import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createIncomeStatementSchema } from "@/lib/schemas/accounting"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getFolderDoc, updateFolderDoc } from "@/lib/services/server-folder-writes"

const updateIncomeStatementSchema = createIncomeStatementSchema.omit({
  producerId: true,
  organizationId: true,
  periodId: true,
}).partial()

export async function GET(request: NextRequest, { params }: { params: Promise<{ incomeStatementId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { incomeStatementId } = await params
    const incomeStatement = await getFolderDoc({
      session,
      collectionName: COLLECTIONS.INCOME_STATEMENTS,
      docId: incomeStatementId,
    })
    return Response.json({ incomeStatement })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ incomeStatementId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { incomeStatementId } = await params
    const input = updateIncomeStatementSchema.parse(await request.json())
    await updateFolderDoc({
      session,
      collectionName: COLLECTIONS.INCOME_STATEMENTS,
      docId: incomeStatementId,
      data: input,
      auditAction: "income_statement.updated",
      targetType: "income_statement",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
