import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { AccountingFirm } from "@/types/producer"

export async function getAccountingFirmById(
  firmId: string,
): Promise<AccountingFirm | null> {
  const db = getFirebaseDb()
  if (!db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.ACCOUNTING_FIRMS, firmId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as AccountingFirm
}

export async function createAccountingFirm(
  data: Omit<AccountingFirm, "id" | "createdAt" | "updatedAt">,
  createdBy: string,
): Promise<string> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  const ref = await addDoc(collection(db, COLLECTIONS.ACCOUNTING_FIRMS), {
    ...data,
    createdBy,
    status: "active",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateAccountingFirm(
  firmId: string,
  data: Partial<AccountingFirm>,
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await updateDoc(doc(db, COLLECTIONS.ACCOUNTING_FIRMS, firmId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
