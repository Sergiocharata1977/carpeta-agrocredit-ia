import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { AuditLog } from "@/types/audit"

export async function getRecentAuditLogs(maxRows = 100): Promise<AuditLog[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const q = query(
    collection(db, COLLECTIONS.AUDIT_LOGS),
    orderBy("createdAt", "desc"),
    limit(maxRows),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}

export async function getAuditLogsForProducer(
  producerId: string,
  maxRows = 100,
): Promise<AuditLog[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const q = query(
    collection(db, COLLECTIONS.AUDIT_LOGS),
    where("producerId", "==", producerId),
    orderBy("createdAt", "desc"),
    limit(maxRows),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog))
}
