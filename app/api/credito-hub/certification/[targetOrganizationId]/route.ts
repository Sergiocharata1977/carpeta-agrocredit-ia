import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import {
  verifyRequestSession,
  requireActiveOrg,
  getAuthErrorResponse,
  AuthError,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import {
  getCurrentCertification,
  certifyFolder,
} from "@/lib/services/folder-certification"
import type { CertificationScope } from "@/types/folder-certification"

const VALID_SCOPES: CertificationScope[] = [
  "identity",
  "accounting",
  "fiscal",
  "patrimonial",
  "full_folder",
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetOrganizationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { targetOrganizationId } = await params
    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(
      session,
      targetOrganizationId,
    )

    const certification = await getCurrentCertification(folderOwnerOrganizationId)
    return Response.json({ certification })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ targetOrganizationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    // Solo contador/admin certifican. El productor puede gestionar su carpeta
    // (assertCanManageAccountingFolder lo permite) pero NO certificarla.
    const canCertify =
      session.roles.includes("accountant") ||
      session.roles.includes("accounting_firm_admin") ||
      session.roles.includes("admin_platform")
    if (!canCertify) {
      throw new AuthError("Solo un contador puede certificar la carpeta", 403)
    }

    const { targetOrganizationId } = await params
    const { folderOwnerOrganizationId, accountingFirmId } =
      await assertCanManageAccountingFolder(session, targetOrganizationId)

    // Scope opcional del body (default "full_folder"). orgId NUNCA del body.
    let scope: CertificationScope = "full_folder"
    try {
      const body = (await request.json()) as { scope?: unknown }
      if (typeof body?.scope === "string" && VALID_SCOPES.includes(body.scope as CertificationScope)) {
        scope = body.scope as CertificationScope
      }
    } catch {
      // Sin body / body inválido -> default full_folder.
    }

    // certifiedByName: razón social del estudio contable (org accountingFirmId)
    // o, si no, el email de la sesión.
    let certifiedByName = session.email ?? "Contador"
    if (accountingFirmId) {
      const orgSnap = await getAdminDb()
        .collection(COLLECTIONS.ORGANIZATIONS)
        .doc(accountingFirmId)
        .get()
      const legalName = orgSnap.exists ? (orgSnap.data()?.legalName as string | undefined) : undefined
      if (legalName) certifiedByName = legalName
    }

    const certification = await certifyFolder({
      folderOwnerOrganizationId,
      accountingFirmId,
      certifiedByUid: session.uid,
      certifiedByName,
      scope,
    })

    return Response.json({ certification })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
