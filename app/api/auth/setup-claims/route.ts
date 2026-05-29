import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, isAdminPlatform } from "@/lib/auth/server-session"
import { FieldValue } from "firebase-admin/firestore"

const setupClaimsSchema = z.object({
  uid: z.string().min(1),
  role: z.enum(["producer", "accountant", "accounting_firm_admin", "bank_user", "admin_platform"]),
  defaultOrganizationId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    const body = await request.json()
    const data = setupClaimsSchema.parse(body)

    // Solo el propio usuario o un admin pueden setear claims
    if (session.uid !== data.uid && !isAdminPlatform(session)) {
      return Response.json({ error: "Sin permisos para esta acción" }, { status: 403 })
    }

    const db = getAdminDb()
    const auth = getAdminAuth()

    // Verificar que la organización existe
    const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(data.defaultOrganizationId).get()
    if (!orgSnap.exists) {
      return Response.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    // Verificar que el uid es member activo de esa organización
    const memberId = `${data.defaultOrganizationId}_${data.uid}`
    const memberSnap = await db.collection(COLLECTIONS.ORGANIZATION_MEMBERS).doc(memberId).get()
    if (!memberSnap.exists || memberSnap.data()?.status !== "active") {
      return Response.json({ error: "No sos miembro activo de esa organización" }, { status: 403 })
    }

    await auth.setCustomUserClaims(data.uid, {
      roles: [data.role],
      defaultOrganizationId: data.defaultOrganizationId,
    })

    await db.collection(COLLECTIONS.USERS).doc(data.uid).update({
      roles: [data.role],
      defaultOrganizationId: data.defaultOrganizationId,
      status: "active",
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "user.claims_set",
      targetType: "user",
      targetId: data.uid,
      metadata: { role: data.role, defaultOrganizationId: data.defaultOrganizationId },
    })

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 })
    }
    console.error("[setup-claims] Error:", error)
    return Response.json({ error: "Error interno" }, { status: 500 })
  }
}
