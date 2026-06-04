"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { GrantScopePicker } from "@/components/access/GrantScopePicker"
import { DurationPicker } from "@/components/access/DurationPicker"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { createAccessInvitationSchema, type CreateAccessInvitationInput } from "@/lib/schemas/access"
import type { AccessScope, InvitationRecipientSubtype } from "@/types/access"

const RECIPIENT_SUBTYPES: { value: InvitationRecipientSubtype; label: string }[] = [
  { value: "bank",                    label: "Banco" },
  { value: "financial_entity",        label: "Financiera" },
  { value: "agro_company",            label: "Empresa agrocomercial" },
  { value: "maquinaria_agricola",     label: "Maquinaria agrícola" },
  { value: "insumos_agricolas",       label: "Insumos agrícolas" },
  { value: "other_authorized_viewer", label: "Otro autorizado" },
]

interface CreateAccessInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetOrganizationId: string
  onCreated?: () => void
}

export function CreateAccessInvitationDialog({
  open,
  onOpenChange,
  targetOrganizationId,
  onCreated,
}: CreateAccessInvitationDialogProps) {
  const [scopes, setScopes] = useState<AccessScope[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ inviteUrl?: string; requiresOwnerApproval: boolean } | null>(null)
  const [copied, setCopied] = useState(false)

  const { register, handleSubmit, reset, watch, setValue } = useForm<CreateAccessInvitationInput>({
    resolver: zodResolver(createAccessInvitationSchema),
    defaultValues: {
      targetOrganizationId,
      targetScope: "single_organization",
      recipientSubtype: "bank",
      requestedScopes: [],
      approvedDays: 30,
      purpose: "",
    },
  })

  async function onSubmit(values: CreateAccessInvitationInput) {
    setLoading(true)
    setError(null)
    try {
      const token = await getFreshIdToken()
      const res = await fetch("/api/access-invitations", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, requestedScopes: scopes, approvedDays: days }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Error al crear invitación")
      setResult({
        inviteUrl: json.inviteUrl ? `${window.location.origin}${json.inviteUrl}` : undefined,
        requiresOwnerApproval: json.requiresOwnerApproval,
      })
      onCreated?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  async function copyUrl() {
    if (!result?.inviteUrl) return
    await navigator.clipboard.writeText(result.inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose() {
    reset()
    setScopes([])
    setDays(30)
    setResult(null)
    setError(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear link excepcional de legajo</DialogTitle>
          <DialogDescription>
            El receptor recibirá un link para crear su clave y ver solo lo que autoricés.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            {result.requiresOwnerApproval ? (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  La invitación quedó pendiente de tu aprobación. Desde la lista de invitaciones podés aprobarla para generar el link.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-medium">Link listo para enviar:</p>
                <div className="flex gap-2">
                  <Input value={result.inviteUrl ?? ""} readOnly className="text-xs" />
                  <Button size="sm" variant="outline" onClick={copyUrl} className="shrink-0 gap-1.5">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">El link expira en 7 días. El receptor debe usar el email que indicaste.</p>
              </div>
            )}
            <Button className="w-full" onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="recipientEmail">Email del destinatario</Label>
                <Input id="recipientEmail" type="email" {...register("recipientEmail")} placeholder="banco@ejemplo.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipientName">Nombre (opcional)</Label>
                <Input id="recipientName" {...register("recipientName")} placeholder="Ej. Juan García" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Tipo de receptor</Label>
              <select
                {...register("recipientSubtype")}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {RECIPIENT_SUBTYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label>Información a compartir</Label>
              <GrantScopePicker
                value={scopes}
                allowedScopes={["profile_basic","accounting_summary","balance_sheets","income_statements","tax_documents","assets","liabilities","documents"]}
                onChange={setScopes}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Vigencia del acceso</Label>
              <DurationPicker value={days} onChange={setDays} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="purpose">Propósito</Label>
              <Textarea id="purpose" {...register("purpose")} placeholder="Ej. Evaluación para crédito de maquinaria" rows={2} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" className="flex-1" disabled={loading || scopes.length === 0}>
                {loading ? "Creando..." : "Crear invitación"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
