import Anthropic from "@anthropic-ai/sdk"
import type {
  FinancialStatementOCRProvider,
  FinancialStatementOCRExtractionResult,
  FinancialStatementOCRHints,
} from "./FinancialStatementOCRProvider"
import type { BalanceSheetDetails, IncomeStatementDetails } from "@/lib/accounting/statement-fields"
import { DEFAULT_BALANCE_SHEET_DETAILS, DEFAULT_INCOME_STATEMENT_DETAILS } from "@/lib/accounting/statement-fields"

const SYSTEM_PROMPT = `Sos un asistente especializado en contabilidad argentina. Tu tarea es extraer datos financieros de PDFs e imágenes de Estados Contables y devolver un JSON estructurado.

Los campos del Balance General (Estado de Situación Patrimonial) en inglés:
- currentAssets: cashAndBanks, temporaryInvestments, tradeReceivables, otherReceivables, inventories, otherAssets
- nonCurrentAssets: tradeReceivables, otherReceivables, inventories, investments, propertyPlantEquipment, investmentProperties, intangibleAssets, biologicalAssets, otherAssets
- currentLiabilities: commercialDebts, loans, salariesAndSocialCharges, taxLiabilities, customerAdvances, dividendsPayable, otherDebts, provisions
- nonCurrentLiabilities: (mismos campos que currentLiabilities)
- equityTotal: total de patrimonio neto

Los campos del Estado de Resultados en inglés:
- netSales, costOfGoodsSold, inventoryValuationResult, sellingExpenses, administrativeExpenses, otherExpenses, relatedInvestmentResults, otherInvestmentResults, financialResultsGeneratedByAssets, financialResultsGeneratedByLiabilities, otherIncomeAndExpenses, incomeTax, discontinuedOperationsResult, discontinuedDisposalResult, extraordinaryResults, minorityInterest, netResult

Devuelve SOLO JSON con este formato:
{
  "balance": { "currentAssets": {...}, "nonCurrentAssets": {...}, "currentLiabilities": {...}, "nonCurrentLiabilities": {...}, "equityTotal": number } | null,
  "income": { "netSales": number, ... } | null,
  "previousBalance": { same as balance } | null,
  "previousIncome": { same as income } | null,
  "currency": "ARS" | "USD",
  "fieldConfidence": { "currentAssets.cashAndBanks": 0.95, ... },
  "warnings": ["string", ...]
}

Si no podés extraer un campo con certeza, usá 0 y agregá el campo a warnings. Los gastos (costos, sellingExpenses, etc.) deben ser negativos.`

export class ClaudeFinancialStatementProvider implements FinancialStatementOCRProvider {
  private client: Anthropic
  private model: string

  constructor(model?: string) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.model = model ?? process.env.CLAUDE_MODEL ?? "claude-haiku-4-5"
  }

  async extract(
    buffer: Buffer,
    mimeType: string,
    hints?: FinancialStatementOCRHints,
  ): Promise<FinancialStatementOCRExtractionResult> {
    const start = Date.now()
    const warnings: string[] = []

    try {
      const base64 = buffer.toString("base64")
      const kindHint = hints?.kind ? `\nTipo esperado: ${hints.kind}` : ""
      const fileHint = hints?.fileName ? `\nArchivo: ${hints.fileName}` : ""

      const isPdf = mimeType === "application/pdf"
      const contentBlock = isPdf
        ? {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64,
            },
          }
        : {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
              data: base64,
            },
          }

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: `Extraé los datos del estado contable.${kindHint}${fileHint}\nDevolvé solo el JSON.`,
              },
            ],
          },
        ],
      })

      const rawText = response.content[0].type === "text" ? response.content[0].text : ""
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error("No se pudo extraer JSON de la respuesta de Claude")
      }

      const parsed = JSON.parse(jsonMatch[0]) as {
        balance?: Record<string, unknown>
        income?: Record<string, unknown>
        previousBalance?: Record<string, unknown>
        previousIncome?: Record<string, unknown>
        currency?: "ARS" | "USD"
        fieldConfidence?: Record<string, number>
        warnings?: string[]
      }

      const currency = parsed.currency ?? "ARS"
      const claudeWarnings: string[] = parsed.warnings ?? []
      warnings.push(...claudeWarnings)

      const fieldConf: FinancialStatementOCRExtractionResult["fieldConfidence"] = {}
      for (const [key, conf] of Object.entries(parsed.fieldConfidence ?? {})) {
        fieldConf[key] = { confidence: conf as number, source: "ai" }
      }

      const balanceResult = parsed.balance
        ? {
            details: mergeWithDefaults(parsed.balance, DEFAULT_BALANCE_SHEET_DETAILS) as BalanceSheetDetails,
            equityTotal: (parsed.balance.equityTotal as number) ?? 0,
            currency,
            previousDetails: parsed.previousBalance
              ? (mergeWithDefaults(parsed.previousBalance, DEFAULT_BALANCE_SHEET_DETAILS) as BalanceSheetDetails)
              : undefined,
            previousEquityTotal: parsed.previousBalance
              ? ((parsed.previousBalance.equityTotal as number) ?? 0)
              : undefined,
          }
        : undefined

      const incomeResult = parsed.income
        ? {
            details: mergeWithDefaults(parsed.income, DEFAULT_INCOME_STATEMENT_DETAILS) as IncomeStatementDetails,
            currency,
            previousDetails: parsed.previousIncome
              ? (mergeWithDefaults(parsed.previousIncome, DEFAULT_INCOME_STATEMENT_DETAILS) as IncomeStatementDetails)
              : undefined,
          }
        : undefined

      const confidenceValues = Object.values(parsed.fieldConfidence ?? {}) as number[]
      const overallConfidence =
        confidenceValues.length > 0
          ? confidenceValues.reduce((a, b) => a + b, 0) / confidenceValues.length
          : 0.5

      return {
        provider: this.model,
        durationMs: Date.now() - start,
        overallConfidence,
        rawText,
        balanceResult,
        incomeResult,
        fieldConfidence: fieldConf,
        warnings,
      }
    } catch (err) {
      warnings.push(`Error de extracción: ${err instanceof Error ? err.message : "desconocido"}`)
      return {
        provider: this.model,
        durationMs: Date.now() - start,
        overallConfidence: 0,
        fieldConfidence: {},
        warnings,
      }
    }
  }
}

function mergeWithDefaults(extracted: Record<string, unknown>, defaults: object): object {
  const result: Record<string, unknown> = { ...defaults }
  for (const [key, value] of Object.entries(extracted)) {
    if (typeof value === "object" && value !== null && typeof result[key] === "object") {
      result[key] = mergeWithDefaults(value as Record<string, unknown>, result[key] as object)
    } else if (value !== undefined && value !== null) {
      result[key] = value
    }
  }
  return result
}
