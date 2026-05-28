import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, query, where, getDocs } from "firebase/firestore"
import type { OrganizationMember } from "@/types/auth"

export async function getUserMemberships(uid: string): Promise<OrganizationMember[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const q = query(
    collection(db, "organization_members"),
    where("uid", "==", uid),
    where("status", "==", "active")
  )

  const snap = await getDocs(q)
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as OrganizationMember))
}

export async function getMembershipForOrg(uid: string, organizationId: string): Promise<OrganizationMember | null> {
  const memberships = await getUserMemberships(uid)
  return memberships.find((m) => m.organizationId === organizationId) ?? null
}
