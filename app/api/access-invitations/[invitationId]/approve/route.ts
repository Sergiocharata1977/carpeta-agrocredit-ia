import { NextRequest } from "next/server"
import { randomBytes, createHash } from "crypto"
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

    // Generar nuevo token al aprobar
    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

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

    return Response.json({
      ok: true,
      token: rawToken,
      inviteUrl: `/invitar/acceso/${rawToken}`,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
