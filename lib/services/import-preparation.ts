// Servicio para preparar una operación de importación desde una intención resuelta
// Arma el PendingImportOperation con las acciones a ejecutar

import { randomUUID } from "node:crypto"
import type { Firestore } from "firebase-admin/firestore"
import type {
  ParsedUserIntent,
  PendingImportOperation,
  PendingAction,
  ResolvedEntity,
  ExtractedDocumentData,
} from "@/types/import-pending"

type Database = Firestore

/**
 * Prepara una operación de importación (sin guardar) a partir de una intención resuelta.
 * Genera el array de PendingAction en el orden correcto.
 */
export async function prepareImportFromIntent(
  intent: ParsedUserIntent,
  extractedData: ExtractedDocumentData,
  resolvedEntities: {
    relatedCompany?: ResolvedEntity
    accountingFirm?: ResolvedEntity
    rootClient?: ResolvedEntity
  },
  documentId: string,
  folderOwnerOrganizationId: string,
  db: Database,
): Promise<PendingImportOperation> {
  const operationId = randomUUID()
  const now = new Date().toISOString()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const actions: PendingAction[] = []

  // Paso 1: Si relatedCompany no existe y usuario quiere crear → action "create_related_company"
  if (
    resolvedEntities.relatedCompany?.status === "not_found" ||
    resolvedEntities.relatedCompany?.status === "new_to_create" ||
    (intent.intent === "create_related_company" && !resolvedEntities.relatedCompany && extractedData.company?.name)
  ) {
    const companyName = resolvedEntities.relatedCompany?.name || extractedData.company?.name || "Nueva Empresa"
    const cuit = resolvedEntities.relatedCompany?.taxId || extractedData.company?.cuit || ""

    actions.push({
      actionId: randomUUID(),
      type: "create_related_company",
      targetEntityType: "related_company",
      targetEntityName: companyName,
      payload: {
        name: companyName,
        cuit,
        parentOrganizationId: folderOwnerOrganizationId,
        activity: intent.modifiers?.activity || "agriculture",
      },
      requiresApproval: true,
    })
  }

  // Paso 2: Si relatedCompany existe pero no está asociada → action "associate_related_company"
  if (
    resolvedEntities.relatedCompany?.status === "found_exact" ||
    resolvedEntities.relatedCompany?.status === "found_multiple"
  ) {
    if (resolvedEntities.relatedCompany.id) {
      actions.push({
        actionId: randomUUID(),
        type: "associate_related_company",
        targetEntityId: resolvedEntities.relatedCompany.id,
        targetEntityType: "related_company",
        targetEntityName: resolvedEntities.relatedCompany.name,
        payload: {
          companyId: resolvedEntities.relatedCompany.id,
        },
        requiresApproval: false,
      })
    }
  }

  // Paso 3: Cargar balance (siempre, si tenemos campos)
  if (extractedData.fields && extractedData.fields.length > 0) {
    const targetCompanyName =
      resolvedEntities.relatedCompany?.name ||
      extractedData.company?.name ||
      "Empresa"

    actions.push({
      actionId: randomUUID(),
      type: "load_balance",
      targetEntityType: "related_company",
      targetEntityName: targetCompanyName,
      payload: {
        documentId,
        extractedFields: extractedData.fields,
        period: extractedData.period,
        documentType: extractedData.documentType,
      },
      requiresApproval: false,
    })
  }

  // Paso 4: Vincular documento
  actions.push({
    actionId: randomUUID(),
    type: "link_document",
    targetEntityId: documentId,
    targetEntityType: "document",
    targetEntityName: extractedData.fileName || documentId,
    payload: {
      documentId,
      folderOwnerOrganizationId,
    },
    requiresApproval: false,
  })

  // Paso 5: Actualizar perfil canónico (si hay datos suficientes)
  if (extractedData.company?.cuit) {
    actions.push({
      actionId: randomUUID(),
      type: "update_canonical_profile",
      targetEntityType: "canonical_profile",
      targetEntityName: extractedData.company.name || "Perfil Canónico",
      payload: {
        cuit: extractedData.company.cuit,
        companyName: extractedData.company.name,
        extractedFields: extractedData.fields,
      },
      requiresApproval: false,
    })
  }

  // Construir PendingImportOperation
  const operation: PendingImportOperation = {
    operationId,
    folderOwnerOrganizationId,
    accountingFirmId: resolvedEntities.accountingFirm?.id ?? null,
    documentId,
    actions,
    preparedAt: now,
    expiresAt,
    preparedByUid: "", // será seteado por ruta API
    preparedByOrganizationId: "", // será seteado por ruta API
    status: "prepared",
  }

  return operation
}
