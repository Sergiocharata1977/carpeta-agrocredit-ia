import {
  type AIProvider,
  type AIClassificationResult,
  type AIClassificationHints,
  type AIExtractionResult,
  type AIExtractionHints,
} from "./AIProvider"

/**
 * Proveedor IA Mock: resultados deterministas y plausibles (confidence ~0.6).
 * Para desarrollo y tests sin API key. No hace llamadas de red.
 */
export class MockAIProvider implements AIProvider {
  readonly name = "mock"

  async classifyDocument(
    _buffer: Buffer,
    mimeType: string,
    hints?: AIClassificationHints,
  ): Promise<AIClassificationResult> {
    const fileName = hints?.fileName?.toLowerCase() ?? ""
    let documentType = "balance_sheet"
    if (fileName.includes("iva")) documentType = "iva"
    else if (fileName.includes("f931") || fileName.includes("931")) documentType = "f931"
    else if (fileName.includes("resultado") || fileName.includes("income")) documentType = "income_statement"

    return {
      documentType,
      subtype: undefined,
      cuit: "30-12345678-9",
      period: "2024",
      issueDate: "2024-12-31",
      issuer: "Mock Estudio Contable",
      confidence: 0.6,
      warnings: [
        `MockAIProvider: clasificación determinista (mimeType=${mimeType}). No usar en producción.`,
      ],
    }
  }

  async extractStructured(
    _buffer: Buffer,
    _mimeType: string,
    _schemaPrompt: string,
    _hints?: AIExtractionHints,
  ): Promise<AIExtractionResult> {
    return {
      fields: {
        cashAndBanks: { value: 1_250_000, confidence: 0.6, page: 1, rawText: "Caja y Bancos 1.250.000" },
        tradeReceivables: { value: 3_200_000, confidence: 0.6, page: 1, rawText: "Créditos por ventas 3.200.000" },
        inventories: { value: 8_750_000, confidence: 0.6, page: 1, rawText: "Bienes de cambio 8.750.000" },
        equityTotal: { value: 16_650_000, confidence: 0.6, page: 2, rawText: "Patrimonio Neto 16.650.000" },
        netSales: { value: 42_800_000, confidence: 0.6, page: 2, rawText: "Ventas netas 42.800.000" },
      },
      rawText: "MockAIProvider — texto fuente simulado del estado contable.",
      warnings: ["MockAIProvider: extracción determinista. No usar en producción."],
      overallConfidence: 0.6,
    }
  }

  async complete(_systemPrompt: string, userPrompt: string): Promise<string> {
    return `MockAIProvider respuesta determinista para: ${userPrompt.slice(0, 80)}`
  }
}
