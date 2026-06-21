import { NextRequest } from "next/server"
import { z } from "zod"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createLiabilitySchema } from "@/lib/schemas/assets"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { deleteFolderDoc, updateFolderDoc } from "@/lib/services/server-folder-writes"

const updateLiabilitySchema = createLiabilitySchema.omit({
  producerId: true,
  organizationId: true,
}).partial().extend({
  documentIds: z.array(z.string()).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ liabilityId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { liabilityId } = await params
    const input = updateLiabilitySchema.parse(await request.json())
    await updateFolderDoc({
      session,
      collectionName: COLLECTIONS.LIABILITIES,
      docId: liabilityId,
      data: input,
      auditAction: "liability.updated",
      targetType: "liability",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ liabilityId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { liabilityId } = await params
    await deleteFolderDoc({
      session,
      collectionName: COLLECTIONS.LIABILITIES,
      docId: liabilityId,
      auditAction: "liability.deleted",
      targetType: "liability",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
