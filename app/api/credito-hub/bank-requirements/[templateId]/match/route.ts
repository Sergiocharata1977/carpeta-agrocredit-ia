import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { matchRequirements } from "@/lib/services/requirement-matching"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    await params
    const body = await request.json()
    const creditApplicationId = String(body.creditApplicationId ?? "")
    if (!creditApplicationId) return Response.json({ error: "creditApplicationId requerido" }, { status: 400 })
    const matches = await matchRequirements({
      creditApplicationId,
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
    })
    return Response.json({ matches })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
