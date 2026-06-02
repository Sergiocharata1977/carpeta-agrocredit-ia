import { NextRequest } from "next/server"
import { createHash } from "crypto"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, getAuthErrorResponse } from "@/lib/auth/server-session"
import { FieldValue } from "firebase-admin/firestore"

async function findInvitationByToken(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.ACCESS_INVITATIONS)
    .where("tokenHash", "==", tokenHash)
    .limit(1)
    .get()
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string }
}

// GET — pública, devuelve info mínima para la pantalla de aceptación
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const invitation = await findInvitationByToken(token)

    if (!invitation) {
      return Response.json({ error: "Invitación no encontrada o token inválido" }, { status: 404 })
    }

    if (invitation.status !== "sent") {
      return Response.json({ error: "Esta invitación ya no está disponible", status: invitation.status }, { status: 410 })
    }

    if (new Date(invitation.tokenExpiresAt as string) < new Date()) {
      return Response.json({ error: "El link de invitación expiró", status: "expired" }, { status: 410 })
    }

    // Obtener nombre del dueño de la carpeta
    const db = getAdminDb()
    const ownerSnap = await db
      .collection(COLLECTIONS.ORGANIZATIONS)
      .doc(invitation.targetOrganizationId as string)
      .get()
    const ownerName = ownerSnap.exists ? (ownerSnap.data()?.legalName ?? "") : ""

    return Response.json({
      invitationId: invitation.id,
      ownerName,
      senderRole: invitation.senderRole,
      recipientEmail: (invitation.recipientEmail as string).replace(/(.{2})(.*)(@.*)/, "$1***$3"),
      requestedScopes: invitation.requestedScopes,
      approvedDays: invitation.approvedDays,
      purpose: invitation.purpose,
      tokenExpiresAt: invitation.tokenExpiresAt,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

// POST — requiere sesión; acepta la invitación y crea el grant
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    const { token } = await params

    const invitation = await findInvitationByToken(token)
    if (!invitation) {
      return Response.json({ error: "Invitación no encontrada" }, { status: 404 })
    }

    if (invitation.status !== "sent") {
      return Response.json({ error: "Esta invitación ya no está disponible" }, { status: 410 })
    }

    if (new Date(invitation.tokenExpiresAt as string) < new Date()) {
      return Response.json({ error: "El link expiró" }, { status: 410 })
    }

    // Verificar que el email del usuario autenticado coincide
    if (session.email?.toLowerCase() !== (invitation.recipientEmail as string).toLowerCase()) {
      return Response.json(
        { error: "El email de tu cuenta no coincide con el destinatario de esta invitación" },
        { status: 403 },
      )
    }

    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()
    const batch = db.batch()

    // Crear o usar organización solicitante del receptor
    let grantedToOrganizationId = session.defaultOrganizationId

    if (!grantedToOrganizationId) {
      // Crear org requesting_entity tipo invited
      const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()
      batch.set(orgRef, {
        type: "requesting_entity",
        subtype: invitation.recipientSubtype,
        legalName: invitation.recipientOrganizationName ?? session.email,
        status: "invited",
        createdBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
      batch.set(
        db.collection(COLLECTIONS.ORGANIZATION_MEMBERS).doc(`${orgRef.id}_${session.uid}`),
        {
          organizationId: orgRef.id,
          uid: session.uid,
          role: "bank_user",
          status: "active",
          invitedBy: invitation.senderUid,
          createdAt: now,
          updatedAt: now,
        },
      )
      grantedToOrganizationId = orgRef.id

      // Actualizar claims
      const auth = getAdminAuth()
      await auth.setCustomUserClaims(session.uid, {
        roles: ["bank_user"],
        defaultOrganizationId: orgRef.id,
        orgStatus: "active",
      })
    }

    // Calcular expiresAt del grant
    const startsAt = new Date()
    const expiresAt = new Date(startsAt.getTime() + (invitation.approvedDays as number) * 24 * 60 * 60 * 1000)

    // Crear access_grant
    const grantRef = db.collection(COLLECTIONS.ACCESS_GRANTS).doc()
    batch.set(grantRef, {
      targetOrganizationId: invitation.targetOrganizationId,
      targetScope: invitation.targetScope,
      includedOrganizationIds: invitation.includedOrganizationIds ?? [],
      accessRequestId: `invitation:${invitation.id}`,
      grantedToOrganizationId,
      allowedScopes: invitation.requestedScopes,
      purpose: invitation.purpose,
      startsAt: startsAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "approved",
      grantedBy: invitation.senderUid,
      createdAt: now,
      updatedAt: now,
    })

    // Marcar invitación como aceptada
    const invRef = db.collection(COLLECTIONS.ACCESS_INVITATIONS).doc(invitation.id)
    batch.update(invRef, {
      status: "accepted",
      acceptedByUid: session.uid,
      acceptedByOrganizationId: grantedToOrganizationId,
      accessGrantId: grantRef.id,
      accessExpiresAt: expiresAt.toISOString(),
      updatedAt: now,
    })

    await batch.commit()

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: grantedToOrganizationId,
      action: "access_invitation.accepted",
      targetType: "access_invitation",
      targetId: invitation.id,
      metadata: {
        grantId: grantRef.id,
        targetOrganizationId: invitation.targetOrganizationId,
      },
    })

    return Response.json({
      ok: true,
      grantId: grantRef.id,
      targetOrganizationId: invitation.targetOrganizationId,
      expiresAt: expiresAt.toISOString(),
      redirectUrl: `/app/entidad/carpetas/${invitation.targetOrganizationId}`,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
