import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { Notification } from "@/types/audit"

export async function getNotificationsForUser(
  recipientUid: string,
  status?: Notification["status"],
): Promise<Notification[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const constraints = [
    where("recipientUid", "==", recipientUid),
    ...(status ? [where("status", "==", status)] : []),
    orderBy("createdAt", "desc"),
    limit(50),
  ]
  const q = query(collection(db, COLLECTIONS.NOTIFICATIONS), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification))
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    status: "read",
  })
}

export async function dismissNotification(notificationId: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    status: "dismissed",
  })
}

export function countUnreadNotifications(notifications: Notification[]): number {
  return notifications.filter((notification) => notification.status === "unread").length
}
