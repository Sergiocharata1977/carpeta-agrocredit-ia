import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireActiveOrg,
  requireAnyRole,
  getAuthErrorResponse,
  isAdminPlatform,
  isFinancialEntity,
  AuthError,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { createCreditApplication, listCreditApplications } from "@/lib/services/credit-applications"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"

async function assertEntityGrant(sessionOrganizationId: string, targetOrganizationId: string): Promise<void> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.ACCESS_GRANTS)
    .where("targetOrganizationId", "==", targetOrganizationId)
    .where("grantedToOrganizationId", "==", sessionOrganizationId)
    .where("status", "==", "approved")
    .limit(5)
    .get()
  const now = new Date()
  const hasGrant = snap.docs.some((doc) => {
    const data = doc.data()
    const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt)
    return expiresAt > now
  })
  if (!hasGrant) throw new AuthError("La entidad no tiene grant vigente para este legajo", 403)
}

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
    const requestingEntityOrganizationId = String(body.requestingEntityOrganizationId ?? session.defaultOrganizationId ?? "")
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
