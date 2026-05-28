import { Badge } from "@/components/ui/badge"
import type { FinancingStatus } from "@/types/financing"

const STATUS_CONFIG: Record<
  FinancingStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Borrador", variant: "outline" },
  requested: { label: "Solicitado", variant: "secondary" },
  pending_authorization: { label: "Pend. autorización", variant: "secondary" },
  documents_received: { label: "Docs. recibidos", variant: "default" },
  in_review: { label: "En análisis", variant: "default" },
  observed: { label: "Observado", variant: "destructive" },
  approved: { label: "Aprobado", variant: "default" },
  rejected: { label: "Rechazado", variant: "destructive" },
  expired: { label: "Vencido", variant: "outline" },
}

export function FinancingStatusBadge({ status }: { status: FinancingStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
