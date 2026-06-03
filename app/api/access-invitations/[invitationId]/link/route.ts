import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import {
  getAuthErrorResponse,
  requireAnyRole,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import {
  assertCanControlInvitation,
  createInvitationToken,
} from "@/lib/auth/access-invitation-access"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["producer", "accountant", "accounting_firm_admin", "admin_platform"])

    const { invitationId } = await params
    const db = getAdminDb()
    const ref = db.collection(COLLECTIONS.ACCESS_INVITATIONS).doc(invitationId)
    const snap = await ref.get()

    if (!snap.exists) {
      return Response.json({ error: "Invitacion no encontrada" }, { status: 404 })
    }

    const invitation = snap.data()!
    await assertCanControlInvitation(session, invitation)

    if (invitation.status !== "sent") {
      return Response.json({ error: "Solo se puede generar link para invitaciones enviadas" }, { status: 409 })
    }

    const { rawToken, tokenHash, tokenExpiresAt } = createInvitationToken()
    await ref.update({
      tokenHash,
      tokenExpiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_invitation.sent",
      targetType: "access_invitation",
      targetId: invitationId,
      metadata: { reissued: true, recipientEmail: invitation.recipientEmail },
    })

    return Response.json({
      ok: true,
      token: rawToken,
      inviteUrl: `/invitar/acceso/${rawToken}`,
      tokenExpiresAt,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
