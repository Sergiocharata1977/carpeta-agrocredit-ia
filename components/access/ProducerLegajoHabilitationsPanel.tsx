"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ComponentType } from "react"
import { toast } from "sonner"
import { AlertCircle, Clock, LinkIcon, Plus, QrCode, Search, ShieldCheck } from "lucide-react"
import { AccessInvitationTable } from "@/components/access/AccessInvitationTable"
import { CreateAccessInvitationDialog } from "@/components/access/CreateAccessInvitationDialog"
import { DurationPicker } from "@/components/access/DurationPicker"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getFreshIdToken, getIdToken } from "@/lib/firebase/auth-client"
import { getActiveGrants, getGrantsForProducer, revokeAccessGrant } from "@/lib/services/access-grants"
import type { AccessGrant, AccessInvitation, AccessScope, InvitationRecipientSubtype } from "@/types/access"

interface ProducerLegajoHabilitationsPanelProps {
  organizationId: string | null
  compact?: boolean
}

interface RequestingEntityOption {
  id: string
  legalName: string
  taxId: string
  subtype?: InvitationRecipientSubtype | null
  contactEmail?: string | null
}

const DEFAULT_SCOPES: AccessScope[] = ["profile_basic", "accounting_summary", "balance_sheets", "income_statements", "tax_documents", "documents"]

export function ProducerLegajoHabilitationsPanel({
  organizationId,
  compact = false,
}: ProducerLegajoHabilitationsPanelProps) {
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [invitations, setInvitations] = useState<AccessInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [mode, setMode] = useState<"account" | "link" | "qr">("account")
  const [query, setQuery] = useState("")
  const [entities, setEntities] = useState<RequestingEntityOption[]>([])
  const [selectedEntity, setSelectedEntity] = useState<RequestingEntityOption | null>(null)
  const [scopes, setScopes] = useState<AccessScope[]>(DEFAULT_SCOPES)
  const [days, setDays] = useState(30)
  const [purpose, setPurpose] = useState("Habilitacion temporal para visualizar legajo agrofinanciero.")
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
  // null = todavia no se sabe; false = carpeta vacia, no se puede habilitar
  const [folderHasData, setFolderHasData] = useState<boolean | null>(null)

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setGrants([])
      setInvitations([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [nextGrants, token] = await Promise.all([getGrantsForProducer(organizationId), getIdToken()])
      setGrants(nextGrants)

      if (token) {
        const res = await fetch(`/api/access-invitations?ownerOrganizationId=${organizationId}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (res.ok) {
          const json = await res.json()
          setInvitations(json.invitations ?? [])
        }

        const statusRes = await fetch(`/api/folders/${organizationId}/status`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        if (statusRes.ok) {
          const statusJson = await statusRes.json()
          setFolderHasData(Boolean(statusJson.hasData))
        }
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudieron cargar las habilitaciones")
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  const searchEntities = useCallback(async (search: string) => {
    const token = await getIdToken()
    if (!token) return
    const params = new URLSearchParams({ type: "requesting_entity", limit: "12" })
    if (search.trim()) params.set("search", search.trim())
    const res = await fetch(`/api/organizations?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const json = await res.json()
    setEntities(json.organizations ?? [])
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    if (!dialogOpen || mode !== "account") return
    void searchEntities(query)
  }, [dialogOpen, mode, query, searchEntities])

  const activeGrants = useMemo(() => getActiveGrants(grants), [grants])
  const visibleGrants = compact ? activeGrants.slice(0, 4) : activeGrants
  const visibleInvitations = compact ? invitations.slice(0, 4) : invitations

  function resetDirectForm() {
    setSelectedEntity(null)
    setScopes(DEFAULT_SCOPES)
    setDays(30)
    setPurpose("Habilitacion temporal para visualizar legajo agrofinanciero.")
    setQuery("")
  }

  async function createDirectGrant() {
    if (folderHasData === false) {
      toast.error("Tu carpeta no tiene informacion cargada todavia. No se puede habilitar el legajo.")
      return
    }
    if (!organizationId || !selectedEntity) {
      toast.error("Selecciona una cuenta del sistema.")
      return
    }
    if (scopes.length === 0) {
      toast.error("Selecciona al menos una seccion del legajo.")
      return
    }

    setSaving(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo validar la sesion")
      const res = await fetch("/api/access-grants/direct", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          targetOrganizationId: organizationId,
          grantedToOrganizationId: selectedEntity.id,
          allowedScopes: scopes,
          approvedDays: days,
          purpose,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error ?? "No se pudo habilitar el legajo")
      toast.success("Legajo habilitado para la cuenta seleccionada")
      setDialogOpen(false)
      resetDirectForm()
      await loadData()
    } catch (createError) {
      toast.error(createError instanceof Error ? createError.message : "No se pudo habilitar el legajo")
    } finally {
      setSaving(false)
    }
  }

  async function revokeGrant(grantId: string) {
    const token = await getIdToken()
    if (!token) return
    setRevoking(grantId)
    try {
      await revokeAccessGrant(grantId, token, "Revocado por el titular del legajo")
      await loadData()
    } finally {
      setRevoking(null)
    }
  }

  async function revokeInvitation(invitationId: string) {
    const token = await getIdToken()
    if (!token) return
    setRevoking(invitationId)
    try {
      await fetch(`/api/access-invitations/${invitationId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      await loadData()
    } finally {
      setRevoking(null)
    }
  }

  async function copyInvitationLink(invitationId: string) {
    const token = await getIdToken()
    if (!token) return null
    const res = await fetch(`/api/access-invitations/${invitationId}/link`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? "No se pudo generar el link")
    return json.inviteUrl ? `${window.location.origin}${json.inviteUrl}` : null
  }

  return (
    <section className="ag-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-[var(--brand-line)] px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#dceee7] text-[var(--brand-green)]">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--brand-ink)]">Habilitaciones de legajo</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Habilita la visualizacion del legajo por cuenta, alcance y tiempo.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={() => {
            setMode("account")
            setDialogOpen(true)
          }}
          disabled={!organizationId || folderHasData === false}
          className="bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/95"
        >
          <Plus className="size-4" />
          Habilitar legajo
        </Button>
      </div>

      {folderHasData === false ? (
        <div className="m-6 mb-0 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>
            Tu carpeta todavia no tiene informacion cargada, por eso no podes habilitar el legajo.
            Pedile a tu contador que cargue balances, impuestos o documentos primero.
          </span>
        </div>
      ) : null}

      {error ? (
        <div className="m-6 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-5 p-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : !organizationId ? (
          <div className="rounded-lg border border-dashed p-6 text-sm text-[var(--brand-muted)]">
            Tu cuenta no tiene organizacion asociada para habilitar legajos.
          </div>
        ) : activeGrants.length === 0 && invitations.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-semibold text-[var(--brand-ink)]">Todavia no hay habilitaciones</p>
            <p className="mt-2 text-sm text-[var(--brand-muted)]">
              Usa el boton Habilitar legajo para enviar acceso a una cuenta del sistema.
            </p>
          </div>
        ) : (
          <>
            {visibleGrants.length > 0 && (
              <div className="divide-y rounded-lg border border-[var(--brand-line)] bg-white">
                {visibleGrants.map((grant) => (
                  <article key={grant.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--brand-ink)]">{grant.purpose}</p>
                      <p className="mt-1 text-xs text-[var(--brand-muted)]">
                        Cuenta {grant.grantedToOrganizationId} - vence {new Date(grant.expiresAt).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => revokeGrant(grant.id)} disabled={revoking === grant.id}>
                      {revoking === grant.id ? "Revocando..." : "Revocar"}
                    </Button>
                  </article>
                ))}
              </div>
            )}

            {visibleInvitations.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-[var(--brand-ink)]">Links excepcionales</h3>
                <AccessInvitationTable
                  invitations={visibleInvitations}
                  onRevoke={revokeInvitation}
                  onCopyLink={copyInvitationLink}
                  revoking={revoking}
                />
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetDirectForm()
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Habilitar visualizacion del legajo</DialogTitle>
            <DialogDescription>
              La via recomendada es enviar la habilitacion a una cuenta registrada del sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 sm:grid-cols-3">
            <ModeButton active={mode === "account"} icon={ShieldCheck} label="Cuenta del sistema" onClick={() => setMode("account")} />
            <ModeButton active={mode === "link"} icon={LinkIcon} label="Link excepcional" onClick={() => setMode("link")} />
            <ModeButton active={mode === "qr"} icon={QrCode} label="QR proximamente" onClick={() => setMode("qr")} />
          </div>

          {mode === "account" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="entity-search">Buscar cuenta financista</Label>
                <div className="flex gap-2">
                  <Input
                    id="entity-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nombre, CUIT o entidad registrada"
                  />
                  <Button type="button" variant="outline" onClick={() => searchEntities(query)}>
                    <Search className="size-4" />
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                {entities.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => setSelectedEntity(entity)}
                    className={`rounded-lg border p-4 text-left transition ${
                      selectedEntity?.id === entity.id
                        ? "border-[var(--brand-green)] bg-[#eef8f2]"
                        : "border-[var(--brand-line)] bg-white hover:border-[var(--brand-green)]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--brand-ink)]">{entity.legalName}</p>
                    <p className="mt-1 text-xs text-[var(--brand-muted)]">
                      CUIT {entity.taxId || "-"}{entity.contactEmail ? ` - ${entity.contactEmail}` : ""}
                    </p>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Secciones habilitadas</Label>
                <GrantScopePicker value={scopes} onChange={setScopes} />
              </div>

              <DurationPicker value={days} onChange={setDays} />

              <div className="space-y-2">
                <Label htmlFor="purpose">Motivo / mensaje</Label>
                <Textarea id="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button type="button" onClick={createDirectGrant} disabled={saving || !selectedEntity || scopes.length === 0}>
                  {saving ? "Habilitando..." : "Enviar a cuenta"}
                </Button>
              </DialogFooter>
            </div>
          )}

          {mode === "link" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Esta via es excepcional para destinatarios que todavia no tienen cuenta. Al continuar se abre el formulario de link.
              <div className="mt-4">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false)
                  setLinkDialogOpen(true)
                }}>
                  Crear link excepcional
                </Button>
              </div>
            </div>
          )}

          {mode === "qr" && (
            <div className="rounded-lg border border-dashed p-6 text-sm text-[var(--brand-muted)]">
              QR queda reservado para una proxima etapa. No esta habilitado todavia.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {organizationId && (
        <CreateAccessInvitationDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          targetOrganizationId={organizationId}
          onCreated={loadData}
        />
      )}
    </section>
  )
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ComponentType<{ className?: string }>
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-[var(--brand-green)] bg-[#eef8f2] text-[var(--brand-green)]"
          : "border-[var(--brand-line)] bg-white text-[var(--brand-ink)] hover:border-[var(--brand-green)]"
      }`}
    >
      <Icon className="size-4" />
      {label}
    </button>
  )
}
