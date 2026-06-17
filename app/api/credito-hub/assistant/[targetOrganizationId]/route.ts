import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireActiveOrg,
  getAuthErrorResponse,
  AuthError,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { resolveAIProvider } from "@/lib/ai/provider-config"
import { buildLegajoContext } from "@/lib/credito-hub/assistant-context"
import { writeAuditLog } from "@/lib/firebase/audit"

/**
 * Asistente IA contextual por legajo (solo lectura).
 *
 * Auth: contador con vínculo activo al cliente o admin (assertCanManageAccountingFolder).
 * El `targetOrganizationId` viene SOLO en la ruta; el body trae solo `message` y
 * `history`. Nada sensible se confía desde el cliente.
 *
 * Guardrails: responde con base en el contexto del legajo; si un dato no consta,
 * lo dice; no recomienda aprobar/rechazar crédito; no modifica datos.
 */

interface RouteContext {
  params: Promise<{ targetOrganizationId: string }>
}

const MAX_MESSAGE_CHARS = 2000
const MAX_HISTORY = 8

// Rate limit simple en memoria: por (uid + carpeta), ventana deslizante.
const RATE_WINDOW_MS = 5 * 60 * 1000
const RATE_MAX = 20
const rateMap = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const hits = (rateMap.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) {
    rateMap.set(key, hits)
    return true
  }
  hits.push(now)
  rateMap.set(key, hits)
  return false
}

const SYSTEM_GUARDRAILS = `Sos un asistente para un CONTADOR que arma el legajo crediticio de un cliente agropecuario.
Reglas estrictas:
- Respondé SOLO con base en las "Evidencias del legajo" que se te dan abajo.
- Si un dato no aparece en las evidencias, decí explícitamente "no consta en el legajo". No inventes ni estimes datos que no estén.
- Cuando afirmes algo, indicá en qué te basás (ej: "según el balance cargado", "según el perfil").
- NO recomiendes aprobar ni rechazar un crédito: sos asesor del contador, no decisor.
- No modificás datos ni ejecutás acciones; solo informás, resumís y señalás qué falta o qué riesgos se ven.
- Respondé en español rioplatense, claro y breve.`

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { targetOrganizationId } = await params
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const canUseAssistant =
      session.roles.includes("accountant") ||
      session.roles.includes("accounting_firm_admin") ||
      session.roles.includes("admin_platform")
    if (!canUseAssistant) {
      throw new AuthError("Solo el contador o admin puede usar el asistente del legajo", 403)
    }

    const { folderOwnerOrganizationId, accountingFirmId } = await assertCanManageAccountingFolder(
      session,
      targetOrganizationId,
    )

    if (rateLimited(`${session.uid}:${folderOwnerOrganizationId}`)) {
      return Response.json(
        { error: "Demasiadas consultas seguidas. Esperá un momento e intentá de nuevo." },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const message = String(body?.message ?? "").trim().slice(0, MAX_MESSAGE_CHARS)
    if (!message) {
      return Response.json({ error: "Escribí una pregunta" }, { status: 400 })
    }
    const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(body?.history)
      ? body.history
          .filter((m: unknown) => m && typeof m === "object")
          .slice(-MAX_HISTORY)
          .map((m: { role?: unknown; content?: unknown }) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content ?? "").slice(0, MAX_MESSAGE_CHARS),
          }))
      : []

    const context = await buildLegajoContext(folderOwnerOrganizationId)

    const systemPrompt = `${SYSTEM_GUARDRAILS}

=== Evidencias del legajo ===
${context.text}
=== Fin de evidencias ===`

    const historyText = history.length
      ? history.map((m) => `${m.role === "assistant" ? "Asistente" : "Contador"}: ${m.content}`).join("\n") + "\n"
      : ""
    const userPrompt = `${historyText}Contador: ${message}`

    const provider = await resolveAIProvider()
    const answer = await provider.complete(systemPrompt, userPrompt)

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: accountingFirmId ?? session.defaultOrganizationId,
      action: "assistant.queried",
      targetType: "credit_folder",
      targetId: folderOwnerOrganizationId,
      metadata: { provider: provider.name, chars: message.length },
    })

    return Response.json({
      answer,
      provider: provider.name,
      isMock: provider.name === "mock",
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
