// Tipos canónicos de CreditoHub — Ola 1 / Agente B
// Reglas (docs/credito-hub/000-ola0-decisiones.md sección 1):
//   - Partition key del legajo = folderOwnerOrganizationId
//   - Estudio contable = accountingFirmId
//   - Banco / entidad solicitante = requestingEntityOrganizationId
//   - PROHIBIDO usar producerId / clientId en colecciones nuevas.
// ExtractedField NUNCA guarda un valor sin procedencia (documento + página + método + confianza).

// ─── Jobs de procesamiento de documentos ─────────────────────────────────────

export type JobStatus =
  | "queued"
  | "preprocessing"
  | "classifying"
  | "extracting"
  | "validating"
  | "awaiting_review"
  | "completed"
  | "failed"
  | "partially_completed"
  | "stalled"

export type EncryptionStatus = "plaintext" | "encrypted"

// Colección: document_jobs
export interface DocumentJob {
  id: string
  folderOwnerOrganizationId: string
  accountingFirmId: string | null
  documentId: string
  fileName?: string | null
  status: JobStatus
  attempts: number
  maxAttempts: number
  // Lease anti-stalled (ver decisiones sección 4)
  claimedBy?: string | null
  claimedAt?: string | null
  leaseExpiresAt?: string | null
  provider: string
  error?: string | null
  statusMessage?: string | null
  fileHash: string
  encryptionStatus: EncryptionStatus
  createdBy: string
  createdByOrganizationId: string
  createdAt: string
  updatedAt: string
}

// ─── Clasificación de documentos ──────────────────────────────────────────────

// Colección: document_classifications
export interface DocumentClassification {
  id: string
  documentId: string
  folderOwnerOrganizationId: string
  documentType: string
  subtype?: string
  cuit?: string
  period?: string
  issueDate?: string
  expiryDate?: string
  issuer?: string
  confidence: number // 0.0 a 1.0
  needsReview: boolean
  createdAt: string
}

// ─── Campos extraídos (con procedencia obligatoria) ───────────────────────────

export type ExtractionMethod =
  | "NATIVE_TEXT"
  | "OCR"
  | "TABLE_EXTRACTION"
  | "VISION_MODEL"
  | "MANUAL"

export type FieldReviewStatus = "PENDING" | "CONFIRMED" | "CORRECTED" | "REJECTED"

export interface FieldBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// Colección: extracted_fields
export interface ExtractedField<T = unknown> {
  id: string
  folderOwnerOrganizationId: string
  documentId: string
  documentVersionId?: string | null
  pageNumber: number | null
  fieldCode: string
  rawLabel: string | null
  rawValue: string | null
  normalizedValue: T | null
  currency: string | null
  unit: string | null
  periodStart: string | null
  periodEnd: string | null
  boundingBox: FieldBoundingBox | null
  confidence: number // 0.0 a 1.0
  extractionMethod: ExtractionMethod
  reviewStatus: FieldReviewStatus
  reviewedBy: string | null
  reviewedAt: string | null
  correctionReason: string | null
  createdAt: string
}

// ─── Perfil crediticio canónico ───────────────────────────────────────────────
// Los bloques económico/financiero/fiscal/patrimonial REFERENCIAN fieldIds
// (ids de ExtractedField), nunca valores sueltos. Esto preserva procedencia.

export type CanonicalProfileValidationState = "incomplete" | "in_review" | "validated"

export interface CanonicalProfileIdentity {
  cuit: string
  legalName: string
  activity?: string
}

// Colección: canonical_credit_profiles
export interface CanonicalCreditProfile {
  id: string
  folderOwnerOrganizationId: string
  identity: CanonicalProfileIdentity
  economic: { fieldIds: string[] }
  financial: { fieldIds: string[] }
  fiscal: { fieldIds: string[] }
  patrimonial: { fieldIds: string[] }
  validationState: CanonicalProfileValidationState
  version: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

// ─── Solicitud de crédito ─────────────────────────────────────────────────────
// Une cliente (legajo), banco, template de requisitos y matches.
// Ver docs/credito-hub/000-ola0-decisiones.md sección 2.

export type CreditApplicationStatus =
  | "draft"
  | "submitted"
  | "in_review"
  | "awaiting_documents"
  | "approved"
  | "rejected"
  | "expired"

// Colección: credit_applications
export interface CreditApplication {
  id: string
  folderOwnerOrganizationId: string // legajo del cliente
  requestingEntityOrganizationId: string // banco / entidad
  requirementTemplateId: string // template publicado a evaluar
  status: CreditApplicationStatus
  requestedAmount?: number
  productName?: string
  createdBy: string
  createdByOrganizationId: string
  createdAt: string
  updatedAt: string
}
