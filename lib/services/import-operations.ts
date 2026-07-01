// Funciones server-side (Admin SDK) para preparar, validar y ejecutar importaciones
// Operaciones controladas: prepare (sin escribir) → confirm → execute (con transacción)

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import {
  DEFAULT_BALANCE_SHEET_DETAILS,
  calculateBalanceTotals,
  type BalanceSheetDetails,
} from "@/lib/accounting/statement-fields"
import type {
  PendingImportOperation,
  PendingAction,
  ExtractedDocumentData,
} from "@/types/import-pending"
import { randomUUID } from "node:crypto"
import type { Firestore } from "firebase-admin/firestore"

type Database = Firestore

interface ExecutedActionSummary {
  type: PendingAction["type"]
  targetEntityName: string
  targetEntityId?: string
  createdId?: string
  status: "executed" | "skipped"
  message: string
}

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
): Promise<{ success: boolean; createdEntityIds: string[]; executedActions: ExecutedActionSummary[]; errors?: string[] }> {
  if (pendingOp.status !== "confirmed") {
    return {
      success: false,
      createdEntityIds: [],
      executedActions: [],
      errors: [`Operacion no esta confirmada. Estado actual: ${pendingOp.status}`],
    }
  }

  try {
    const createdEntityIds: string[] = []
    const executedActions: ExecutedActionSummary[] = []
    const createdCompanyIdsByName = new Map<string, string>()
    const now = new Date().toISOString()

    for (const action of pendingOp.actions) {
      if (action.type === "create_related_company") {
        const newOrgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()
        await newOrgRef.set({
          type: "system_user_entity",
          parentOrganizationId: pendingOp.folderOwnerOrganizationId,
          legalName: action.targetEntityName,
          taxId: stringPayload(action.payload.cuit) || "",
          status: "active",
          createdBy: actorUid,
          createdAt: now,
          updatedAt: now,
        })
        createdEntityIds.push(newOrgRef.id)
        createdCompanyIdsByName.set(normalizeKey(action.targetEntityName), newOrgRef.id)
        executedActions.push({
          type: action.type,
          targetEntityName: action.targetEntityName,
          targetEntityId: newOrgRef.id,
          createdId: newOrgRef.id,
          status: "executed",
          message: `Empresa creada: ${action.targetEntityName}`,
        })
        continue
      }

      if (action.type === "associate_related_company") {
        const companyId = action.targetEntityId || stringPayload(action.payload.companyId)
        if (companyId) {
          executedActions.push({
            type: action.type,
            targetEntityName: action.targetEntityName,
            targetEntityId: companyId,
            status: "executed",
            message: `Empresa asociada: ${action.targetEntityName}`,
          })
        }
        continue
      }

      if (action.type === "load_balance") {
        const targetEntityId =
          action.targetEntityId ||
          createdCompanyIdsByName.get(normalizeKey(action.targetEntityName)) ||
          pendingOp.folderOwnerOrganizationId
        const fields = getActionFields(action)
        const periodId = await ensureAccountingPeriod(db, targetEntityId, action, actorUid, now)
        const balanceId = await createDraftBalanceSheet(db, {
          action,
          actorUid,
          documentId: pendingOp.documentId,
          fields,
          now,
          periodId,
          targetEntityId,
        })
        createdEntityIds.push(balanceId)
        executedActions.push({
          type: action.type,
          targetEntityName: action.targetEntityName,
          targetEntityId,
          createdId: balanceId,
          status: "executed",
          message: `Balance borrador creado para ${action.targetEntityName}`,
        })
        continue
      }

      if (action.type === "link_document") {
        const documentId = stringPayload(action.payload.documentId) || pendingOp.documentId
        const targetEntityId =
          createdCompanyIdsByName.get(normalizeKey(action.targetEntityName)) ||
          createdEntityIds[0] ||
          pendingOp.folderOwnerOrganizationId
        await db.collection(COLLECTIONS.DOCUMENTS).doc(documentId).update({
          linkedToOrganizationId: targetEntityId,
          linkedAt: now,
          updatedAt: now,
        })
        executedActions.push({
          type: action.type,
          targetEntityName: action.targetEntityName,
          targetEntityId,
          status: "executed",
          message: `Documento vinculado: ${action.targetEntityName}`,
        })
        continue
      }

      if (action.type === "update_canonical_profile") {
        const profileRef = await getCanonicalProfileRef(db, pendingOp.folderOwnerOrganizationId)
        await profileRef.set(
            {
              folderOwnerOrganizationId: pendingOp.folderOwnerOrganizationId,
              identity: {
                cuit: stringPayload(action.payload.cuit) || "",
                legalName: stringPayload(action.payload.companyName) || action.targetEntityName,
              },
              lastAssistantOperationId: operationId,
              updatedAt: now,
            },
            { merge: true },
          )
        executedActions.push({
          type: action.type,
          targetEntityName: action.targetEntityName,
          targetEntityId: profileRef.id,
          status: "executed",
          message: `Perfil crediticio actualizado: ${action.targetEntityName}`,
        })
      }
    }

    const pendingImportRef = db.collection(COLLECTIONS.ASSISTANT_PENDING_IMPORTS).doc(operationId)
    await pendingImportRef.update({
      status: "executed",
      executedAt: now,
      executedActions,
    })

    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      action: "assistant.import_executed",
      actorUid,
      actorOrganizationId: actorOrgId,
      targetType: "pending_import_operation",
      targetId: operationId,
      metadata: { createdEntityIds, executedActions },
      createdAt: now,
    })

    return { success: true, createdEntityIds, executedActions }
  } catch (error) {
    return {
      success: false,
      createdEntityIds: [],
      executedActions: [],
      errors: [error instanceof Error ? error.message : "Error desconocido al ejecutar"],
    }
  }
}

// ─── CANCELACIÓN ────────────────────────────────────────────────────────────

/**
 * Cancela una operación pendiente.
 */
function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function stringPayload(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function numericValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Number(value.replace(/\./g, "").replace(",", "."))
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function getActionFields(action: PendingAction): Array<Record<string, unknown>> {
  const raw = action.payload.extractedFields ?? action.payload.fields
  return Array.isArray(raw)
    ? raw.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    : []
}

function getFieldCode(field: Record<string, unknown>): string {
  return typeof field.fieldCode === "string" ? field.fieldCode : ""
}

function getFieldAmount(field: Record<string, unknown>): number {
  if ("normalizedValue" in field) return numericValue(field.normalizedValue)
  if ("value" in field) return numericValue(field.value)
  if ("rawValue" in field) return numericValue(field.rawValue)
  return 0
}

function setDetail(
  details: BalanceSheetDetails,
  path: keyof BalanceSheetDetails,
  field: string,
  value: number,
) {
  ;(details[path] as Record<string, number>)[field] = value
}

function buildBalanceDetails(fields: Array<Record<string, unknown>>): BalanceSheetDetails {
  const details: BalanceSheetDetails = JSON.parse(JSON.stringify(DEFAULT_BALANCE_SHEET_DETAILS))
  for (const field of fields) {
    const code = normalizeKey(getFieldCode(field)).replace(/[^a-z0-9]/g, "")
    const value = getFieldAmount(field)
    if (!value) continue

    if (code.includes("cashandbanks") || code.includes("cajaybancos")) setDetail(details, "currentAssets", "cashAndBanks", value)
    else if (code.includes("temporaryinvestments") || code.includes("inversionestemporarias")) setDetail(details, "currentAssets", "temporaryInvestments", value)
    else if (code.includes("inventories") || code.includes("bienesdecambio")) setDetail(details, "currentAssets", "inventories", value)
    else if (code.includes("tradereceivables") || code.includes("creditosporventas")) setDetail(details, "currentAssets", "tradeReceivables", value)
    else if (code.includes("activocorriente") || code.includes("currentassets")) setDetail(details, "currentAssets", "otherAssets", value)
    else if (code.includes("propertyplantequipment") || code.includes("bienesdeuso")) setDetail(details, "nonCurrentAssets", "propertyPlantEquipment", value)
    else if (code.includes("activonocorriente") || code.includes("noncurrentassets")) setDetail(details, "nonCurrentAssets", "otherAssets", value)
    else if (code.includes("loans") || code.includes("prestamos")) setDetail(details, "currentLiabilities", "loans", value)
    else if (code.includes("commercialdebts") || code.includes("deudascomerciales")) setDetail(details, "currentLiabilities", "commercialDebts", value)
    else if (code.includes("taxliabilities") || code.includes("cargasfiscales")) setDetail(details, "currentLiabilities", "taxLiabilities", value)
    else if (code.includes("pasivocorriente") || code.includes("currentliabilities")) setDetail(details, "currentLiabilities", "otherDebts", value)
    else if (code.includes("pasivonocorriente") || code.includes("noncurrentliabilities")) setDetail(details, "nonCurrentLiabilities", "otherDebts", value)
  }
  return details
}

function getEquityTotal(fields: Array<Record<string, unknown>>): number {
  const field = fields.find((item) => {
    const code = normalizeKey(getFieldCode(item)).replace(/[^a-z0-9]/g, "")
    return code.includes("equity") || code.includes("patrimonioneto")
  })
  return field ? getFieldAmount(field) : 0
}

function inferYear(action: PendingAction): number {
  const period = action.payload.period
  if (period && typeof period === "object") {
    const start = (period as { start?: unknown }).start
    const end = (period as { end?: unknown }).end
    const value = typeof end === "string" ? end : typeof start === "string" ? start : ""
    const year = Number(value.match(/\d{4}/)?.[0])
    if (Number.isInteger(year)) return year
  }
  return new Date().getFullYear()
}

async function ensureAccountingPeriod(
  db: Database,
  targetEntityId: string,
  action: PendingAction,
  actorUid: string,
  now: string,
): Promise<string> {
  const year = inferYear(action)
  const existing = await db
    .collection(COLLECTIONS.ACCOUNTING_PERIODS)
    .where("producerId", "==", targetEntityId)
    .where("year", "==", year)
    .where("periodType", "==", "fiscal_year")
    .limit(1)
    .get()
  if (!existing.empty) return existing.docs[0].id

  const ref = db.collection(COLLECTIONS.ACCOUNTING_PERIODS).doc()
  await ref.set({
    producerId: targetEntityId,
    organizationId: targetEntityId,
    year,
    periodType: "fiscal_year",
    label: `Ejercicio ${year}`,
    status: "open",
    closedAt: null,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
  })
  return ref.id
}

async function createDraftBalanceSheet(
  db: Database,
  params: {
    action: PendingAction
    actorUid: string
    documentId: string
    fields: Array<Record<string, unknown>>
    now: string
    periodId: string
    targetEntityId: string
  },
): Promise<string> {
  const details = buildBalanceDetails(params.fields)
  const equityTotal = getEquityTotal(params.fields)
  const totals = calculateBalanceTotals(details, equityTotal)
  const ref = db.collection(COLLECTIONS.BALANCE_SHEETS).doc()
  await ref.set({
    producerId: params.targetEntityId,
    organizationId: params.targetEntityId,
    folderOwnerOrganizationId: params.targetEntityId,
    periodId: params.periodId,
    details,
    assetsTotal: totals.assetsTotal,
    liabilitiesTotal: totals.liabilitiesTotal,
    equityTotal: totals.equityTotal,
    currency: "ARS",
    validationStatus: "draft",
    observations: `Creado desde asistente IA. Revisar importacion ${params.action.actionId}.`,
    documentIds: [params.documentId],
    createdBy: params.actorUid,
    createdAt: params.now,
    updatedAt: params.now,
  })
  return ref.id
}

async function getCanonicalProfileRef(db: Database, folderOwnerOrganizationId: string) {
  const snap = await db
    .collection(COLLECTIONS.CANONICAL_CREDIT_PROFILES)
    .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
    .limit(1)
    .get()
  if (!snap.empty) return snap.docs[0].ref
  return db.collection(COLLECTIONS.CANONICAL_CREDIT_PROFILES).doc()
}

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
