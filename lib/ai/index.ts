import type { AIProvider } from "./AIProvider"
import { MockAIProvider } from "./MockAIProvider"
import { XaiProvider } from "./XaiProvider"
import { AnthropicProvider } from "./AnthropicProvider"
import { GroqProvider } from "./GroqProvider"

/** Proveedores IA seleccionables (además de mock). */
export const AI_PROVIDER_NAMES = ["groq", "anthropic", "xai"] as const
export type AIProviderName = (typeof AI_PROVIDER_NAMES)[number]

/** ¿Hay API key configurada para este proveedor? (server-side) */
export function hasProviderKey(name: AIProviderName): boolean {
  if (name === "groq") return !!process.env.GROQ_API_KEY
  if (name === "anthropic") return !!process.env.ANTHROPIC_API_KEY
  if (name === "xai") return !!process.env.XAI_API_KEY
  return false
}

/**
 * Instancia el proveedor pedido SI tiene key; si no, cae a MockAIProvider.
 * No lee config: recibe el nombre ya resuelto.
 */
export function createProvider(name: string): AIProvider {
  const provider = (name ?? "").trim().toLowerCase()

  if (provider === "groq") {
    if (process.env.GROQ_API_KEY) return new GroqProvider()
    console.warn("[AI] provider=groq pero falta GROQ_API_KEY — usando MockAIProvider")
  } else if (provider === "xai") {
    if (process.env.XAI_API_KEY) return new XaiProvider()
    console.warn("[AI] provider=xai pero falta XAI_API_KEY — usando MockAIProvider")
  } else if (provider === "anthropic") {
    if (process.env.ANTHROPIC_API_KEY) return new AnthropicProvider()
    console.warn("[AI] provider=anthropic pero falta ANTHROPIC_API_KEY — usando MockAIProvider")
  } else {
    console.warn(`[AI] provider no configurado o desconocido ("${provider}") — usando MockAIProvider`)
  }

  return new MockAIProvider()
}

/**
 * Factory de proveedor IA por env (sync, sin Firestore).
 *
 * Selección por AI_PROVIDER: "groq" | "xai" | "anthropic" | (otro → mock).
 * Para selección dinámica desde la config de super admin, usar
 * `resolveAIProvider()` de `./provider-config`.
 *
 * Los SDKs pesados se importan de forma diferida dentro de cada provider, así
 * el import de este módulo no fuerza la carga de binarios nativos.
 */
export function getAIProvider(): AIProvider {
  return createProvider(process.env.AI_PROVIDER ?? "")
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
