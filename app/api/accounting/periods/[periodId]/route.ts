import { NextRequest } from "next/server"
import { z } from "zod"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getFolderDoc, updateFolderDoc } from "@/lib/services/server-folder-writes"

const updatePeriodStatusSchema = z.object({
  status: z.enum(["open", "closed", "archived"]),
})

export async function GET(request: NextRequest, { params }: { params: Promise<{ periodId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { periodId } = await params
    const period = await getFolderDoc({
      session,
      collectionName: COLLECTIONS.ACCOUNTING_PERIODS,
      docId: periodId,
    })
    return Response.json({ period })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ periodId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { periodId } = await params
    const input = updatePeriodStatusSchema.parse(await request.json())
    await updateFolderDoc({
      session,
      collectionName: COLLECTIONS.ACCOUNTING_PERIODS,
      docId: periodId,
      data: {
        status: input.status,
        closedAt: input.status === "closed" ? new Date().toISOString() : null,
      },
      auditAction: "accounting_period.updated",
      targetType: "accounting_period",
    })
    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
