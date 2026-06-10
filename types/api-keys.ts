export const API_KEY_SCOPES = [
  "producers:read",
  "producers:write",
  "credit_folders:read",
  "credit_folders:write",
  "documents:read",
  "documents:write",
  "financials:read",
  "financials:write",
] as const

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number]

export interface ApiKey {
  id: string
  organizationId: string
  name: string
  keyHash: string
  scopes: ApiKeyScope[]
  status: "active" | "revoked"
  lastUsedAt: string | null
  expiresAt: string | null
  createdBy: string
  createdAt: string
  revokedAt: string | null
  revokedBy: string | null
}

export interface ApiKeyPublic extends Omit<ApiKey, "keyHash"> {}
