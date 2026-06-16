/**
 * Servicio de clasificación documental (CreditoHub — Ola 2 / Agente B).
 *
 * Server-side (Admin SDK). Persiste y lee DocumentClassification en la colección
 * canónica DOCUMENT_CLASSIFICATIONS. Toda escritura genera audit_logs.
 * Partition key del legajo = folderOwnerOrganizationId (regla CreditoHub).
 */

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import type { DocumentClassification } from "@/types/credito-hub"
import type { ClassifierOutput } from "@/lib/ai/classification/document-classifier"

/** Datos requeridos para persistir una clasificación. */
export interface SaveClassificationInput {
  documentId: string
  folderOwnerOrganizationId: string
  classification: ClassifierOutput
  /** Actor que disparó la clasificación (uid). */
  actorUid: string
  /** Organización del actor (para auditoría). */
  actorOrganizationId: string | null
}

/** Convierte un Timestamp/serverTimestamp a ISO string de forma segura. */
function toIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString()
  if (value instanceof Date) return value.toISOString()
  return new Date().toISOString()
}

/**
 * Persiste una clasificación en DOCUMENT_CLASSIFICATIONS y escribe el audit
 * `document.classified` con metadata { documentType, confidence }.
 * Devuelve el DocumentClassification completo (con id y createdAt).
 */
export async function saveClassification(
  input: SaveClassificationInput,
): Promise<DocumentClassification> {
  const db = getAdminDb()

  const docData = {
    documentId: input.documentId,
    folderOwnerOrganizationId: input.folderOwnerOrganizationId,
    documentType: input.classification.documentType,
    ...(input.classification.subtype !== undefined && { subtype: input.classification.subtype }),
    ...(input.classification.cuit !== undefined && { cuit: input.classification.cuit }),
    ...(input.classification.period !== undefined && { period: input.classification.period }),
    ...(input.classification.issueDate !== undefined && { issueDate: input.classification.issueDate }),
    ...(input.classification.expiryDate !== undefined && { expiryDate: input.classification.expiryDate }),
    ...(input.classification.issuer !== undefined && { issuer: input.classification.issuer }),
    confidence: input.classification.confidence,
    needsReview: input.classification.needsReview,
    createdAt: FieldValue.serverTimestamp(),
  }

  const ref = await db.collection(COLLECTIONS.DOCUMENT_CLASSIFICATIONS).add(docData)

  await writeAuditLog({
    actorUid: input.actorUid,
    actorOrganizationId: input.actorOrganizationId,
    action: "document.classified",
    targetType: "document",
    targetId: input.documentId,
    metadata: {
      documentType: input.classification.documentType,
      confidence: input.classification.confidence,
    },
  })

  return {
    id: ref.id,
    documentId: input.documentId,
    folderOwnerOrganizationId: input.folderOwnerOrganizationId,
    documentType: input.classification.documentType,
    subtype: input.classification.subtype,
    cuit: input.classification.cuit,
    period: input.classification.period,
    issueDate: input.classification.issueDate,
    expiryDate: input.classification.expiryDate,
    issuer: input.classification.issuer,
    confidence: input.classification.confidence,
    needsReview: input.classification.needsReview,
    createdAt: new Date().toISOString(),
  }
}

/**
 * Devuelve la clasificación más reciente de un documento, o null si no existe.
 */
export async function getClassificationByDocument(
  documentId: string,
): Promise<DocumentClassification | null> {
  const db = getAdminDb()

  const snap = await db
    .collection(COLLECTIONS.DOCUMENT_CLASSIFICATIONS)
    .where("documentId", "==", documentId)
    .get()

  if (snap.empty) return null

  // Elegir el más reciente por createdAt (orden en memoria para no exigir índice).
  const docs = snap.docs
    .map((d) => ({ ref: d, data: d.data() }))
    .sort((a, b) => {
      const ta = a.data.createdAt instanceof Timestamp ? a.data.createdAt.toMillis() : 0
      const tb = b.data.createdAt instanceof Timestamp ? b.data.createdAt.toMillis() : 0
      return tb - ta
    })

  const chosen = docs[0]
  const data = chosen.data

  return {
    id: chosen.ref.id,
    documentId: data.documentId,
    folderOwnerOrganizationId: data.folderOwnerOrganizationId,
    documentType: data.documentType,
    subtype: data.subtype,
    cuit: data.cuit,
    period: data.period,
    issueDate: data.issueDate,
    expiryDate: data.expiryDate,
    issuer: data.issuer,
    confidence: data.confidence,
    needsReview: data.needsReview,
    createdAt: toIso(data.createdAt),
  }
}
