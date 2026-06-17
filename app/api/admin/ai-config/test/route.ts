import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireAnyRole,
  getAuthErrorResponse,
} from "@/lib/auth/server-session"
import {
  AI_PROVIDER_NAMES,
  hasProviderKey,
  createProvider,
  type AIProviderName,
} from "@/lib/ai"

/**
 * Prueba/compara proveedores IA: corre un prompt corto de conectividad por cada
 * proveedor pedido (o todos los que tienen key) y mide latencia. Solo admin.
 * No toca documentos del legajo — es un ping de modelo para comparar.
 */

const SAMPLE_SYSTEM = "Sos un asistente financiero argentino conciso."
const SAMPLE_USER =
  'Respondé SOLO con un JSON así: {"ok": true, "resumen": "<una frase de 6 palabras sobre análisis crediticio agropecuario>"}'

const MAX_OUTPUT_CHARS = 600

interface ProviderTestResult {
  provider: AIProviderName
  hasKey: boolean
  ok: boolean
  latencyMs: number | null
  output: string | null
  error: string | null
}

function isProviderName(value: unknown): value is AIProviderName {
  return typeof value === "string" && (AI_PROVIDER_NAMES as readonly string[]).includes(value)
}

async function runOne(name: AIProviderName): Promise<ProviderTestResult> {
  if (!hasProviderKey(name)) {
    return { provider: name, hasKey: false, ok: false, latencyMs: null, output: null, error: "Sin API key configurada" }
  }
  const provider = createProvider(name)
  const start = Date.now()
  try {
    const output = await provider.complete(SAMPLE_SYSTEM, SAMPLE_USER)
    return {
      provider: name,
      hasKey: true,
      ok: true,
      latencyMs: Date.now() - start,
      output: output.slice(0, MAX_OUTPUT_CHARS),
      error: null,
    }
  } catch (error) {
    return {
      provider: name,
      hasKey: true,
      ok: false,
      latencyMs: Date.now() - start,
      output: null,
      error: error instanceof Error ? error.message : "Error desconocido",
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const body = await request.json().catch(() => ({}))
    const requested: AIProviderName[] = Array.isArray(body?.providers)
      ? body.providers.filter(isProviderName)
      : isProviderName(body?.provider)
        ? [body.provider]
        : [...AI_PROVIDER_NAMES]

    // Corre en paralelo: cada proveedor es independiente.
    const results = await Promise.all(requested.map(runOne))
    return Response.json({ results })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
