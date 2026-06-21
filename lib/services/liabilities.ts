import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { Liability } from "@/types/assets"
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

export async function getLiabilitiesForProducer(producerId: string): Promise<Liability[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.LIABILITIES),
    where("producerId", "==", producerId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Liability))
}

export async function getLiabilitiesForOrganization(organizationId: string): Promise<Liability[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.LIABILITIES),
    where("organizationId", "==", organizationId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Liability))
}

export async function createLiability(
  data: Omit<Liability, "id" | "createdAt" | "updatedAt">,
  createdBy: string
): Promise<string> {
  void createdBy
  const response = await authFetch("/api/folders/liabilities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, documentIds: data.documentIds ?? [] }),
  })
  return (await parseApiResponse<{ id: string }>(response)).id
}

export async function updateLiability(
  liabilityId: string,
  data: Partial<Liability>
): Promise<void> {
  const response = await authFetch(`/api/folders/liabilities/${liabilityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  await parseApiResponse<{ ok: boolean }>(response)
}

export async function deleteLiability(liabilityId: string): Promise<void> {
  const response = await authFetch(`/api/folders/liabilities/${liabilityId}`, {
    method: "DELETE",
  })
  await parseApiResponse<{ ok: boolean }>(response)
}

export function getTotalLiabilityValue(liabilities: Liability[]): { ARS: number; USD: number } {
  return liabilities.reduce(
    (acc, liability) => {
      acc[liability.currency] += liability.amount
      return acc
    },
    { ARS: 0, USD: 0 }
  )
}
