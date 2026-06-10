"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { CheckCircle2, Loader2, Save, UserRound } from "lucide-react"
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
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"

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

export default function ProducerPerfilPage() {
  const { user } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      legalName: "",
      taxId: "",
      personType: "physical",
      activity: "agriculture",
      province: "",
      city: "",
      address: "",
      phone: "",
      email: "",
    },
  })

  useEffect(() => {
    if (!user?.defaultOrganizationId) return
    const orgId = user.defaultOrganizationId

    async function loadOrg() {
      setLoading(true)
      setLoadError(null)
      try {
        const token = await getFreshIdToken()
        if (!token) throw new Error("Sesion no disponible")
        const res = await fetch(`/api/organizations?type=system_user`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return

        const tokenForDirect = await getFreshIdToken()
        if (!tokenForDirect) return
        const directRes = await fetch(`/api/producer-profile/${orgId}`, {
          headers: { Authorization: `Bearer ${tokenForDirect}` },
        })
        if (directRes.ok) {
          const json = await directRes.json()
          const org = json.organization
          if (org) {
            form.reset({
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
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "No se pudo cargar el perfil")
      } finally {
        setLoading(false)
      }
    }

    void loadOrg()
  }, [user?.defaultOrganizationId, form])

  async function onSubmit(values: ProfileValues) {
    if (!user?.defaultOrganizationId) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesion no disponible")
      const res = await fetch(`/api/organizations/${user.defaultOrganizationId}`, {
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
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "No se pudo guardar el perfil")
    } finally {
      setSaving(false)
    }
  }

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="space-y-6">
        <section className="ag-panel overflow-hidden">
          <div className="flex items-start gap-4 border-b border-[var(--brand-line)] px-6 py-5">
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

          {loadError && (
            <div className="mx-6 mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-6 animate-spin text-[var(--brand-muted)]" />
            </div>
          ) : (
            <form
              id="perfil-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-5 p-6 md:grid-cols-2"
            >
              <div className="space-y-2 md:col-span-2">
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
                  onValueChange={(v) => form.setValue("personType", v as ProfileValues["personType"], { shouldValidate: true })}
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

              <div className="space-y-2">
                <Label>Actividad principal</Label>
                <Select
                  value={form.watch("activity")}
                  onValueChange={(v) => form.setValue("activity", v as ProfileValues["activity"], { shouldValidate: true })}
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

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Domicilio</Label>
                <Input id="address" {...form.register("address")} placeholder="Calle, numero, localidad (opcional)" />
              </div>

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

              {saveError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
                  {saveError}
                </div>
              )}
            </form>
          )}

          <div className="flex items-center justify-between border-t border-[var(--brand-line)] px-6 py-4">
            {saved ? (
              <span className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                <CheckCircle2 className="size-4" />
                Perfil guardado
              </span>
            ) : (
              <span className="text-sm text-[var(--brand-muted)]">
                Completa los datos para que tu contador pueda iniciar la carpeta.
              </span>
            )}
            <Button
              type="submit"
              form="perfil-form"
              disabled={saving || loading}
              className="bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/95"
            >
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              Guardar cambios
            </Button>
          </div>
        </section>
      </div>
    </RoleGate>
  )
}
