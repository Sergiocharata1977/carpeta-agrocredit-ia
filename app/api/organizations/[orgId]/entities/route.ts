import { NextRequest } from "next/server"
import { z } from "zod"
import { FieldValue, QueryDocumentSnapshot } from "firebase-admin/firestore"
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
import { addEntitySchema } from "@/lib/schemas/onboarding"
import type { Organization } from "@/types/auth"

interface RouteContext {
  params: Promise<{ orgId: string }>
}

async function getParentSystemUser(orgId: string): Promise<Organization> {
  const snap = await getAdminDb().collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get()
  if (!snap.exists) {
    throw new AuthError("Organizacion no encontrada", 404)
  }

  const organization = { id: snap.id, ...snap.data() } as Organization
  if (organization.type !== "system_user") {
    throw new AuthError("La organizacion padre debe ser un Usuario del sistema", 400)
  }

  return organization
}

async function assertCanManageEntities(
  session: ServerSession,
  orgId: string,
): Promise<Organization> {
  const parent = await getParentSystemUser(orgId)

  if (isAdminPlatform(session)) return parent

  if (isProducerRole(session)) {
    await assertActiveMembership(session, orgId)
    return parent
  }

  if (isAccountantRole(session)) {
    const accountingFirmId = requireDefaultOrganization(session)
    await assertActiveMembership(session, accountingFirmId)

    const db = getAdminDb()
    const [canonicalLink, legacyLink] = await Promise.all([
      db
        .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
        .where("accountingFirmId", "==", accountingFirmId)
        .where("systemUserOrganizationId", "==", orgId)
        .where("status", "==", "active")
        .limit(1)
        .get(),
      db
        .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
        .where("accountingFirmId", "==", accountingFirmId)
        .where("producerId", "==", orgId)
        .where("status", "==", "active")
        .limit(1)
        .get(),
    ])

    if (!canonicalLink.empty || !legacyLink.empty) {
      return parent
    }
  }

  throw new AuthError("No tenes permisos para operar empresas de este cliente", 403)
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { orgId } = await params
    const session = await verifyRequestSession(request)
    await assertCanManageEntities(session, orgId)

    const snap = await getAdminDb()
      .collection(COLLECTIONS.ORGANIZATIONS)
      .where("parentOrganizationId", "==", orgId)
      .where("type", "==", "system_user_entity")
      .get()

    const entities = snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }))
    return Response.json({ entities })
  } catch (error) {
    if (error instanceof AuthError) {
      return getAuthErrorResponse(error)
    }

    console.error("[organizations/entities GET] Error:", error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { orgId } = await params
    const session = await verifyRequestSession(request)
    await assertCanManageEntities(session, orgId)

    const data = addEntitySchema.parse(await request.json())
    const now = FieldValue.serverTimestamp()

    const entityRef = await getAdminDb().collection(COLLECTIONS.ORGANIZATIONS).add({
      type: "system_user_entity",
      parentOrganizationId: orgId,
      folderOwnerOrganizationId: orgId,
      legalName: data.legalName,
      taxId: data.taxId,
      activity: data.activity,
      province: data.province,
      city: data.city,
      entityOwnersText: data.entityOwnersText ?? "",
      status: "active",
      folderStatus: "incomplete",
      createdBy: session.uid,
      createdAt: now,
      updatedAt: now,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "organization.entity_added",
      targetType: "organization",
      targetId: entityRef.id,
      metadata: { parentOrganizationId: orgId, legalName: data.legalName },
    })

    return Response.json({ id: entityRef.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    if (error instanceof AuthError) {
      return getAuthErrorResponse(error)
    }

    console.error("[organizations/entities POST] Error:", error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}
