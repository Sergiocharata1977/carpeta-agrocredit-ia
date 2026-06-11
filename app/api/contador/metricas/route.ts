import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import {
  getAuthErrorResponse,
  isAccountantRole,
  requireAnyRole,
  verifyRequestSession,
} from "@/lib/auth/server-session"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["accountant", "accounting_firm_admin", "admin_platform"])

    const db = getAdminDb()

    // Derive the accounting firm organization from session
    const accountingFirmOrgId = isAccountantRole(session) ? session.defaultOrganizationId : null
    if (!accountingFirmOrgId && !session.roles.includes("admin_platform")) {
      return Response.json({ error: "Sin organización contable en sesión" }, { status: 403 })
    }

    // Get active producer_accountant_links for this firm
    let linksQuery = db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("status", "==", "active")

    if (accountingFirmOrgId) {
      linksQuery = linksQuery.where("accountingFirmId", "==", accountingFirmOrgId) as typeof linksQuery
    }

    const linksSnap = await linksQuery.get()
    const clientOrgIds = linksSnap.docs.map((d) => d.data().producerOrganizationId as string).filter(Boolean)

    if (clientOrgIds.length === 0) {
      return Response.json({ totalClients: 0, completeCount: 0, incompleteCount: 0 })
    }

    // Fetch organizations in batches of 10 (Firestore `in` limit)
    const CHUNK = 10
    let completeCount = 0
    let incompleteCount = 0

    for (let i = 0; i < clientOrgIds.length; i += CHUNK) {
      const chunk = clientOrgIds.slice(i, i + CHUNK)
      const orgsSnap = await db
        .collection(COLLECTIONS.ORGANIZATIONS)
        .where("__name__", "in", chunk)
        .get()

      for (const doc of orgsSnap.docs) {
        const folderStatus = doc.data().folderStatus
        if (folderStatus === "complete") {
          completeCount++
        } else {
          incompleteCount++
        }
      }
    }

    return Response.json({
      totalClients: clientOrgIds.length,
      completeCount,
      incompleteCount,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
