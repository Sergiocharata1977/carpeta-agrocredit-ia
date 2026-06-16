import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { getFieldsByOwner } from "@/lib/services/extracted-fields"
import { upsertProfileFromFields } from "@/lib/services/canonical-profile"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fieldId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { fieldId } = await params
    const body = await request.json()
    const action = String(body.action ?? "")
    if (!["confirm", "correct", "reject"].includes(action)) {
      return Response.json({ error: "Accion invalida" }, { status: 400 })
    }

    const db = getAdminDb()
    const ref = db.collection(COLLECTIONS.EXTRACTED_FIELDS).doc(fieldId)
    const snap = await ref.get()
    if (!snap.exists) return Response.json({ error: "Campo no encontrado" }, { status: 404 })
    const field = snap.data()!
    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(session, field.folderOwnerOrganizationId)

    const patch: Record<string, unknown> = {
      reviewedBy: session.uid,
      reviewedAt: new Date().toISOString(),
    }
    let auditAction: "field.confirmed" | "field.corrected" | "field.rejected"
    if (action === "confirm") {
      patch.reviewStatus = "CONFIRMED"
      auditAction = "field.confirmed"
    } else if (action === "correct") {
      patch.reviewStatus = "CORRECTED"
      patch.normalizedValue = body.value ?? null
      patch.correctionReason = body.reason ?? null
      auditAction = "field.corrected"
    } else {
      patch.reviewStatus = "REJECTED"
      patch.correctionReason = body.reason ?? null
      auditAction = "field.rejected"
    }
    await ref.update(patch)
    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: auditAction,
      targetType: "extracted_field",
      targetId: fieldId,
      metadata: { folderOwnerOrganizationId },
    })
    const fields = await getFieldsByOwner(folderOwnerOrganizationId)
    await upsertProfileFromFields(folderOwnerOrganizationId, fields, {
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
    })
    await ref.update({ updatedAt: FieldValue.serverTimestamp() })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
