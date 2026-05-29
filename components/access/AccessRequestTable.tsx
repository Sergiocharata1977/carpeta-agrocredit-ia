"use client"

import { ACCESS_SCOPE_OPTIONS } from "@/components/access/GrantScopePicker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AccessRequest, AccessRequestStatus } from "@/types/access"

const STATUS_LABELS: Record<AccessRequestStatus, string> = {
  draft: "Borrador",
  requested: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  revoked: "Revocada",
  expired: "Vencida",
}

const STATUS_VARIANTS: Record<
  AccessRequestStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  requested: "secondary",
  approved: "default",
  rejected: "destructive",
  revoked: "outline",
  expired: "outline",
}

function ScopeList({ scopes }: { scopes: AccessRequest["requestedScopes"] }) {
  const labels = scopes.map((scope) => {
    return ACCESS_SCOPE_OPTIONS.find((option) => option.value === scope)?.label ?? scope
  })
  return <span className="text-muted-foreground">{labels.join(", ")}</span>
}

export function AccessStatusBadge({ status }: { status: AccessRequestStatus }) {
  return <Badge variant={STATUS_VARIANTS[status]}>{STATUS_LABELS[status]}</Badge>
}

interface AccessRequestTableProps {
  requests: AccessRequest[]
  onDecide?: (request: AccessRequest) => void
  emptyMessage?: string
}

export function AccessRequestTable({
  requests,
  onDecide,
  emptyMessage = "No hay solicitudes de acceso.",
}: AccessRequestTableProps) {
  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Productor</TableHead>
          <TableHead>Finalidad</TableHead>
          <TableHead>Alcance</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="w-28 text-right">Accion</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((request) => (
          <TableRow key={request.id}>
            <TableCell className="font-mono text-xs">{request.targetOrganizationId}</TableCell>
            <TableCell>{request.purpose}</TableCell>
            <TableCell>
              <ScopeList scopes={request.requestedScopes} />
            </TableCell>
            <TableCell>
              <AccessStatusBadge status={request.status} />
            </TableCell>
            <TableCell className="text-right">
              {request.status === "requested" && onDecide ? (
                <Button size="sm" variant="outline" onClick={() => onDecide(request)}>
                  Decidir
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
