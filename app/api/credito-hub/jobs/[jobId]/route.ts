import { NextRequest } from "next/server"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { getAuthErrorResponse, requireActiveOrg, verifyRequestSession } from "@/lib/auth/server-session"
import { deleteDocumentJob, getJob } from "@/lib/services/document-jobs"

export async function DELETE(
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

    if (["preprocessing", "classifying", "extracting", "validating"].includes(job.status)) {
      return Response.json(
        { error: "No se puede eliminar mientras la IA lo esta procesando. Actualiza en unos segundos." },
        { status: 409 },
      )
    }

    const result = await deleteDocumentJob(job.id, {
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId ?? null,
    })

    return Response.json(result)
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
