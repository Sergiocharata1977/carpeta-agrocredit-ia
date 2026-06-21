import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { updateAssetSchema } from "@/lib/schemas/assets"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { deleteFolderDoc, updateFolderDoc } from "@/lib/services/server-folder-writes"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { assetId } = await params
    const input = updateAssetSchema.parse(await request.json())
    await updateFolderDoc({
      session,
      collectionName: COLLECTIONS.ASSETS,
      docId: assetId,
      data: input,
      auditAction: "asset.updated",
      targetType: "asset",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { assetId } = await params
    await deleteFolderDoc({
      session,
      collectionName: COLLECTIONS.ASSETS,
      docId: assetId,
      auditAction: "asset.deleted",
      targetType: "asset",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
