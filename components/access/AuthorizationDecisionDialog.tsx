"use client"

import { useEffect, useState } from "react"
import { GrantScopePicker } from "@/components/access/GrantScopePicker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AccessRequest, AccessScope } from "@/types/access"

interface AuthorizationDecisionDialogProps {
  request: AccessRequest | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onApprove: (params: { allowedScopes: AccessScope[]; expirationDays: number }) => Promise<void>
  onReject: (reason?: string) => Promise<void>
  isLoading?: boolean
}

export function AuthorizationDecisionDialog({
  request,
  open,
  onOpenChange,
  onApprove,
  onReject,
  isLoading = false,
}: AuthorizationDecisionDialogProps) {
  const [allowedScopes, setAllowedScopes] = useState<AccessScope[]>([])
  const [expirationDays, setExpirationDays] = useState(90)
  const [rejectionReason, setRejectionReason] = useState("")

  useEffect(() => {
    if (!request) return
    setAllowedScopes(request.requestedScopes)
    setExpirationDays(request.requestedDays)
    setRejectionReason("")
  }, [request])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Decidir solicitud de acceso</DialogTitle>
          <DialogDescription>
            Aproba solo los alcances necesarios y defini una fecha de vencimiento.
          </DialogDescription>
        </DialogHeader>

        {request && (
          <div className="space-y-5">
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Finalidad</p>
              <p className="text-muted-foreground">{request.purpose}</p>
            </div>

            <div className="space-y-2">
              <Label>Scopes aprobados</Label>
              <GrantScopePicker
                value={allowedScopes}
                allowedScopes={request.requestedScopes}
                onChange={setAllowedScopes}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expirationDays">Vigencia aprobada en dias</Label>
              <Input
                id="expirationDays"
                type="number"
                min={1}
                max={365}
                value={expirationDays}
                onChange={(event) => setExpirationDays(Number(event.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rejectionReason">Motivo de rechazo</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Opcional si vas a rechazar"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            onClick={() => onReject(rejectionReason || undefined)}
          >
            Rechazar
          </Button>
          <Button
            type="button"
            disabled={isLoading || allowedScopes.length === 0}
            onClick={() => onApprove({ allowedScopes, expirationDays })}
          >
            Aprobar acceso
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
