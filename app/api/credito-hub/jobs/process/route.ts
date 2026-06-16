import { NextRequest } from "next/server"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { MAX_JOBS_PER_RUN } from "@/lib/credito-hub/limits"
import { claimNextQueuedJob, reclaimStalledJobs, transitionJob } from "@/lib/services/document-jobs"
import { classify } from "@/lib/ai/classification/document-classifier"
import { saveClassification } from "@/lib/services/document-classification"
import { extractBalance, extractForm931, extractIncome, extractIvaReturn } from "@/lib/ai/extraction/extractors"
import { saveFields, getFieldsByOwner } from "@/lib/services/extracted-fields"
import { upsertProfileFromFields } from "@/lib/services/canonical-profile"
import type { ExtractedField } from "@/types/credito-hub"

function toExtractorType(documentType: string) {
  if (documentType === "estado_situacion_patrimonial") return extractBalance
  if (documentType === "estado_resultados") return extractIncome
  if (documentType === "ddjj_iva") return extractIvaReturn
  if (documentType === "formulario_931") return extractForm931
  return null
}

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const workerId = `credito-hub-${Date.now()}`
  await reclaimStalledJobs()
  const processed: Array<{ jobId: string; status: string; error?: string }> = []

  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const job = await claimNextQueuedJob(workerId)
    if (!job) break
    try {
      const docSnap = await getAdminDb().collection(COLLECTIONS.DOCUMENTS).doc(job.documentId).get()
      if (!docSnap.exists) throw new Error("Documento fuente no encontrado")
      const doc = docSnap.data()!
      const storagePath = doc.storagePath as string
      const [buffer] = await getAdminStorage().bucket().file(storagePath).download()
      const mimeType = (doc.mimeType as string) || "application/pdf"

      await transitionJob(job.id, "classifying")
      const classification = await classify(buffer, mimeType, { fileName: doc.fileName })
      await saveClassification({
        documentId: job.documentId,
        folderOwnerOrganizationId: job.folderOwnerOrganizationId,
        classification,
        actorUid: "cron",
        actorOrganizationId: null,
      })

      const extractor = toExtractorType(classification.documentType)
      let fields: ExtractedField[] = []
      if (extractor) {
        await transitionJob(job.id, "extracting")
        fields = await extractor({
          buffer,
          mimeType,
          folderOwnerOrganizationId: job.folderOwnerOrganizationId,
          documentId: job.documentId,
          fileName: doc.fileName,
          defaultCurrency: "ARS",
        })
        await saveFields(fields, { actorUid: "cron", actorOrganizationId: null })
      }

      await transitionJob(job.id, "validating")
      const allFields = fields.length > 0 ? await getFieldsByOwner(job.folderOwnerOrganizationId) : []
      if (allFields.length > 0) {
        await upsertProfileFromFields(job.folderOwnerOrganizationId, allFields, {
          actorUid: "cron",
          actorOrganizationId: null,
        })
      }
      await transitionJob(job.id, "awaiting_review")
      processed.push({ jobId: job.id, status: "awaiting_review" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      await transitionJob(job.id, "failed", { error: message, actorUid: "cron", actorOrganizationId: null })
      processed.push({ jobId: job.id, status: "failed", error: message })
    }
  }

  return Response.json({ processed })
}
