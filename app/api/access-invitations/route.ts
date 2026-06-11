import { NextRequest } from "next/server"
import { z } from "zod"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import {
  getAuthErrorResponse,
  requireActiveOrg,
  requireAnyRole,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import {
  assertCanControlInvitation,
  assertCanCreateInvitation,
  createInvitationToken,
} from "@/lib/auth/access-invitation-access"
import { createAccessInvitationSchema } from "@/lib/schemas/access"
import { getFolderDataStatus } from "@/lib/firebase/folder-data"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["producer", "accountant", "accounting_firm_admin", "admin_platform"])
    if (session.roles.includes("accountant") || session.roles.includes("accounting_firm_admin")) {
      requireActiveOrg(session)
    }

    const data = createAccessInvitationSchema.parse(await request.json())
    const invitationAccess = await assertCanCreateInvitation(session, data.targetOrganizationId)

    const db = getAdminDb()
    const folderStatus = await getFolderDataStatus(db, data.targetOrganizationId)
    if (!folderStatus.hasData) {
      return Response.json(
        { error: "La carpeta no tiene informacion cargada todavia. Carga datos antes de invitar a visualizar el legajo." },
        { status: 409 },
      )
    }

    const { rawToken, tokenHash, tokenExpiresAt } = createInvitationToken()
    const status = invitationAccess.requiresOwnerApproval ? "pending_owner_approval" : "sent"
    const now = FieldValue.serverTimestamp()
    const invitationRef = db.collection(COLLECTIONS.ACCESS_INVITATIONS).doc()

    await invitationRef.set({
      tokenHash,
      status,
      targetOrganizationId: data.targetOrganizationId,
      targetScope: data.targetScope,
      senderUid: session.uid,
      senderOrganizationId: session.defaultOrganizationId ?? "",
      senderRole: invitationAccess.senderRole,
      ownerOrganizationId: invitationAccess.ownerOrganizationId,
      requiresOwnerApproval: invitationAccess.requiresOwnerApproval,
      recipientEmail: data.recipientEmail.toLowerCase(),
      recipientName: data.recipientName ?? null,
      recipientOrganizationName: data.recipientOrganizationName ?? null,
      recipientSubtype: data.recipientSubtype,
      requestedScopes: data.requestedScopes,
      approvedDays: data.approvedDays,
      purpose: data.purpose,
      tokenExpiresAt,
      createdAt: now,
      updatedAt: now,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: status === "sent" ? "access_invitation.sent" : "access_invitation.created",
      targetType: "access_invitation",
      targetId: invitationRef.id,
      metadata: {
        recipientEmail: data.recipientEmail,
        targetOrganizationId: data.targetOrganizationId,
        status,
      },
    })

    return Response.json(
      {
        invitationId: invitationRef.id,
        status,
        token: status === "sent" ? rawToken : null,
        inviteUrl: status === "sent" ? `/invitar/acceso/${rawToken}` : null,
        requiresOwnerApproval: invitationAccess.requiresOwnerApproval,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }
    return getAuthErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["producer", "accountant", "accounting_firm_admin", "admin_platform"])

    const { searchParams } = new URL(request.url)
    const ownerOrgId = searchParams.get("ownerOrganizationId")
    if (!ownerOrgId) {
      return Response.json({ error: "ownerOrganizationId requerido" }, { status: 400 })
    }

    if (!session.roles.includes("admin_platform")) {
      await assertCanControlInvitation(session, {
        ownerOrganizationId: ownerOrgId,
        targetOrganizationId: ownerOrgId,
        senderUid: session.uid,
      })
    }

    const snap = await getAdminDb()
      .collection(COLLECTIONS.ACCESS_INVITATIONS)
      .where("ownerOrganizationId", "==", ownerOrgId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get()

    const invitations = snap.docs.map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        tokenHash: undefined,
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt,
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt,
      }
    })

    return Response.json({ invitations })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
