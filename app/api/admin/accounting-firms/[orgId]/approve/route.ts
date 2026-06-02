import { NextRequest } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const { orgId } = await params
    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()

    const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId)
    const orgSnap = await orgRef.get()
    if (!orgSnap.exists || orgSnap.data()?.type !== "accounting_firm") {
      return Response.json({ error: "Estudio contable no encontrado" }, { status: 404 })
    }

    await orgRef.update({ status: "active", updatedAt: now })

    // Actualizar claims de todos los miembros de la org
    const membersSnap = await db
      .collection(COLLECTIONS.ORGANIZATION_MEMBERS)
      .where("organizationId", "==", orgId)
      .get()

    const auth = getAdminAuth()
    await Promise.all(
      membersSnap.docs.map(async (memberDoc) => {
        const uid = memberDoc.data().uid as string
        const current = await auth.getUser(uid)
        const existing = (current.customClaims ?? {}) as Record<string, unknown>
        await auth.setCustomUserClaims(uid, { ...existing, orgStatus: "active" })
      })
    )

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId ?? "platform",
      action: "admin.accounting_firm_approved",
      targetType: "organization",
      targetId: orgId,
      metadata: { legalName: orgSnap.data()?.legalName },
    })

    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
