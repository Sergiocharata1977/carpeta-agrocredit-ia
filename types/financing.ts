// Estado de solicitud de financiación
export type FinancingStatus =
  | "draft"
  | "requested"
  | "pending_authorization"
  | "documents_received"
  | "in_review"
  | "observed"
  | "approved"
  | "rejected"
  | "expired"

// Tipo de financiación
export type FinancingType =
  | "working_capital"
  | "investment"
  | "mortgage"
  | "commercial_credit"
  | "leasing"
  | "other"

// Evento de cambio de estado
export interface FinancingStatusEvent {
  status: FinancingStatus
  changedBy: string
  changedAt: string
  note?: string
}

// Solicitud de financiación (colección: financing_requests)
export interface FinancingRequest {
  id: string
  targetOrganizationId: string   // ID en organizations (system_user o system_user_entity)
  requesterOrganizationId: string
  grantId: string | null // access_grant asociado
  financingType: FinancingType
  amount: number
  currency: "ARS" | "USD"
  termMonths: number
  purpose: string // destino del financiamiento
  status: FinancingStatus
  observations?: string
  requiredDocuments: string[] // lista de documentos solicitados
  receivedDocuments: string[] // documentos recibidos
  statusHistory: FinancingStatusEvent[]
  createdAt: string
  updatedAt: string
  createdBy: string
}
