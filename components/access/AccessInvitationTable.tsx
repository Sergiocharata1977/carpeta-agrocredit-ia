"use client"

import { Clock, CheckCircle2, XCircle, Ban, Send, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { AccessInvitation } from "@/types/access"

const STATUS_META: Record<AccessInvitation["status"], { label: string; className: string; icon: React.ReactNode }> = {
  draft:                   { label: "Borrador",           className: "bg-gray-100 text-gray-600",    icon: <Clock className="size-3" /> },
  pending_owner_approval:  { label: "Pendiente tuya",     className: "bg-amber-100 text-amber-700",  icon: <Clock className="size-3" /> },
  sent:                    { label: "Enviada",             className: "bg-blue-100 text-blue-700",    icon: <Send className="size-3" /> },
  accepted:                { label: "Aceptada",            className: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 className="size-3" /> },
  revoked:                 { label: "Revocada",            className: "bg-red-100 text-red-600",      icon: <Ban className="size-3" /> },
  expired:                 { label: "Expirada",            className: "bg-gray-100 text-gray-500",    icon: <XCircle className="size-3" /> },
}

interface AccessInvitationTableProps {
  invitations: AccessInvitation[]
  onRevoke: (id: string) => void
  onApprove?: (id: string) => void
  revoking?: string | null
}

export function AccessInvitationTable({
  invitations,
  onRevoke,
  onApprove,
  revoking,
}: AccessInvitationTableProps) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copyLink(invitationId: string) {
    // Link se obtiene aprobando; aquí sólo como placeholder UI
    await navigator.clipboard.writeText(`${window.location.origin}/invitar/acceso/[token-pendiente]`)
    setCopied(invitationId)
    setTimeout(() => setCopied(null), 2000)
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        No hay invitaciones enviadas todavía.
      </div>
    )
  }

  return (
    <div className="divide-y rounded-xl border border-[var(--brand-line)]">
      {invitations.map((inv) => {
        const meta = STATUS_META[inv.status] ?? STATUS_META.draft
        return (
          <div key={inv.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">{inv.recipientEmail}</p>
                {inv.recipientName && (
                  <span className="text-xs text-muted-foreground">({inv.recipientName})</span>
                )}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                  {meta.icon}
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {inv.requestedScopes.slice(0, 3).join(", ")}
                {inv.requestedScopes.length > 3 && ` +${inv.requestedScopes.length - 3}`}
                {" · "}{inv.approvedDays} días
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              {inv.status === "pending_owner_approval" && onApprove && (
                <Button size="sm" onClick={() => onApprove(inv.id)}>
                  Aprobar y enviar
                </Button>
              )}
              {inv.status === "sent" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(inv.id)}
                  className="gap-1.5"
                >
                  {copied === inv.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied === inv.id ? "Copiado" : "Copiar link"}
                </Button>
              )}
              {(inv.status === "sent" || inv.status === "pending_owner_approval") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => onRevoke(inv.id)}
                  disabled={revoking === inv.id}
                >
                  {revoking === inv.id ? "..." : "Revocar"}
                </Button>
              )}
              {inv.status === "accepted" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => onRevoke(inv.id)}
                  disabled={revoking === inv.id}
                >
                  Revocar acceso
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
