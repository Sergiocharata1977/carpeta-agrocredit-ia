// Roles de usuario en la plataforma
export type UserRole =
  | "admin_platform"
  | "producer"
  | "accountant"
  | "accounting_firm_admin"
  | "bank_user"
  | "agro_company_user"

// Tipos de organización
export type OrganizationType =
  | "platform"
  | "producer"
  | "accounting_firm"
  | "bank"
  | "financial_entity"
  | "agro_company"

// Estado de usuario
export type UserStatus = "active" | "suspended" | "pending_verification"

// Estado de membresía
export type MembershipStatus = "active" | "invited" | "suspended" | "removed"

// Perfil de usuario en Firestore (colección: users)
export interface UserProfile {
  uid: string
  email: string
  displayName: string
  defaultOrganizationId: string | null
  roles: UserRole[]
  status: UserStatus
  createdAt: string
  updatedAt: string
}

// Organización/tenant (colección: organizations)
export interface Organization {
  id: string
  type: OrganizationType
  legalName: string
  taxId: string
  status: "active" | "suspended" | "pending"
  plan: "free" | "basic" | "pro" | "enterprise"
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Membresía usuario-organización (colección: organization_members)
export interface OrganizationMember {
  id: string
  organizationId: string
  uid: string
  role: UserRole
  status: MembershipStatus
  invitedBy: string | null
  createdAt: string
  updatedAt: string
}
