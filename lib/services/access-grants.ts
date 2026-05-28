import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { AccessGrant } from "@/types/access"

async function assertApiResponse(response: Response): Promise<void> {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Error de API")
  }
}

export async function getGrantsForProducer(
  producerId: string,
): Promise<AccessGrant[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ACCESS_GRANTS),
    where("producerId", "==", producerId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessGrant))
}

export async function getGrantsForEntity(
  grantedToOrganizationId: string,
): Promise<AccessGrant[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ACCESS_GRANTS),
    where("grantedToOrganizationId", "==", grantedToOrganizationId),
    where("status", "==", "approved"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessGrant))
}

function coerceDate(value: unknown): Date | null {
  if (typeof value === "string") return new Date(value)
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate
    return typeof toDate === "function" ? toDate() : null
  }
  return null
}

export function isGrantActive(grant: AccessGrant): boolean {
  if (grant.status !== "approved") return false
  const expires = coerceDate(grant.expiresAt)
  if (!expires) return false
  return expires > new Date()
}

export function getActiveGrants(grants: AccessGrant[]): AccessGrant[] {
  return grants.filter(isGrantActive)
}

export async function revokeAccessGrant(
  grantId: string,
  idToken: string,
  reason?: string,
): Promise<void> {
  const response = await fetch(`/api/access-grants/${grantId}/revoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  })

  await assertApiResponse(response)
}
