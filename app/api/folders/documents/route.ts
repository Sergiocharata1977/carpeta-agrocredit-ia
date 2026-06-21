import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { listFolderDocs } from "@/lib/services/server-folder-writes"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const targetOrganizationId = request.nextUrl.searchParams.get("targetOrganizationId") ?? ""
    const periodId = request.nextUrl.searchParams.get("periodId") ?? ""
    if (!targetOrganizationId || !periodId) {
      return Response.json({ error: "targetOrganizationId y periodId requeridos" }, { status: 400 })
    }
    const documents = await listFolderDocs({
      session,
      collectionName: COLLECTIONS.DOCUMENTS,
      targetOrganizationId,
      filters: [["periodId", "==", periodId]],
    })
    return Response.json({ documents })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
