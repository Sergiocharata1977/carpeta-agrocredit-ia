// Tipos para operaciones de importación pendiente del asistente conversacional
// Colección: assistant_pending_imports — operaciones temporales con TTL 24h

// Tipos de acciones que puede ejecutar una importación
export type ImportAction =
  | "create_related_company"
  | "associate_related_company"
  | "load_balance"
  | "link_document"
  | "update_canonical_profile"

// Tipos de entidades que pueden ser resueltas
export type ResolvedEntityType = "accounting_firm" | "root_client" | "related_company"

// ─── Operación de importación pendiente ────────────────────────────────────────

/**
 * Operación temporal preparada por el asistente, guardada en `assistant_pending_imports`.
 * Ciclo de vida: prepared → confirmed → executed | canceled
 * TTL máximo: 24 horas desde preparedAt
 */
export interface PendingImportOperation {
  operationId: string
  folderOwnerOrganizationId: string
  accountingFirmId?: string | null
  documentId: string
  actions: PendingAction[]
  preparedAt: string // ISO string
  expiresAt: string // ISO string (preparado + 24h)
  preparedByUid: string
  preparedByOrganizationId: string
  confirmedAt?: string // ISO string
  confirmedByUid?: string
  canceledAt?: string // ISO string
  executedAt?: string // ISO string
  status: "prepared" | "confirmed" | "executed" | "canceled" | "expired"
}

// ─── Acción pendiente dentro de una operación ──────────────────────────────────

/**
 * Una acción individual a ejecutar como parte de la operación.
 * Ordenadas para ejecutarse secuencialmente (crear empresa antes de cargar balance).
 */
export interface PendingAction {
  actionId: string
  type: ImportAction
  targetEntityId?: string
  targetEntityType?: ResolvedEntityType | "document" | "canonical_profile"
  targetEntityName: string
  payload: Record<string, unknown>
  requiresApproval: boolean
}

// ─── Entidad resuelta de una búsqueda ──────────────────────────────────────────

/**
 * Resultado de resolver una búsqueda de entidad (estudio, cliente, empresa).
 * Puede tener un resultado exacto, múltiples candidatos o no existir.
 */
export interface ResolvedEntity {
  type: ResolvedEntityType
  id?: string
  name: string
  taxId?: string
  parentOrganizationId?: string
  status: "found_exact" | "found_multiple" | "not_found" | "new_to_create"
  candidates?: EntityCandidate[]
}

// ─── Candidato de entidad ──────────────────────────────────────────────────────

/**
 * Posible coincidencia de una búsqueda de entidad.
 * Usado cuando hay múltiples resultados y requiere confirmación del usuario.
 */
export interface EntityCandidate {
  id: string
  name: string
  taxId: string
  confidence: number // 0-1
}

// ─── Intención del usuario parseada ───────────────────────────────────────────

/**
 * Resultado del parseo de lenguaje natural del usuario.
 * Extraída por IA y validada por intent-resolution.
 */
export interface ParsedUserIntent {
  intent: string // "attach_to_account" | "attach_to_related_company" | "create_related_company" | etc.
  targetAccountSearch?: string // búsqueda de contador/estudio si menciona
  targetCompanySearch?: string // búsqueda de empresa si menciona
  action: string // "prepare" | "confirm" | "execute" | "show"
  modifiers?: Record<string, unknown>
}

// ─── Datos extraídos de un documento ───────────────────────────────────────────

/**
 * Datos clasificados y extraídos de un documento procesado.
 * Referencian ExtractedField ids para mantener procedencia.
 */
export interface ExtractedDocumentData {
  documentId: string
  documentType: string // "balance_sheet", "income_statement", etc.
  fileName?: string
  issuer?: string
  company?: {
    name?: string
    cuit?: string
  }
  period?: {
    start?: string
    end?: string
  }
  issueDate?: string
  confidence: number // confianza global de extracción
  fields: ExtractedField[]
  summary?: string // resumen en lenguaje natural
}

// ─── Campo extraído individual ─────────────────────────────────────────────────

/**
 * Un campo individual extraído de un documento.
 * Referencia a documentId y procedencia (página, método).
 */
export interface ExtractedField {
  fieldCode: string // "activoCorriente", "liquidoTotal", etc.
  fieldLabel?: string // "Activo Corriente"
  rawValue?: string | null
  normalizedValue?: unknown // number, string, fecha, etc.
  confidence: number // 0-1
  pageNumber?: number | null
  extractionMethod?: string // "NATIVE_TEXT", "OCR", "TABLE_EXTRACTION", etc.
  reviewStatus?: string // "PENDING", "CONFIRMED", "CORRECTED", "REJECTED"
  observation?: string
}
