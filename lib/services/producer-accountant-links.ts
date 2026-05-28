import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { ProducerAccountantLink } from "@/types/producer"

export async function getLinksForProducer(
  producerId: string,
): Promise<ProducerAccountantLink[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS),
    where("producerId", "==", producerId),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProducerAccountantLink))
}

export async function getLinksForAccountant(
  accountantUid: string,
): Promise<ProducerAccountantLink[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS),
    where("accountantUid", "==", accountantUid),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProducerAccountantLink))
}

export async function createLink(
  data: Omit<ProducerAccountantLink, "id" | "createdAt" | "updatedAt">,
  createdBy: string,
): Promise<string> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  const ref = await addDoc(collection(db, COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS), {
    ...data,
    createdBy,
    status: data.status ?? "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateLinkStatus(
  linkId: string,
  status: ProducerAccountantLink["status"],
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await updateDoc(doc(db, COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS, linkId), {
    status,
    updatedAt: serverTimestamp(),
  })
}

export async function getActiveMainLink(
  producerId: string,
): Promise<ProducerAccountantLink | null> {
  const db = getFirebaseDb()
  if (!db) return null
  const q = query(
    collection(db, COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS),
    where("producerId", "==", producerId),
    where("status", "==", "active"),
    where("isMain", "==", true),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as ProducerAccountantLink
}
