// Máquina de estados del asistente conversacional de CreditoHub
// Controla transiciones: upload → process → analyze → intent → resolve → prepare → review → confirm → execute

import type {
  ExtractedDocumentData,
  ExtractedField,
  ParsedUserIntent,
  ResolvedEntity,
  EntityCandidate,
  PendingImportOperation,
  PendingAction,
  ImportAction,
  ResolvedEntityType,
} from './import-pending'

export enum AssistantConversationState {
  idle = "idle",
  uploading = "uploading",
  processing = "processing",
  document_analyzed = "document_analyzed",
  awaiting_user_intent = "awaiting_user_intent",
  resolving_entities = "resolving_entities",
  preparing_import = "preparing_import",
  awaiting_review = "awaiting_review",
  awaiting_confirmation = "awaiting_confirmation",
  executing_import = "executing_import",
  completed = "completed",
  error = "error",
}

// Referencia a DocumentType de credito-hub.ts
export type DocumentType =
  | "balance_sheet"
  | "income_statement"
  | "tax_return"
  | "bank_statement"
  | "invoice"
  | "other"

// Contexto de conversación — mantiene estado a través de toda la interacción
export interface AssistantContext {
  state: AssistantConversationState
  documentId?: string
  fileName?: string
  extractedData?: ExtractedDocumentData
  detectedType?: DocumentType
  detectedCompany?: { name: string; cuit?: string }
  userIntent?: ParsedUserIntent
  resolvedEntity?: ResolvedEntity
  pendingImport?: PendingImportOperation
  executionSummary?: string[]
  error?: string
  messages: AssistantMessage[]
}

// Mensaje en el chat del asistente
export interface AssistantMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  actionType?: "upload" | "parse_intent" | "resolve_entity" | "preview" | "confirm" | "execute"
}

// Re-exportar desde import-pending para conveniencia
export type {
  ExtractedDocumentData,
  ExtractedField,
  ParsedUserIntent,
  ResolvedEntity,
  EntityCandidate,
  PendingImportOperation,
  PendingAction,
  ImportAction,
  ResolvedEntityType,
}
