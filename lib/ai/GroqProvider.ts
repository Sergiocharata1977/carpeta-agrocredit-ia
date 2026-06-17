import OpenAI from "openai"
import {
  type AIProvider,
  type AIClassificationResult,
  type AIClassificationHints,
  type AIExtractionResult,
  type AIExtractionHints,
  type AIExtractedField,
  parseFirstJsonBlock,
} from "./AIProvider"
import { extractPdfText } from "./pdf-to-images"

/**
 * Proveedor IA basado en Groq vía SDK `openai` con baseURL override.
 *
 * Groq expone una API OpenAI-compatible (igual que xAI), así que el manejo de
 * PDFs/imágenes es el mismo que XaiProvider:
 *  - texto-primero (extractPdfText); si hay texto usable → se manda como texto.
 *  - si es escaneado → rasterizar (pdfToImages) y mandar image_url base64.
 *  - imágenes: content image_url con data URL base64.
 *
 * Modelo: si GROQ_MODEL está, se usa. Si no, GET /models y se elige uno con
 * visión (Llama 4 scout/maverick, llava, etc.); si no aparece ninguno con
 * visión se cae a DEFAULT_GROQ_VISION_MODEL. El id se cachea a nivel módulo.
 */

const VISION_HINTS = ["llama-4", "scout", "maverick", "vision", "llava", "multimodal"]
const DEFAULT_GROQ_VISION_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"

let cachedVisionModel: string | null = null
let modelResolutionPromise: Promise<string> | null = null

interface GroqModelEntry {
  id: string
}

export class GroqProvider implements AIProvider {
  readonly name = "groq"
  private client: OpenAI
  private explicitModel: string | null

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
    })
    this.explicitModel = process.env.GROQ_MODEL?.trim() || null
  }

  /** Resuelve el modelo con visión: env explícito o descubrimiento vía /models (cacheado). */
  private async resolveModel(): Promise<string> {
    if (this.explicitModel) return this.explicitModel
    if (cachedVisionModel) return cachedVisionModel
    if (modelResolutionPromise) return modelResolutionPromise

    modelResolutionPromise = (async () => {
      try {
        const list = await this.client.models.list()
        const models = (list.data ?? []) as GroqModelEntry[]
        const visionModel =
          models.find((m) => VISION_HINTS.some((h) => m.id.toLowerCase().includes(h)))?.id ??
          DEFAULT_GROQ_VISION_MODEL
        cachedVisionModel = visionModel
        return visionModel
      } catch {
        // Si /models falla, igual probamos con el default de visión conocido.
        cachedVisionModel = DEFAULT_GROQ_VISION_MODEL
        return DEFAULT_GROQ_VISION_MODEL
      } finally {
        modelResolutionPromise = null
      }
    })()

    return modelResolutionPromise
  }

  private async buildMediaContent(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ blocks: OpenAI.Chat.Completions.ChatCompletionContentPart[]; warnings: string[] }> {
    const warnings: string[] = []

    if (mimeType === "application/pdf") {
      try {
        const textResult = await extractPdfText(buffer)
        if (textResult.hasUsableText) {
          return {
            blocks: [
              {
                type: "text",
                text: `Texto extraído del PDF (${textResult.pageCount} páginas):\n\n${textResult.text}`,
              },
            ],
            warnings,
          }
        }
        warnings.push("PDF con poco texto nativo — se rasteriza para visión")
      } catch {
        warnings.push("No se pudo extraer texto nativo del PDF — se intenta rasterización")
      }

      return {
        blocks: [
          {
            type: "text",
            text: "El PDF no tiene texto nativo suficiente y la rasterizacion server-side esta deshabilitada en Vercel. Requiere revision manual o procesamiento con un provider con PDF nativo.",
          },
        ],
        warnings,
      }
    }

    const base64 = buffer.toString("base64")
    return {
      blocks: [
        {
          type: "image_url" as const,
          image_url: { url: `data:${mimeType};base64,${base64}` },
        },
      ],
      warnings,
    }
  }

  /** Intenta forzar salida JSON; si el modelo no lo soporta, reintenta sin response_format. */
  private async chatJson(
    model: string,
    systemPrompt: string,
    userBlocks: OpenAI.Chat.Completions.ChatCompletionContentPart[],
  ): Promise<string> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userBlocks },
    ]

    try {
      const res = await this.client.chat.completions.create({
        model,
        max_tokens: 4096,
        response_format: { type: "json_object" },
        messages,
      })
      return res.choices[0]?.message?.content ?? ""
    } catch {
      const res = await this.client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages,
      })
      return res.choices[0]?.message?.content ?? ""
    }
  }

  async classifyDocument(
    buffer: Buffer,
    mimeType: string,
    hints?: AIClassificationHints,
  ): Promise<AIClassificationResult> {
    const warnings: string[] = []
    try {
      const model = await this.resolveModel()
      const media = await this.buildMediaContent(buffer, mimeType)
      warnings.push(...media.warnings)

      const fileHint = hints?.fileName ? `\nNombre de archivo: ${hints.fileName}` : ""
      const systemPrompt = `Sos un clasificador de documentos financieros argentinos. Analizá el documento y devolvé SOLO un JSON con esta forma exacta:
{
  "documentType": "string (ej: balance_sheet, income_statement, tax_document, f931, iva, otro)",
  "subtype": "string opcional",
  "cuit": "string opcional (XX-XXXXXXXX-X)",
  "period": "string opcional (ej: 2024, 2024-12)",
  "issueDate": "YYYY-MM-DD opcional",
  "expiryDate": "YYYY-MM-DD opcional",
  "issuer": "string opcional",
  "confidence": number entre 0 y 1,
  "warnings": ["string", ...]
}`

      const blocks: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        { type: "text", text: `Clasificá este documento.${fileHint}\nDevolvé solo el JSON.` },
        ...media.blocks,
      ]

      const raw = await this.chatJson(model, systemPrompt, blocks)
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
        warnings: [...warnings, `Error de clasificación Groq: ${errMsg(err)}`],
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
      const model = await this.resolveModel()
      const media = await this.buildMediaContent(buffer, mimeType)
      warnings.push(...media.warnings)

      const typeHint = hints?.documentType ? `\nTipo de documento: ${hints.documentType}` : ""
      const fileHint = hints?.fileName ? `\nNombre de archivo: ${hints.fileName}` : ""

      const systemPrompt = `Sos un extractor de datos estructurados de documentos financieros argentinos.
${schemaPrompt}

Devolvé SOLO un JSON con esta forma:
{
  "fields": { "<nombre_campo>": { "value": <valor>, "confidence": number 0..1, "page": number|null, "rawText": string|null } },
  "rawText": "string opcional con el texto fuente",
  "warnings": ["string", ...],
  "overallConfidence": number entre 0 y 1
}`

      const blocks: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
        {
          type: "text",
          text: `Extraé los campos del documento según el esquema.${typeHint}${fileHint}\nDevolvé solo el JSON.`,
        },
        ...media.blocks,
      ]

      const raw = await this.chatJson(model, systemPrompt, blocks)
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
        warnings: [...warnings, `Error de extracción Groq: ${errMsg(err)}`],
        overallConfidence: 0,
      }
    }
  }

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const model = await this.resolveModel()
    const res = await this.client.chat.completions.create({
      model,
      max_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    })
    return res.choices[0]?.message?.content ?? ""
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(1, n))
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : "desconocido"
}

/** Solo para tests: limpiar el cache de modelo entre casos. */
export function __resetGroqModelCache(): void {
  cachedVisionModel = null
  modelResolutionPromise = null
}
