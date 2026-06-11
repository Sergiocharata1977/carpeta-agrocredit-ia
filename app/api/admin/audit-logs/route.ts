import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }
  if (typeof value === "string") return value
  return null
}

// Lista de audit_logs para el panel admin, via Admin SDK.
// orderBy simple sobre createdAt (indice single-field automatico); filtros en memoria.
export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const { searchParams } = new URL(request.url)
    const actionFilter = searchParams.get("action")
    const actorFilter = searchParams.get("actorUid")
    const limitParam = Math.min(Number(searchParams.get("limit")) || 100, 500)

    const db = getAdminDb()
    const snap = await db
      .collection(COLLECTIONS.AUDIT_LOGS)
      .orderBy("createdAt", "desc")
      .limit(limitParam)
      .get()

    let logs = snap.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        createdAt: timestampToIso(data.createdAt),
      } as Record<string, unknown> & { id: string; actorUid?: string }
    })

    if (actionFilter) logs = logs.filter((log) => log.action === actionFilter)
    if (actorFilter) logs = logs.filter((log) => log.actorUid === actorFilter)

    // Enriquecer con email/nombre del actor desde users
    const actorUids = [...new Set(logs.map((log) => log.actorUid).filter(Boolean))] as string[]
    const actorMap = new Map<string, { email: string | null; displayName: string | null }>()
    if (actorUids.length > 0) {
      const refs = actorUids.map((uid) => db.collection(COLLECTIONS.USERS).doc(uid))
      const snaps = await db.getAll(...refs)
      for (const userSnap of snaps) {
        if (userSnap.exists) {
          const u = userSnap.data()!
          actorMap.set(userSnap.id, {
            email: u.email ?? null,
            displayName: u.displayName ?? null,
          })
        }
      }
    }

    const enriched = logs.map((log) => ({
      ...log,
      actorEmail: log.actorUid ? actorMap.get(log.actorUid)?.email ?? null : null,
      actorName: log.actorUid ? actorMap.get(log.actorUid)?.displayName ?? null : null,
    }))

    return Response.json({ logs: enriched })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
