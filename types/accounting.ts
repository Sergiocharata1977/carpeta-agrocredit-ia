import type {
  BalanceSheetDetails,
  IncomeStatementDetails,
} from "@/lib/accounting/statement-fields"

// Estado de validacion de un periodo o documento contable
export type ValidationStatus =
  | "draft"
  | "pending_review"
  | "validated"
  | "observed"
  | "rejected"

// Tipo de periodo
export type PeriodType = "fiscal_year" | "campaign" | "semester" | "quarter"

// Estado del periodo
export type PeriodStatus = "open" | "closed" | "archived"

// Periodo fiscal/campana (coleccion: accounting_periods)
export interface AccountingPeriod {
  id: string
  producerId: string
  organizationId: string
  year: number
  periodType: PeriodType
  label: string
  status: PeriodStatus
  closedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Balance general / estado de situacion patrimonial (coleccion: balance_sheets)
export interface BalanceSheet {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  details?: BalanceSheetDetails
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

// Estado de resultados (coleccion: income_statements)
export interface IncomeStatement {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  details?: IncomeStatementDetails
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
  | "social_security"
  | "gross_income"
  | "other"

// Documento fiscal/impositivo (coleccion: tax_documents)
export interface TaxDocument {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  taxType: TaxDocumentType
  fiscalPeriod: string
  amount: number
  currency: "ARS" | "USD"
  validationStatus: ValidationStatus
  observations?: string
  documentIds: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}
