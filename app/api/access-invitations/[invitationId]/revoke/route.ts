import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["producer", "accountant", "accounting_firm_admin", "admin_platform"])

    const { invitationId } = await params
    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()

    const ref = db.collection(COLLECTIONS.ACCESS_INVITATIONS).doc(invitationId)
    const snap = await ref.get()
    if (!snap.exists) {
      return Response.json({ error: "Invitación no encontrada" }, { status: 404 })
    }

    const invitation = snap.data()!
    if (invitation.status === "revoked") {
      return Response.json({ error: "Ya está revocada" }, { status: 409 })
    }

    await ref.update({ status: "revoked", updatedAt: now })

    // Si ya fue aceptada, revocar también el grant
    if (invitation.accessGrantId) {
      await db.collection(COLLECTIONS.ACCESS_GRANTS).doc(invitation.accessGrantId).update({
        status: "revoked",
        revokedBy: session.uid,
        revokedAt: new Date().toISOString(),
        updatedAt: now,
      })
    }

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_invitation.revoked",
      targetType: "access_invitation",
      targetId: invitationId,
      metadata: { recipientEmail: invitation.recipientEmail },
    })

    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
