"use client"

import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getIdToken } from "@/lib/firebase/auth-client"
import { cn } from "@/lib/utils"

export interface VinculoPendiente {
  id: string
  status: "pending" | "active" | "inactive" | "rejected"
  systemUserOrganizationId?: string
  producerId?: string
  accountingFirmId: string
  legalName?: string
  organizationLegalName?: string
  taxId?: string
  requestedByName?: string
  createdAt?: string | Date | null
}

interface VinculoPendienteCardProps {
  link: VinculoPendiente
  className?: string
  onDecision?: (status: "active" | "rejected") => void
}

export function VinculoPendienteCard({ link, className, onDecision }: VinculoPendienteCardProps) {
  const [loadingStatus, setLoadingStatus] = useState<"active" | "rejected" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const organizationName = link.organizationLegalName ?? link.legalName ?? "Usuario sin nombre"
  const createdAt =
    link.createdAt instanceof Date
      ? link.createdAt.toLocaleDateString("es-AR")
      : link.createdAt
        ? new Date(link.createdAt).toLocaleDateString("es-AR")
        : null

  async function decide(status: "active" | "rejected") {
    setLoadingStatus(status)
    setError(null)
    try {
      const token = await getIdToken()
      const response = await fetch(`/api/producer-accountant-links/${link.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "No se pudo actualizar el vinculo")
      }

      onDecision?.(status)
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "No se pudo actualizar el vinculo")
    } finally {
      setLoadingStatus(null)
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="min-w-0">
          <CardTitle className="truncate text-base">{organizationName}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {link.taxId ? `CUIT ${link.taxId}` : "CUIT pendiente"}
            {createdAt ? ` - solicitado ${createdAt}` : ""}
          </p>
        </div>
        <Badge variant={link.status === "pending" ? "outline" : "secondary"}>{link.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {link.requestedByName && (
          <p className="text-sm text-muted-foreground">Solicitado por {link.requestedByName}</p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {link.status === "pending" && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="flex-1" disabled={!!loadingStatus} onClick={() => decide("active")}>
              {loadingStatus === "active" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
              Aceptar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={!!loadingStatus}
              onClick={() => decide("rejected")}
            >
              {loadingStatus === "rejected" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <X className="mr-2 size-4" />}
              Rechazar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
