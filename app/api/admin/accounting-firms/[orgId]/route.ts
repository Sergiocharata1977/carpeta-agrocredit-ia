import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"
import { AR_PROVINCES } from "@/lib/constants/provinces"

interface RouteContext {
  params: Promise<{ orgId: string }>
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }
  if (typeof value === "string") return value
  return null
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const { orgId } = await context.params
    const snap = await getAdminDb().collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get()
    if (!snap.exists || snap.data()?.type !== "accounting_firm") {
      return Response.json({ error: "Estudio contable no encontrado" }, { status: 404 })
    }

    const data = snap.data()!
    return Response.json({
      firm: {
        id: snap.id,
        ...data,
        createdAt: timestampToIso(data.createdAt),
        updatedAt: timestampToIso(data.updatedAt),
      },
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

const patchFirmSchema = z.object({
  legalName: z.string().min(2).max(120).optional(),
  contactName: z.string().min(2).max(100).optional(),
  contactPhone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(120).optional().or(z.literal("")),
  city: z.string().max(60).optional().or(z.literal("")),
  province: z.enum(AR_PROVINCES).optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
  licenseNumber: z.string().max(40).optional().or(z.literal("")),
  professionalCouncil: z.enum(AR_PROVINCES).optional(),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const { orgId } = await context.params
    const db = getAdminDb()
    const snap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get()
    if (!snap.exists || snap.data()?.type !== "accounting_firm") {
      return Response.json({ error: "Estudio contable no encontrado" }, { status: 404 })
    }

    const body = patchFirmSchema.parse(await request.json())
    if (Object.keys(body).length === 0) {
      return Response.json({ error: "No hay campos para actualizar" }, { status: 400 })
    }

    // El consejo profesional siempre debe coincidir con la provincia del estudio
    const nextProvince = body.province ?? snap.data()?.province
    const nextCouncil = body.professionalCouncil ?? snap.data()?.professionalCouncil
    if (nextProvince && nextCouncil && nextProvince !== nextCouncil) {
      return Response.json(
        { error: "El consejo profesional debe coincidir con la provincia del estudio" },
        { status: 400 },
      )
    }

    await db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).update({
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "accounting_firm.updated",
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
