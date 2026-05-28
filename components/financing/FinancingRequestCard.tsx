"use client"

import { FinancingStatusBadge } from "@/components/financing/FinancingStatusBadge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { FinancingRequest, FinancingStatus } from "@/types/financing"

const STATUS_OPTIONS: Array<{ value: FinancingStatus; label: string }> = [
  { value: "pending_authorization", label: "Pend. autorizacion" },
  { value: "requested", label: "Solicitado" },
  { value: "documents_received", label: "Docs. recibidos" },
  { value: "in_review", label: "En analisis" },
  { value: "observed", label: "Observado" },
  { value: "approved", label: "Aprobado" },
  { value: "rejected", label: "Rechazado" },
  { value: "expired", label: "Vencido" },
]

interface FinancingRequestCardProps {
  request: FinancingRequest
  onStatusChange?: (request: FinancingRequest, status: FinancingStatus) => void
  compact?: boolean
}

export function FinancingRequestCard({
  request,
  onStatusChange,
  compact = false,
}: FinancingRequestCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium">Productor {request.producerId}</CardTitle>
          <FinancingStatusBadge status={request.status} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{request.currency}</Badge>
          <Badge variant="outline">
            {new Intl.NumberFormat("es-AR").format(request.amount)}
          </Badge>
          <Badge variant="outline">{request.termMonths} meses</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 pt-0 text-sm">
        <p className="line-clamp-3 text-muted-foreground">{request.purpose}</p>
        {!compact && request.observations && (
          <p className="rounded-md bg-muted p-2 text-xs">{request.observations}</p>
        )}
      </CardContent>
      {onStatusChange && (
        <CardFooter className="gap-2 p-4 pt-0">
          <Select
            value={request.status}
            onValueChange={(value) => onStatusChange(request, value as FinancingStatus)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onStatusChange(request, "observed")}
          >
            Observar
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
