import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { BalanceSheet } from "@/types/accounting"
import type {
  CreateBalanceSheetInput,
  UpdateBalanceSheetInput,
} from "@/lib/schemas/accounting"
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

export async function getBalanceSheetsForPeriod(
  producerId: string,
  periodId: string
): Promise<BalanceSheet[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const q = query(
    collection(db, COLLECTIONS.BALANCE_SHEETS),
    where("producerId", "==", producerId),
    where("periodId", "==", periodId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as BalanceSheet))
}

export async function getBalanceSheetById(
  id: string
): Promise<BalanceSheet | null> {
  const db = getFirebaseDb()
  if (!db) return null

  const snap = await getDoc(doc(db, COLLECTIONS.BALANCE_SHEETS, id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as BalanceSheet
}

export async function createBalanceSheet(
  data: CreateBalanceSheetInput,
  createdBy: string
): Promise<string> {
  void createdBy
  const response = await authFetch("/api/accounting/balance-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return (await parseApiResponse<{ id: string }>(response)).id
}

export async function updateBalanceSheet(
  id: string,
  data: UpdateBalanceSheetInput
): Promise<void> {
  const response = await authFetch(`/api/accounting/balance-sheets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  await parseApiResponse<{ ok: boolean }>(response)
}
