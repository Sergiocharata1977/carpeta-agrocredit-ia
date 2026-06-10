import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import {
  assertActiveMembership,
  getAuthErrorResponse,
  isAdminPlatform,
  isProducerRole,
  requireDefaultOrganization,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { writeAuditLog } from "@/lib/firebase/audit"
import { COLLECTIONS } from "@/lib/firebase/collections"

const AGRO_ACTIVITIES = [
  "agriculture",
  "livestock",
  "mixed",
  "horticulture",
  "forestry",
  "other",
] as const

const patchOrgSchema = z.object({
  legalName: z.string().min(2).max(120).optional(),
  taxId: z.string().min(11).max(11).optional(),
  personType: z.enum(["physical", "legal"]).optional(),
  activity: z.enum(AGRO_ACTIVITIES).optional(),
  province: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  address: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional(),
})

interface RouteContext {
  params: Promise<{ orgId: string }>
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await verifyRequestSession(request)
    const { orgId } = await context.params

    const isOwner =
      isAdminPlatform(session) ||
      (isProducerRole(session) && requireDefaultOrganization(session) === orgId)

    if (!isOwner) {
      return Response.json({ error: "Solo el titular puede actualizar estos datos" }, { status: 403 })
    }

    await assertActiveMembership(session, orgId)

    const db = getAdminDb()
    const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get()
    if (!orgSnap.exists) {
      return Response.json({ error: "Organizacion no encontrada" }, { status: 404 })
    }

    const body = patchOrgSchema.parse(await request.json())
    if (Object.keys(body).length === 0) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    await db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).update({
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: orgId,
      action: "organization.updated",
      targetType: "organization",
      targetId: orgId,
      metadata: { fields: Object.keys(body) },
    })

    return Response.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }
    return getAuthErrorResponse(error)
  }
}
