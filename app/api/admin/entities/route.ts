import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import {
  verifyRequestSession,
  requireAnyRole,
  getAuthErrorResponse,
} from "@/lib/auth/server-session"
import { adminCreateRequestingEntitySchema } from "@/lib/schemas/onboarding"
import { FieldValue } from "firebase-admin/firestore"

/**
 * Alta de entidad solicitante (banco/financiera/agro/maquinaria/insumos) por el
 * super admin para administrarla desde la plataforma.
 *
 * A diferencia de /api/onboarding/requesting-entity, NO crea usuario, NO crea
 * membership y NO toca los claims del admin: solo crea la organización. El admin
 * la deja activa; los usuarios de la entidad se vinculan después por invitación.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const body = await request.json().catch(() => ({}))
    const data = adminCreateRequestingEntitySchema.parse(body)

    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()
    const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()

    await orgRef.set({
      type: "requesting_entity",
      subtype: data.subtype,
      legalName: data.legalName,
      taxId: data.taxId,
      contactName: data.contactName ?? null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone ?? null,
      sector: data.sector ?? null,
      status: "active",
      createdBy: session.uid,
      createdByAdmin: true,
      createdAt: now,
      updatedAt: now,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "organization.requesting_entity_created",
      targetType: "organization",
      targetId: orgRef.id,
      metadata: { subtype: data.subtype, legalName: data.legalName, byAdmin: true },
    })

    return Response.json({ organizationId: orgRef.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: error.issues[0]?.message ?? "Datos inválidos", issues: error.issues },
        { status: 400 },
      )
    }
    return getAuthErrorResponse(error)
  }
}
