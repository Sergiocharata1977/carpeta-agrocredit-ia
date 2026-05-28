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

export async function createLiability(
  data: Omit<Liability, "id" | "createdAt" | "updatedAt">,
  createdBy: string
): Promise<string> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  const ref = await addDoc(collection(db, COLLECTIONS.LIABILITIES), {
    ...data,
    createdBy,
    documentIds: data.documentIds ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateLiability(
  liabilityId: string,
  data: Partial<Liability>
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await updateDoc(doc(db, COLLECTIONS.LIABILITIES, liabilityId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteLiability(liabilityId: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await deleteDoc(doc(db, COLLECTIONS.LIABILITIES, liabilityId))
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
