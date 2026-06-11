import { NextRequest } from "next/server"
import { Timestamp } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const db = getAdminDb()
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const [orgsSnap, grantsSnap, auditTodaySnap] = await Promise.all([
      db.collection(COLLECTIONS.ORGANIZATIONS).get(),
      db.collection(COLLECTIONS.ACCESS_GRANTS).where("status", "==", "approved").get(),
      db.collection(COLLECTIONS.AUDIT_LOGS)
        .where("createdAt", ">=", Timestamp.fromDate(todayStart))
        .get(),
    ])

    const activeGrantsCount = grantsSnap.docs.filter((doc) => {
      const expiresAt = doc.data().expiresAt?.toDate?.()
      return expiresAt && expiresAt > now
    }).length

    const orgsByType: Record<string, number> = {}
    for (const doc of orgsSnap.docs) {
      const type: string = doc.data().type ?? "unknown"
      orgsByType[type] = (orgsByType[type] ?? 0) + 1
    }

    return Response.json({
      actionsToday: auditTodaySnap.size,
      activeGrants: activeGrantsCount,
      orgsByType,
      totalOrgs: orgsSnap.size,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
