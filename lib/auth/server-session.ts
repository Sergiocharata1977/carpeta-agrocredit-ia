import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { UserRole } from "@/types/auth"

export interface ServerSession {
  uid: string
  email: string | null
  roles: UserRole[]
  defaultOrganizationId: string | null
  orgStatus: string | null
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

export async function verifyRequestSession(request: Request): Promise<ServerSession> {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  if (!token) {
    throw new AuthError("Token de autenticacion requerido", 401)
  }

  const decoded = await getAdminAuth().verifyIdToken(token)
  const roles = Array.isArray(decoded.roles) ? (decoded.roles as UserRole[]) : []
  const defaultOrganizationId =
    typeof decoded.defaultOrganizationId === "string"
      ? decoded.defaultOrganizationId
      : null
  const orgStatus =
    typeof decoded.orgStatus === "string" ? decoded.orgStatus : null

  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    roles,
    defaultOrganizationId,
    orgStatus,
  }
}

export function requireActiveOrg(session: ServerSession): void {
  if (session.orgStatus && session.orgStatus !== "active") {
    throw new AuthError("El estudio contable aún no está habilitado por la plataforma", 403)
  }
}

export function requireAnyRole(session: ServerSession, allowedRoles: UserRole[]): void {
  if (!allowedRoles.some((role) => session.roles.includes(role))) {
    throw new AuthError("No tenes permisos para esta accion", 403)
  }
}

export function requireDefaultOrganization(session: ServerSession): string {
  if (!session.defaultOrganizationId) {
    throw new AuthError("La sesion no tiene organizacion por defecto", 403)
  }

  return session.defaultOrganizationId
}

export function isAdminPlatform(session: ServerSession): boolean {
  return session.roles.includes("admin_platform")
}

export function isFinancialEntity(session: ServerSession): boolean {
  return (
    session.roles.includes("bank_user") ||
    session.roles.includes("agro_company_user")
  )
}

export function isProducerRole(session: ServerSession): boolean {
  return session.roles.includes("producer")
}

export function isAccountantRole(session: ServerSession): boolean {
  return (
    session.roles.includes("accountant") ||
    session.roles.includes("accounting_firm_admin")
  )
}

export async function assertActiveMembership(
  session: ServerSession,
  organizationId: string,
): Promise<void> {
  if (isAdminPlatform(session)) return

  const snap = await getAdminDb()
    .collection(COLLECTIONS.ORGANIZATION_MEMBERS)
    .where("uid", "==", session.uid)
    .where("organizationId", "==", organizationId)
    .where("status", "==", "active")
    .limit(1)
    .get()

  if (snap.empty) {
    throw new AuthError("No tenes membresia activa en esa organizacion", 403)
  }
}

export function getAuthErrorResponse(error: unknown): Response {
  const status = error instanceof AuthError ? error.status : 500
  const message =
    error instanceof Error ? error.message : "Error interno de autorizacion"

  return Response.json({ error: message }, { status })
}
