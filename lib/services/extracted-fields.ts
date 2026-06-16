/**
 * Servicio Admin SDK de campos extraídos (CreditoHub — Ola 2 / Agente C).
 *
 * Persiste ExtractedField[] producidos por los extractores (lib/ai/extraction).
 * Cada campo conserva su procedencia completa (documento, página, método,
 * confianza). Audita field.extracted.
 *
 * Partition key = folderOwnerOrganizationId (NUNCA producerId/clientId).
 */

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import type { ExtractedField } from "@/types/credito-hub"

const MAX_BATCH = 450 // margen bajo el límite de 500 operaciones de Firestore

export interface SaveFieldsActor {
  actorUid: string
  actorOrganizationId: string | null
}

/**
 * Guarda los campos extraídos en batch (chunked) usando el id que ya traen.
 * Audita un único field.extracted por documento con el resumen.
 */
export async function saveFields(
  fields: ExtractedField[],
  actor: SaveFieldsActor,
): Promise<string[]> {
  if (fields.length === 0) return []

  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.EXTRACTED_FIELDS)
  const ids: string[] = []

  for (let i = 0; i < fields.length; i += MAX_BATCH) {
    const chunk = fields.slice(i, i + MAX_BATCH)
    const batch = db.batch()
    for (const field of chunk) {
      const ref = field.id ? col.doc(field.id) : col.doc()
      const id = ref.id
      ids.push(id)
      batch.set(ref, { ...field, id })
    }
    await batch.commit()
  }

  // Agrupa por documento para auditar una entrada por documento afectado.
  const byDocument = new Map<string, { ownerId: string; count: number }>()
  for (const field of fields) {
    const existing = byDocument.get(field.documentId)
    if (existing) {
      existing.count += 1
    } else {
      byDocument.set(field.documentId, {
        ownerId: field.folderOwnerOrganizationId,
        count: 1,
      })
    }
  }

  for (const [documentId, info] of byDocument) {
    await writeAuditLog({
      actorUid: actor.actorUid,
      actorOrganizationId: actor.actorOrganizationId,
      action: "field.extracted",
      targetType: "document",
      targetId: documentId,
      metadata: {
        folderOwnerOrganizationId: info.ownerId,
        fieldCount: info.count,
      },
    })
  }

  return ids
}

function mapDoc(snapData: FirebaseFirestore.DocumentData, id: string): ExtractedField {
  const data = snapData
  const createdAt =
    data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? null
  return { ...data, id, createdAt } as ExtractedField
}

/** Devuelve todos los campos extraídos de un documento. */
export async function getFieldsByDocument(documentId: string): Promise<ExtractedField[]> {
  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.EXTRACTED_FIELDS)
    .where("documentId", "==", documentId)
    .get()
  return snap.docs.map((d) => mapDoc(d.data(), d.id))
}

/** Devuelve todos los campos extraídos del legajo (partición). */
export async function getFieldsByOwner(
  folderOwnerOrganizationId: string,
): Promise<ExtractedField[]> {
  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.EXTRACTED_FIELDS)
    .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
    .get()
  return snap.docs.map((d) => mapDoc(d.data(), d.id))
}
