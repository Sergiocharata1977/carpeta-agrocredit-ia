import { NextRequest } from "next/server"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { getAuthErrorResponse, requireActiveOrg, verifyRequestSession } from "@/lib/auth/server-session"
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

    if (job.status !== "failed") {
      return Response.json({ error: "Solo se pueden reintentar jobs fallidos" }, { status: 400 })
    }

    const retried = await transitionJob(job.id, "queued")
    return Response.json({ job: retried })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
