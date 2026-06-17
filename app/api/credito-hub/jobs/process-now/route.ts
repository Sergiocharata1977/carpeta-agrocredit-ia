import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { runWorkerForFolder } from "@/lib/credito-hub/process-jobs"

/**
 * Disparador IA on-demand para el contador: procesa los documentos pendientes
 * SOLO del legajo abierto. Pensado para plan Vercel Hobby, donde el cron corre
 * a lo sumo 1 vez por dia. Auth de gestor del legajo; nunca toma orgId del body.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const body = await request.json().catch(() => ({}))
    const targetOrganizationId = String(body.targetOrganizationId ?? "")
    if (!targetOrganizationId) {
      return Response.json({ error: "targetOrganizationId requerido" }, { status: 400 })
    }
    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(
      session,
      targetOrganizationId,
    )
    const workerId = `credito-hub-ondemand-${session.uid}-${Date.now()}`
    const processed = await runWorkerForFolder(workerId, folderOwnerOrganizationId)
    return Response.json({ processed })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
