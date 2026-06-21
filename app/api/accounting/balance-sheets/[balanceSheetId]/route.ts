import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { updateBalanceSheetSchema } from "@/lib/schemas/accounting"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { updateFolderDoc } from "@/lib/services/server-folder-writes"

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ balanceSheetId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { balanceSheetId } = await params
    const input = updateBalanceSheetSchema.parse(await request.json())
    await updateFolderDoc({
      session,
      collectionName: COLLECTIONS.BALANCE_SHEETS,
      docId: balanceSheetId,
      data: input,
      auditAction: "balance_sheet.updated",
      targetType: "balance_sheet",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
