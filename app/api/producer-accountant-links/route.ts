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

const requestLinkSchema = z.object({
  accountingFirmId: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    if (!isProducerRole(session) && !isAdminPlatform(session)) {
      return Response.json({ error: "No tenes permisos" }, { status: 403 })
    }

    const producerOrgId = requireDefaultOrganization(session)
    const db = getAdminDb()

    const snapshot = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("systemUserOrganizationId", "==", producerOrgId)
      .orderBy("createdAt", "desc")
      .get()

    if (snapshot.empty) {
      return Response.json({ links: [] })
    }

    const firmIds = [
      ...new Set(
        snapshot.docs
          .map((doc) => doc.data().accountingFirmId as string)
          .filter(Boolean),
      ),
    ]

    const firmRefs = firmIds.map((id) =>
      db.collection(COLLECTIONS.ORGANIZATIONS).doc(id),
    )
    const firmSnaps = firmIds.length > 0 ? await db.getAll(...firmRefs) : []
    const firmMap = new Map(firmSnaps.map((snap) => [snap.id, snap.data()]))

    const links = snapshot.docs.map((doc) => {
      const data = doc.data()
      const firm = firmMap.get(data.accountingFirmId)
      return {
        id: doc.id,
        status: data.status ?? "pending",
        accountingFirmId: data.accountingFirmId,
        firmLegalName: firm?.legalName ?? null,
        firmTaxId: firm?.taxId ?? null,
        firmContactEmail: firm?.contactEmail ?? null,
        isMain: data.isMain ?? false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
      }
    })

    return Response.json({ links })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    if (!isProducerRole(session) && !isAdminPlatform(session)) {
      return Response.json({ error: "Solo un usuario puede solicitar un vinculo" }, { status: 403 })
    }

    const producerOrgId = requireDefaultOrganization(session)
    const body = requestLinkSchema.parse(await request.json())
    const db = getAdminDb()

    const firmSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(body.accountingFirmId).get()
    if (!firmSnap.exists || firmSnap.data()?.type !== "accounting_firm") {
      return Response.json({ error: "Estudio contable no encontrado" }, { status: 404 })
    }
    if (firmSnap.data()?.status !== "active") {
      return Response.json({ error: "El estudio contable no esta habilitado por la plataforma" }, { status: 400 })
    }

    const existingSnap = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("systemUserOrganizationId", "==", producerOrgId)
      .where("accountingFirmId", "==", body.accountingFirmId)
      .where("status", "in", ["active", "pending"])
      .limit(1)
      .get()

    if (!existingSnap.empty) {
      const existing = existingSnap.docs[0].data()
      const msg =
        existing.status === "active"
          ? "Ya tenes un vinculo activo con ese estudio"
          : "Ya tenes una solicitud pendiente con ese estudio"
      return Response.json({ error: msg }, { status: 409 })
    }

    await assertActiveMembership(session, producerOrgId)

    const ref = await db.collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS).add({
      systemUserOrganizationId: producerOrgId,
      accountingFirmId: body.accountingFirmId,
      requestedByUid: session.uid,
      status: "pending",
      isMain: true,
      canUpload: true,
      canAuthorize: false,
      createdBy: session.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: producerOrgId,
      action: "producer_accountant_link.requested",
      targetType: "producer_accountant_link",
      targetId: ref.id,
      metadata: { accountingFirmId: body.accountingFirmId },
    })

    return Response.json({ ok: true, linkId: ref.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }
    return getAuthErrorResponse(error)
  }
}
