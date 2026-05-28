import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { FinancingRequest, FinancingStatus } from "@/types/financing"
import type {
  CreateFinancingRequestInput,
  UpdateFinancingStatusInput,
} from "@/lib/schemas/financing"

async function assertApiResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Error de API")
  }

  return payload
}

export async function getFinancingRequestsByEntity(
  requesterOrganizationId: string,
): Promise<FinancingRequest[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.FINANCING_REQUESTS),
    where("requesterOrganizationId", "==", requesterOrganizationId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancingRequest))
}

export async function getFinancingRequestsByProducer(
  producerId: string,
): Promise<FinancingRequest[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.FINANCING_REQUESTS),
    where("producerId", "==", producerId),
    orderBy("createdAt", "desc"),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancingRequest))
}

export async function createFinancingRequest(
  data: CreateFinancingRequestInput,
  idToken: string,
): Promise<string> {
  const response = await fetch("/api/financing-requests", {
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

export async function updateFinancingStatus(
  requestId: string,
  newStatus: FinancingStatus,
  idToken: string,
  note?: string,
): Promise<void> {
  const payload: UpdateFinancingStatusInput = {
    financingRequestId: requestId,
    status: newStatus,
    ...(note ? { note } : {}),
  }
  const response = await fetch(`/api/financing-requests/${requestId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  await assertApiResponse(response)
}

export async function addObservation(
  requestId: string,
  observation: string,
  idToken: string,
): Promise<void> {
  const response = await fetch(`/api/financing-requests/${requestId}/status`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      financingRequestId: requestId,
      observations: observation,
    }),
  })

  await assertApiResponse(response)
}
