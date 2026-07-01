// Servicio para persistencia temporal de operaciones de importación del asistente
// Colección: assistant_pending_imports (TTL máximo 24h)

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import type { PendingImportOperation } from "@/types/import-pending"
import type { Firestore } from "firebase-admin/firestore"

type Database = Firestore

// ─── GUARDAR OPERACIÓN PREPARADA ──────────────────────────────────────────────

/**
 * Guarda una operación preparada en assistant_pending_imports.
 * TTL: 24 horas desde preparedAt.
 */
export async function savePreparedImportOperation(
  db: Database,
  pendingOp: PendingImportOperation,
): Promise<void> {
  if (!pendingOp.operationId) {
    throw new Error("operationId es requerido")
  }

  if (!pendingOp.folderOwnerOrganizationId) {
    throw new Error("folderOwnerOrganizationId es requerido")
  }

  if (!pendingOp.documentId) {
    throw new Error("documentId es requerido")
  }

  // Validar que expiresAt es >= 24h desde preparedAt
  const preparedTime = new Date(pendingOp.preparedAt).getTime()
  const expiresTime = new Date(pendingOp.expiresAt).getTime()
  const maxTtl = 24 * 60 * 60 * 1000

  if (expiresTime - preparedTime > maxTtl) {
    throw new Error("TTL no puede exceder 24 horas")
  }

  // Guardar en colección
  const pendingRef = db
    .collection("assistant_pending_imports")
    .doc(pendingOp.operationId)

  await pendingRef.set({
    ...pendingOp,
    status: "prepared",
  })

  // Auditar creación
  await db.collection("audit_logs").add({
    action: "assistant.import_prepared",
    actorUid: pendingOp.preparedByUid,
    actorOrganizationId: pendingOp.preparedByOrganizationId,
    targetType: "pending_import_operation",
    targetId: pendingOp.operationId,
    metadata: {
      documentId: pendingOp.documentId,
      actionCount: pendingOp.actions.length,
      folderOwnerOrganizationId: pendingOp.folderOwnerOrganizationId,
    },
    createdAt: new Date().toISOString(),
  })
}

// ─── MARCAR COMO CONFIRMADA ───────────────────────────────────────────────────

/**
 * Marca una operación preparada como confirmada.
 */
export async function markImportOperationConfirmed(
  db: Database,
  operationId: string,
  confirmedByUid: string,
): Promise<PendingImportOperation> {
  const ref = db.collection("assistant_pending_imports").doc(operationId)
  const snap = await ref.get()

  if (!snap.exists) {
    throw new Error(`Operación no encontrada: ${operationId}`)
  }

  const operation = snap.data() as PendingImportOperation

  if (operation.status !== "prepared") {
    throw new Error(
      `No se puede confirmar operación en estado: ${operation.status}`,
    )
  }

  const now = new Date().toISOString()

  // Actualizar
  await ref.update({
    status: "confirmed",
    confirmedAt: now,
    confirmedByUid,
  })

  // Auditar
  await db.collection("audit_logs").add({
    action: "assistant.import_confirmed",
    actorUid: confirmedByUid,
    targetType: "pending_import_operation",
    targetId: operationId,
    metadata: {
      folderOwnerOrganizationId: operation.folderOwnerOrganizationId,
    },
    createdAt: now,
  })

  // Devolver operación actualizada
  const updated = await ref.get()
  return updated.data() as PendingImportOperation
}

// ─── MARCAR COMO EJECUTADA ────────────────────────────────────────────────────

/**
 * Marca una operación confirmada como ejecutada.
 * Se llama desde executeConfirmedImport() después de la transacción.
 */
export async function markImportOperationExecuted(
  db: Database,
  operationId: string,
): Promise<void> {
  const ref = db.collection("assistant_pending_imports").doc(operationId)
  const snap = await ref.get()

  if (!snap.exists) {
    throw new Error(`Operación no encontrada: ${operationId}`)
  }

  const operation = snap.data() as PendingImportOperation

  if (operation.status !== "confirmed") {
    throw new Error(
      `No se puede ejecutar operación en estado: ${operation.status}`,
    )
  }

  const now = new Date().toISOString()

  await ref.update({
    status: "executed",
    executedAt: now,
  })

  // Auditar (ya se audita en executeConfirmedImport, pero es redundante para seguridad)
  await db.collection("audit_logs").add({
    action: "assistant.import_executed",
    targetType: "pending_import_operation",
    targetId: operationId,
    metadata: {
      folderOwnerOrganizationId: operation.folderOwnerOrganizationId,
    },
    createdAt: now,
  })
}

// ─── MARCAR COMO CANCELADA ────────────────────────────────────────────────────

/**
 * Marca una operación preparada o confirmada como cancelada.
 */
export async function markImportOperationCanceled(
  db: Database,
  operationId: string,
  canceledByUid: string,
  reason: string,
): Promise<void> {
  const ref = db.collection("assistant_pending_imports").doc(operationId)
  const snap = await ref.get()

  if (!snap.exists) {
    throw new Error(`Operación no encontrada: ${operationId}`)
  }

  const operation = snap.data() as PendingImportOperation

  if (operation.status === "executed" || operation.status === "canceled") {
    throw new Error(
      `No se puede cancelar operación en estado: ${operation.status}`,
    )
  }

  const now = new Date().toISOString()

  await ref.update({
    status: "canceled",
    canceledAt: now,
  })

  // Auditar
  await db.collection("audit_logs").add({
    action: "assistant.import_canceled",
    actorUid: canceledByUid,
    targetType: "pending_import_operation",
    targetId: operationId,
    metadata: {
      reason,
      previousStatus: operation.status,
      folderOwnerOrganizationId: operation.folderOwnerOrganizationId,
    },
    createdAt: now,
  })
}

// ─── LECTURA ──────────────────────────────────────────────────────────────────

/**
 * Obtiene una operación pendiente por ID.
 */
export async function getPendingImportOperation(
  db: Database,
  operationId: string,
): Promise<PendingImportOperation | null> {
  const snap = await db
    .collection("assistant_pending_imports")
    .doc(operationId)
    .get()

  if (!snap.exists) return null
  return snap.data() as PendingImportOperation
}

/**
 * Obtiene todas las operaciones pendientes de un legajo.
 */
export async function getPendingImportsByFolder(
  db: Database,
  folderOwnerOrganizationId: string,
): Promise<PendingImportOperation[]> {
  const snap = await db
    .collection("assistant_pending_imports")
    .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
    .where("status", "in", ["prepared", "confirmed"])
    .limit(50)
    .get()

  return snap.docs.map((doc) => doc.data() as PendingImportOperation)
}

/**
 * Limpia operaciones expiradas (status expired, canceladas o ejecutadas).
 * Ejecutar periódicamente como Cloud Function.
 */
export async function cleanupExpiredOperations(db: Database): Promise<number> {
  const now = new Date()
  const snap = await db
    .collection("assistant_pending_imports")
    .where("expiresAt", "<", now.toISOString())
    .limit(100)
    .get()

  let count = 0
  for (const doc of snap.docs) {
    await doc.ref.delete()
    count++
  }

  return count
}
