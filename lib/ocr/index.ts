import type { FinancialStatementOCRProvider } from "./FinancialStatementOCRProvider"

export function getFinancialStatementOCRProvider(): FinancialStatementOCRProvider {
  if (process.env.ANTHROPIC_API_KEY) {
    const { ClaudeFinancialStatementProvider } = require("./ClaudeFinancialStatementProvider")
    return new ClaudeFinancialStatementProvider()
  }

  console.warn("[OCR] ANTHROPIC_API_KEY no configurada — usando MockFinancialStatementOCRProvider")
  const { MockFinancialStatementOCRProvider } = require("./MockFinancialStatementOCRProvider")
  return new MockFinancialStatementOCRProvider()
}

export type { FinancialStatementOCRProvider, FinancialStatementOCRExtractionResult } from "./FinancialStatementOCRProvider"
