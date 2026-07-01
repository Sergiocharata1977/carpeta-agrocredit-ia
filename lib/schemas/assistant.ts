// Zod schemas para validación de asistente conversacional
import { z } from "zod"

// ─── CUIT Argentino (11 dígitos) ───────────────────────────────────────────────
const cuitSchema = z
  .string()
  .regex(/^\d{11}$/, "CUIT debe tener 11 dígitos")
  .optional()
  .nullable()

// ─── UUID / operationId ────────────────────────────────────────────────────────
const operationIdSchema = z.string().min(1).max(255)

// ─── Timestamp ISO ────────────────────────────────────────────────────────────
const isoDateSchema = z.string().datetime()

// ─── Confidence (0-1) ─────────────────────────────────────────────────────────
const confidenceSchema = z.number().min(0).max(1)

// ─── Nombres de entidades (3-160 caracteres) ──────────────────────────────────
const entityNameSchema = z.string().min(3).max(160)

// ─────────────────────────────────────────────────────────────────────────────

// Schema para ParsedUserIntent
export const parsedUserIntentSchema = z.object({
  intent: z.string().min(1),
  targetAccountSearch: z.string().optional(),
  targetCompanySearch: z.string().optional(),
  action: z.string().min(1),
  modifiers: z.record(z.unknown()).optional(),
})

export type ParsedUserIntentType = z.infer<typeof parsedUserIntentSchema>

// ─────────────────────────────────────────────────────────────────────────────

// Schema para ExtractedField
export const extractedFieldSchema = z.object({
  fieldCode: z.string().min(1),
  fieldLabel: z.string().optional(),
  rawValue: z.string().nullable().optional(),
  normalizedValue: z.unknown().optional(),
  confidence: confidenceSchema,
  pageNumber: z.number().int().positive().nullable().optional(),
  extractionMethod: z.string().optional(),
  reviewStatus: z.string().optional(),
  observation: z.string().optional(),
})

export type ExtractedFieldType = z.infer<typeof extractedFieldSchema>

// ─────────────────────────────────────────────────────────────────────────────

// Schema para ExtractedDocumentData
export const extractedDocumentDataSchema = z.object({
  documentId: z.string().min(1),
  documentType: z.string().min(1),
  fileName: z.string().optional(),
  issuer: z.string().optional(),
  company: z
    .object({
      name: z.string().optional(),
      cuit: cuitSchema,
    })
    .optional(),
  period: z
    .object({
      start: isoDateSchema.optional(),
      end: isoDateSchema.optional(),
    })
    .optional(),
  issueDate: isoDateSchema.optional(),
  confidence: confidenceSchema,
  fields: z.array(extractedFieldSchema),
  summary: z.string().optional(),
})

export type ExtractedDocumentDataType = z.infer<typeof extractedDocumentDataSchema>

// ─────────────────────────────────────────────────────────────────────────────

// Schema para EntityCandidate
export const entityCandidateSchema = z.object({
  id: z.string().min(1),
  name: entityNameSchema,
  taxId: z.string().min(1),
  confidence: confidenceSchema,
})

export type EntityCandidateType = z.infer<typeof entityCandidateSchema>

// ─────────────────────────────────────────────────────────────────────────────

// Schema para ResolvedEntity
export const resolvedEntitySchema = z.object({
  type: z.enum(["accounting_firm", "root_client", "related_company"]),
  id: z.string().optional(),
  name: entityNameSchema,
  taxId: cuitSchema,
  parentOrganizationId: z.string().optional(),
  status: z.enum(["found_exact", "found_multiple", "not_found", "new_to_create"]),
  candidates: z.array(entityCandidateSchema).optional(),
})

export type ResolvedEntityType = z.infer<typeof resolvedEntitySchema>

// ─────────────────────────────────────────────────────────────────────────────

// Schema para PendingAction
const importActionSchema = z.enum([
  "create_related_company",
  "associate_related_company",
  "load_balance",
  "link_document",
  "update_canonical_profile",
])

export const pendingActionSchema = z.object({
  actionId: z.string().min(1),
  type: importActionSchema,
  targetEntityId: z.string().optional(),
  targetEntityType: z.enum(["accounting_firm", "root_client", "related_company", "document", "canonical_profile"]).optional(),
  targetEntityName: entityNameSchema,
  payload: z.record(z.unknown()),
  requiresApproval: z.boolean(),
})

export type PendingActionType = z.infer<typeof pendingActionSchema>

// ─────────────────────────────────────────────────────────────────────────────

// Schema para PendingImportOperation
export const pendingImportOperationSchema = z.object({
  operationId: operationIdSchema,
  folderOwnerOrganizationId: z.string().min(1),
  accountingFirmId: z.string().optional().nullable(),
  documentId: z.string().min(1),
  actions: z.array(pendingActionSchema),
  preparedAt: isoDateSchema,
  expiresAt: isoDateSchema,
  preparedByUid: z.string().min(1),
  preparedByOrganizationId: z.string().min(1),
  confirmedAt: isoDateSchema.optional(),
  confirmedByUid: z.string().optional(),
  canceledAt: isoDateSchema.optional(),
  executedAt: isoDateSchema.optional(),
  status: z.enum(["prepared", "confirmed", "executed", "canceled", "expired"]),
})

export type PendingImportOperationType = z.infer<typeof pendingImportOperationSchema>

// ─────────────────────────────────────────────────────────────────────────────

// Schemas para request/response bodies

export const prepareImportRequestSchema = z.object({
  documentId: z.string().min(1),
  userIntent: parsedUserIntentSchema,
  resolvedEntities: z
    .object({
      relatedCompany: resolvedEntitySchema.optional(),
      accountingFirm: resolvedEntitySchema.optional(),
      rootClient: resolvedEntitySchema.optional(),
    })
    .optional(),
})

export type PrepareImportRequestType = z.infer<typeof prepareImportRequestSchema>

export const confirmImportRequestSchema = z.object({
  operationId: operationIdSchema,
  confirmedAt: isoDateSchema.optional(),
})

export type ConfirmImportRequestType = z.infer<typeof confirmImportRequestSchema>

export const executeImportRequestSchema = z.object({
  operationId: operationIdSchema,
})

export type ExecuteImportRequestType = z.infer<typeof executeImportRequestSchema>

export const cancelImportRequestSchema = z.object({
  operationId: operationIdSchema,
  reason: z.string().optional(),
})

export type CancelImportRequestType = z.infer<typeof cancelImportRequestSchema>
