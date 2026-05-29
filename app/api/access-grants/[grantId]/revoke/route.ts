import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { assertCanDecideAccess, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { getAuthErrorResponse, verifyRequestSession } from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import type { AccessGrant } from "@/types/access"

const revokeSchema = z.object({
  reason: z.string().max(500).optional(),
})

export async function POST(
  request: Request,
  context: { params: Promise<{ grantId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    const { grantId } = await context.params
    const input = revokeSchema.parse(await request.json().catch(() => ({})))
    const db = getAdminDb()
    const grantRef = db.collection(COLLECTIONS.ACCESS_GRANTS).doc(grantId)
    const grantSnap = await grantRef.get()

    if (!grantSnap.exists) {
      return Response.json({ error: "Grant no encontrado" }, { status: 404 })
    }

    const grant = { id: grantSnap.id, ...grantSnap.data() } as AccessGrant
    await assertCanDecideAccess(session, grant.targetOrganizationId)

    await grantRef.update({
      status: "revoked",
      revokedBy: session.uid,
      revokedAt: new Date().toISOString(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    if (grant.accessRequestId) {
      await db.collection(COLLECTIONS.ACCESS_REQUESTS).doc(grant.accessRequestId).update({
        status: "revoked",
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_grant.revoked",
      targetType: "access_grant",
      targetId: grantId,
      metadata: {
        targetOrganizationId: grant.targetOrganizationId,
        reason: input.reason ?? null,
      },
    })

    await notifyOrganizationUsers({
      organizationId: grant.grantedToOrganizationId,
      type: "access_request_revoked",
      payload: {
        grantId,
        accessRequestId: grant.accessRequestId,
        targetOrganizationId: grant.targetOrganizationId,
        reason: input.reason ?? null,
      },
    })

    return Response.json({ id: grantId, status: "revoked" })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
