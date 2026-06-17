import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireActiveOrg,
  requireAnyRole,
  getAuthErrorResponse,
  isAdminPlatform,
  isFinancialEntity,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { assertEntityGrant } from "@/lib/auth/entity-grant"
import { createCreditApplication, listCreditApplications } from "@/lib/services/credit-applications"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const targetOrganizationId = request.nextUrl.searchParams.get("targetOrganizationId")
    const requestingEntityOrganizationId = request.nextUrl.searchParams.get("requestingEntityOrganizationId")
    let folderOwnerOrganizationId: string | undefined
    if (targetOrganizationId) {
      if (isFinancialEntity(session) && session.defaultOrganizationId) {
        await assertEntityGrant(session.defaultOrganizationId, targetOrganizationId)
        folderOwnerOrganizationId = targetOrganizationId
      } else {
        folderOwnerOrganizationId = (await assertCanManageAccountingFolder(session, targetOrganizationId)).folderOwnerOrganizationId
      }
    }
    const applications = await listCreditApplications({
      folderOwnerOrganizationId,
      requestingEntityOrganizationId: requestingEntityOrganizationId ?? undefined,
    })
    return Response.json({ applications })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const body = await request.json()
    const targetOrganizationId = String(body.targetOrganizationId ?? "")
    const requirementTemplateId = String(body.requirementTemplateId ?? "")
    // Una entidad financiera (no admin) solo puede atribuir la solicitud a su propia org:
    // se ignora el valor del body para evitar suplantacion de otra entidad.
    const requestingEntityOrganizationId =
      isFinancialEntity(session) && !isAdminPlatform(session)
        ? String(session.defaultOrganizationId ?? "")
        : String(body.requestingEntityOrganizationId ?? session.defaultOrganizationId ?? "")
    if (!targetOrganizationId || !requirementTemplateId || !requestingEntityOrganizationId) {
      return Response.json({ error: "targetOrganizationId, requestingEntityOrganizationId y requirementTemplateId son requeridos" }, { status: 400 })
    }
    if (!isAdminPlatform(session)) {
      requireAnyRole(session, ["bank_user", "agro_company_user", "accountant", "accounting_firm_admin", "producer"])
    }
    let folderOwnerOrganizationId: string
    if (isFinancialEntity(session) && session.defaultOrganizationId) {
      await assertEntityGrant(session.defaultOrganizationId, targetOrganizationId)
      folderOwnerOrganizationId = targetOrganizationId
    } else {
      folderOwnerOrganizationId = (await assertCanManageAccountingFolder(session, targetOrganizationId)).folderOwnerOrganizationId
    }
    const application = await createCreditApplication({
      folderOwnerOrganizationId,
      requestingEntityOrganizationId,
      requirementTemplateId,
      requestedAmount: typeof body.requestedAmount === "number" ? body.requestedAmount : undefined,
      productName: typeof body.productName === "string" ? body.productName : undefined,
      createdBy: session.uid,
      createdByOrganizationId: session.defaultOrganizationId ?? folderOwnerOrganizationId,
    })
    return Response.json({ application }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
