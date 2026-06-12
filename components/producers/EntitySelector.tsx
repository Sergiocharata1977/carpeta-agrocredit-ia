"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { Building2, PlusCircle, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import type { AgroActivity, Organization } from "@/types/auth"

interface EntitySelectorProps {
  rootProducerId: string
  rootLabel: string
  activeEntityId: string
  onEntityChange: (entityId: string) => void
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

const emptyForm = (): EntityFormState => ({
  legalName: "",
  taxId: "",
  activity: "mixed",
  province: "",
  city: "",
  entityOwnersText: "",
})

function normalizeTaxId(value: string) {
  return value.replace(/\D/g, "").slice(0, 11)
}

async function getAuthHeaders() {
  const token = await getFreshIdToken()
  if (!token) throw new Error("No se pudo validar la sesion")

  return {
    Authorization: `Bearer ${token}`,
  }
}

export function EntitySelector({
  rootProducerId,
  rootLabel,
  activeEntityId,
  onEntityChange,
}: EntitySelectorProps) {
  const [entities, setEntities] = useState<ChildEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<EntityFormState>(() => emptyForm())

  const sortedEntities = useMemo(
    () => [...entities].sort((a, b) => a.legalName.localeCompare(b.legalName, "es")),
    [entities],
  )

  const loadEntities = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/organizations/${encodeURIComponent(rootProducerId)}/entities`, {
        headers: await getAuthHeaders(),
        cache: "no-store",
      })
      const payload = (await response.json().catch(() => null)) as
        | { entities?: ChildEntity[]; error?: string }
        | null

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudieron cargar las empresas")
      }

      setEntities(payload?.entities ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar las empresas")
      setEntities([])
    } finally {
      setLoading(false)
    }
  }, [rootProducerId])

  useEffect(() => {
    void loadEntities()
  }, [loadEntities])

  async function handleCreateEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const taxId = normalizeTaxId(form.taxId)

    if (form.legalName.trim().length < 3 || taxId.length !== 11) {
      toast.error("Completa razon social y CUIT de 11 digitos.")
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/organizations/${encodeURIComponent(rootProducerId)}/entities`, {
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
      })
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; error?: string; issues?: Array<{ message?: string }> }
        | null

      if (!response.ok || !payload?.id) {
        const issueMessage = payload?.issues?.[0]?.message
        throw new Error(issueMessage ?? payload?.error ?? "No se pudo crear la empresa")
      }

      toast.success("Empresa agregada correctamente")
      setForm(emptyForm())
      setDialogOpen(false)
      await loadEntities()
      onEntityChange(payload.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear la empresa")
    } finally {
      setSaving(false)
    }
  }

  const formTaxId = normalizeTaxId(form.taxId)
  const showTaxIdHelp = formTaxId.length > 0 && formTaxId.length < 11

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeEntityId === rootProducerId ? "default" : "outline"}
          className="min-h-9 gap-2"
          onClick={() => onEntityChange(rootProducerId)}
          title={rootLabel}
        >
          <UserRound className="h-4 w-4" />
          Declaracion personal
        </Button>

        {loading ? (
          <>
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
          </>
        ) : (
          sortedEntities.map((entity) => (
            <Button
              key={entity.id}
              type="button"
              size="sm"
              variant={activeEntityId === entity.id ? "default" : "outline"}
              className="min-h-9 max-w-full gap-2"
              onClick={() => onEntityChange(entity.id)}
              title={entity.entityOwnersText || entity.legalName}
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{entity.legalName}</span>
            </Button>
          ))
        )}

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="min-h-9 gap-2"
          onClick={() => setDialogOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          Empresa
        </Button>
      </div>

      {activeEntityId === rootProducerId ? (
        <Badge variant="secondary">Impuestos habilitados</Badge>
      ) : (
        <Badge variant="outline">Balance y resultados por empresa</Badge>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva empresa</DialogTitle>
            <DialogDescription>
              Carga la empresa hija y sus titulares principales para operar su carpeta contable.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateEntity} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity-legal-name">Razon social</Label>
                <Input
                  id="entity-legal-name"
                  value={form.legalName}
                  onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-tax-id">CUIT</Label>
                <Input
                  id="entity-tax-id"
                  inputMode="numeric"
                  maxLength={11}
                  placeholder="11 digitos sin guiones"
                  value={form.taxId}
                  onChange={(event) => setForm((prev) => ({ ...prev, taxId: normalizeTaxId(event.target.value) }))}
                  aria-describedby={showTaxIdHelp ? "entity-tax-id-help" : undefined}
                  required
                />
                {showTaxIdHelp && (
                  <p id="entity-tax-id-help" className="text-xs text-destructive">
                    Ingresa el CUIT completo de 11 digitos; el DNI solo tiene 8.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-activity">Actividad</Label>
                <Select
                  value={form.activity}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, activity: value as AgroActivity }))}
                >
                  <SelectTrigger id="entity-activity" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-province">Provincia</Label>
                <Input
                  id="entity-province"
                  value={form.province}
                  onChange={(event) => setForm((prev) => ({ ...prev, province: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity-city">Localidad</Label>
                <Input
                  id="entity-city"
                  value={form.city}
                  onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="entity-owners">Titulares</Label>
                <Textarea
                  id="entity-owners"
                  value={form.entityOwnersText}
                  onChange={(event) => setForm((prev) => ({ ...prev, entityOwnersText: event.target.value }))}
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
