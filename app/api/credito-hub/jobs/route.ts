import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { listJobs } from "@/lib/services/document-jobs"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const targetOrganizationId = request.nextUrl.searchParams.get("targetOrganizationId") ?? request.nextUrl.searchParams.get("producerId")
    if (!targetOrganizationId) return Response.json({ error: "targetOrganizationId requerido" }, { status: 400 })
    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(session, targetOrganizationId)
    const jobs = await listJobs(folderOwnerOrganizationId)
    return Response.json({ jobs })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
