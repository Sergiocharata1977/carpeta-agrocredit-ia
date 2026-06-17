import "server-only"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import {
  AI_PROVIDER_NAMES,
  type AIProviderName,
  type AIProvider,
  createProvider,
  hasProviderKey,
} from "./index"

/**
 * Selección del proveedor IA activo persistida en Firestore (config de super
 * admin). El documento vive en `platform_settings/ai`. Si no existe, se usa el
 * env `AI_PROVIDER` como default.
 *
 * Solo server-side (Admin SDK). El doc se escribe únicamente desde la API admin
 * (`/api/admin/ai-config`), nunca desde el cliente — las reglas Firestore dejan
 * `platform_settings` deny-by-default.
 */

const SETTINGS_DOC_ID = "ai"
const CACHE_TTL_MS = 15_000

export interface AiSettings {
  /** Proveedor activo elegido por el admin. null = usar default por env. */
  provider: AIProviderName | null
  updatedAt: string | null
  updatedByUid: string | null
}

interface CacheEntry {
  value: AiSettings
  expiresAt: number
}

let cache: CacheEntry | null = null

function isProviderName(value: unknown): value is AIProviderName {
  return typeof value === "string" && (AI_PROVIDER_NAMES as readonly string[]).includes(value)
}

function toIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return typeof value === "string" ? value : null
}

/** Lee la config activa (cacheada ~15s). */
export async function getAiSettings(): Promise<AiSettings> {
  if (cache && cache.expiresAt > Date.now()) return cache.value

  let value: AiSettings = { provider: null, updatedAt: null, updatedByUid: null }
  try {
    const snap = await getAdminDb()
      .collection(COLLECTIONS.PLATFORM_SETTINGS)
      .doc(SETTINGS_DOC_ID)
      .get()
    if (snap.exists) {
      const data = snap.data() ?? {}
      value = {
        provider: isProviderName(data.provider) ? data.provider : null,
        updatedAt: toIso(data.updatedAt),
        updatedByUid: typeof data.updatedByUid === "string" ? data.updatedByUid : null,
      }
    }
  } catch {
    // Sin acceso/doc → default por env.
  }

  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS }
  return value
}

/** Escribe el proveedor activo (o null para volver al default por env). */
export async function setActiveProvider(
  provider: AIProviderName | null,
  updatedByUid: string,
): Promise<void> {
  await getAdminDb()
    .collection(COLLECTIONS.PLATFORM_SETTINGS)
    .doc(SETTINGS_DOC_ID)
    .set(
      {
        provider: provider ?? null,
        updatedByUid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    )
  cache = null
}

/**
 * Nombre del proveedor que se usará realmente: config activa si está, si no el
 * env `AI_PROVIDER`. No verifica key (eso lo hace createProvider, que cae a mock).
 */
export async function getActiveProviderName(): Promise<string> {
  const settings = await getAiSettings()
  return settings.provider ?? process.env.AI_PROVIDER ?? ""
}

/**
 * Proveedor IA resuelto desde la config de super admin (con fallback a env).
 * Reemplaza a getAIProvider() en el pipeline; cae a Mock si falta la key.
 */
export async function resolveAIProvider(): Promise<AIProvider> {
  return createProvider(await getActiveProviderName())
}

/** Solo tests: invalidar el cache de settings. */
export function __resetAiSettingsCache(): void {
  cache = null
}

export { hasProviderKey }
