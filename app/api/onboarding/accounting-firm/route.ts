import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession } from "@/lib/auth/server-session"
import { accountingFirmOnboardingSchema } from "@/lib/schemas/onboarding"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    const body = await request.json()
    const data = accountingFirmOnboardingSchema.omit({ registration: true }).parse(body)

    const db = getAdminDb()
    const batch = db.batch()
    const now = FieldValue.serverTimestamp()

    const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()
    batch.set(orgRef, {
      type: "accounting_firm",
      legalName: data.firm.legalName,
      taxId: data.firm.taxId,
      contactName: data.firm.contactName,
      contactPhone: data.firm.contactPhone ?? null,
      status: "active",
      createdBy: session.uid,
      createdAt: now,
      updatedAt: now,
    })

    const memberRef = db.collection(COLLECTIONS.ORGANIZATION_MEMBERS).doc(`${orgRef.id}_${session.uid}`)
    batch.set(memberRef, {
      organizationId: orgRef.id,
      uid: session.uid,
      role: "accountant",
      status: "active",
      invitedBy: null,
      createdAt: now,
      updatedAt: now,
    })

    await batch.commit()

    await getAdminAuth().setCustomUserClaims(session.uid, {
      roles: ["accountant"],
      defaultOrganizationId: orgRef.id,
    })

    await db.collection(COLLECTIONS.USERS).doc(session.uid).update({
      roles: ["accountant"],
      defaultOrganizationId: orgRef.id,
      status: "active",
      updatedAt: now,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: orgRef.id,
      action: "organization.accounting_firm_created",
      targetType: "organization",
      targetId: orgRef.id,
      metadata: { legalName: data.firm.legalName },
    })

    return Response.json({ organizationId: orgRef.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 })
    }
    console.error("[onboarding/accounting-firm] Error:", error)
    return Response.json({ error: "Error interno al crear el estudio contable" }, { status: 500 })
  }
}
