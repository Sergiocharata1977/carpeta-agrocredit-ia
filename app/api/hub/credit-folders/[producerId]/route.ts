import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { validateApiKeyFromHeader } from "@/lib/services/api-keys"

interface RouteContext {
  params: Promise<{ producerId: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { producerId } = await params

  const auth = await validateApiKeyFromHeader(
    request.headers.get("Authorization"),
    "credit_folders:read",
  )
  if (!auth.valid) {
    return Response.json({ error: auth.error }, { status: 401 })
  }

  const db = getAdminDb()

  // Verificar acceso según tipo de organización
  const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(auth.organizationId).get()
  const orgType = orgSnap.data()?.type as string | undefined
  let hasAccess = false

  if (orgType === "accounting_firm") {
    const linkSnap = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("accountingFirmId", "==", auth.organizationId)
      .where("systemUserOrganizationId", "==", producerId)
      .where("status", "==", "active")
      .limit(1)
      .get()
    hasAccess = !linkSnap.empty
  } else {
    const now = new Date().toISOString()
    const grantSnap = await db
      .collection(COLLECTIONS.ACCESS_GRANTS)
      .where("grantedToOrganizationId", "==", auth.organizationId)
      .where("targetOrganizationId", "==", producerId)
      .where("status", "==", "approved")
      .limit(1)
      .get()
    hasAccess = grantSnap.docs.some((d) => {
      const exp = d.data().expiresAt as string | null
      return !exp || exp > now
    })
  }

  if (!hasAccess) {
    return Response.json({ error: "Acceso denegado a esta carpeta crediticia" }, { status: 403 })
  }

  const [producerSnap, profileSnap] = await Promise.all([
    db.collection(COLLECTIONS.ORGANIZATIONS).doc(producerId).get(),
    db.collection(COLLECTIONS.ORGANIZATION_PROFILES).doc(producerId).get(),
  ])

  if (!producerSnap.exists) {
    return Response.json({ error: "Productor no encontrado" }, { status: 404 })
  }

  const producer = producerSnap.data()!
  const profile = profileSnap.exists ? profileSnap.data() : null

  await writeAuditLog({
    actorUid: `api_key:${auth.keyId}`,
    actorOrganizationId: auth.organizationId,
    action: "hub.credit_folder.read",
    targetType: "organization",
    targetId: producerId,
    metadata: { producerId },
  })

  return Response.json({
    producer: {
      id: producerId,
      legalName: producer.legalName ?? null,
      taxId: producer.taxId ?? null,
      status: producer.status ?? null,
    },
    profile: profile
      ? {
          taxCondition: profile.taxCondition ?? null,
          ownHectares: profile.ownHectares ?? null,
          rentedHectares: profile.rentedHectares ?? null,
          mainCrops: profile.mainCrops ?? null,
          estimatedAnnualSales: profile.estimatedAnnualSales ?? null,
          estimatedAnnualSalesCurrency: profile.estimatedAnnualSalesCurrency ?? null,
          updatedAt: profile.updatedAt?.toDate?.()?.toISOString() ?? null,
        }
      : null,
  })
}
