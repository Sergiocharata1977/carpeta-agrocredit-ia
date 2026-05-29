import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { assertCanDecideAccess, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { getAuthErrorResponse, verifyRequestSession } from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { approveAccessRequestSchema } from "@/lib/schemas/access"
import type { AccessRequest, AccessScope } from "@/types/access"

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("approved"),
    allowedScopes: approveAccessRequestSchema.shape.allowedScopes,
    approvedDays: approveAccessRequestSchema.shape.approvedDays,
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
    const targetOrg = await assertCanDecideAccess(session, accessRequest.targetOrganizationId)

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
        metadata: {
          targetOrganizationId: accessRequest.targetOrganizationId,
          reason: input.rejectionReason ?? null,
        },
      })

      await notifyOrganizationUsers({
        organizationId: accessRequest.requesterOrganizationId,
        type: "access_request_rejected",
        payload: {
          accessRequestId: requestId,
          targetOrganizationId: accessRequest.targetOrganizationId,
        },
      })

      return Response.json({ id: requestId, status: "rejected" })
    }

    const allowedScopes = input.allowedScopes.filter((scope: AccessScope) =>
      accessRequest.requestedScopes.includes(scope),
    )

    if (allowedScopes.length === 0) {
      return Response.json({ error: "Debe aprobar al menos un scope solicitado" }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + input.approvedDays * 24 * 60 * 60 * 1000)

    const grantRef = db.collection(COLLECTIONS.ACCESS_GRANTS).doc()
    const batch = db.batch()

    batch.update(requestRef, {
      status: "approved",
      approvedDays: input.approvedDays,
      decidedBy: session.uid,
      decidedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    batch.set(grantRef, {
      targetOrganizationId: accessRequest.targetOrganizationId,
      targetScope: accessRequest.targetScope,
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
      metadata: { allowedScopes, grantId: grantRef.id, targetOrganizationId: targetOrg.id },
    })
    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_grant.created",
      targetType: "access_grant",
      targetId: grantRef.id,
      metadata: { accessRequestId: requestId, expiresAt: expiresAt.toISOString(), approvedDays: input.approvedDays },
    })

    await notifyOrganizationUsers({
      organizationId: accessRequest.requesterOrganizationId,
      type: "access_request_approved",
      payload: {
        accessRequestId: requestId,
        grantId: grantRef.id,
        targetOrganizationId: accessRequest.targetOrganizationId,
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
