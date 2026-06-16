import { z } from "zod"

// ─── Enums cerrados (deben coincidir con types/credito-hub.ts) ────────────────

export const JOB_STATUSES = [
  "queued",
  "preprocessing",
  "classifying",
  "extracting",
  "validating",
  "awaiting_review",
  "completed",
  "failed",
  "partially_completed",
  "stalled",
] as const

export const ENCRYPTION_STATUSES = ["plaintext", "encrypted"] as const

export const EXTRACTION_METHODS = [
  "NATIVE_TEXT",
  "OCR",
  "TABLE_EXTRACTION",
  "VISION_MODEL",
  "MANUAL",
] as const

export const FIELD_REVIEW_STATUSES = ["PENDING", "CONFIRMED", "CORRECTED", "REJECTED"] as const

export const CANONICAL_PROFILE_VALIDATION_STATES = [
  "incomplete",
  "in_review",
  "validated",
] as const

export const CREDIT_APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "awaiting_documents",
  "approved",
  "rejected",
  "expired",
] as const

// ─── Helpers reutilizables ────────────────────────────────────────────────────

// CUIT argentino: exactamente 11 dígitos.
const cuitSchema = z
  .string()
  .regex(/^\d{11}$/, "El CUIT debe tener exactamente 11 dígitos")

const confidenceSchema = z
  .number()
  .min(0, "confidence mínimo 0")
  .max(1, "confidence máximo 1")

// ─── DocumentJob ──────────────────────────────────────────────────────────────
// folderOwnerOrganizationId / createdByOrganizationId se derivan server-side
// (NUNCA del body). Por eso no entran en el schema create.

export const createDocumentJobSchema = z.object({
  documentId: z.string().min(1, "documentId requerido"),
  provider: z.string().min(1, "provider requerido"),
  fileHash: z.string().min(1, "fileHash requerido"),
  encryptionStatus: z.enum(ENCRYPTION_STATUSES).default("plaintext"),
  maxAttempts: z.number().int().min(1).max(10).default(3),
})

export type CreateDocumentJobInput = z.infer<typeof createDocumentJobSchema>

export const updateDocumentJobSchema = z
  .object({
    status: z.enum(JOB_STATUSES),
    attempts: z.number().int().min(0),
    claimedBy: z.string().nullable(),
    claimedAt: z.string().nullable(),
    leaseExpiresAt: z.string().nullable(),
    error: z.string().nullable(),
  })
  .partial()

export type UpdateDocumentJobInput = z.infer<typeof updateDocumentJobSchema>

// ─── DocumentClassification ───────────────────────────────────────────────────

export const createDocumentClassificationSchema = z.object({
  documentId: z.string().min(1, "documentId requerido"),
  documentType: z.string().min(1, "documentType requerido"),
  subtype: z.string().optional(),
  cuit: cuitSchema.optional(),
  period: z.string().optional(),
  issueDate: z.string().optional(),
  expiryDate: z.string().optional(),
  issuer: z.string().optional(),
  confidence: confidenceSchema,
  needsReview: z.boolean().default(false),
})

export type CreateDocumentClassificationInput = z.infer<
  typeof createDocumentClassificationSchema
>

export const updateDocumentClassificationSchema = createDocumentClassificationSchema
  .partial()
  .omit({ documentId: true })

export type UpdateDocumentClassificationInput = z.infer<
  typeof updateDocumentClassificationSchema
>

// ─── ExtractedField (procedencia obligatoria) ─────────────────────────────────

const boundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

export const createExtractedFieldSchema = z.object({
  documentId: z.string().min(1, "documentId requerido"),
  documentVersionId: z.string().nullable().default(null),
  pageNumber: z.number().int().min(0).nullable(),
  fieldCode: z.string().min(1, "fieldCode requerido"),
  rawLabel: z.string().nullable(),
  rawValue: z.string().nullable(),
  normalizedValue: z.unknown().nullable(),
  currency: z.string().nullable(),
  unit: z.string().nullable(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  boundingBox: boundingBoxSchema.nullable(),
  confidence: confidenceSchema,
  extractionMethod: z.enum(EXTRACTION_METHODS),
})

export type CreateExtractedFieldInput = z.infer<typeof createExtractedFieldSchema>

// Revisión humana de un campo extraído.
export const reviewExtractedFieldSchema = z.object({
  reviewStatus: z.enum(FIELD_REVIEW_STATUSES),
  normalizedValue: z.unknown().nullable().optional(),
  correctionReason: z.string().nullable().optional(),
})

export type ReviewExtractedFieldInput = z.infer<typeof reviewExtractedFieldSchema>

// ─── CanonicalCreditProfile ───────────────────────────────────────────────────

const fieldRefsSchema = z.object({
  fieldIds: z.array(z.string()).default([]),
})

export const createCanonicalCreditProfileSchema = z.object({
  identity: z.object({
    cuit: cuitSchema,
    legalName: z.string().min(1, "legalName requerido"),
    activity: z.string().optional(),
  }),
  economic: fieldRefsSchema.default({ fieldIds: [] }),
  financial: fieldRefsSchema.default({ fieldIds: [] }),
  fiscal: fieldRefsSchema.default({ fieldIds: [] }),
  patrimonial: fieldRefsSchema.default({ fieldIds: [] }),
  validationState: z.enum(CANONICAL_PROFILE_VALIDATION_STATES).default("incomplete"),
})

export type CreateCanonicalCreditProfileInput = z.infer<
  typeof createCanonicalCreditProfileSchema
>

export const updateCanonicalCreditProfileSchema = z
  .object({
    identity: z.object({
      cuit: cuitSchema,
      legalName: z.string().min(1, "legalName requerido"),
      activity: z.string().optional(),
    }),
    economic: fieldRefsSchema,
    financial: fieldRefsSchema,
    fiscal: fieldRefsSchema,
    patrimonial: fieldRefsSchema,
    validationState: z.enum(CANONICAL_PROFILE_VALIDATION_STATES),
  })
  .partial()

export type UpdateCanonicalCreditProfileInput = z.infer<
  typeof updateCanonicalCreditProfileSchema
>

// ─── CreditApplication ────────────────────────────────────────────────────────
// requestingEntityOrganizationId es el banco; folderOwnerOrganizationId se deriva
// server-side desde assertCanManageAccountingFolder. No se acepta del body.

export const createCreditApplicationSchema = z.object({
  requestingEntityOrganizationId: z
    .string()
    .min(1, "requestingEntityOrganizationId requerido"),
  requirementTemplateId: z.string().min(1, "requirementTemplateId requerido"),
  status: z.enum(CREDIT_APPLICATION_STATUSES).default("draft"),
  requestedAmount: z.number().positive("El monto debe ser mayor a 0").optional(),
  productName: z.string().optional(),
})

export type CreateCreditApplicationInput = z.infer<
  typeof createCreditApplicationSchema
>

export const updateCreditApplicationSchema = z
  .object({
    status: z.enum(CREDIT_APPLICATION_STATUSES),
    requestedAmount: z.number().positive("El monto debe ser mayor a 0"),
    productName: z.string(),
  })
  .partial()

export type UpdateCreditApplicationInput = z.infer<
  typeof updateCreditApplicationSchema
>
