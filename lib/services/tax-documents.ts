import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { TaxDocument } from "@/types/accounting"
import type { CreateTaxDocumentInput } from "@/lib/schemas/accounting"

// Tipo parcial para actualización de documentos fiscales
type UpdateTaxDocumentInput = Partial<
  Omit<TaxDocument, "id" | "createdAt" | "updatedAt" | "createdBy">
>

export async function getTaxDocumentsForPeriod(
  producerId: string,
  periodId: string
): Promise<TaxDocument[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const q = query(
    collection(db, COLLECTIONS.TAX_DOCUMENTS),
    where("producerId", "==", producerId),
    where("periodId", "==", periodId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaxDocument))
}

export async function createTaxDocument(
  data: CreateTaxDocumentInput,
  createdBy: string
): Promise<string> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")

  const now = serverTimestamp()
  const docRef = await addDoc(collection(db, COLLECTIONS.TAX_DOCUMENTS), {
    ...data,
    validationStatus: "draft",
    createdBy,
    createdAt: now,
    updatedAt: now,
  })
  return docRef.id
}

export async function updateTaxDocument(
  id: string,
  data: UpdateTaxDocumentInput
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")

  const ref = doc(db, COLLECTIONS.TAX_DOCUMENTS, id)
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
