import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { assertActiveMembership, isAdminPlatform, verifyRequestSession } from "@/lib/auth/server-session"
import { addEntitySchema } from "@/lib/schemas/onboarding"
import { FieldValue, QueryDocumentSnapshot } from "firebase-admin/firestore"

interface RouteContext {
  params: Promise<{ orgId: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { orgId } = await params
    const session = await verifyRequestSession(request)

    if (!isAdminPlatform(session)) {
      await assertActiveMembership(session, orgId)
    }

    const db = getAdminDb()
    const snap = await db
      .collection(COLLECTIONS.ORGANIZATIONS)
      .where("parentOrganizationId", "==", orgId)
      .where("type", "==", "system_user_entity")
      .get()

    const entities = snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }))
    return Response.json({ entities })
  } catch (error) {
    console.error("[organizations/entities GET] Error:", error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { orgId } = await params
    const session = await verifyRequestSession(request)
    await assertActiveMembership(session, orgId)

    // Verificar que la organización padre es un system_user
    const db = getAdminDb()
    const parentSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get()
    if (!parentSnap.exists || parentSnap.data()?.type !== "system_user") {
      return Response.json({ error: "La organización padre debe ser un Usuario del sistema" }, { status: 400 })
    }

    const body = await request.json()
    const data = addEntitySchema.parse(body)
    const now = FieldValue.serverTimestamp()

    const entityRef = await db.collection(COLLECTIONS.ORGANIZATIONS).add({
      type: "system_user_entity",
      parentOrganizationId: orgId,
      legalName: data.legalName,
      taxId: data.taxId,
      activity: data.activity,
      province: data.province,
      city: data.city,
      status: "active",
      folderStatus: "incomplete",
      createdBy: session.uid,
      createdAt: now,
      updatedAt: now,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: orgId,
      action: "organization.entity_added",
      targetType: "organization",
      targetId: entityRef.id,
      metadata: { parentOrganizationId: orgId, legalName: data.legalName },
    })

    return Response.json({ id: entityRef.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 })
    }
    console.error("[organizations/entities POST] Error:", error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}
