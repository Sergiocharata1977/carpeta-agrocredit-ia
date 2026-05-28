import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { assertActiveMembership, getAuthErrorResponse, isFinancialEntity, requireDefaultOrganization, verifyRequestSession } from "@/lib/auth/server-session"
import { getProducerForServer, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { writeAuditLog } from "@/lib/firebase/audit"
import { createAccessRequestSchema } from "@/lib/schemas/access"

export async function POST(request: Request) {
  try {
    const session = await verifyRequestSession(request)

    if (!isFinancialEntity(session)) {
      return Response.json({ error: "Solo bancos y empresas pueden solicitar acceso" }, { status: 403 })
    }

    const requesterOrganizationId = requireDefaultOrganization(session)
    await assertActiveMembership(session, requesterOrganizationId)

    const body = await request.json()
    const input = createAccessRequestSchema.parse({
      ...body,
      requesterOrganizationId,
    })
    const producer = await getProducerForServer(input.producerId)

    const ref = await getAdminDb().collection(COLLECTIONS.ACCESS_REQUESTS).add({
      producerId: input.producerId,
      requesterOrganizationId,
      requestedScopes: input.requestedScopes,
      purpose: input.purpose,
      requestedExpirationDays: input.requestedExpirationDays,
      status: "requested",
      createdBy: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: requesterOrganizationId,
      action: "access_request.created",
      targetType: "access_request",
      targetId: ref.id,
      producerId: input.producerId,
      metadata: {
        requesterOrganizationId,
        requestedScopes: input.requestedScopes,
      },
    })

    await notifyOrganizationUsers({
      organizationId: producer.organizationId,
      type: "access_request_received",
      payload: {
        accessRequestId: ref.id,
        producerId: input.producerId,
        requesterOrganizationId,
        purpose: input.purpose,
      },
    })

    return Response.json({ id: ref.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
