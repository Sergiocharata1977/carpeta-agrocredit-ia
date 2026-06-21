import { NextRequest } from "next/server"
import { z } from "zod"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createTaxDocumentSchema } from "@/lib/schemas/accounting"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getFolderDoc, updateFolderDoc } from "@/lib/services/server-folder-writes"

const updateTaxDocumentSchema = createTaxDocumentSchema.omit({
  producerId: true,
  organizationId: true,
  periodId: true,
}).partial().extend({
  validationStatus: z.enum(["draft", "pending_review", "validated", "observed", "rejected"]).optional(),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ taxDocumentId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { taxDocumentId } = await params
    const taxDocument = await getFolderDoc({
      session,
      collectionName: COLLECTIONS.TAX_DOCUMENTS,
      docId: taxDocumentId,
    })
    return Response.json({ taxDocument })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ taxDocumentId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { taxDocumentId } = await params
    const input = updateTaxDocumentSchema.parse(await request.json())
    await updateFolderDoc({
      session,
      collectionName: COLLECTIONS.TAX_DOCUMENTS,
      docId: taxDocumentId,
      data: input,
      auditAction: "tax_document.updated",
      targetType: "tax_document",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
