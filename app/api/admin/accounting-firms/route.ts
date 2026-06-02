import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get("status")

    const db = getAdminDb()
    let query = db.collection(COLLECTIONS.ORGANIZATIONS).where("type", "==", "accounting_firm")
    if (statusFilter) {
      query = query.where("status", "==", statusFilter) as typeof query
    }

    const snap = await query.orderBy("createdAt", "desc").get()

    const firms = snap.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Record<string, unknown>),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() ?? null,
    }))

    return Response.json({ firms })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
