// Funciones server-side (Admin SDK) para preparar, validar y ejecutar importaciones
// Operaciones controladas: prepare (sin escribir) → confirm → execute (con transacción)

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import type {
  PendingImportOperation,
  PendingAction,
  ExtractedDocumentData,
} from "@/types/import-pending"
import { randomUUID } from "node:crypto"
import type { Firestore } from "firebase-admin/firestore"

type Database = Firestore

// ─── PREPARACIÓN DE IMPORTACIÓN ────────────────────────────────────────────────

/**
 * Prepara una operación de importación de balance sin escribir datos finales.
 * Genera operationId y devuelve estructura para guardar en assistant_pending_imports.
 */
export async function prepareBalanceImport(
  db: Database,
  documentId: string,
  extractedData: ExtractedDocumentData,
  folderOwnerOrganizationId: string,
  targetCompanyId?: string,
): Promise<PendingImportOperation> {
  const operationId = randomUUID()
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // +24h

  const actions: PendingAction[] = []

  // Si targetCompanyId existe, cargar balance en esa empresa
  if (targetCompanyId) {
    actions.push({
      actionId: randomUUID(),
      type: "load_balance",
      targetEntityId: targetCompanyId,
      targetEntityType: "related_company",
      targetEntityName: extractedData.company?.name || "Unknown",
      payload: {
        documentId,
        extractedFields: extractedData.fields,
        period: extractedData.period,
      },
      requiresApproval: false,
    })
  } else {
    // Si no, preparar acciones para crear/asociar empresa
    actions.push({
      actionId: randomUUID(),
      type: "create_related_company",
      targetEntityType: "related_company",
      targetEntityName: extractedData.company?.name || "Nueva Empresa",
      payload: {
        name: extractedData.company?.name,
        cuit: extractedData.company?.cuit,
        parentOrganizationId: folderOwnerOrganizationId,
      },
      requiresApproval: true,
    })

    actions.push({
      actionId: randomUUID(),
      type: "load_balance",
      targetEntityType: "related_company",
      targetEntityName: extractedData.company?.name || "Nueva Empresa",
      payload: {
        documentId,
        extractedFields: extractedData.fields,
        period: extractedData.period,
      },
      requiresApproval: false,
    })
  }

  // Acción para vincular documento
  actions.push({
    actionId: randomUUID(),
    type: "link_document",
    targetEntityId: documentId,
    targetEntityType: "document",
    targetEntityName: extractedData.fileName || documentId,
    payload: { documentId },
    requiresApproval: false,
  })

  const operation: PendingImportOperation = {
    operationId,
    folderOwnerOrganizationId,
    documentId,
    actions,
    preparedAt: now,
    expiresAt,
    preparedByUid: "", // será seteado por la ruta API
    preparedByOrganizationId: "", // será seteado por la ruta API
    status: "prepared",
  }

  return operation
}

// ─── VALIDACIÓN DE OPERACIÓN ──────────────────────────────────────────────────

/**
 * Valida que una operación sea ejecutable por el usuario solicitante.
 */
export async function validateImportOperation(
  db: Database,
  pendingOp: PendingImportOperation,
  requesterUid: string,
  requesterOrgId: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = []

  // Validar que requesterUid es miembro activo de requesterOrgId
  const memberSnap = await db
    .collection("organization_members")
    .where("uid", "==", requesterUid)
    .where("organizationId", "==", requesterOrgId)
    .where("status", "==", "active")
    .limit(1)
    .get()

  if (memberSnap.empty) {
    errors.push("Usuario no es miembro activo de la organización solicitante")
  }

  // Validar que no está expirada
  if (new Date(pendingOp.expiresAt) < new Date()) {
    errors.push("Operación expirada")
  }

  // Validar que requesterOrgId tiene acceso a folderOwnerOrganizationId
  // (Lógica simplificada: permitir si es el mismo tenant o si hay una relación existente)
  if (requesterOrgId !== pendingOp.folderOwnerOrganizationId) {
    // Buscar relación: contador vinculado o requesting_entity con grant activo
    const linkSnap = await db
      .collection("producer_accountant_links")
      .where("producerId", "==", pendingOp.folderOwnerOrganizationId)
      .where("accountantId", "==", requesterOrgId)
      .where("status", "==", "active")
      .limit(1)
      .get()

    if (linkSnap.empty) {
      errors.push("Organización no tiene acceso al legajo destino")
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

// ─── EJECUCIÓN CONFIRMADA ────────────────────────────────────────────────────

/**
 * Ejecuta operación confirmada en una transacción.
 * NOTA: Esta es una versión simplificada. Implementación real debe:
 * - Ejecutar cada PendingAction en orden
 * - Crear entidades en transacción
 * - Escribir audit logs
 * - Manejar rollback si falla
 */
export async function executeConfirmedImport(
  db: Database,
  operationId: string,
  pendingOp: PendingImportOperation,
  actorUid: string,
  actorOrgId: string,
): Promise<{ success: boolean; createdEntityIds: string[]; errors?: string[] }> {
  // Validar que está confirmada
  if (pendingOp.status !== "confirmed") {
    return {
      success: false,
      createdEntityIds: [],
      errors: [`Operación no está confirmada. Estado actual: ${pendingOp.status}`],
    }
  }

  try {
    const createdEntityIds: string[] = []
    const now = new Date().toISOString()

    // Ejecutar cada acción secuencialmente
    // NOTA: Implementación final debe usar transacción para atomicidad
    for (const action of pendingOp.actions) {
      if (action.type === "create_related_company") {
        // Crear empresa
        const newOrgRef = db.collection("organizations").doc()
        await newOrgRef.set({
          type: "system_user_entity",
          parentOrganizationId: pendingOp.folderOwnerOrganizationId,
          legalName: action.targetEntityName,
          taxId: (action.payload.cuit as string) || "",
          status: "active",
          createdBy: actorUid,
          createdAt: now,
          updatedAt: now,
        })
        createdEntityIds.push(newOrgRef.id)
      }
      // Otras acciones se implementarían aquí (load_balance, link_document, etc.)
    }

    // Marcar operación como executed
    const pendingImportRef = db.collection("assistant_pending_imports").doc(operationId)
    await pendingImportRef.update({
      status: "executed",
      executedAt: now,
    })

    // Auditar
    await db.collection("audit_logs").add({
      action: "assistant.import_executed",
      actorUid,
      actorOrganizationId: actorOrgId,
      targetType: "pending_import_operation",
      targetId: operationId,
      metadata: { createdEntityIds },
      createdAt: now,
    })

    return { success: true, createdEntityIds }
  } catch (error) {
    return {
      success: false,
      createdEntityIds: [],
      errors: [
        error instanceof Error ? error.message : "Error desconocido al ejecutar",
      ],
    }
  }
}

// ─── CANCELACIÓN ────────────────────────────────────────────────────────────

/**
 * Cancela una operación pendiente.
 */
export async function cancelImportOperation(
  db: Database,
  operationId: string,
  reason: string,
  canceledByUid: string,
): Promise<void> {
  const pendingRef = db.collection("assistant_pending_imports").doc(operationId)
  const snap = await pendingRef.get()

  if (!snap.exists) {
    throw new Error(`Operación no encontrada: ${operationId}`)
  }

  const operation = snap.data() as PendingImportOperation

  // Validar que puede ser cancelada
  if (operation.status === "executed" || operation.status === "canceled") {
    throw new Error(`No se puede cancelar operación en estado: ${operation.status}`)
  }

  // Actualizar estado
  await pendingRef.update({
    status: "canceled",
    canceledAt: new Date().toISOString(),
  })

  // Auditar
  await db.collection("audit_logs").add({
    action: "assistant.import_canceled",
    actorUid: canceledByUid,
    targetType: "pending_import_operation",
    targetId: operationId,
    metadata: { reason },
    createdAt: new Date().toISOString(),
  })
}

// ─── LECTURA ────────────────────────────────────────────────────────────────

/**
 * Obtiene una operación pendiente por ID (sin validar acceso).
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
