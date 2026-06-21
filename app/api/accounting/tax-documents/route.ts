import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createTaxDocumentSchema } from "@/lib/schemas/accounting"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { addFolderDoc, listFolderDocs } from "@/lib/services/server-folder-writes"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const targetOrganizationId = request.nextUrl.searchParams.get("targetOrganizationId") ?? ""
    const periodId = request.nextUrl.searchParams.get("periodId") ?? ""
    if (!targetOrganizationId || !periodId) {
      return Response.json({ error: "targetOrganizationId y periodId requeridos" }, { status: 400 })
    }
    const taxDocuments = await listFolderDocs({
      session,
      collectionName: COLLECTIONS.TAX_DOCUMENTS,
      targetOrganizationId,
      filters: [["periodId", "==", periodId]],
    })
    return Response.json({ taxDocuments })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const input = createTaxDocumentSchema.parse(await request.json())
    const id = await addFolderDoc({
      session,
      collectionName: COLLECTIONS.TAX_DOCUMENTS,
      data: { ...input, validationStatus: "draft" },
      auditAction: "tax_document.created",
      targetType: "tax_document",
    })
    return Response.json({ id }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
