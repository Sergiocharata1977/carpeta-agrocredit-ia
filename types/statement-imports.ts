import type { BalanceSheetDetails, IncomeStatementDetails } from "@/lib/accounting/statement-fields"

export type StatementImportKind = "balance_sheet" | "income_statement" | "combined"

export type StatementImportStatus =
  | "uploaded"
  | "extracted"
  | "reviewed"
  | "applied"
  | "rejected"
  | "failed"

export interface FieldConfidence {
  confidence: number                     // 0.0 a 1.0
  source: "ocr" | "ai" | "excel" | "manual"
}

export interface ExtractedBalance {
  details: BalanceSheetDetails
  equityTotal: number
  currency: "ARS" | "USD"
  previousDetails?: BalanceSheetDetails  // ejercicio anterior si el PDF/Excel lo incluye
  previousEquityTotal?: number
}

export interface ExtractedIncomeStatement {
  details: IncomeStatementDetails
  currency: "ARS" | "USD"
  previousDetails?: IncomeStatementDetails
}

// Convención de claves de fieldConfidence:
// Balance:    "{group}.{field}"  → ej: "currentAssets.cashAndBanks"
// Resultados: "{field}"          → ej: "netSales"
// Patrimonio: "equityTotal"
export interface FinancialStatementImport {
  id: string
  producerId: string                     // organizationId de tipo system_user o system_user_entity
  folderOwnerOrganizationId: string
  accountingFirmId: string | null
  periodId: string
  kind: StatementImportKind
  status: StatementImportStatus
  sourceDocumentId: string
  sourceStoragePath: string
  sourceFileName: string
  sourceMimeType: string
  provider: string                       // "claude-haiku-4-5" | "mock" | "excel"
  overallConfidence: number              // 0.0 a 1.0
  extractedBalance?: ExtractedBalance
  extractedIncomeStatement?: ExtractedIncomeStatement
  fieldConfidence: Record<string, FieldConfidence>
  warnings: string[]
  rawText?: string
  appliedBalanceSheetId?: string
  appliedIncomeStatementId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}
