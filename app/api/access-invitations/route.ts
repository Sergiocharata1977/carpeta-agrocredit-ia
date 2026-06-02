import { NextRequest } from "next/server"
import { randomBytes, createHash } from "crypto"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import {
  verifyRequestSession,
  requireAnyRole,
  requireActiveOrg,
  getAuthErrorResponse,
} from "@/lib/auth/server-session"
import { createAccessInvitationSchema } from "@/lib/schemas/access"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["producer", "accountant", "accounting_firm_admin", "admin_platform"])
    if (session.roles.includes("accountant") || session.roles.includes("accounting_firm_admin")) {
      requireActiveOrg(session)
    }

    const body = await request.json()
    const data = createAccessInvitationSchema.parse(body)

    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()

    // Determinar si necesita aprobación del dueño
    const isAccountant =
      session.roles.includes("accountant") ||
      session.roles.includes("accounting_firm_admin")
    const requiresOwnerApproval = isAccountant // v1: contador siempre requiere aprobación del cliente

    // Token opaco (64 hex chars), hash SHA-256 para almacenamiento
    const rawToken = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(rawToken).digest("hex")

    // El link expira en 7 días para que el receptor lo use
    const tokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const senderRole = session.roles.includes("admin_platform")
      ? "admin_platform"
      : session.roles.includes("accountant") || session.roles.includes("accounting_firm_admin")
        ? "accountant"
        : "producer"

    const status = requiresOwnerApproval ? "pending_owner_approval" : "sent"

    const invitationRef = db.collection(COLLECTIONS.ACCESS_INVITATIONS).doc()
    await invitationRef.set({
      tokenHash,
      status,
      targetOrganizationId: data.targetOrganizationId,
      targetScope: data.targetScope,
      senderUid: session.uid,
      senderOrganizationId: session.defaultOrganizationId ?? "",
      senderRole,
      ownerOrganizationId: data.targetOrganizationId,
      requiresOwnerApproval,
      recipientEmail: data.recipientEmail,
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
      action: "access_invitation.created",
      targetType: "access_invitation",
      targetId: invitationRef.id,
      metadata: {
        recipientEmail: data.recipientEmail,
        targetOrganizationId: data.targetOrganizationId,
        status,
      },
    })

    // Solo devuelve el token raw al creador, una sola vez
    return Response.json(
      {
        invitationId: invitationRef.id,
        status,
        token: status === "sent" ? rawToken : null,
        inviteUrl: status === "sent" ? `/invitar/acceso/${rawToken}` : null,
        requiresOwnerApproval,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 })
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

    const db = getAdminDb()
    const snap = await db
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
        tokenHash: undefined, // nunca exponer
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt,
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt,
      }
    })

    return Response.json({ invitations })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
