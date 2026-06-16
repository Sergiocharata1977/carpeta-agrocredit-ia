import { z } from "zod"

// ─── Enums cerrados (deben coincidir con types/bank-requirements.ts) ──────────

export const REQUIREMENT_RESPONSIBLE_ROLES = ["CLIENT", "ACCOUNTANT", "BANK"] as const

export const BANK_REQUIREMENT_TEMPLATE_STATUSES = [
  "draft",
  "published",
  "archived",
] as const

export const MATCH_STATUSES = [
  "fulfilled",
  "partial",
  "missing",
  "expired",
  "inconsistent",
  "needs_review",
  "not_applicable",
  "pending_signature",
  "pending_certification",
  "substitutable",
] as const

// ─── BankRequirement (item embebido en el template) ───────────────────────────

export const bankRequirementSchema = z.object({
  requirementCode: z.string().min(1, "requirementCode requerido"),
  name: z.string().min(1, "name requerido"),
  description: z.string(),
  category: z.string().min(1, "category requerida"),
  required: z.boolean(),
  periodCount: z.number().int().min(0).optional(),
  maxAgeMonths: z.number().int().min(0).optional(),
  acceptedFormats: z.array(z.string()).default([]),
  requiresAccountantSignature: z.boolean().optional(),
  requiresCouncilCertification: z.boolean().optional(),
  responsibleRole: z.enum(REQUIREMENT_RESPONSIBLE_ROLES),
  validationRules: z.array(z.string()).default([]),
  sourcePage: z.number().int().min(0).nullable().optional(),
  substitutableBy: z.array(z.string()).optional(),
})

export type BankRequirementInput = z.infer<typeof bankRequirementSchema>

// ─── BankRequirementTemplate ──────────────────────────────────────────────────
// requestingEntityOrganizationId se deriva server-side, no se acepta del body.

export const createBankRequirementTemplateSchema = z.object({
  bankName: z.string().min(1, "bankName requerido"),
  productName: z.string().optional(),
  version: z.number().int().min(1).default(1),
  status: z.enum(BANK_REQUIREMENT_TEMPLATE_STATUSES).default("draft"),
  effectiveFrom: z.string().optional(),
  requirements: z.array(bankRequirementSchema).default([]),
  sourceDocumentId: z.string().optional(),
})

export type CreateBankRequirementTemplateInput = z.infer<
  typeof createBankRequirementTemplateSchema
>

export const updateBankRequirementTemplateSchema = z
  .object({
    bankName: z.string().min(1, "bankName requerido"),
    productName: z.string(),
    version: z.number().int().min(1),
    status: z.enum(BANK_REQUIREMENT_TEMPLATE_STATUSES),
    effectiveFrom: z.string(),
    requirements: z.array(bankRequirementSchema),
    sourceDocumentId: z.string(),
  })
  .partial()

export type UpdateBankRequirementTemplateInput = z.infer<
  typeof updateBankRequirementTemplateSchema
>

// ─── RequirementMatch ─────────────────────────────────────────────────────────

export const createRequirementMatchSchema = z.object({
  creditApplicationId: z.string().min(1, "creditApplicationId requerido"),
  requirementCode: z.string().min(1, "requirementCode requerido"),
  status: z.enum(MATCH_STATUSES),
  matchedDocumentIds: z.array(z.string()).default([]),
  explanation: z.string(),
  responsibleRole: z.enum(REQUIREMENT_RESPONSIBLE_ROLES),
  dueDate: z.string().optional(),
})

export type CreateRequirementMatchInput = z.infer<typeof createRequirementMatchSchema>

export const updateRequirementMatchSchema = z
  .object({
    status: z.enum(MATCH_STATUSES),
    matchedDocumentIds: z.array(z.string()),
    explanation: z.string(),
    responsibleRole: z.enum(REQUIREMENT_RESPONSIBLE_ROLES),
    dueDate: z.string(),
  })
  .partial()

export type UpdateRequirementMatchInput = z.infer<typeof updateRequirementMatchSchema>
