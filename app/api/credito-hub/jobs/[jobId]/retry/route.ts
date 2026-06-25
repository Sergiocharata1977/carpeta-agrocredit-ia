import { NextRequest } from "next/server"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { getAuthErrorResponse, requireActiveOrg, verifyRequestSession } from "@/lib/auth/server-session"
import { getActiveProviderName } from "@/lib/ai/provider-config"
import { getJob, transitionJob } from "@/lib/services/document-jobs"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { jobId } = await params
    const job = await getJob(jobId)
    if (!job) return Response.json({ error: "Job no encontrado" }, { status: 404 })

    await assertCanManageAccountingFolder(session, job.folderOwnerOrganizationId)

    if (job.status !== "failed" && job.status !== "awaiting_review") {
      return Response.json({ error: "Solo se pueden reprocesar jobs fallidos o en revision" }, { status: 400 })
    }

    const provider = (await getActiveProviderName()) || "mock"
    const retried = await transitionJob(job.id, "queued", { patch: { provider } })
    return Response.json({ job: retried })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
