// Acciones auditables
export type AuditAction =
  | "producer.created"
  | "producer.updated"
  | "accountant_link.created"
  | "accountant_link.updated"
  | "document.uploaded"
  | "balance_sheet.created"
  | "balance_sheet.updated"
  | "income_statement.created"
  | "income_statement.updated"
  | "tax_document.created"
  | "tax_document.updated"
  | "asset.created"
  | "asset.updated"
  | "liability.created"
  | "liability.updated"
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
