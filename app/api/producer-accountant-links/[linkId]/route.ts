import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import {
  assertActiveMembership,
  getAuthErrorResponse,
  isAccountantRole,
  isAdminPlatform,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { writeAuditLog } from "@/lib/firebase/audit"
import { COLLECTIONS } from "@/lib/firebase/collections"

interface RouteContext {
  params: Promise<{ linkId: string }>
}

const decisionSchema = z.object({
  status: z.enum(["active", "rejected"]),
})

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await verifyRequestSession(request)
    if (!isAdminPlatform(session) && !isAccountantRole(session)) {
      return Response.json({ error: "No tenes permisos para decidir este vinculo" }, { status: 403 })
    }

    const { linkId } = await context.params
    const body = decisionSchema.parse(await request.json())
    const db = getAdminDb()
    const linkRef = db.collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS).doc(linkId)
    const linkSnap = await linkRef.get()

    if (!linkSnap.exists) {
      return Response.json({ error: "Vinculo no encontrado" }, { status: 404 })
    }

    const link = linkSnap.data() ?? {}
    const accountingFirmId =
      typeof link.accountingFirmId === "string" ? link.accountingFirmId : null

    if (!accountingFirmId) {
      return Response.json({ error: "El vinculo no tiene estudio contable asociado" }, { status: 400 })
    }

    await assertActiveMembership(session, accountingFirmId)

    await linkRef.update({
      status: body.status,
      accountantUid: body.status === "active" ? session.uid : link.accountantUid ?? null,
      decidedBy: session.uid,
      decidedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: accountingFirmId,
      action: `producer_accountant_link.${body.status}`,
      targetType: "producer_accountant_link",
      targetId: linkId,
      metadata: {
        systemUserOrganizationId: link.systemUserOrganizationId ?? link.producerId ?? null,
      },
    })

    return Response.json({ ok: true, status: body.status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
