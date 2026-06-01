// Roles de usuario en la plataforma
export type UserRole =
  | "admin_platform"
  | "producer"             // legacy alias → system_user. Mantener en claims por compatibilidad
  | "accountant"
  | "accounting_firm_admin"
  | "bank_user"            // rol genérico para cualquier requesting_entity
  | "agro_company_user"    // legacy alias → bank_user

// Tipos de organización — modelo canónico (ver reports/002_REORGANIZACION_BASE_DATOS.md)
export type OrganizationType =
  | "platform"
  | "accounting_firm"
  | "system_user"          // titular/cliente raíz (reemplaza a "producer")
  | "system_user_entity"   // empresa hija del system_user (parentOrganizationId obligatorio)
  | "requesting_entity"    // banco, financiera, agrocomercial, maquinaria, insumos (subtype obligatorio)

// Subtipos de requesting_entity
export type RequestingEntitySubtype =
  | "bank"
  | "financial_entity"
  | "agro_company"
  | "maquinaria_agricola"
  | "insumos_agricolas"

// Estado de carpeta contable de un system_user o system_user_entity
export type FolderStatus =
  | "incomplete"
  | "in_progress"
  | "complete"
  | "under_review"
  | "outdated"
  | "archived"

// Actividad agropecuaria principal
export type AgroActivity =
  | "agriculture"
  | "livestock"
  | "mixed"
  | "horticulture"
  | "forestry"
  | "other"

// Estado de usuario
export type UserStatus = "active" | "suspended" | "pending_onboarding"

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

// Organización/tenant unificada (colección: organizations)
// Cubre todos los tipos: platform, accounting_firm, system_user, system_user_entity, requesting_entity
export interface Organization {
  id: string
  type: OrganizationType
  // Solo requesting_entity — obligatorio cuando type === "requesting_entity"
  subtype?: RequestingEntitySubtype
  // Solo system_user_entity — apunta al system_user raíz
  parentOrganizationId?: string
  legalName: string
  taxId: string
  status: "active" | "suspended" | "pending"
  plan?: "free" | "basic" | "pro" | "enterprise"
  // Campos extendidos para system_user y system_user_entity
  activity?: AgroActivity
  // V1: texto libre para titulares/socios externos o registrados. V2: entity_ownership.
  entityOwnersText?: string
  province?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  folderStatus?: FolderStatus
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
