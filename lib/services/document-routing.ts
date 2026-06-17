// Servicio Admin SDK de decisiones de ruteo documental (CreditoHub — Ola 3).
//
// Persiste DocumentRoutingDecision producidas por el pipeline de auto-routing
// por CUIT. Cada decisión conserva el CUIT detectado, la carpeta sugerida y la
// finalmente asignada. Patrón Admin SDK: FieldValue.serverTimestamp() al
// escribir, normalización de timestamps a ISO string al leer.

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { FieldValue } from "firebase-admin/firestore"
import type {
  DocumentRoutingDecision,
  RoutingStatus,
} from "@/types/document-routing"

type FirestoreData = Record<string, unknown>

function toIso(value: unknown): string | null {
  if (value == null) return null
  const maybeTs = value as { toDate?: () => Date }
  if (typeof maybeTs.toDate === "function") {
    return maybeTs.toDate().toISOString()
  }
  return value as string
}

function mapDecision(id: string, data: FirestoreData): DocumentRoutingDecision {
  return {
    id,
    documentId: (data.documentId as string) ?? "",
    rootOrganizationId: (data.rootOrganizationId as string) ?? "",
    detectedCuit: (data.detectedCuit as string) ?? null,
    detectedDocumentType: (data.detectedDocumentType as string) ?? null,
    suggestedFolderOwnerOrganizationId:
      (data.suggestedFolderOwnerOrganizationId as string) ?? null,
    assignedFolderOwnerOrganizationId:
      (data.assignedFolderOwnerOrganizationId as string) ?? null,
    routingStatus: (data.routingStatus as RoutingStatus) ?? "needs_manual_assignment",
    routingConfidence:
      typeof data.routingConfidence === "number"
        ? (data.routingConfidence as number)
        : null,
    reviewedBy: (data.reviewedBy as string) ?? null,
    reviewedAt: toIso(data.reviewedAt),
    createdAt: toIso(data.createdAt) ?? "",
    updatedAt: toIso(data.updatedAt) ?? "",
  }
}

export interface RecordRoutingDecisionInput {
  documentId: string
  rootOrganizationId: string
  detectedCuit: string | null
  detectedDocumentType: string | null
  suggestedFolderOwnerOrganizationId: string | null
  assignedFolderOwnerOrganizationId: string | null
  routingStatus: RoutingStatus
  routingConfidence: number | null
}

/**
 * Registra una decisión de ruteo. Idempotente por documentId: si ya existe una
 * decisión para el documento, la actualiza en lugar de crear una nueva.
 */
export async function recordRoutingDecision(
  input: RecordRoutingDecisionInput,
): Promise<DocumentRoutingDecision> {
  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.DOCUMENT_ROUTING_DECISIONS)
  const now = FieldValue.serverTimestamp()

  const existingSnap = await col
    .where("documentId", "==", input.documentId)
    .limit(1)
    .get()

  if (!existingSnap.empty) {
    const ref = existingSnap.docs[0].ref
    await ref.update({
      rootOrganizationId: input.rootOrganizationId,
      detectedCuit: input.detectedCuit,
      detectedDocumentType: input.detectedDocumentType,
      suggestedFolderOwnerOrganizationId: input.suggestedFolderOwnerOrganizationId,
      assignedFolderOwnerOrganizationId: input.assignedFolderOwnerOrganizationId,
      routingStatus: input.routingStatus,
      routingConfidence: input.routingConfidence,
      updatedAt: now,
    })
    const updated = await ref.get()
    return mapDecision(updated.id, updated.data() ?? {})
  }

  const ref = col.doc()
  await ref.set({
    documentId: input.documentId,
    rootOrganizationId: input.rootOrganizationId,
    detectedCuit: input.detectedCuit,
    detectedDocumentType: input.detectedDocumentType,
    suggestedFolderOwnerOrganizationId: input.suggestedFolderOwnerOrganizationId,
    assignedFolderOwnerOrganizationId: input.assignedFolderOwnerOrganizationId,
    routingStatus: input.routingStatus,
    routingConfidence: input.routingConfidence,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
  })
  const created = await ref.get()
  return mapDecision(created.id, created.data() ?? {})
}

/** Devuelve la decisión por id, o null si no existe. */
export async function getDecision(
  decisionId: string,
): Promise<DocumentRoutingDecision | null> {
  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.DOCUMENT_ROUTING_DECISIONS)
    .doc(decisionId)
    .get()
  if (!snap.exists) return null
  return mapDecision(snap.id, snap.data() ?? {})
}

/**
 * Lista las decisiones del grupo que requieren asignación manual
 * (routingStatus == "needs_manual_assignment").
 */
export async function listDecisionsNeedingAssignment(
  rootOrganizationId: string,
): Promise<DocumentRoutingDecision[]> {
  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.DOCUMENT_ROUTING_DECISIONS)
    .where("rootOrganizationId", "==", rootOrganizationId)
    .where("routingStatus", "==", "needs_manual_assignment")
    .get()
  return snap.docs.map((d) => mapDecision(d.id, d.data()))
}

/**
 * Asigna manualmente una decisión a una carpeta (org) del grupo. Marca la
 * decisión como manually_assigned y registra el revisor. NO escribe audit_logs
 * (eso lo hace el route handler que tiene el contexto de actor/request).
 */
export async function assignDecision(
  decisionId: string,
  assignedFolderOwnerOrganizationId: string,
  actorUid: string,
): Promise<DocumentRoutingDecision> {
  const db = getAdminDb()
  const ref = db
    .collection(COLLECTIONS.DOCUMENT_ROUTING_DECISIONS)
    .doc(decisionId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error(`document-routing: decisión ${decisionId} no existe`)
  }
  await ref.update({
    assignedFolderOwnerOrganizationId,
    routingStatus: "manually_assigned" as RoutingStatus,
    reviewedBy: actorUid,
    reviewedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  const updated = await ref.get()
  return mapDecision(updated.id, updated.data() ?? {})
}
