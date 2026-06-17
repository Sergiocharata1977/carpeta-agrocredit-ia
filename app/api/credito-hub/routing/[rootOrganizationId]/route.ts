import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireActiveOrg,
  getAuthErrorResponse,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { listDecisionsNeedingAssignment } from "@/lib/services/document-routing"

// GET /api/credito-hub/routing/{rootOrganizationId}
// Lista las decisiones de ruteo del grupo que requieren asignación manual.
// Auth: assertCanManageAccountingFolder (titular o contador con vínculo activo).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ rootOrganizationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { rootOrganizationId } = await params
    await assertCanManageAccountingFolder(session, rootOrganizationId)

    const decisions = await listDecisionsNeedingAssignment(rootOrganizationId)
    return Response.json({ decisions })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
