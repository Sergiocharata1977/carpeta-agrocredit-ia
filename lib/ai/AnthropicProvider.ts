import Anthropic from "@anthropic-ai/sdk"
import {
  type AIProvider,
  type AIClassificationResult,
  type AIClassificationHints,
  type AIExtractionResult,
  type AIExtractionHints,
  type AIExtractedField,
  parseFirstJsonBlock,
} from "./AIProvider"

/**
 * Proveedor IA basado en Anthropic (Claude).
 *
 * Reusa el enfoque de ClaudeFinancialStatementProvider: bloque "document"
 * nativo para PDF (Claude lo acepta directo, sin rasterizar) e "image" para
 * imágenes. Lee ANTHROPIC_API_KEY y CLAUDE_MODEL.
 *
 * Esta es la ruta de fallback cuando xAI no está disponible o no soporta
 * imágenes (ver Ola 0, sección 6, punto 3).
 */

const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const
type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic"
  private client: Anthropic
  private model: string

  constructor(model?: string) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    this.model = model ?? process.env.CLAUDE_MODEL ?? "claude-haiku-4-5-20251001"
  }

  private buildContentBlock(
    buffer: Buffer,
    mimeType: string,
  ): Anthropic.Messages.ContentBlockParam {
    const base64 = buffer.toString("base64")
    if (mimeType === "application/pdf") {
      return {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      }
    }
    const mediaType: SupportedImageType = SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)
      ? (mimeType as SupportedImageType)
      : "image/png"
    return {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 },
    }
  }

  private async messageText(
    systemPrompt: string,
    contentBlocks: Anthropic.Messages.ContentBlockParam[],
  ): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: contentBlocks }],
    })
    const first = response.content[0]
    return first && first.type === "text" ? first.text : ""
  }

  async classifyDocument(
    buffer: Buffer,
    mimeType: string,
    hints?: AIClassificationHints,
  ): Promise<AIClassificationResult> {
    const warnings: string[] = []
    try {
      const fileHint = hints?.fileName ? `\nNombre de archivo: ${hints.fileName}` : ""
      const systemPrompt = `Sos un clasificador de documentos financieros argentinos. Devolvé SOLO un JSON con esta forma exacta:
{
  "documentType": "string (ej: balance_sheet, income_statement, tax_document, f931, iva, otro)",
  "subtype": "string opcional",
  "cuit": "string opcional (XX-XXXXXXXX-X)",
  "period": "string opcional",
  "issueDate": "YYYY-MM-DD opcional",
  "expiryDate": "YYYY-MM-DD opcional",
  "issuer": "string opcional",
  "confidence": number entre 0 y 1,
  "warnings": ["string", ...]
}`

      const raw = await this.messageText(systemPrompt, [
        this.buildContentBlock(buffer, mimeType),
        { type: "text", text: `Clasificá este documento.${fileHint}\nDevolvé solo el JSON.` },
      ])

      const parsed = parseFirstJsonBlock<Partial<AIClassificationResult>>(raw)
      return {
        documentType: parsed.documentType ?? "unknown",
        subtype: parsed.subtype,
        cuit: parsed.cuit,
        period: parsed.period,
        issueDate: parsed.issueDate,
        expiryDate: parsed.expiryDate,
        issuer: parsed.issuer,
        confidence: clamp01(parsed.confidence ?? 0.5),
        warnings: [...warnings, ...(parsed.warnings ?? [])],
      }
    } catch (err) {
      return {
        documentType: "unknown",
        confidence: 0,
        warnings: [...warnings, `Error de clasificación Anthropic: ${errMsg(err)}`],
      }
    }
  }

  async extractStructured(
    buffer: Buffer,
    mimeType: string,
    schemaPrompt: string,
    hints?: AIExtractionHints,
  ): Promise<AIExtractionResult> {
    const warnings: string[] = []
    try {
      const typeHint = hints?.documentType ? `\nTipo de documento: ${hints.documentType}` : ""
      const fileHint = hints?.fileName ? `\nNombre de archivo: ${hints.fileName}` : ""
      const systemPrompt = `Sos un extractor de datos estructurados de documentos financieros argentinos.
${schemaPrompt}

Devolvé SOLO un JSON con esta forma:
{
  "fields": { "<nombre_campo>": { "value": <valor>, "confidence": number 0..1, "page": number|null, "rawText": string|null } },
  "rawText": "string opcional",
  "warnings": ["string", ...],
  "overallConfidence": number entre 0 y 1
}`

      const raw = await this.messageText(systemPrompt, [
        this.buildContentBlock(buffer, mimeType),
        {
          type: "text",
          text: `Extraé los campos según el esquema.${typeHint}${fileHint}\nDevolvé solo el JSON.`,
        },
      ])

      const parsed = parseFirstJsonBlock<{
        fields?: Record<string, Partial<AIExtractedField>>
        rawText?: string
        warnings?: string[]
        overallConfidence?: number
      }>(raw)

      const fields: Record<string, AIExtractedField> = {}
      for (const [key, f] of Object.entries(parsed.fields ?? {})) {
        fields[key] = {
          value: f?.value ?? null,
          confidence: clamp01(f?.confidence ?? 0.5),
          page: f?.page ?? null,
          rawText: f?.rawText ?? null,
        }
      }

      const confValues = Object.values(fields).map((f) => f.confidence)
      const overallConfidence =
        parsed.overallConfidence != null
          ? clamp01(parsed.overallConfidence)
          : confValues.length > 0
            ? confValues.reduce((a, b) => a + b, 0) / confValues.length
            : 0.5

      return {
        fields,
        rawText: parsed.rawText,
        warnings: [...warnings, ...(parsed.warnings ?? [])],
        overallConfidence,
      }
    } catch (err) {
      return {
        fields: {},
        warnings: [...warnings, `Error de extracción Anthropic: ${errMsg(err)}`],
        overallConfidence: 0,
      }
    }
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    return this.messageText(systemPrompt, [{ type: "text", text: userPrompt }])
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "desconocido"
}
