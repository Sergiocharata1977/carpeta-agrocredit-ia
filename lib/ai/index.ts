import type { AIProvider } from "./AIProvider"
import { MockAIProvider } from "./MockAIProvider"
import { XaiProvider } from "./XaiProvider"
import { AnthropicProvider } from "./AnthropicProvider"

/**
 * Factory de proveedor IA (CreditoHub).
 *
 * Selección por AI_PROVIDER:
 *  - "xai"       → XaiProvider si hay XAI_API_KEY.
 *  - "anthropic" → AnthropicProvider si hay ANTHROPIC_API_KEY.
 *  - cualquier otro valor o sin key → MockAIProvider (con console.warn).
 *
 * Los SDKs pesados (openai, @anthropic-ai/sdk) y pdfjs/pdf-to-img se importan
 * de forma diferida DENTRO de cada provider (import dinámico en pdf-to-images,
 * y los SDKs solo se instancian al construir el provider elegido), así el
 * import de este módulo no fuerza la carga de binarios nativos.
 */
export function getAIProvider(): AIProvider {
  const provider = (process.env.AI_PROVIDER ?? "").trim().toLowerCase()

  if (provider === "xai") {
    if (process.env.XAI_API_KEY) {
      return new XaiProvider()
    }
    console.warn("[AI] AI_PROVIDER=xai pero falta XAI_API_KEY — usando MockAIProvider")
  } else if (provider === "anthropic") {
    if (process.env.ANTHROPIC_API_KEY) {
      return new AnthropicProvider()
    }
    console.warn("[AI] AI_PROVIDER=anthropic pero falta ANTHROPIC_API_KEY — usando MockAIProvider")
  } else {
    console.warn(
      `[AI] AI_PROVIDER no configurado o desconocido ("${provider}") — usando MockAIProvider`,
    )
  }

  return new MockAIProvider()
}

export type {
  AIProvider,
  AIClassificationResult,
  AIClassificationHints,
  AIExtractionResult,
  AIExtractionHints,
  AIExtractedField,
} from "./AIProvider"
export { parseFirstJsonBlock } from "./AIProvider"
export { PdfRasterizationError, PdfTextExtractionError } from "./pdf-to-images"
