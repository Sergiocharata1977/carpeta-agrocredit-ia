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
import type { AccountingPeriod, PeriodStatus } from "@/types/accounting"
import type { CreateAccountingPeriodInput } from "@/lib/schemas/accounting"
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

export async function getPeriodsForProducer(
  producerId: string
): Promise<AccountingPeriod[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const q = query(
    collection(db, COLLECTIONS.ACCOUNTING_PERIODS),
    where("producerId", "==", producerId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AccountingPeriod))
}

export async function getPeriodById(
  periodId: string
): Promise<AccountingPeriod | null> {
  const db = getFirebaseDb()
  if (!db) return null

  const snap = await getDoc(doc(db, COLLECTIONS.ACCOUNTING_PERIODS, periodId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as AccountingPeriod
}

export async function createPeriod(
  data: CreateAccountingPeriodInput,
  createdBy: string
): Promise<string> {
  void createdBy
  const response = await authFetch("/api/accounting/periods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return (await parseApiResponse<{ id: string }>(response)).id
}

export async function updatePeriodStatus(
  periodId: string,
  status: PeriodStatus
): Promise<void> {
  const response = await authFetch(`/api/accounting/periods/${periodId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  await parseApiResponse<{ ok: boolean }>(response)
}
