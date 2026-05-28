import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { assertGrantIsActive, getProducerForServer, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { assertActiveMembership, getAuthErrorResponse, isFinancialEntity, requireDefaultOrganization, verifyRequestSession } from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { createFinancingRequestSchema } from "@/lib/schemas/financing"
import type { AccessGrant } from "@/types/access"

export async function POST(request: Request) {
  try {
    const session = await verifyRequestSession(request)

    if (!isFinancialEntity(session)) {
      return Response.json({ error: "Solo bancos y empresas pueden crear solicitudes" }, { status: 403 })
    }

    const requesterOrganizationId = requireDefaultOrganization(session)
    await assertActiveMembership(session, requesterOrganizationId)

    const input = createFinancingRequestSchema.parse({
      ...(await request.json()),
      requesterOrganizationId,
    })
    const producer = await getProducerForServer(input.producerId)
    const db = getAdminDb()

    if (input.grantId) {
      const grantSnap = await db.collection(COLLECTIONS.ACCESS_GRANTS).doc(input.grantId).get()
      if (!grantSnap.exists) {
        return Response.json({ error: "Grant no encontrado" }, { status: 404 })
      }

      const grant = { id: grantSnap.id, ...grantSnap.data() } as AccessGrant
      assertGrantIsActive(grant)

      if (
        grant.grantedToOrganizationId !== requesterOrganizationId ||
        grant.producerId !== input.producerId
      ) {
        return Response.json({ error: "El grant no corresponde a esta solicitud" }, { status: 403 })
      }
    }

    const initialStatus = input.grantId ? "requested" : "pending_authorization"
    const now = new Date().toISOString()
    const ref = await db.collection(COLLECTIONS.FINANCING_REQUESTS).add({
      producerId: input.producerId,
      requesterOrganizationId,
      grantId: input.grantId,
      financingType: input.financingType,
      amount: input.amount,
      currency: input.currency,
      termMonths: input.termMonths,
      purpose: input.purpose,
      observations: input.observations ?? "",
      requiredDocuments: input.requiredDocuments,
      receivedDocuments: [],
      status: initialStatus,
      statusHistory: [
        {
          status: initialStatus,
          changedBy: session.uid,
          changedAt: now,
          note: "Solicitud creada",
        },
      ],
      createdBy: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: requesterOrganizationId,
      action: "financing_request.created",
      targetType: "financing_request",
      targetId: ref.id,
      producerId: input.producerId,
      metadata: {
        amount: input.amount,
        currency: input.currency,
        financingType: input.financingType,
        grantId: input.grantId,
      },
    })

    await notifyOrganizationUsers({
      organizationId: producer.organizationId,
      type: "financing_request_received",
      payload: {
        financingRequestId: ref.id,
        producerId: input.producerId,
        requesterOrganizationId,
        amount: input.amount,
        currency: input.currency,
      },
    })

    return Response.json({ id: ref.id, status: initialStatus }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
