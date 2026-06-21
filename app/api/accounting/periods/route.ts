import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { createAccountingPeriodSchema } from "@/lib/schemas/accounting"
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
    const periods = await listFolderDocs({
      session,
      collectionName: COLLECTIONS.ACCOUNTING_PERIODS,
      targetOrganizationId,
    })
    return Response.json({ periods })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const input = createAccountingPeriodSchema.parse(await request.json())
    const id = await addFolderDoc({
      session,
      collectionName: COLLECTIONS.ACCOUNTING_PERIODS,
      data: {
        ...input,
        status: "open",
        closedAt: null,
      },
      auditAction: "accounting_period.created",
      targetType: "accounting_period",
    })
    return Response.json({ id }, { status: 201 })
  } catch (error) {
    if (error instanceof Response) return error
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
