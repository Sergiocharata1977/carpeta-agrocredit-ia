import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { Producer } from "@/types/producer"

export async function getProducersByOrg(organizationId: string): Promise<Producer[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.PRODUCERS),
    where("organizationId", "==", organizationId),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Producer))
}

export async function getProducerById(producerId: string): Promise<Producer | null> {
  const db = getFirebaseDb()
  if (!db) return null
  const snap = await getDoc(doc(db, COLLECTIONS.PRODUCERS, producerId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Producer
}

export async function createProducer(
  data: Omit<Producer, "id" | "createdAt" | "updatedAt">,
  createdBy: string,
): Promise<string> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  const ref = await addDoc(collection(db, COLLECTIONS.PRODUCERS), {
    ...data,
    createdBy,
    folderStatus: "incomplete",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateProducer(
  producerId: string,
  data: Partial<Producer>,
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await updateDoc(doc(db, COLLECTIONS.PRODUCERS, producerId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}
