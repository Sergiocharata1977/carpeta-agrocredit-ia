import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createInvitationToken } from "@/lib/auth/access-invitation-access"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["producer", "admin_platform"])

    const { invitationId } = await params
    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()

    const ref = db.collection(COLLECTIONS.ACCESS_INVITATIONS).doc(invitationId)
    const snap = await ref.get()
    if (!snap.exists) {
      return Response.json({ error: "Invitación no encontrada" }, { status: 404 })
    }

    const invitation = snap.data()!
    if (invitation.status !== "pending_owner_approval") {
      return Response.json({ error: "La invitación no está pendiente de aprobación" }, { status: 409 })
    }

    // Verificar que el productor que aprueba es el dueño de la carpeta
    if (
      !session.roles.includes("admin_platform") &&
      invitation.ownerOrganizationId !== session.defaultOrganizationId
    ) {
      return Response.json({ error: "No tenés permiso para aprobar esta invitación" }, { status: 403 })
    }

    const { rawToken, tokenHash, tokenExpiresAt } = createInvitationToken()

    await ref.update({
      status: "sent",
      tokenHash,
      tokenExpiresAt,
      approvedByOwnerUid: session.uid,
      approvedByOwnerAt: new Date().toISOString(),
      updatedAt: now,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_invitation.approved",
      targetType: "access_invitation",
      targetId: invitationId,
      metadata: { recipientEmail: invitation.recipientEmail },
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_invitation.sent",
      targetType: "access_invitation",
      targetId: invitationId,
      metadata: { recipientEmail: invitation.recipientEmail },
    })

    return Response.json({
      ok: true,
      token: rawToken,
      inviteUrl: `/invitar/acceso/${rawToken}`,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
