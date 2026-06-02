import type { FinancialStatementOCRProvider, FinancialStatementOCRExtractionResult, FinancialStatementOCRHints } from "./FinancialStatementOCRProvider"
import { DEFAULT_BALANCE_SHEET_DETAILS, DEFAULT_INCOME_STATEMENT_DETAILS } from "@/lib/accounting/statement-fields"

export class MockFinancialStatementOCRProvider implements FinancialStatementOCRProvider {
  async extract(
    _buffer: Buffer,
    _mimeType: string,
    hints?: FinancialStatementOCRHints,
  ): Promise<FinancialStatementOCRExtractionResult> {
    const start = Date.now()

    const balanceResult = {
      details: {
        ...DEFAULT_BALANCE_SHEET_DETAILS,
        currentAssets: {
          cashAndBanks: 1_250_000,
          temporaryInvestments: 500_000,
          tradeReceivables: 3_200_000,
          otherReceivables: 450_000,
          inventories: 8_750_000,
          otherAssets: 0,
        },
        nonCurrentAssets: {
          tradeReceivables: 0,
          otherReceivables: 0,
          inventories: 0,
          investments: 1_200_000,
          propertyPlantEquipment: 18_500_000,
          investmentProperties: 0,
          intangibleAssets: 0,
          biologicalAssets: 4_300_000,
          otherAssets: 0,
        },
        currentLiabilities: {
          commercialDebts: 2_100_000,
          loans: 3_500_000,
          salariesAndSocialCharges: 280_000,
          taxLiabilities: 420_000,
          customerAdvances: 0,
          dividendsPayable: 0,
          otherDebts: 0,
          provisions: 0,
        },
        nonCurrentLiabilities: {
          commercialDebts: 0,
          loans: 5_200_000,
          salariesAndSocialCharges: 0,
          taxLiabilities: 0,
          customerAdvances: 0,
          dividendsPayable: 0,
          otherDebts: 0,
          provisions: 0,
        },
      },
      equityTotal: 16_650_000,
      currency: "ARS" as const,
    }

    const incomeResult = {
      details: {
        ...DEFAULT_INCOME_STATEMENT_DETAILS,
        netSales: 42_800_000,
        costOfGoodsSold: -28_500_000,
        inventoryValuationResult: 1_200_000,
        sellingExpenses: -2_100_000,
        administrativeExpenses: -1_800_000,
        otherExpenses: 0,
        relatedInvestmentResults: 0,
        otherInvestmentResults: 0,
        financialResultsGeneratedByAssets: 180_000,
        financialResultsGeneratedByLiabilities: -650_000,
        otherIncomeAndExpenses: 0,
        incomeTax: -2_200_000,
        discontinuedOperationsResult: 0,
        discontinuedDisposalResult: 0,
        extraordinaryResults: 0,
        minorityInterest: 0,
        netResult: 8_930_000,
      },
      currency: "ARS" as const,
    }

    const fieldConfidence: Record<string, { confidence: number; source: "ai" }> = {}
    // Algunos campos con confianza alta, uno bajo para testear warnings
    const balanceFields = ["currentAssets.cashAndBanks", "currentAssets.inventories", "nonCurrentAssets.propertyPlantEquipment", "equityTotal"]
    for (const f of balanceFields) {
      fieldConfidence[f] = { confidence: 0.88, source: "ai" }
    }
    fieldConfidence["nonCurrentAssets.biologicalAssets"] = { confidence: 0.45, source: "ai" }

    return {
      provider: "mock",
      durationMs: Date.now() - start,
      overallConfidence: 0.82,
      balanceResult: hints?.kind !== "income_statement" ? balanceResult : undefined,
      incomeResult: hints?.kind !== "balance_sheet" ? incomeResult : undefined,
      fieldConfidence,
      warnings: ["Campo 'Activos biológicos' con baja confianza — revisar antes de aplicar"],
    }
  }
}
