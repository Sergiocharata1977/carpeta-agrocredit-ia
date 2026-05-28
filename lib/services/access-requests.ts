import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { AccessRequest } from "@/types/access"
import type { CreateAccessRequestInput } from "@/lib/schemas/access"

async function assertApiResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Error de API")
  }

  return payload
}

export async function getAccessRequestsForProducer(
  producerId: string,
): Promise<AccessRequest[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ACCESS_REQUESTS),
    where("producerId", "==", producerId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessRequest))
}

export async function getAccessRequestsForEntity(
  requesterOrganizationId: string,
): Promise<AccessRequest[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ACCESS_REQUESTS),
    where("requesterOrganizationId", "==", requesterOrganizationId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccessRequest))
}

export async function createAccessRequest(
  data: CreateAccessRequestInput,
  idToken: string,
): Promise<string> {
  const response = await fetch("/api/access-requests", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const payload = await assertApiResponse(response)
  return String(payload.id)
}

export async function decideAccessRequest(
  requestId: string,
  idToken: string,
  decision:
    | {
        decision: "approved"
        allowedScopes: AccessRequest["requestedScopes"]
        expirationDays: number
      }
    | { decision: "rejected"; rejectionReason?: string },
): Promise<void> {
  const response = await fetch(`/api/access-requests/${requestId}/decision`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(decision),
  })

  await assertApiResponse(response)
}
