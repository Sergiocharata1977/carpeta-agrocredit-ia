import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createAssetSchema } from "@/lib/schemas/assets"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { addFolderDoc } from "@/lib/services/server-folder-writes"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const input = createAssetSchema.parse(await request.json())
    const id = await addFolderDoc({
      session,
      collectionName: COLLECTIONS.ASSETS,
      data: input,
      auditAction: "asset.created",
      targetType: "asset",
    })
    return Response.json({ id }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
