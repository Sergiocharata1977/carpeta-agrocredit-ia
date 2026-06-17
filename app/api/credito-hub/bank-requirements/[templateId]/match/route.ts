import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireActiveOrg,
  getAuthErrorResponse,
  isAdminPlatform,
  isFinancialEntity,
  AuthError,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { assertEntityGrant } from "@/lib/auth/entity-grant"
import { matchRequirements } from "@/lib/services/requirement-matching"
import { getCreditApplication } from "@/lib/services/credit-applications"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    await params
    const body = await request.json()
    const creditApplicationId = String(body.creditApplicationId ?? "")
    if (!creditApplicationId) return Response.json({ error: "creditApplicationId requerido" }, { status: 400 })

    const application = await getCreditApplication(creditApplicationId)
    if (!application) return Response.json({ error: "Solicitud de credito no encontrada" }, { status: 404 })
    // Autorizacion: admin, o la entidad solicitante con grant vigente, o quien gestiona el legajo.
    if (!isAdminPlatform(session)) {
      if (
        isFinancialEntity(session) &&
        session.defaultOrganizationId === application.requestingEntityOrganizationId
      ) {
        await assertEntityGrant(session.defaultOrganizationId, application.folderOwnerOrganizationId)
      } else {
        await assertCanManageAccountingFolder(session, application.folderOwnerOrganizationId)
      }
    } else if (!session.defaultOrganizationId) {
      throw new AuthError("La sesion no tiene organizacion por defecto", 403)
    }

    const matches = await matchRequirements({
      creditApplicationId,
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
    })
    return Response.json({ matches })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
