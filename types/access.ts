// Subtipo del receptor de una invitación
export type InvitationRecipientSubtype =
  | "bank"
  | "financial_entity"
  | "agro_company"
  | "maquinaria_agricola"
  | "insumos_agricolas"
  | "other_authorized_viewer"

// Estado de una invitación de acceso por link
export type AccessInvitationStatus =
  | "draft"
  | "pending_owner_approval"
  | "sent"
  | "accepted"
  | "revoked"
  | "expired"

// Invitación de acceso por link (colección: access_invitations)
export interface AccessInvitation {
  id: string
  tokenHash: string                          // SHA-256 del token — el token plano nunca se guarda
  status: AccessInvitationStatus

  targetOrganizationId: string
  targetScope: AccessTargetScope
  includedOrganizationIds?: string[]

  senderUid: string
  senderOrganizationId: string
  senderRole: "producer" | "accountant" | "admin_platform"

  ownerOrganizationId: string
  accountantLinkId?: string
  requiresOwnerApproval: boolean
  approvedByOwnerUid?: string
  approvedByOwnerAt?: string

  recipientEmail: string
  recipientName?: string
  recipientOrganizationName?: string
  recipientSubtype: InvitationRecipientSubtype

  requestedScopes: AccessScope[]
  approvedDays: number
  purpose: string

  acceptedByUid?: string
  acceptedByOrganizationId?: string
  accessGrantId?: string

  tokenExpiresAt: string
  accessExpiresAt?: string
  createdAt: string
  updatedAt: string
}

// Scopes de acceso disponibles
export type AccessScope =
  | "profile_basic"
  | "accounting_summary"
  | "balance_sheets"
  | "income_statements"
  | "tax_documents"
  | "assets"
  | "liabilities"
  | "documents"
  | "full_credit_folder"

// Estado de solicitud de acceso
export type AccessRequestStatus =
  | "draft"
  | "requested"
  | "approved"
  | "rejected"
  | "revoked"
  | "expired"

// Alcance del target del acceso
export type AccessTargetScope = "single_organization" | "group"

// Solicitud de acceso (colección: access_requests)
export interface AccessRequest {
  id: string
  // Campo canónico nuevo — ID en organizations (system_user o system_user_entity)
  targetOrganizationId: string
  targetScope: AccessTargetScope  // single_organization = solo esa org, group = system_user y todas sus hijas
  requesterOrganizationId: string
  requestedScopes: AccessScope[]
  purpose: string
  requestedDays: number           // días de acceso solicitados por la entidad
  approvedDays?: number           // días aprobados por el usuario (puede diferir de requestedDays)
  status: AccessRequestStatus
  decidedBy?: string
  decidedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Grant de acceso (colección: access_grants)
export interface AccessGrant {
  id: string
  targetOrganizationId: string    // ID en organizations
  targetScope: AccessTargetScope
  // Snapshot de orgs incluidas si targetScope === "group" (se guarda al aprobar)
  includedOrganizationIds?: string[]
  accessRequestId: string
  grantedToOrganizationId: string
  allowedScopes: AccessScope[]
  purpose: string
  startsAt: string
  expiresAt: string               // calculado server-side: startsAt + approvedDays
  status: AccessRequestStatus
  grantedBy: string
  revokedBy?: string
  revokedAt?: string
  createdAt: string
  updatedAt: string
}
