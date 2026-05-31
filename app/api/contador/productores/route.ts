import { NextRequest } from "next/server"
import { z } from "zod"
import {
  assertActiveMembership,
  getAuthErrorResponse,
  isAccountantRole,
  isAdminPlatform,
  requireDefaultOrganization,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import type { DocumentData } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { AgroActivity, FolderStatus } from "@/types/auth"
import type { Producer } from "@/types/producer"

const FOLDER_STATUSES = [
  "incomplete",
  "in_progress",
  "complete",
  "under_review",
  "outdated",
  "archived",
] as const satisfies readonly FolderStatus[]

const AGRO_ACTIVITIES = [
  "agriculture",
  "livestock",
  "mixed",
  "horticulture",
  "forestry",
  "other",
] as const satisfies readonly AgroActivity[]

function isAgroActivity(value: unknown): value is AgroActivity {
  return typeof value === "string" && AGRO_ACTIVITIES.includes(value as AgroActivity)
}

function isFolderStatus(value: unknown): value is FolderStatus {
  return typeof value === "string" && FOLDER_STATUSES.includes(value as FolderStatus)
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString()
  }

  return ""
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function serializeProducer(id: string, data: DocumentData): Producer {
  return {
    id,
    organizationId: id,
    taxId: typeof data.taxId === "string" ? data.taxId : "",
    legalName: typeof data.legalName === "string" ? data.legalName : "Usuario sin nombre",
    personType: data.personType === "physical" ? "physical" : "legal",
    activity: isAgroActivity(data.activity) ? data.activity : "other",
    province: typeof data.province === "string" ? data.province : "",
    city: typeof data.city === "string" ? data.city : "",
    address: optionalString(data.address),
    phone: optionalString(data.phone),
    email: optionalString(data.email),
    folderStatus: isFolderStatus(data.folderStatus) ? data.folderStatus : "incomplete",
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    createdBy: typeof data.createdBy === "string" ? data.createdBy : "",
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)

    if (!isAdminPlatform(session) && !isAccountantRole(session)) {
      return Response.json({ error: "No tenes permisos para ver estos usuarios" }, { status: 403 })
    }

    const db = getAdminDb()

    if (isAdminPlatform(session) && !isAccountantRole(session)) {
      const snapshot = await db
        .collection(COLLECTIONS.ORGANIZATIONS)
        .where("type", "==", "system_user")
        .where("status", "==", "active")
        .limit(100)
        .get()

      const producers = snapshot.docs
        .map((doc) => serializeProducer(doc.id, doc.data()))
        .sort((a, b) => a.legalName.localeCompare(b.legalName, "es"))

      return Response.json({ producers })
    }

    const accountingFirmId = requireDefaultOrganization(session)
    await assertActiveMembership(session, accountingFirmId)

    const linksSnapshot = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("accountingFirmId", "==", accountingFirmId)
      .where("status", "==", "active")
      .get()

    const organizationIds = [
      ...new Set(
        linksSnapshot.docs
          .map((doc) => {
            const link = doc.data()
            return typeof link.systemUserOrganizationId === "string"
              ? link.systemUserOrganizationId
              : typeof link.producerId === "string"
                ? link.producerId
                : null
          })
          .filter((id): id is string => Boolean(id)),
      ),
    ]

    if (organizationIds.length === 0) {
      return Response.json({ producers: [] })
    }

    const orgRefs = organizationIds.map((id) => db.collection(COLLECTIONS.ORGANIZATIONS).doc(id))
    const orgSnapshots = await db.getAll(...orgRefs)

    const producers = orgSnapshots
      .filter((doc) => doc.exists)
      .map((doc) => serializeProducer(doc.id, doc.data() ?? {}))
      .filter((producer) => producer.legalName.toLowerCase() !== "usuario sin nombre")
      .sort((a, b) => a.legalName.localeCompare(b.legalName, "es"))

    return Response.json({ producers })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Parametros invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
