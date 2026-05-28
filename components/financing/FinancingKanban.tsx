"use client"

import { FinancingRequestCard } from "@/components/financing/FinancingRequestCard"
import type { FinancingRequest, FinancingStatus } from "@/types/financing"

const KANBAN_COLUMNS: Array<{ status: FinancingStatus; label: string }> = [
  { status: "pending_authorization", label: "Pend. autorizacion" },
  { status: "requested", label: "Solicitado" },
  { status: "documents_received", label: "Docs recibidos" },
  { status: "in_review", label: "En analisis" },
  { status: "observed", label: "Observado" },
  { status: "approved", label: "Aprobado" },
  { status: "rejected", label: "Rechazado" },
]

interface FinancingKanbanProps {
  requests: FinancingRequest[]
  onStatusChange?: (request: FinancingRequest, status: FinancingStatus) => void
}

export function FinancingKanban({ requests, onStatusChange }: FinancingKanbanProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No hay solicitudes de financiacion.
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-4 2xl:grid-cols-7">
      {KANBAN_COLUMNS.map((column) => {
        const columnRequests = requests.filter((request) => request.status === column.status)
        return (
          <section key={column.status} className="min-w-0 space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-medium">{column.label}</h2>
              <span className="text-xs text-muted-foreground">{columnRequests.length}</span>
            </div>
            <div className="space-y-3">
              {columnRequests.map((request) => (
                <FinancingRequestCard
                  key={request.id}
                  request={request}
                  onStatusChange={onStatusChange}
                  compact
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
