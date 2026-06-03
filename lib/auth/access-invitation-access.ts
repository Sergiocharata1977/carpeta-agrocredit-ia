import { randomBytes, createHash } from "crypto"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { AuthError, type ServerSession } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"

export function createInvitationToken() {
  const rawToken = randomBytes(32).toString("hex")
  return {
    rawToken,
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

export function hashInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function resolveInvitationOwnerOrganizationId(
  targetOrganizationId: string,
): Promise<string> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.ORGANIZATIONS)
    .doc(targetOrganizationId)
    .get()

  if (!snap.exists) {
    throw new AuthError("La organizacion objetivo no existe", 404)
  }

  const data = snap.data() ?? {}
  if (data.type !== "system_user" && data.type !== "system_user_entity") {
    throw new AuthError("Solo se pueden compartir carpetas de usuarios o empresas hijas", 400)
  }

  return typeof data.parentOrganizationId === "string"
    ? data.parentOrganizationId
    : targetOrganizationId
}

export async function assertCanCreateInvitation(
  session: ServerSession,
  targetOrganizationId: string,
): Promise<{
  ownerOrganizationId: string
  requiresOwnerApproval: boolean
  senderRole: "producer" | "accountant" | "admin_platform"
}> {
  const ownerOrganizationId = await resolveInvitationOwnerOrganizationId(targetOrganizationId)

  if (session.roles.includes("admin_platform")) {
    return { ownerOrganizationId, requiresOwnerApproval: false, senderRole: "admin_platform" }
  }

  if (session.roles.includes("producer")) {
    if (!session.defaultOrganizationId || session.defaultOrganizationId !== ownerOrganizationId) {
      throw new AuthError("No podes compartir una carpeta que no controlas", 403)
    }
    return { ownerOrganizationId, requiresOwnerApproval: false, senderRole: "producer" }
  }

  if (session.roles.includes("accountant") || session.roles.includes("accounting_firm_admin")) {
    await assertCanManageAccountingFolder(session, targetOrganizationId)
    return { ownerOrganizationId, requiresOwnerApproval: true, senderRole: "accountant" }
  }

  throw new AuthError("Rol no autorizado para crear invitaciones", 403)
}

export async function assertCanControlInvitation(
  session: ServerSession,
  invitation: FirebaseFirestore.DocumentData,
): Promise<void> {
  if (session.roles.includes("admin_platform")) return

  if (session.roles.includes("producer")) {
    if (session.defaultOrganizationId === invitation.ownerOrganizationId) return
    throw new AuthError("No podes gestionar esta invitacion", 403)
  }

  if (session.roles.includes("accountant") || session.roles.includes("accounting_firm_admin")) {
    if (invitation.senderUid !== session.uid) {
      throw new AuthError("No podes gestionar una invitacion creada por otro usuario", 403)
    }
    await assertCanManageAccountingFolder(session, invitation.targetOrganizationId)
    return
  }

  throw new AuthError("Rol no autorizado para gestionar invitaciones", 403)
}
