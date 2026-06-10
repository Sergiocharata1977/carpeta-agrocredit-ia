"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Notification, NotificationType } from "@/types/audit"

const TYPE_LABELS: Record<NotificationType, string> = {
  link_request_received: "Solicitud de vinculo",
  access_request_received: "Acceso solicitado",
  access_request_approved: "Acceso aprobado",
  access_request_rejected: "Acceso rechazado",
  access_request_revoked: "Acceso revocado",
  access_expiring_soon: "Acceso por vencer",
  access_expired: "Acceso vencido",
  financing_request_received: "Financiacion recibida",
  financing_request_status_changed: "Estado actualizado",
  financing_request_observed: "Financiacion observada",
  balance_pending_update: "Balance pendiente",
  document_observed: "Documento observado",
  folder_incomplete: "Carpeta incompleta",
}

interface NotificationListProps {
  notifications: Notification[]
  onMarkRead?: (notification: Notification) => void
  onDismiss?: (notification: Notification) => void
}

export function NotificationList({
  notifications,
  onMarkRead,
  onDismiss,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No hay notificaciones.
      </div>
    )
  }

  return (
    <div className="divide-y rounded-md border">
      {notifications.map((notification) => (
        <div key={notification.id} className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{TYPE_LABELS[notification.type]}</p>
              <Badge variant={notification.status === "unread" ? "default" : "outline"}>
                {notification.status === "unread" ? "Nueva" : "Leida"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatNotificationPayload(notification.payload)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {notification.status === "unread" && onMarkRead && (
              <Button size="sm" variant="outline" onClick={() => onMarkRead(notification)}>
                Marcar leida
              </Button>
            )}
            {onDismiss && (
              <Button size="sm" variant="ghost" onClick={() => onDismiss(notification)}>
                Ocultar
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatNotificationPayload(payload: Record<string, unknown>): string {
  const producerId = typeof payload.producerId === "string" ? payload.producerId : null
  const requestId =
    typeof payload.accessRequestId === "string"
      ? payload.accessRequestId
      : typeof payload.financingRequestId === "string"
        ? payload.financingRequestId
        : null
  const pieces = [
    producerId ? `Productor ${producerId}` : null,
    requestId ? `Referencia ${requestId}` : null,
  ].filter(Boolean)

  return pieces.length > 0 ? pieces.join(" · ") : "Notificacion interna"
}
