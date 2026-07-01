// Acciones auditables
export type AuditAction =
  | "producer.created"
  | "producer.updated"
  | "accountant_link.created"
  | "accountant_link.updated"
  | "document.uploaded"
  | "document.deleted"
  | "document.job_deleted"
  | "accounting_period.created"
  | "accounting_period.updated"
  | "balance_sheet.created"
  | "balance_sheet.updated"
  | "income_statement.created"
  | "income_statement.updated"
  | "tax_document.created"
  | "tax_document.updated"
  | "asset.created"
  | "asset.updated"
  | "asset.deleted"
  | "liability.created"
  | "liability.updated"
  | "liability.deleted"
  | "access_request.created"
  | "access_request.approved"
  | "access_request.rejected"
  | "access_request.revoked"
  | "access_grant.created"
  | "access_grant.revoked"
  | "credit_folder.viewed"
  | "financing_request.created"
  | "financing_request.status_changed"
  | "user.login"
  | "user.logout"
  | "organization.created"
  | "organization.updated"
  | "organization.requesting_entity_created"
  | "access_invitation.created"
  | "access_invitation.sent"
  | "access_invitation.approved"
  | "access_invitation.accepted"
  | "access_invitation.revoked"
  | "access_invitation.expired"
  | "statement_import.extracted"
  | "statement_import.reviewed"
  | "statement_import.applied"
  | "statement_import.rejected"
  // CreditoHub (Ola 1)
  | "document.classified"
  | "document.job_queued"
  | "document.job_failed"
  | "field.extracted"
  | "field.confirmed"
  | "field.corrected"
  | "field.rejected"
  | "canonical_profile.updated"
  | "bank_requirement.created"
  | "bank_requirement.parsed"
  | "requirement.matched"
  | "credit_application.created"
  | "credit_package.generated"
  | "assistant.queried"
  | "document.routed"
  | "document.routing_reassigned"
  | "folder.certified"
  | "folder.certification_invalidated"
  // Asistente conversacional (Ola 1-6)
  | "assistant.conversation_started"
  | "assistant.document_uploaded"
  | "assistant.extraction_completed"
  | "assistant.intent_parsed"
  | "assistant.entity_resolved"
  | "assistant.import_prepared"
  | "assistant.import_confirmed"
  | "assistant.import_executed"
  | "assistant.import_canceled"
  // Plataforma
  | "ai_provider.changed"

// Entrada de auditoría (colección: audit_logs)
export interface AuditLog {
  id: string
  actorUid: string
  actorOrganizationId: string | null
  action: AuditAction
  targetType: string
  targetId: string
  producerId?: string // si la acción afecta a un productor
  metadata: Record<string, unknown>
  // Capturados automaticamente por lib/firebase/audit.ts desde el request
  ip?: string | null
  userAgent?: string | null
  createdAt: string
}

// Notificación interna (colección: notifications)
export type NotificationType =
  | "link_request_received"
  | "access_request_received"
  | "access_request_approved"
  | "access_request_rejected"
  | "access_request_revoked"
  | "access_expiring_soon"
  | "access_expired"
  | "financing_request_received"
  | "financing_request_status_changed"
  | "financing_request_observed"
  | "balance_pending_update"
  | "document_observed"
  | "folder_incomplete"

export interface Notification {
  id: string
  recipientUid: string
  organizationId: string | null
  type: NotificationType
  status: "unread" | "read" | "dismissed"
  payload: Record<string, unknown>
  createdAt: string
}
