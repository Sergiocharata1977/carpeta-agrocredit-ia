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
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")

  const now = serverTimestamp()
  const docRef = await addDoc(collection(db, COLLECTIONS.BALANCE_SHEETS), {
    ...data,
    validationStatus: "draft",
    createdBy,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateBalanceSheet(
  id: string,
  data: UpdateBalanceSheetInput
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")

  const ref = doc(db, COLLECTIONS.BALANCE_SHEETS, id)
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
