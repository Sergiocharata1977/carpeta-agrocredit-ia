import type { UserRole } from "@/types/auth"

// Roles que tienen acceso a paneles privados
export const PRIVATE_ROLES: UserRole[] = [
  "admin_platform",
  "producer",
  "accountant",
  "accounting_firm_admin",
  "bank_user",
  "agro_company_user",
]

// Ruta de dashboard por rol
export const ROLE_DASHBOARD_ROUTES: Record<UserRole, string> = {
  admin_platform: "/app/admin",
  producer: "/app/productor",
  accountant: "/app/contador",
  accounting_firm_admin: "/app/contador",
  bank_user: "/app/entidad",
  agro_company_user: "/app/entidad",
}

export function getDefaultDashboardRoute(roles: UserRole[]): string {
  if (roles.includes("admin_platform")) return ROLE_DASHBOARD_ROUTES.admin_platform
  if (roles.includes("producer")) return ROLE_DASHBOARD_ROUTES.producer
  if (roles.includes("accountant") || roles.includes("accounting_firm_admin")) return ROLE_DASHBOARD_ROUTES.accountant
  if (roles.includes("bank_user") || roles.includes("agro_company_user")) return ROLE_DASHBOARD_ROUTES.agro_company_user
  return "/login"
}

export function hasRole(userRoles: UserRole[], requiredRoles: UserRole[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role))
}

export function isAdminPlatform(roles: UserRole[]): boolean {
  return roles.includes("admin_platform")
}

export function isProducer(roles: UserRole[]): boolean {
  return roles.includes("producer")
}

export function isAccountant(roles: UserRole[]): boolean {
  return roles.includes("accountant") || roles.includes("accounting_firm_admin")
}

export function isFinancialEntity(roles: UserRole[]): boolean {
  return roles.includes("bank_user") || roles.includes("agro_company_user")
}
