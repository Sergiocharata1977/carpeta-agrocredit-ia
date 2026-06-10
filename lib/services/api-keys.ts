import crypto from "crypto"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { ApiKey, ApiKeyPublic, ApiKeyScope } from "@/types/api-keys"

const KEY_PREFIX = "agro_"

export function generateApiKeyPlaintext(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(32).toString("hex")}`
}

export function hashApiKey(plaintext: string): string {
  return crypto.createHash("sha256").update(plaintext).digest("hex")
}

function serializeApiKey(id: string, data: FirebaseFirestore.DocumentData): ApiKey {
  return {
    id,
    organizationId: data.organizationId,
    name: data.name,
    keyHash: data.keyHash,
    scopes: data.scopes ?? [],
    status: data.status,
    lastUsedAt: data.lastUsedAt?.toDate?.()?.toISOString() ?? null,
    expiresAt: data.expiresAt ?? null,
    createdBy: data.createdBy,
    createdAt: data.createdAt?.toDate?.()?.toISOString() ?? "",
    revokedAt: data.revokedAt?.toDate?.()?.toISOString() ?? null,
    revokedBy: data.revokedBy ?? null,
  }
}

export async function createApiKey(params: {
  organizationId: string
  name: string
  scopes: ApiKeyScope[]
  expiresAt?: string
  createdBy: string
}): Promise<{ apiKey: ApiKey; plaintext: string }> {
  const plaintext = generateApiKeyPlaintext()
  const keyHash = hashApiKey(plaintext)
  const db = getAdminDb()

  const ref = await db.collection(COLLECTIONS.API_KEYS).add({
    organizationId: params.organizationId,
    name: params.name,
    keyHash,
    scopes: params.scopes,
    status: "active",
    lastUsedAt: null,
    expiresAt: params.expiresAt ?? null,
    createdBy: params.createdBy,
    createdAt: FieldValue.serverTimestamp(),
    revokedAt: null,
    revokedBy: null,
  })

  const snap = await ref.get()
  return { apiKey: serializeApiKey(snap.id, snap.data()!), plaintext }
}

export async function validateApiKeyFromHeader(
  authHeader: string | null,
  requiredScope: ApiKeyScope,
): Promise<{ valid: true; organizationId: string; keyId: string } | { valid: false; error: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" }
  }

  const plaintext = authHeader.slice(7)
  const keyHash = hashApiKey(plaintext)

  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.API_KEYS)
    .where("keyHash", "==", keyHash)
    .where("status", "==", "active")
    .limit(1)
    .get()

  if (snap.empty) {
    return { valid: false, error: "Invalid API key" }
  }

  const doc = snap.docs[0]
  const data = doc.data()

  if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
    return { valid: false, error: "API key expired" }
  }

  if (!(data.scopes as ApiKeyScope[]).includes(requiredScope)) {
    return { valid: false, error: `Scope insuficiente: se requiere ${requiredScope}` }
  }

  // fire-and-forget: actualiza lastUsedAt sin bloquear la respuesta
  doc.ref.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => {})

  return { valid: true, organizationId: data.organizationId as string, keyId: doc.id }
}

export async function listApiKeys(organizationId?: string): Promise<ApiKey[]> {
  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.API_KEYS)
  const snap = organizationId
    ? await col.where("organizationId", "==", organizationId).orderBy("createdAt", "desc").get()
    : await col.orderBy("createdAt", "desc").get()
  return snap.docs.map((d) => serializeApiKey(d.id, d.data()))
}

export async function revokeApiKey(keyId: string, revokedBy: string): Promise<void> {
  await getAdminDb().collection(COLLECTIONS.API_KEYS).doc(keyId).update({
    status: "revoked",
    revokedAt: FieldValue.serverTimestamp(),
    revokedBy,
  })
}

export function toPublicApiKey({ keyHash: _keyHash, ...rest }: ApiKey): ApiKeyPublic {
  return rest
}
