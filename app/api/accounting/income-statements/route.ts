import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createIncomeStatementSchema } from "@/lib/schemas/accounting"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { addFolderDoc } from "@/lib/services/server-folder-writes"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const input = createIncomeStatementSchema.parse(await request.json())
    const id = await addFolderDoc({
      session,
      collectionName: COLLECTIONS.INCOME_STATEMENTS,
      data: { ...input, validationStatus: "draft" },
      auditAction: "income_statement.created",
      targetType: "income_statement",
    })
    return Response.json({ id }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
