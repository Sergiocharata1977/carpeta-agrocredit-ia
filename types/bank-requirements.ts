// Tipos canónicos de requisitos bancarios — Ola 1 / Agente B
// Banco / entidad solicitante = requestingEntityOrganizationId (nombre canónico).
// PROHIBIDO usar producerId / clientId / bankId.

export type RequirementResponsibleRole = "CLIENT" | "ACCOUNTANT" | "BANK"

// Un requisito individual dentro de un template bancario.
export interface BankRequirement {
  requirementCode: string
  name: string
  description: string
  category: string
  required: boolean
  periodCount?: number
  maxAgeMonths?: number
  acceptedFormats: string[]
  requiresAccountantSignature?: boolean
  requiresCouncilCertification?: boolean
  responsibleRole: RequirementResponsibleRole
  validationRules: string[]
  sourcePage?: number | null
  substitutableBy?: string[]
}

export type BankRequirementTemplateStatus = "draft" | "published" | "archived"

// Colección: bank_requirement_templates
export interface BankRequirementTemplate {
  id: string
  requestingEntityOrganizationId: string // banco / entidad solicitante
  bankName: string
  productName?: string
  version: number
  status: BankRequirementTemplateStatus
  effectiveFrom?: string
  requirements: BankRequirement[]
  sourceDocumentId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ─── Matching de requisitos contra una solicitud de crédito ───────────────────

export type MatchStatus =
  | "fulfilled"
  | "partial"
  | "missing"
  | "expired"
  | "inconsistent"
  | "needs_review"
  | "not_applicable"
  | "pending_signature"
  | "pending_certification"
  | "substitutable"

// Colección: requirement_matches
export interface RequirementMatch {
  id: string
  creditApplicationId: string // referencia a CreditApplication
  requirementCode: string
  status: MatchStatus
  matchedDocumentIds: string[]
  explanation: string
  responsibleRole: RequirementResponsibleRole
  dueDate?: string
  createdAt: string
}
