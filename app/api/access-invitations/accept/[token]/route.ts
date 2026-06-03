import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { getAuthErrorResponse, verifyRequestSession } from "@/lib/auth/server-session"
import { hashInvitationToken } from "@/lib/auth/access-invitation-access"

async function findInvitationByToken(token: string) {
  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.ACCESS_INVITATIONS)
    .where("tokenHash", "==", hashInvitationToken(token))
    .limit(1)
    .get()

  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const invitation = await findInvitationByToken(token)

    if (!invitation) {
      return Response.json({ error: "Invitacion no encontrada o token invalido" }, { status: 404 })
    }

    if (invitation.status !== "sent") {
      return Response.json({ error: "Esta invitacion ya no esta disponible", status: invitation.status }, { status: 410 })
    }

    if (new Date(invitation.tokenExpiresAt as string) < new Date()) {
      return Response.json({ error: "El link de invitacion expiro", status: "expired" }, { status: 410 })
    }

    const ownerSnap = await getAdminDb()
      .collection(COLLECTIONS.ORGANIZATIONS)
      .doc(invitation.targetOrganizationId as string)
      .get()

    return Response.json({
      invitationId: invitation.id,
      ownerName: ownerSnap.exists ? (ownerSnap.data()?.legalName ?? "") : "",
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    const { token } = await params
    const invitation = await findInvitationByToken(token)

    if (!invitation) {
      return Response.json({ error: "Invitacion no encontrada" }, { status: 404 })
    }
    if (invitation.status !== "sent") {
      return Response.json({ error: "Esta invitacion ya no esta disponible" }, { status: 410 })
    }
    if (new Date(invitation.tokenExpiresAt as string) < new Date()) {
      return Response.json({ error: "El link expiro" }, { status: 410 })
    }
    if (session.email?.toLowerCase() !== (invitation.recipientEmail as string).toLowerCase()) {
      return Response.json(
        { error: "El email de tu cuenta no coincide con el destinatario de esta invitacion" },
        { status: 403 },
      )
    }

    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()
    const batch = db.batch()

    let grantedToOrganizationId = session.defaultOrganizationId
    let canUseCurrentOrg = false

    if (grantedToOrganizationId) {
      const currentOrgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(grantedToOrganizationId).get()
      canUseCurrentOrg =
        currentOrgSnap.exists &&
        currentOrgSnap.data()?.type === "requesting_entity" &&
        (session.roles.includes("bank_user") || session.roles.includes("agro_company_user"))
    }

    if (!grantedToOrganizationId || !canUseCurrentOrg) {
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
      batch.set(db.collection(COLLECTIONS.ORGANIZATION_MEMBERS).doc(`${orgRef.id}_${session.uid}`), {
        organizationId: orgRef.id,
        uid: session.uid,
        role: "bank_user",
        status: "active",
        invitedBy: invitation.senderUid,
        createdAt: now,
        updatedAt: now,
      })
      grantedToOrganizationId = orgRef.id

      await getAdminAuth().setCustomUserClaims(session.uid, {
        roles: Array.from(new Set([...session.roles, "bank_user"])),
        defaultOrganizationId: orgRef.id,
        orgStatus: "active",
      })
    }

    const startsAt = new Date()
    const expiresAt = new Date(startsAt.getTime() + (invitation.approvedDays as number) * 24 * 60 * 60 * 1000)
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

    batch.update(db.collection(COLLECTIONS.ACCESS_INVITATIONS).doc(invitation.id), {
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
