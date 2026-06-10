import { NextRequest } from "next/server"
import { z } from "zod"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import {
  AuthError,
  assertActiveMembership,
  getAuthErrorResponse,
  isAccountantRole,
  isAdminPlatform,
  isProducerRole,
  requireDefaultOrganization,
  verifyRequestSession,
  type ServerSession,
} from "@/lib/auth/server-session"
import { upsertProducerProfileSchema } from "@/lib/schemas/producer-profile"
import type { Organization } from "@/types/auth"
import type { OrganizationProfile } from "@/types/producer-profile"

interface RouteContext {
  params: Promise<{ orgId: string }>
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

function serializeProfile(
  id: string,
  data: FirebaseFirestore.DocumentData,
): OrganizationProfile {
  return {
    id,
    organizationId: typeof data.organizationId === "string" ? data.organizationId : id,
    taxCondition: data.taxCondition,
    taxCategory: data.taxCategory,
    activitiesAfip: Array.isArray(data.activitiesAfip) ? data.activitiesAfip : undefined,
    registrationYear: data.registrationYear,
    hasEmployees: data.hasEmployees,
    employeesCount: data.employeesCount,
    ownHectares: data.ownHectares,
    rentedHectares: data.rentedHectares,
    mainCrops: Array.isArray(data.mainCrops) ? data.mainCrops : undefined,
    estimatedProduction: data.estimatedProduction,
    currentCampaign: data.currentCampaign,
    mainMachinery: data.mainMachinery,
    estimatedAnnualSales: data.estimatedAnnualSales,
    estimatedAnnualSalesCurrency: data.estimatedAnnualSalesCurrency,
    bankDebts: data.bankDebts,
    bankDebtsCurrency: data.bankDebtsCurrency,
    issuedChecks: data.issuedChecks,
    rejectedChecks: data.rejectedChecks,
    activeLoans: data.activeLoans,
    ruralCards: data.ruralCards,
    commercialQuotas: data.commercialQuotas,
    summaryOwnFields: data.summaryOwnFields,
    summaryMachinery: data.summaryMachinery,
    summaryVehicles: data.summaryVehicles,
    summarySiloBolsa: data.summarySiloBolsa,
    summaryLivestock: data.summaryLivestock,
    updatedBy: typeof data.updatedBy === "string" ? data.updatedBy : "",
    updatedAt: toIsoString(data.updatedAt),
    createdAt: toIsoString(data.createdAt),
  }
}

async function getProfileTargetOrganization(orgId: string): Promise<Organization> {
  const snap = await getAdminDb().collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get()
  if (!snap.exists) {
    throw new AuthError("Organizacion no encontrada", 404)
  }

  const organization = { id: snap.id, ...snap.data() } as Organization
  if (
    organization.type !== "system_user" &&
    organization.type !== "system_user_entity"
  ) {
    throw new AuthError("La organizacion no admite perfil de productor", 400)
  }

  return organization
}

async function assertCanAccessProfile(
  session: ServerSession,
  orgId: string,
): Promise<Organization> {
  const organization = await getProfileTargetOrganization(orgId)
  const rootOrganizationId = organization.parentOrganizationId ?? orgId

  if (isAdminPlatform(session)) return organization

  if (isProducerRole(session)) {
    await assertActiveMembership(session, rootOrganizationId)
    return organization
  }

  if (isAccountantRole(session)) {
    const accountingFirmId = requireDefaultOrganization(session)
    await assertActiveMembership(session, accountingFirmId)

    const db = getAdminDb()
    const [canonicalLink, legacyLink] = await Promise.all([
      db
        .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
        .where("accountingFirmId", "==", accountingFirmId)
        .where("systemUserOrganizationId", "==", rootOrganizationId)
        .where("status", "==", "active")
        .limit(1)
        .get(),
      db
        .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
        .where("accountingFirmId", "==", accountingFirmId)
        .where("producerId", "==", rootOrganizationId)
        .where("status", "==", "active")
        .limit(1)
        .get(),
    ])

    if (!canonicalLink.empty || !legacyLink.empty) {
      return organization
    }
  }

  throw new AuthError("No tenes permisos para operar este perfil", 403)
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { orgId } = await params
    const session = await verifyRequestSession(request)
    const organization = await assertCanAccessProfile(session, orgId)

    const snap = await getAdminDb()
      .collection(COLLECTIONS.ORGANIZATION_PROFILES)
      .doc(orgId)
      .get()

    return Response.json({
      profile: snap.exists ? serializeProfile(snap.id, snap.data() ?? {}) : null,
      organization: {
        legalName: organization.legalName ?? null,
        taxId: organization.taxId ?? null,
        type: organization.type,
        status: organization.status ?? null,
      },
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return getAuthErrorResponse(error)
    }

    console.error("[producer-profile][GET] Error:", error)
    return Response.json({ error: "Error interno al cargar el perfil" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { orgId } = await params
    const session = await verifyRequestSession(request)
    const organization = await assertCanAccessProfile(session, orgId)
    const data = upsertProducerProfileSchema.parse(await request.json())

    const db = getAdminDb()
    const profileRef = db.collection(COLLECTIONS.ORGANIZATION_PROFILES).doc(orgId)
    const existing = await profileRef.get()
    const now = FieldValue.serverTimestamp()

    await profileRef.set(
      {
        ...data,
        organizationId: orgId,
        folderOwnerOrganizationId: organization.parentOrganizationId ?? orgId,
        updatedBy: session.uid,
        updatedAt: now,
        ...(existing.exists ? {} : { createdAt: now }),
      },
      { merge: true },
    )

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "organization.updated",
      targetType: "organization_profile",
      targetId: orgId,
      metadata: { fields: Object.keys(data) },
    })

    const updated = await profileRef.get()
    return Response.json({
      profile: serializeProfile(updated.id, updated.data() ?? {}),
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    if (error instanceof AuthError) {
      return getAuthErrorResponse(error)
    }

    console.error("[producer-profile][PATCH] Error:", error)
    return Response.json({ error: "Error interno al guardar el perfil" }, { status: 500 })
  }
}
