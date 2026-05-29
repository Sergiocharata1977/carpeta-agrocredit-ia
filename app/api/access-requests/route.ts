import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { getAuthErrorResponse, isFinancialEntity, requireDefaultOrganization, verifyRequestSession } from "@/lib/auth/server-session"
import { getTargetOrganizationForServer, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { writeAuditLog } from "@/lib/firebase/audit"
import { createAccessRequestSchema } from "@/lib/schemas/access"

export async function POST(request: Request) {
  try {
    const session = await verifyRequestSession(request)

    if (!isFinancialEntity(session)) {
      return Response.json({ error: "Solo entidades solicitantes pueden pedir acceso" }, { status: 403 })
    }

    const requesterOrganizationId = requireDefaultOrganization(session)

    const body = await request.json()
    const input = createAccessRequestSchema.parse({
      ...body,
      requesterOrganizationId,
    })

    const targetOrg = await getTargetOrganizationForServer(input.targetOrganizationId)

    const ref = await getAdminDb().collection(COLLECTIONS.ACCESS_REQUESTS).add({
      targetOrganizationId: input.targetOrganizationId,
      targetScope: input.targetScope,
      requesterOrganizationId,
      requestedScopes: input.requestedScopes,
      purpose: input.purpose,
      requestedDays: input.requestedDays,
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
      metadata: {
        targetOrganizationId: input.targetOrganizationId,
        requesterOrganizationId,
        requestedScopes: input.requestedScopes,
        requestedDays: input.requestedDays,
      },
    })

    // Notificar a los miembros de la org objetivo (system_user o su raíz)
    const notifyOrgId = targetOrg.parentOrganizationId ?? targetOrg.id
    await notifyOrganizationUsers({
      organizationId: notifyOrgId,
      type: "access_request_received",
      payload: {
        accessRequestId: ref.id,
        targetOrganizationId: input.targetOrganizationId,
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
