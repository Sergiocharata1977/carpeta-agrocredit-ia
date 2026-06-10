import { NextRequest } from "next/server"
import {
  assertActiveMembership,
  getAuthErrorResponse,
  isAccountantRole,
  isAdminPlatform,
  requireDefaultOrganization,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    if (!isAccountantRole(session) && !isAdminPlatform(session)) {
      return Response.json({ error: "No tenes permisos" }, { status: 403 })
    }

    const accountingFirmId = requireDefaultOrganization(session)
    await assertActiveMembership(session, accountingFirmId)

    const db = getAdminDb()
    const snapshot = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("accountingFirmId", "==", accountingFirmId)
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .get()

    if (snapshot.empty) {
      return Response.json({ links: [] })
    }

    const orgIds = [
      ...new Set(
        snapshot.docs
          .map((doc) => {
            const data = doc.data()
            return (data.systemUserOrganizationId ?? data.producerId) as string | undefined
          })
          .filter((id): id is string => Boolean(id)),
      ),
    ]

    const orgRefs = orgIds.map((id) =>
      db.collection(COLLECTIONS.ORGANIZATIONS).doc(id),
    )
    const orgSnaps = orgIds.length > 0 ? await db.getAll(...orgRefs) : []
    const orgMap = new Map(orgSnaps.map((snap) => [snap.id, snap.data()]))

    const links = snapshot.docs.map((doc) => {
      const data = doc.data()
      const orgId = data.systemUserOrganizationId ?? data.producerId
      const org = orgId ? orgMap.get(orgId) : null
      return {
        id: doc.id,
        status: data.status,
        systemUserOrganizationId: (data.systemUserOrganizationId as string | null) ?? null,
        producerId: (data.producerId as string | null) ?? null,
        accountingFirmId: data.accountingFirmId as string,
        organizationLegalName: (org?.legalName as string | null) ?? null,
        taxId: (org?.taxId as string | null) ?? null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      }
    })

    return Response.json({ links })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
