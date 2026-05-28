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

// Solicitud de acceso (colección: access_requests)
export interface AccessRequest {
  id: string
  producerId: string
  requesterOrganizationId: string
  requestedScopes: AccessScope[]
  purpose: string
  requestedExpirationDays: number
  status: AccessRequestStatus
  decidedBy?: string // uid del productor que decidió
  decidedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Grant de acceso (colección: access_grants)
export interface AccessGrant {
  id: string
  producerId: string
  accessRequestId: string
  grantedToOrganizationId: string
  allowedScopes: AccessScope[]
  purpose: string
  startsAt: string
  expiresAt: string
  status: AccessRequestStatus
  grantedBy: string // uid del productor
  revokedBy?: string
  revokedAt?: string
  createdAt: string
  updatedAt: string
}
