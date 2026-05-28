import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { assertCanDecideProducerAccess, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { getAuthErrorResponse, verifyRequestSession } from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { approveAccessRequestSchema } from "@/lib/schemas/access"
import type { AccessRequest } from "@/types/access"

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approved"),
    allowedScopes: approveAccessRequestSchema.shape.allowedScopes,
    expirationDays: approveAccessRequestSchema.shape.expirationDays,
  }),
  z.object({
    decision: z.literal("rejected"),
    rejectionReason: z.string().max(500).optional(),
  }),
])

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    const { requestId } = await context.params
    const input = decisionSchema.parse(await request.json())
    const db = getAdminDb()
    const requestRef = db.collection(COLLECTIONS.ACCESS_REQUESTS).doc(requestId)
    const requestSnap = await requestRef.get()

    if (!requestSnap.exists) {
      return Response.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    const accessRequest = { id: requestSnap.id, ...requestSnap.data() } as AccessRequest
    const producer = await assertCanDecideProducerAccess(session, accessRequest.producerId)

    if (accessRequest.status !== "requested") {
      return Response.json({ error: "La solicitud ya fue decidida" }, { status: 409 })
    }

    if (input.decision === "rejected") {
      await requestRef.update({
        status: "rejected",
        decidedBy: session.uid,
        decidedAt: FieldValue.serverTimestamp(),
        rejectionReason: input.rejectionReason ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      })

      await writeAuditLog({
        actorUid: session.uid,
        actorOrganizationId: session.defaultOrganizationId,
        action: "access_request.rejected",
        targetType: "access_request",
        targetId: requestId,
        producerId: accessRequest.producerId,
        metadata: { reason: input.rejectionReason ?? null },
      })

      await notifyOrganizationUsers({
        organizationId: accessRequest.requesterOrganizationId,
        type: "access_request_rejected",
        payload: {
          accessRequestId: requestId,
          producerId: accessRequest.producerId,
          producerOrganizationId: producer.organizationId,
        },
      })

      return Response.json({ id: requestId, status: "rejected" })
    }

    const allowedScopes = input.allowedScopes.filter((scope) =>
      accessRequest.requestedScopes.includes(scope),
    )

    if (allowedScopes.length === 0) {
      return Response.json({ error: "Debe aprobar al menos un scope solicitado" }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + input.expirationDays)

    const grantRef = db.collection(COLLECTIONS.ACCESS_GRANTS).doc()
    const batch = db.batch()

    batch.update(requestRef, {
      status: "approved",
      decidedBy: session.uid,
      decidedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    batch.set(grantRef, {
      producerId: accessRequest.producerId,
      accessRequestId: requestId,
      grantedToOrganizationId: accessRequest.requesterOrganizationId,
      allowedScopes,
      purpose: accessRequest.purpose,
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "approved",
      grantedBy: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await batch.commit()

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_request.approved",
      targetType: "access_request",
      targetId: requestId,
      producerId: accessRequest.producerId,
      metadata: { allowedScopes, grantId: grantRef.id },
    })
    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_grant.created",
      targetType: "access_grant",
      targetId: grantRef.id,
      producerId: accessRequest.producerId,
      metadata: { accessRequestId: requestId, expiresAt: expiresAt.toISOString() },
    })

    await notifyOrganizationUsers({
      organizationId: accessRequest.requesterOrganizationId,
      type: "access_request_approved",
      payload: {
        accessRequestId: requestId,
        grantId: grantRef.id,
        producerId: accessRequest.producerId,
        expiresAt: expiresAt.toISOString(),
      },
    })

    return Response.json({ id: requestId, grantId: grantRef.id, status: "approved" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
