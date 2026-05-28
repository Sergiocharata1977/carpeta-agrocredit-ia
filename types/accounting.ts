// Estado de validación de un período o documento contable
export type ValidationStatus =
  | "draft"
  | "pending_review"
  | "validated"
  | "observed"
  | "rejected"

// Tipo de período
export type PeriodType = "fiscal_year" | "campaign" | "semester" | "quarter"

// Estado del período
export type PeriodStatus = "open" | "closed" | "archived"

// Período fiscal/campaña (colección: accounting_periods)
export interface AccountingPeriod {
  id: string
  producerId: string
  organizationId: string
  year: number
  periodType: PeriodType
  label: string // ej: "2024", "Campaña 2023/2024"
  status: PeriodStatus
  closedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Balance general (colección: balance_sheets)
export interface BalanceSheet {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  assetsTotal: number
  liabilitiesTotal: number
  equityTotal: number
  currency: "ARS" | "USD"
  validationStatus: ValidationStatus
  observations?: string
  documentIds: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Estado de resultados (colección: income_statements)
export interface IncomeStatement {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  sales: number
  grossResult: number
  netResult: number
  currency: "ARS" | "USD"
  validationStatus: ValidationStatus
  observations?: string
  documentIds: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Tipo de documento fiscal
export type TaxDocumentType =
  | "iva_monthly"
  | "income_tax_annual"
  | "income_tax_advance"
  | "social_security" // 931
  | "gross_income"
  | "other"

// Documento fiscal/impositivo (colección: tax_documents)
export interface TaxDocument {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  taxType: TaxDocumentType
  fiscalPeriod: string // ej: "2024-03", "2024"
  amount: number
  currency: "ARS" | "USD"
  validationStatus: ValidationStatus
  observations?: string
  documentIds: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}
