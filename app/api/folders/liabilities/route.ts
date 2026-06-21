import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createLiabilitySchema } from "@/lib/schemas/assets"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { addFolderDoc, listFolderDocs } from "@/lib/services/server-folder-writes"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const targetOrganizationId = request.nextUrl.searchParams.get("targetOrganizationId") ?? ""
    if (!targetOrganizationId) {
      return Response.json({ error: "targetOrganizationId requerido" }, { status: 400 })
    }
    const liabilities = await listFolderDocs({
      session,
      collectionName: COLLECTIONS.LIABILITIES,
      targetOrganizationId,
    })
    return Response.json({ liabilities })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const input = createLiabilitySchema.parse(await request.json())
    const id = await addFolderDoc({
      session,
      collectionName: COLLECTIONS.LIABILITIES,
      data: input,
      auditAction: "liability.created",
      targetType: "liability",
    })
    return Response.json({ id }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
