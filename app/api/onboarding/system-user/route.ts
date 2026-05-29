import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession } from "@/lib/auth/server-session"
import { systemUserOnboardingSchema } from "@/lib/schemas/onboarding"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    const body = await request.json()
    const data = systemUserOnboardingSchema.omit({ registration: true }).parse(body)

    // El contador puede crear clientes directamente (vínculo activo)
    const createdByAccountant = request.nextUrl.searchParams.get("createdByAccountant") === "true"
    const isAccountantCreating = createdByAccountant && session.roles.some(
      (r) => r === "accountant" || r === "accounting_firm_admin"
    )

    const db = getAdminDb()
    const batch = db.batch()
    const now = FieldValue.serverTimestamp()

    // Crear organización system_user
    const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()
    batch.set(orgRef, {
      type: "system_user",
      legalName: data.organization.legalName,
      taxId: data.organization.taxId,
      personType: data.organization.personType,
      activity: data.organization.activity,
      province: data.organization.province,
      city: data.organization.city,
      phone: data.organization.phone ?? null,
      email: data.organization.email ?? null,
      status: "active",
      folderStatus: "incomplete",
      createdBy: session.uid,
      createdAt: now,
      updatedAt: now,
    })

    // Membresía del usuario en su org raíz
    const memberRef = db.collection(COLLECTIONS.ORGANIZATION_MEMBERS).doc(`${orgRef.id}_${session.uid}`)
    batch.set(memberRef, {
      organizationId: orgRef.id,
      uid: session.uid,
      role: "producer",
      status: "active",
      invitedBy: isAccountantCreating ? session.uid : null,
      createdAt: now,
      updatedAt: now,
    })

    // Empresas hijas (system_user_entity)
    const entityIds: string[] = []
    for (const entity of data.entities) {
      const entityRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()
      batch.set(entityRef, {
        type: "system_user_entity",
        parentOrganizationId: orgRef.id,
        legalName: entity.legalName,
        taxId: entity.taxId,
        activity: entity.activity,
        province: entity.province,
        city: entity.city,
        status: "active",
        folderStatus: "incomplete",
        createdBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
      entityIds.push(entityRef.id)
    }

    // Vínculo con estudio contable (opcional)
    let linkId: string | null = null
    if (data.accountant?.accountingFirmId) {
      const linkRef = db.collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS).doc()
      const linkStatus = isAccountantCreating ? "active" : "pending"
      batch.set(linkRef, {
        systemUserOrganizationId: orgRef.id,
        accountingFirmId: data.accountant.accountingFirmId,
        accountantUid: isAccountantCreating ? session.uid : (data.accountant.accountantUid ?? null),
        status: linkStatus,
        isMain: true,
        canUpload: true,
        canAuthorize: false,
        createdBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
      linkId = linkRef.id
    }

    await batch.commit()

    // Setear custom claims si el propio usuario se está registrando
    if (!isAccountantCreating) {
      const { getAdminAuth } = await import("@/lib/firebase/admin-sdk")
      await getAdminAuth().setCustomUserClaims(session.uid, {
        roles: ["producer"],
        defaultOrganizationId: orgRef.id,
      })
      await db.collection(COLLECTIONS.USERS).doc(session.uid).update({
        roles: ["producer"],
        defaultOrganizationId: orgRef.id,
        status: "active",
        updatedAt: now,
      })
    }

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: orgRef.id,
      action: "organization.system_user_created",
      targetType: "organization",
      targetId: orgRef.id,
      metadata: { entityIds, linkId, isAccountantCreating },
    })

    return Response.json({ organizationId: orgRef.id, entityIds, linkId }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 })
    }
    console.error("[onboarding/system-user] Error:", error)
    return Response.json({ error: "Error interno al crear el usuario del sistema" }, { status: 500 })
  }
}
