import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { assertCanDecideAccess, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { getAuthErrorResponse, verifyRequestSession } from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"

const directGrantSchema = z.object({
  targetOrganizationId: z.string().min(1),
  grantedToOrganizationId: z.string().min(1),
  allowedScopes: z.array(z.enum([
    "profile_basic",
    "accounting_summary",
    "balance_sheets",
    "income_statements",
    "tax_documents",
    "assets",
    "liabilities",
    "documents",
    "full_credit_folder",
  ])).min(1),
  approvedDays: z.number().int().min(1).max(365),
  purpose: z.string().min(1).max(500),
})

export async function POST(request: Request) {
  try {
    const session = await verifyRequestSession(request)
    const input = directGrantSchema.parse(await request.json())
    const targetOrg = await assertCanDecideAccess(session, input.targetOrganizationId)

    const db = getAdminDb()
    const recipientSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(input.grantedToOrganizationId).get()
    if (!recipientSnap.exists || recipientSnap.data()?.type !== "requesting_entity") {
      return Response.json({ error: "La cuenta destino no es una entidad habilitada del sistema" }, { status: 404 })
    }
    if (recipientSnap.data()?.status !== "active") {
      return Response.json({ error: "La entidad destino no esta activa" }, { status: 409 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + input.approvedDays * 24 * 60 * 60 * 1000)
    const grantRef = db.collection(COLLECTIONS.ACCESS_GRANTS).doc()

    await grantRef.set({
      targetOrganizationId: input.targetOrganizationId,
      targetScope: "single_organization",
      accessRequestId: null,
      source: "direct_habilitation",
      grantedToOrganizationId: input.grantedToOrganizationId,
      allowedScopes: input.allowedScopes,
      purpose: input.purpose,
      startsAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "approved",
      grantedBy: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "access_grant.created",
      targetType: "access_grant",
      targetId: grantRef.id,
      metadata: {
        source: "direct_habilitation",
        targetOrganizationId: targetOrg.id,
        grantedToOrganizationId: input.grantedToOrganizationId,
        allowedScopes: input.allowedScopes,
        approvedDays: input.approvedDays,
        expiresAt: expiresAt.toISOString(),
      },
    })

    await notifyOrganizationUsers({
      organizationId: input.grantedToOrganizationId,
      type: "access_grant_created",
      payload: {
        grantId: grantRef.id,
        targetOrganizationId: input.targetOrganizationId,
        expiresAt: expiresAt.toISOString(),
      },
    })

    return Response.json({ id: grantRef.id, status: "approved", expiresAt: expiresAt.toISOString() }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
