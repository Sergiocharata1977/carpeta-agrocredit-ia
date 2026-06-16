/**
 * Capa IA genérica multiproveedor (CreditoHub — Ola 1 / Agente A).
 *
 * Interfaces puras y agnósticas de proveedor. Reciben Buffers, NO leen
 * Firestore ni Storage. El flujo legacy de lib/ocr sigue intacto; esta capa
 * es nueva y se usa por el pipeline de CreditoHub.
 */

/** Resultado de clasificación de un documento (tipo, emisor, periodo, etc.). */
export interface AIClassificationResult {
  documentType: string
  subtype?: string
  cuit?: string
  period?: string
  issueDate?: string
  expiryDate?: string
  issuer?: string
  /** 0.0 a 1.0 */
  confidence: number
  warnings: string[]
}

/** Un campo extraído con su confianza y trazabilidad opcional. */
export interface AIExtractedField {
  value: unknown
  /** 0.0 a 1.0 */
  confidence: number
  page?: number | null
  rawText?: string | null
}

/** Resultado de extracción estructurada de campos. */
export interface AIExtractionResult {
  fields: Record<string, AIExtractedField>
  rawText?: string
  warnings: string[]
  /** 0.0 a 1.0 */
  overallConfidence: number
}

/** Pistas opcionales para clasificación/extracción. */
export interface AIClassificationHints {
  fileName?: string
}

export interface AIExtractionHints {
  fileName?: string
  documentType?: string
}

/**
 * Contrato común de todo proveedor IA (xAI, Anthropic, Mock).
 * Implementaciones deben ser server-side y no persistir estado externo.
 */
export interface AIProvider {
  name: string
  classifyDocument(
    buffer: Buffer,
    mimeType: string,
    hints?: AIClassificationHints,
  ): Promise<AIClassificationResult>
  extractStructured(
    buffer: Buffer,
    mimeType: string,
    schemaPrompt: string,
    hints?: AIExtractionHints,
  ): Promise<AIExtractionResult>
  complete(systemPrompt: string, userPrompt: string): Promise<string>
}

/**
 * Extrae el primer bloque JSON balanceado de un texto de respuesta del modelo.
 * Robusto frente a texto antes/después y a llaves anidadas (a diferencia de un
 * `match(/\{[\s\S]*\}/)` que se queda con el último cierre).
 *
 * Lanza si no encuentra un objeto JSON parseable.
 */
export function parseFirstJsonBlock<T = unknown>(text: string): T {
  const start = text.indexOf("{")
  if (start === -1) {
    throw new Error("No se encontró un bloque JSON en la respuesta del modelo")
  }

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < text.length; i++) {
    const ch = text[i]

    if (escaped) {
      escaped = false
      continue
    }
    if (ch === "\\") {
      if (inString) escaped = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue

    if (ch === "{") {
      depth++
    } else if (ch === "}") {
      depth--
      if (depth === 0) {
        const candidate = text.slice(start, i + 1)
        return JSON.parse(candidate) as T
      }
    }
  }

  throw new Error("Bloque JSON incompleto o no balanceado en la respuesta del modelo")
}
