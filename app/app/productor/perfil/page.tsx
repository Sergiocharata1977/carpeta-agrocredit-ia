"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Building2,
  CheckCircle2,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Save,
  UserRound,
} from "lucide-react"
import { RoleGate } from "@/components/auth/RoleGate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"

// ─── Opciones ────────────────────────────────────────────────────────────────

const ACTIVITY_OPTIONS = [
  { value: "agriculture", label: "Agricultura" },
  { value: "livestock", label: "Ganaderia" },
  { value: "mixed", label: "Mixto" },
  { value: "horticulture", label: "Horticultura" },
  { value: "forestry", label: "Forestacion" },
  { value: "other", label: "Otra" },
]

const PERSON_TYPE_OPTIONS = [
  { value: "physical", label: "Persona fisica" },
  { value: "legal", label: "Persona juridica / empresa" },
]

const ACTIVITY_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_OPTIONS.map((o) => [o.value, o.label]),
)
const PERSON_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  PERSON_TYPE_OPTIONS.map((o) => [o.value, o.label]),
)

// ─── Schema ───────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  legalName: z.string().min(2, "Ingresa tu nombre o razon social"),
  taxId: z.string().length(11, "El CUIT debe tener 11 digitos sin guiones"),
  personType: z.enum(["physical", "legal"]),
  activity: z.enum(["agriculture", "livestock", "mixed", "horticulture", "forestry", "other"]),
  province: z.string().min(1, "Ingresa tu provincia"),
  city: z.string().min(1, "Ingresa tu localidad"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email invalido").optional().or(z.literal("")),
})

type ProfileValues = z.infer<typeof profileSchema>

const EMPTY: ProfileValues = {
  legalName: "",
  taxId: "",
  personType: "physical",
  activity: "agriculture",
  province: "",
  city: "",
  address: "",
  phone: "",
  email: "",
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ProducerPerfilPage() {
  const { user } = useSession()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [data, setData] = useState<ProfileValues>(EMPTY)
  const [editOpen, setEditOpen] = useState(false)

  useEffect(() => {
    if (!user?.defaultOrganizationId) return
    loadProfile(user.defaultOrganizationId)
  }, [user?.defaultOrganizationId])

  async function loadProfile(orgId: string) {
    setLoading(true)
    setLoadError(null)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesion no disponible")
      const res = await fetch(`/api/producer-profile/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("No se pudo cargar el perfil")
      const json = await res.json()
      const org = json.organization
      if (org) {
        setData({
          legalName: org.legalName ?? "",
          taxId: org.taxId ?? "",
          personType: org.personType ?? "physical",
          activity: org.activity ?? "agriculture",
          province: org.province ?? "",
          city: org.city ?? "",
          address: org.address ?? "",
          phone: org.phone ?? "",
          email: org.email ?? "",
        })
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "No se pudo cargar el perfil")
    } finally {
      setLoading(false)
    }
  }

  function handleSaved(updated: ProfileValues) {
    setData(updated)
    setEditOpen(false)
  }

  const isEmpty = !data.legalName && !data.taxId

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="space-y-6">
        <section className="ag-panel overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-[var(--brand-line)] px-6 py-5">
            <div className="flex items-start gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#dceee7] text-[var(--brand-green)]">
                <UserRound className="size-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-ink)]">Mi perfil</h1>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                  Datos de identidad y actividad. El contador los usa para preparar tu carpeta.
                </p>
              </div>
            </div>

            {!loading && (
              <Button
                onClick={() => setEditOpen(true)}
                className="shrink-0 bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/90"
              >
                <Pencil className="mr-2 size-4" />
                Editar
              </Button>
            )}
          </div>

          {/* Cuerpo */}
          {loadError && (
            <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-[var(--brand-muted)]" />
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f0f4f2] text-[var(--brand-muted)]">
                <UserRound className="size-7" />
              </div>
              <div>
                <p className="font-semibold text-[var(--brand-ink)]">Perfil sin completar</p>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">
                  Completa tus datos para que tu contador pueda iniciar la carpeta.
                </p>
              </div>
              <Button
                onClick={() => setEditOpen(true)}
                className="bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/90"
              >
                <Pencil className="mr-2 size-4" />
                Completar perfil
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--brand-line)]">
              {/* Identidad */}
              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <Field
                  icon={<UserRound className="size-4" />}
                  label="Nombre / Razon social"
                  value={data.legalName}
                />
                <Field
                  icon={<Building2 className="size-4" />}
                  label="CUIT"
                  value={formatCuit(data.taxId)}
                />
                <Field
                  label="Tipo de persona"
                  value={PERSON_TYPE_LABELS[data.personType] ?? data.personType}
                />
                <Field
                  label="Actividad principal"
                  value={ACTIVITY_LABELS[data.activity] ?? data.activity}
                />
              </div>

              {/* Ubicación */}
              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <Field
                  icon={<MapPin className="size-4" />}
                  label="Provincia"
                  value={data.province || "—"}
                />
                <Field label="Localidad" value={data.city || "—"} />
                <div className="sm:col-span-2">
                  <Field label="Domicilio" value={data.address || "—"} />
                </div>
              </div>

              {/* Contacto */}
              <div className="grid gap-6 p-6 sm:grid-cols-2">
                <Field
                  icon={<Phone className="size-4" />}
                  label="Telefono"
                  value={data.phone || "—"}
                />
                <Field
                  icon={<Mail className="size-4" />}
                  label="Email de contacto"
                  value={data.email || "—"}
                />
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modal de edición */}
      <EditProfileDialog
        open={editOpen}
        initialValues={data}
        orgId={user?.defaultOrganizationId ?? ""}
        onClose={() => setEditOpen(false)}
        onSaved={handleSaved}
      />
    </RoleGate>
  )
}

// ─── Campo de solo lectura ────────────────────────────────────────────────────

function Field({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
        {label}
      </p>
      <p className="flex items-center gap-2 text-[15px] font-medium text-[var(--brand-ink)]">
        {icon && <span className="text-[var(--brand-muted)]">{icon}</span>}
        {value}
      </p>
    </div>
  )
}

// ─── Modal de edición ─────────────────────────────────────────────────────────

function EditProfileDialog({
  open,
  initialValues,
  orgId,
  onClose,
  onSaved,
}: {
  open: boolean
  initialValues: ProfileValues
  orgId: string
  onClose: () => void
  onSaved: (updated: ProfileValues) => void
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
  })

  // Sincronizar valores cuando se abre el dialog
  useEffect(() => {
    if (open) {
      form.reset(initialValues)
      setSaveError(null)
      setSaved(false)
    }
  }, [open, initialValues, form])

  async function onSubmit(values: ProfileValues) {
    if (!orgId) return
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesion no disponible")
      const res = await fetch(`/api/organizations/${orgId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar")
      setSaved(true)
      setTimeout(() => {
        onSaved(values)
      }, 800)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar el perfil")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[var(--brand-ink)]">
            <Pencil className="size-4" />
            Editar perfil
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Identidad */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
              Identidad
            </p>
            <div className="grid gap-4 rounded-xl border border-[var(--brand-line)] p-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="legalName">Nombre / Razon social</Label>
                <Input id="legalName" {...form.register("legalName")} />
                {form.formState.errors.legalName && (
                  <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxId">CUIT (11 digitos sin guiones)</Label>
                <Input id="taxId" inputMode="numeric" maxLength={11} {...form.register("taxId")} />
                {form.formState.errors.taxId && (
                  <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de persona</Label>
                <Select
                  value={form.watch("personType")}
                  onValueChange={(v) =>
                    form.setValue("personType", v as ProfileValues["personType"], { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSON_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Actividad principal</Label>
                <Select
                  value={form.watch("activity")}
                  onValueChange={(v) =>
                    form.setValue("activity", v as ProfileValues["activity"], { shouldValidate: true })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Ubicación */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
              Ubicacion
            </p>
            <div className="grid gap-4 rounded-xl border border-[var(--brand-line)] p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="province">Provincia</Label>
                <Input id="province" {...form.register("province")} />
                {form.formState.errors.province && (
                  <p className="text-sm text-destructive">{form.formState.errors.province.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">Localidad</Label>
                <Input id="city" {...form.register("city")} />
                {form.formState.errors.city && (
                  <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Domicilio</Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  placeholder="Calle, numero, localidad (opcional)"
                />
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
              Contacto
            </p>
            <div className="grid gap-4 rounded-xl border border-[var(--brand-line)] p-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono</Label>
                <Input id="phone" {...form.register("phone")} placeholder="Opcional" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email de contacto</Label>
                <Input id="email" type="email" {...form.register("email")} placeholder="Opcional" />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>
          </div>

          {saveError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {saveError}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--brand-line)] pt-4">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="size-4" />
                Guardado
              </span>
            )}
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/90"
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Guardar cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCuit(raw: string): string {
  if (raw.length !== 11) return raw
  return `${raw.slice(0, 2)}-${raw.slice(2, 10)}-${raw.slice(10)}`
}
