"use client"

import { use, useCallback, useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Building2, PlusCircle, UserRound } from "lucide-react"
import { toast } from "sonner"
import { getDoc, doc } from "firebase/firestore"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import type { AgroActivity, Organization } from "@/types/auth"

interface PageProps {
  params: Promise<{ clientId: string }>
}

type ChildEntity = Pick<
  Organization,
  "id" | "legalName" | "taxId" | "activity" | "province" | "city" | "entityOwnersText"
>

type EntityFormState = {
  legalName: string
  taxId: string
  activity: AgroActivity
  province: string
  city: string
  entityOwnersText: string
}

const ACTIVITY_LABELS: Record<AgroActivity, string> = {
  agriculture: "Agricultura",
  livestock: "Ganaderia",
  mixed: "Mixta",
  horticulture: "Horticultura",
  forestry: "Forestal",
  other: "Otra",
}

const emptyEntityForm = (): EntityFormState => ({
  legalName: "",
  taxId: "",
  activity: "mixed",
  province: "",
  city: "",
  entityOwnersText: "",
})

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getFreshIdToken()
  if (!token) throw new Error("No se pudo validar la sesion")
  return { Authorization: `Bearer ${token}` }
}

export default function ClienteSinglePage({ params }: PageProps) {
  const { clientId } = use(params)
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()

  const [client, setClient] = useState<Organization | null>(null)
  const [entities, setEntities] = useState<ChildEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EntityFormState>(() => emptyEntityForm())

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const db = getFirebaseDb()
      if (db) {
        const snap = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, clientId))
        if (snap.exists()) {
          setClient({ id: snap.id, ...snap.data() } as Organization)
        }
      }

      const headers = await getAuthHeaders()
      const res = await fetch(
        `/api/organizations/${encodeURIComponent(clientId)}/entities`,
        { headers, cache: "no-store" },
      )
      const payload = (await res.json().catch(() => null)) as
        | { entities?: ChildEntity[]; error?: string }
        | null

      if (!res.ok) throw new Error(payload?.error ?? "No se pudieron cargar las empresas")
      setEntities(payload?.entities ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (sessionLoading) return
    void loadData()
  }, [loadData, sessionLoading])

  async function handleCreateEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const taxId = form.taxId.replace(/\D/g, "")
    if (form.legalName.trim().length < 3 || taxId.length !== 11) {
      toast.error("Completa razon social y CUIT de 11 digitos.")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(
        `/api/organizations/${encodeURIComponent(clientId)}/entities`,
        {
          method: "POST",
          headers: {
            ...(await getAuthHeaders()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...form,
            taxId,
            legalName: form.legalName.trim(),
            province: form.province.trim(),
            city: form.city.trim(),
            entityOwnersText: form.entityOwnersText.trim(),
          }),
        },
      )
      const payload = (await res.json().catch(() => null)) as
        | { id?: string; error?: string }
        | null
      if (!res.ok || !payload?.id) throw new Error(payload?.error ?? "No se pudo crear la empresa")
      toast.success("Empresa creada correctamente")
      setForm(emptyEntityForm())
      setDialogOpen(false)
      router.push(`/app/contador/empresas/${payload.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la empresa")
    } finally {
      setSaving(false)
    }
  }

  if (sessionLoading || loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const sortedEntities = [...entities].sort((a, b) =>
    a.legalName.localeCompare(b.legalName, "es"),
  )

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {client?.legalName ?? "Cliente"}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {client?.taxId && <span>CUIT: {client.taxId}</span>}
          {client?.activity && (
            <>
              <span aria-hidden="true">|</span>
              <span>{ACTIVITY_LABELS[client.activity] ?? client.activity}</span>
            </>
          )}
          {(client?.city || client?.province) && (
            <>
              <span aria-hidden="true">|</span>
              <span>{[client?.city, client?.province].filter(Boolean).join(", ")}</span>
            </>
          )}
        </div>
      </div>

      {/* Datos personales */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos personales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <DataField label="Razon social" value={client?.legalName} />
            <DataField label="CUIT" value={client?.taxId} />
            <DataField label="Actividad" value={client?.activity ? ACTIVITY_LABELS[client.activity] : undefined} />
            <DataField label="Provincia" value={client?.province} />
            <DataField label="Ciudad" value={client?.city} />
            <DataField label="Domicilio" value={client?.address} />
            <DataField label="Telefono" value={client?.phone} />
            <DataField label="Email" value={client?.email} />
            <DataField
              label="Estado carpeta"
              value={client?.folderStatus}
              render={(v) => <Badge variant="outline">{v}</Badge>}
            />
          </div>
        </CardContent>
      </Card>

      {/* Empresas relacionadas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Empresas relacionadas</h2>
            <p className="text-sm text-muted-foreground">
              Entidades fiscales con carpeta contable propia
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nueva Empresa
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card persona física */}
          <EmpresaCard
            label={client?.legalName ?? "Persona Fisica"}
            cuit={client?.taxId}
            activity={client?.activity}
            isPersonaFisica
            href={`/app/contador/empresas/${clientId}`}
          />

          {/* Cards empresas hijas */}
          {sortedEntities.map((entity) => (
            <EmpresaCard
              key={entity.id}
              label={entity.legalName}
              cuit={entity.taxId}
              activity={entity.activity}
              owners={entity.entityOwnersText}
              href={`/app/contador/empresas/${entity.id}`}
            />
          ))}

          {/* Card nueva empresa */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
          >
            <PlusCircle className="h-8 w-8" />
            <span className="text-sm font-medium">Agregar empresa</span>
          </button>
        </div>
      </div>

      {/* Dialog nueva empresa */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva empresa</DialogTitle>
            <DialogDescription>
              Empresa o entidad fiscal relacionada con {client?.legalName ?? "este cliente"}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntity} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="e-name">Razon social</Label>
                <Input
                  id="e-name"
                  value={form.legalName}
                  onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-cuit">CUIT</Label>
                <Input
                  id="e-cuit"
                  inputMode="numeric"
                  value={form.taxId}
                  onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-activity">Actividad</Label>
                <Select
                  value={form.activity}
                  onValueChange={(v) => setForm((p) => ({ ...p, activity: v as AgroActivity }))}
                >
                  <SelectTrigger id="e-activity" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-province">Provincia</Label>
                <Input
                  id="e-province"
                  value={form.province}
                  onChange={(e) => setForm((p) => ({ ...p, province: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="e-city">Localidad</Label>
                <Input
                  id="e-city"
                  value={form.city}
                  onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="e-owners">Titulares</Label>
                <Textarea
                  id="e-owners"
                  value={form.entityOwnersText}
                  onChange={(e) => setForm((p) => ({ ...p, entityOwnersText: e.target.value }))}
                  placeholder="Nombre, CUIT y participacion. Puede incluir titulares externos."
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Guardar empresa"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function DataField({
  label,
  value,
  render,
}: {
  label: string
  value?: string | null
  render?: (v: string) => React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {value ? (
        render ? render(value) : <p className="text-sm">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">-</p>
      )}
    </div>
  )
}

function EmpresaCard({
  label,
  cuit,
  activity,
  owners,
  href,
  isPersonaFisica = false,
}: {
  label: string
  cuit?: string
  activity?: AgroActivity
  owners?: string
  href: string
  isPersonaFisica?: boolean
}) {
  const router = useRouter()
  const activityLabel = activity ? (ACTIVITY_LABELS[activity] ?? activity) : null

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className="group flex flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          {isPersonaFisica ? (
            <UserRound className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{label}</p>
          {cuit && <p className="text-xs text-muted-foreground">CUIT: {cuit}</p>}
          {activityLabel && <p className="text-xs text-muted-foreground">{activityLabel}</p>}
          {owners && (
            <p className="mt-1 truncate text-xs text-muted-foreground" title={owners}>
              {owners}
            </p>
          )}
        </div>
      </div>
      <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Ver carpeta →
      </span>
    </button>
  )
}
