import { NextRequest } from "next/server"
import { z } from "zod"
import {
  assertActiveMembership,
  getAuthErrorResponse,
  isAccountantRole,
  requireDefaultOrganization,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import type { DocumentData } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { AgroActivity } from "@/types/auth"

const AGRO_ACTIVITIES: AgroActivity[] = [
  "agriculture",
  "livestock",
  "mixed",
  "horticulture",
  "forestry",
  "other",
]

function isAgroActivity(value: unknown): value is AgroActivity {
  return typeof value === "string" && (AGRO_ACTIVITIES as string[]).includes(value)
}

function toIsoString(value: unknown): string {
  if (typeof value === "string") return value
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString()
  }
  return ""
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

export interface EmpresaItem {
  id: string
  legalName: string
  taxId: string
  activity: AgroActivity
  province: string
  city: string
  entityOwnersText?: string
  parentOrganizationId: string
  parentLegalName: string
  createdAt: string
}

function serializeEmpresa(id: string, data: DocumentData, parentLegalName: string): EmpresaItem {
  return {
    id,
    legalName: typeof data.legalName === "string" ? data.legalName : "Empresa sin nombre",
    taxId: typeof data.taxId === "string" ? data.taxId : "",
    activity: isAgroActivity(data.activity) ? data.activity : "other",
    province: typeof data.province === "string" ? data.province : "",
    city: typeof data.city === "string" ? data.city : "",
    entityOwnersText: optionalString(data.entityOwnersText),
    parentOrganizationId: typeof data.parentOrganizationId === "string" ? data.parentOrganizationId : "",
    parentLegalName,
    createdAt: toIsoString(data.createdAt),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)

    if (!isAccountantRole(session)) {
      return Response.json({ error: "No tenes permisos para ver las empresas" }, { status: 403 })
    }

    const accountingFirmId = requireDefaultOrganization(session)
    await assertActiveMembership(session, accountingFirmId)

    const db = getAdminDb()

    const linksSnapshot = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("accountingFirmId", "==", accountingFirmId)
      .where("status", "==", "active")
      .get()

    const clientOrgIds = [
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

    if (clientOrgIds.length === 0) {
      return Response.json({ empresas: [] })
    }

    const parentRefs = clientOrgIds.map((id) => db.collection(COLLECTIONS.ORGANIZATIONS).doc(id))
    const parentSnaps = await db.getAll(...parentRefs)
    const parentNameMap = new Map<string, string>()
    for (const snap of parentSnaps) {
      if (snap.exists) {
        const name = snap.data()?.legalName
        parentNameMap.set(snap.id, typeof name === "string" ? name : "Cliente sin nombre")
      }
    }

    // Firestore "in" operator max 30 items — procesar en lotes
    const BATCH_SIZE = 30
    const empresas: EmpresaItem[] = []

    for (let i = 0; i < clientOrgIds.length; i += BATCH_SIZE) {
      const batch = clientOrgIds.slice(i, i + BATCH_SIZE)
      const snap = await db
        .collection(COLLECTIONS.ORGANIZATIONS)
        .where("parentOrganizationId", "in", batch)
        .where("type", "==", "system_user_entity")
        .get()

      for (const doc of snap.docs) {
        const data = doc.data()
        const parentId = typeof data.parentOrganizationId === "string" ? data.parentOrganizationId : ""
        const parentName = parentNameMap.get(parentId) ?? "Cliente sin nombre"
        empresas.push(serializeEmpresa(doc.id, data, parentName))
      }
    }

    empresas.sort((a, b) => a.legalName.localeCompare(b.legalName, "es"))

    return Response.json({ empresas })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Parametros invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
