import type { ExtractedBalance, ExtractedIncomeStatement, StatementImportKind } from "@/types/statement-imports"

export interface FinancialStatementOCRExtractionResult {
  provider: string
  durationMs: number
  overallConfidence: number             // 0.0 a 1.0
  rawText?: string
  balanceResult?: ExtractedBalance
  incomeResult?: ExtractedIncomeStatement
  fieldConfidence: Record<string, { confidence: number; source: "ocr" | "ai" | "excel" | "manual" }>
  warnings: string[]
}

export interface FinancialStatementOCRHints {
  kind?: StatementImportKind
  fileName?: string
}

export interface FinancialStatementOCRProvider {
  extract(
    buffer: Buffer,
    mimeType: string,
    hints?: FinancialStatementOCRHints,
  ): Promise<FinancialStatementOCRExtractionResult>
}
