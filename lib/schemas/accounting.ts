import { z } from "zod"

const PERIOD_TYPES = ["fiscal_year", "campaign", "semester", "quarter"] as const

const CURRENCIES = ["ARS", "USD"] as const

const VALIDATION_STATUSES = [
  "draft",
  "pending_review",
  "validated",
  "observed",
  "rejected",
] as const

const TAX_DOCUMENT_TYPES = [
  "iva_monthly",
  "income_tax_annual",
  "income_tax_advance",
  "social_security",
  "gross_income",
  "other",
] as const

const amountSchema = z.number()

const currentAssetDetailsSchema = z.object({
  cashAndBanks: amountSchema,
  temporaryInvestments: amountSchema,
  tradeReceivables: amountSchema,
  otherReceivables: amountSchema,
  inventories: amountSchema,
  otherAssets: amountSchema,
})

const nonCurrentAssetDetailsSchema = z.object({
  tradeReceivables: amountSchema,
  otherReceivables: amountSchema,
  inventories: amountSchema,
  investments: amountSchema,
  propertyPlantEquipment: amountSchema,
  investmentProperties: amountSchema,
  intangibleAssets: amountSchema,
  biologicalAssets: amountSchema,
  otherAssets: amountSchema,
})

const liabilityDetailsSchema = z.object({
  commercialDebts: amountSchema,
  loans: amountSchema,
  salariesAndSocialCharges: amountSchema,
  taxLiabilities: amountSchema,
  customerAdvances: amountSchema,
  dividendsPayable: amountSchema,
  otherDebts: amountSchema,
  provisions: amountSchema,
})

export const balanceSheetDetailsSchema = z.object({
  currentAssets: currentAssetDetailsSchema,
  nonCurrentAssets: nonCurrentAssetDetailsSchema,
  currentLiabilities: liabilityDetailsSchema,
  nonCurrentLiabilities: liabilityDetailsSchema,
})

export const incomeStatementDetailsSchema = z.object({
  netSales: amountSchema,
  costOfGoodsSold: amountSchema,
  inventoryValuationResult: amountSchema,
  sellingExpenses: amountSchema,
  administrativeExpenses: amountSchema,
  otherExpenses: amountSchema,
  relatedInvestmentResults: amountSchema,
  otherInvestmentResults: amountSchema,
  financialResultsGeneratedByAssets: amountSchema,
  financialResultsGeneratedByLiabilities: amountSchema,
  otherIncomeAndExpenses: amountSchema,
  incomeTax: amountSchema,
  discontinuedOperationsResult: amountSchema,
  discontinuedDisposalResult: amountSchema,
  extraordinaryResults: amountSchema,
})

// Schema para crear un período contable
export const createAccountingPeriodSchema = z.object({
  producerId: z.string().min(1, "El ID del productor es requerido"),
  organizationId: z.string().min(1, "El ID de organización es requerido"),
  year: z
    .number()
    .int("El año debe ser un entero")
    .min(1900, "Año no válido")
    .max(2100, "Año no válido"),
  periodType: z.enum(PERIOD_TYPES),
  label: z.string().min(1, "La etiqueta del período es requerida").max(100),
})

export type CreateAccountingPeriodInput = z.infer<typeof createAccountingPeriodSchema>

// Schema para crear un balance general
export const createBalanceSheetSchema = z.object({
  producerId: z.string().min(1, "El ID del productor es requerido"),
  organizationId: z.string().min(1, "El ID de organización es requerido"),
  periodId: z.string().min(1, "El ID del período es requerido"),
  details: balanceSheetDetailsSchema,
  assetsTotal: z.number().min(0, "El total de activos no puede ser negativo"),
  liabilitiesTotal: z.number().min(0, "El total de pasivos no puede ser negativo"),
  equityTotal: z.number(),
  currency: z.enum(CURRENCIES),
  observations: z.string().max(1000).optional(),
  documentIds: z.array(z.string()).default([]),
})

export type CreateBalanceSheetInput = z.infer<typeof createBalanceSheetSchema>

// Schema para actualizar un balance general
export const updateBalanceSheetSchema = z.object({
  details: balanceSheetDetailsSchema.optional(),
  assetsTotal: z.number().min(0, "El total de activos no puede ser negativo").optional(),
  liabilitiesTotal: z.number().min(0, "El total de pasivos no puede ser negativo").optional(),
  equityTotal: z.number().optional(),
  currency: z.enum(CURRENCIES).optional(),
  validationStatus: z.enum(VALIDATION_STATUSES).optional(),
  observations: z.string().max(1000).optional(),
  documentIds: z.array(z.string()).optional(),
})

export type UpdateBalanceSheetInput = z.infer<typeof updateBalanceSheetSchema>

// Schema para crear un estado de resultados
export const createIncomeStatementSchema = z.object({
  producerId: z.string().min(1, "El ID del productor es requerido"),
  organizationId: z.string().min(1, "El ID de organización es requerido"),
  periodId: z.string().min(1, "El ID del período es requerido"),
  details: incomeStatementDetailsSchema,
  sales: z.number().min(0, "Las ventas no pueden ser negativas"),
  grossResult: z.number(),
  netResult: z.number(),
  currency: z.enum(CURRENCIES),
  observations: z.string().max(1000).optional(),
  documentIds: z.array(z.string()).default([]),
})

export type CreateIncomeStatementInput = z.infer<typeof createIncomeStatementSchema>

// Schema para crear un documento fiscal
export const createTaxDocumentSchema = z.object({
  producerId: z.string().min(1, "El ID del productor es requerido"),
  organizationId: z.string().min(1, "El ID de organización es requerido"),
  periodId: z.string().min(1, "El ID del período es requerido"),
  taxType: z.enum(TAX_DOCUMENT_TYPES),
  fiscalPeriod: z
    .string()
    .min(1, "El período fiscal es requerido")
    .max(20, "Formato de período fiscal no válido"),
  amount: z.number().min(0, "El importe no puede ser negativo"),
  currency: z.enum(CURRENCIES),
  observations: z.string().max(1000).optional(),
  documentIds: z.array(z.string()).default([]),
})

export type CreateTaxDocumentInput = z.infer<typeof createTaxDocumentSchema>
