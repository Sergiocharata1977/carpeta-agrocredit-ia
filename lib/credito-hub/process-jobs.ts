// Pipeline de procesamiento de un job documental: classify -> extract -> perfil.
// Compartido por el worker cron (global) y el boton "Procesar con IA" (scopeado
// por legajo). Mantiene una sola fuente de verdad para la orquestacion.

import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import {
  claimJobById,
  claimNextQueuedJob,
  listJobs,
  reclaimStalledJobs,
  transitionJob,
  CLAIMABLE_STATUSES,
} from "@/lib/services/document-jobs"
import { classify } from "@/lib/ai/classification/document-classifier"
import { saveClassification } from "@/lib/services/document-classification"
import {
  extractBalance,
  extractForm931,
  extractIncome,
  extractIvaReturn,
} from "@/lib/ai/extraction/extractors"
import { saveFields, getFieldsByOwner } from "@/lib/services/extracted-fields"
import { upsertProfileFromFields } from "@/lib/services/canonical-profile"
import { MAX_JOBS_PER_RUN } from "@/lib/credito-hub/limits"
import { resolveFolderByCuit } from "@/lib/credito-hub/folder-routing"
import { recordRoutingDecision } from "@/lib/services/document-routing"
import { writeAuditLog } from "@/lib/firebase/audit"
import { FieldValue } from "firebase-admin/firestore"
import type { DocumentJob, ExtractedField } from "@/types/credito-hub"

function extractorFor(documentType: string) {
  if (documentType === "estado_situacion_patrimonial") return extractBalance
  if (documentType === "estado_resultados") return extractIncome
  if (documentType === "ddjj_iva") return extractIvaReturn
  if (documentType === "formulario_931") return extractForm931
  return null
}

export interface ProcessResult {
  jobId: string
  status: string
  error?: string
}

/**
 * Procesa un job YA reclamado (estado preprocessing): descarga el documento,
 * clasifica, extrae segun tipo, actualiza el perfil canonico y deja el job en
 * awaiting_review (o failed con su error). No reclama: el caller ya hizo claim.
 */
export async function processClaimedJob(job: DocumentJob): Promise<ProcessResult> {
  try {
    const docSnap = await getAdminDb()
      .collection(COLLECTIONS.DOCUMENTS)
      .doc(job.documentId)
      .get()
    if (!docSnap.exists) throw new Error("Documento fuente no encontrado")
    const doc = docSnap.data()!
    const storagePath = doc.storagePath as string
    const [buffer] = await getAdminStorage().bucket().file(storagePath).download()
    const mimeType = (doc.mimeType as string) || "application/pdf"

    await transitionJob(job.id, "classifying")
    const classification = await classify(buffer, mimeType, { fileName: doc.fileName })

    // Auto-routing por CUIT: el intake del legajo sube al titular raíz, así que
    // el folderOwnerOrganizationId del job es la raíz del grupo. Tras clasificar,
    // comparamos el CUIT detectado contra el taxId de la raíz y sus empresas
    // hijas. Si matchea una carpeta distinta, reasignamos el legajo del job y de
    // los campos extraídos a esa carpeta; si no, queda needs_manual_assignment
    // en la raíz. Todo el procesamiento posterior usa folderOwnerOrganizationId.
    const rootOrganizationId = job.folderOwnerOrganizationId
    const detectedCuit = classification.cuit ?? null
    const routing = await resolveFolderByCuit(rootOrganizationId, detectedCuit)
    let folderOwnerOrganizationId = rootOrganizationId

    if (routing.orgId && routing.orgId !== rootOrganizationId) {
      // Matcheó una carpeta hija distinta: reasignar el job a esa carpeta.
      folderOwnerOrganizationId = routing.orgId
      await getAdminDb()
        .collection(COLLECTIONS.DOCUMENT_JOBS)
        .doc(job.id)
        .update({
          folderOwnerOrganizationId,
          updatedAt: FieldValue.serverTimestamp(),
        })
      await recordRoutingDecision({
        documentId: job.documentId,
        rootOrganizationId,
        detectedCuit,
        detectedDocumentType: classification.documentType,
        suggestedFolderOwnerOrganizationId: routing.orgId,
        assignedFolderOwnerOrganizationId: routing.orgId,
        routingStatus: "auto_assigned",
        routingConfidence: classification.confidence ?? null,
      })
      await writeAuditLog({
        actorUid: "cron",
        actorOrganizationId: null,
        action: "document.routed",
        targetType: "document",
        targetId: job.documentId,
        metadata: {
          rootOrganizationId,
          assignedFolderOwnerOrganizationId: routing.orgId,
          detectedCuit,
          routingStatus: "auto_assigned",
        },
      })
    } else if (!routing.orgId) {
      // No matcheó ninguna carpeta del grupo: requiere asignación manual.
      // El job permanece en la raíz.
      await recordRoutingDecision({
        documentId: job.documentId,
        rootOrganizationId,
        detectedCuit,
        detectedDocumentType: classification.documentType,
        suggestedFolderOwnerOrganizationId: null,
        assignedFolderOwnerOrganizationId: null,
        routingStatus: "needs_manual_assignment",
        routingConfidence: classification.confidence ?? null,
      })
      await writeAuditLog({
        actorUid: "cron",
        actorOrganizationId: null,
        action: "document.routed",
        targetType: "document",
        targetId: job.documentId,
        metadata: {
          rootOrganizationId,
          detectedCuit,
          routingStatus: "needs_manual_assignment",
        },
      })
    }
    // Si routing.orgId === rootOrganizationId, el documento ya está en la
    // carpeta correcta (la raíz): no se reasigna ni se registra decisión.

    await saveClassification({
      documentId: job.documentId,
      folderOwnerOrganizationId,
      classification,
      actorUid: "cron",
      actorOrganizationId: null,
    })

    const extractor = extractorFor(classification.documentType)
    let fields: ExtractedField[] = []
    if (extractor) {
      await transitionJob(job.id, "extracting")
      fields = await extractor({
        buffer,
        mimeType,
        folderOwnerOrganizationId,
        documentId: job.documentId,
        fileName: doc.fileName,
        defaultCurrency: "ARS",
      })
      await saveFields(fields, { actorUid: "cron", actorOrganizationId: null })
    } else {
      await transitionJob(job.id, "awaiting_review")
      return { jobId: job.id, status: "awaiting_review" }
    }

    await transitionJob(job.id, "validating")
    if (fields.length > 0) {
      const allFields = await getFieldsByOwner(folderOwnerOrganizationId)
      if (allFields.length > 0) {
        await upsertProfileFromFields(folderOwnerOrganizationId, allFields, {
          actorUid: "cron",
          actorOrganizationId: null,
        })
      }
    }
    await transitionJob(job.id, "awaiting_review")
    return { jobId: job.id, status: "awaiting_review" }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido"
    await transitionJob(job.id, "failed", { error: message, actorUid: "cron", actorOrganizationId: null })
    return { jobId: job.id, status: "failed", error: message }
  }
}

/**
 * Worker global (cron): recupera stalled y procesa hasta MAX_JOBS_PER_RUN jobs
 * de cualquier legajo.
 */
export async function runWorkerGlobal(workerId: string): Promise<ProcessResult[]> {
  await reclaimStalledJobs()
  const processed: ProcessResult[] = []
  for (let i = 0; i < MAX_JOBS_PER_RUN; i++) {
    const job = await claimNextQueuedJob(workerId)
    if (!job) break
    processed.push(await processClaimedJob(job))
  }
  return processed
}

/**
 * Procesamiento scopeado a un legajo (boton "Procesar con IA" del contador):
 * toma los jobs reclamables SOLO de ese folderOwnerOrganizationId y los procesa.
 */
export async function runWorkerForFolder(
  workerId: string,
  folderOwnerOrganizationId: string,
): Promise<ProcessResult[]> {
  const jobs = await listJobs(folderOwnerOrganizationId)
  const claimable = jobs
    .filter((j) => CLAIMABLE_STATUSES.includes(j.status))
    .slice(0, MAX_JOBS_PER_RUN)

  const processed: ProcessResult[] = []
  for (const candidate of claimable) {
    const claimed = await claimJobById(candidate.id, workerId)
    if (!claimed) continue // otro worker lo tomó
    processed.push(await processClaimedJob(claimed))
  }
  return processed
}
