import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["bank_user", "agro_company_user", "admin_platform"])

    const { searchParams } = new URL(request.url)
    const targetOrganizationId = searchParams.get("targetOrganizationId")
    if (!targetOrganizationId) {
      return Response.json({ error: "targetOrganizationId es requerido" }, { status: 400 })
    }

    const grantedToOrganizationId = session.defaultOrganizationId
    if (!grantedToOrganizationId) {
      return Response.json({ error: "Sin organización por defecto en la sesión" }, { status: 403 })
    }

    const db = getAdminDb()
    const now = new Date()

    const snap = await db
      .collection(COLLECTIONS.ACCESS_GRANTS)
      .where("targetOrganizationId", "==", targetOrganizationId)
      .where("grantedToOrganizationId", "==", grantedToOrganizationId)
      .where("status", "==", "approved")
      .orderBy("expiresAt", "desc")
      .limit(5)
      .get()

    const activeGrant = snap.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          startsAt: data.startsAt?.toDate?.()?.toISOString() ?? data.startsAt,
          expiresAt: data.expiresAt?.toDate?.()?.toISOString() ?? data.expiresAt,
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt,
        }
      })
      .find((grant) => new Date(grant.expiresAt as string) > now) ?? null

    return Response.json({ grant: activeGrant })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
