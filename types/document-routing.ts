// Auto-routing de documentos del Legajo por CUIT (CreditoHub — Ola 3).
//
// Tras clasificar un documento, el pipeline compara el CUIT detectado contra el
// taxId de cada organización del grupo (titular raíz + empresas hijas con
// parentOrganizationId) y registra una decisión de ruteo. Si matchea, el
// documento queda auto-asignado a la carpeta correcta; si no, requiere
// asignación manual del contador.

/** Estado de una decisión de ruteo documental. */
export type RoutingStatus =
  | "auto_assigned"
  | "needs_manual_assignment"
  | "manually_assigned"
  | "rejected"

export interface DocumentRoutingDecision {
  id: string
  documentId: string
  /** Org raíz (titular) del grupo donde se intentó rutear. */
  rootOrganizationId: string
  /** CUIT detectado por el clasificador (sin normalizar, tal cual viene). */
  detectedCuit: string | null
  /** Tipo documental detectado por el clasificador. */
  detectedDocumentType: string | null
  /** Carpeta (org) sugerida automáticamente por match de CUIT, o null. */
  suggestedFolderOwnerOrganizationId: string | null
  /** Carpeta (org) finalmente asignada (auto o manual), o null si pendiente. */
  assignedFolderOwnerOrganizationId: string | null
  routingStatus: RoutingStatus
  /** Confianza del ruteo (heredada de la clasificación), o null. */
  routingConfidence: number | null
  /** UID que revisó/asignó manualmente, o null. */
  reviewedBy: string | null
  /** Timestamp ISO de la revisión manual, o null. */
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
}
