import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireAnyRole,
  getAuthErrorResponse,
} from "@/lib/auth/server-session"
import { writeAuditLog } from "@/lib/firebase/audit"
import { AI_PROVIDER_NAMES, hasProviderKey, type AIProviderName } from "@/lib/ai"
import { getAiSettings, setActiveProvider, getActiveProviderName } from "@/lib/ai/provider-config"

const PROVIDER_LABELS: Record<AIProviderName, string> = {
  groq: "Groq",
  anthropic: "Anthropic (Claude)",
  xai: "xAI (Grok)",
}

function isProviderName(value: unknown): value is AIProviderName {
  return typeof value === "string" && (AI_PROVIDER_NAMES as readonly string[]).includes(value)
}

async function buildState() {
  const settings = await getAiSettings()
  const active = (await getActiveProviderName()).trim().toLowerCase()
  return {
    // Proveedor elegido explícitamente por el admin (null = default por env).
    selectedProvider: settings.provider,
    // Lo que realmente se usa (config o, si null, AI_PROVIDER del env).
    activeProvider: active || null,
    // Default por variable de entorno.
    envDefault: (process.env.AI_PROVIDER ?? "").trim().toLowerCase() || null,
    updatedAt: settings.updatedAt,
    updatedByUid: settings.updatedByUid,
    providers: AI_PROVIDER_NAMES.map((name) => ({
      name,
      label: PROVIDER_LABELS[name],
      hasKey: hasProviderKey(name),
    })),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])
    return Response.json(await buildState())
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const body = await request.json().catch(() => ({}))
    const raw = body?.provider

    // null/"" → volver al default por env.
    const provider: AIProviderName | null =
      raw === null || raw === "" ? null : isProviderName(raw) ? raw : undefined!

    if (provider === undefined) {
      return Response.json(
        { error: `provider inválido. Opciones: ${AI_PROVIDER_NAMES.join(", ")} o null` },
        { status: 400 },
      )
    }

    await setActiveProvider(provider, session.uid)
    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "ai_provider.changed",
      targetType: "platform_settings",
      targetId: "ai",
      metadata: { provider },
    })

    return Response.json(await buildState())
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
