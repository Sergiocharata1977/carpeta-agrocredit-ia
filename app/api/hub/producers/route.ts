import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { validateApiKeyFromHeader } from "@/lib/services/api-keys"

export async function GET(request: NextRequest) {
  const auth = await validateApiKeyFromHeader(
    request.headers.get("Authorization"),
    "producers:read",
  )
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: 401 })
  }

  const db = getAdminDb()

  const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(auth.organizationId).get()
  const orgType = orgSnap.data()?.type as string | undefined

  let producerIds: string[] = []

  if (orgType === "accounting_firm") {
    const linksSnap = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("accountingFirmId", "==", auth.organizationId)
      .where("status", "==", "active")
      .get()
    producerIds = linksSnap.docs.map((d) => d.data().systemUserOrganizationId as string)
  } else {
    // bank / financial entity / agro_company — acceso via grants
    const grantsSnap = await db
      .collection(COLLECTIONS.ACCESS_GRANTS)
      .where("granteeOrganizationId", "==", auth.organizationId)
      .where("status", "==", "approved")
      .get()

    const now = new Date().toISOString()
    producerIds = grantsSnap.docs
      .filter((d) => {
        const exp = d.data().expiresAt as string | null
        return !exp || exp > now
      })
      .map((d) => d.data().producerOrganizationId as string)
  }

  if (producerIds.length === 0) {
    return Response.json({ producers: [] })
  }

  const uniqueIds = [...new Set(producerIds)]
  const refs = uniqueIds.map((id) => db.collection(COLLECTIONS.ORGANIZATIONS).doc(id))
  const orgs = await db.getAll(...refs)

  const producers = orgs
    .filter((d) => d.exists)
    .map((d) => ({
      id: d.id,
      legalName: d.data()!.legalName ?? null,
      taxId: d.data()!.taxId ?? null,
      status: d.data()!.status ?? null,
    }))

  await writeAuditLog({
    actorUid: `api_key:${auth.keyId}`,
    actorOrganizationId: auth.organizationId,
    action: "hub.producers.list",
    targetType: "organization",
    targetId: auth.organizationId,
    metadata: { count: producers.length },
  })

  return Response.json({ producers })
}
