"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  Landmark,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  User,
  X,
  XCircle,
} from "lucide-react"
import { RoleGate } from "@/components/auth/RoleGate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { AR_PROVINCES, councilLabel } from "@/lib/constants/provinces"

type OrgStatus = "pending_approval" | "active" | "rejected"

interface FirmDetail {
  id: string
  legalName: string
  taxId: string
  contactName?: string
  contactPhone?: string
  status: OrgStatus
  createdAt: string | null
  address?: string
  city?: string
  province?: string
  photoUrl?: string
  licenseNumber?: string
  professionalCouncil?: string
}

const STATUS_META: Record<OrgStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending_approval: {
    label: "Pendiente de habilitación",
    className: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <Clock className="size-3.5" />,
  },
  active: {
    label: "Habilitado",
    className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckCircle2 className="size-3.5" />,
  },
  rejected: {
    label: "Rechazado",
    className: "bg-red-50 text-red-700 border border-red-200",
    icon: <XCircle className="size-3.5" />,
  },
}

interface EditForm {
  legalName: string
  contactName: string
  contactPhone: string
  address: string
  city: string
  province: string
  photoUrl: string
  licenseNumber: string
  professionalCouncil: string
}

export default function AdminEstudioSinglePage() {
  const { firmId } = useParams<{ firmId: string }>()
  const router = useRouter()
  const [firm, setFirm] = useState<FirmDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getFreshIdToken()
      const res = await fetch(`/api/admin/accounting-firms/${firmId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo cargar el estudio")
      setFirm(json.firm)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el estudio")
      setFirm(null)
    } finally {
      setLoading(false)
    }
  }, [firmId])

  useEffect(() => { void load() }, [load])

  function startEditing() {
    if (!firm) return
    setForm({
      legalName: firm.legalName ?? "",
      contactName: firm.contactName ?? "",
      contactPhone: firm.contactPhone ?? "",
      address: firm.address ?? "",
      city: firm.city ?? "",
      province: firm.province ?? "",
      photoUrl: firm.photoUrl ?? "",
      licenseNumber: firm.licenseNumber ?? "",
      professionalCouncil: firm.professionalCouncil ?? "",
    })
    setEditing(true)
  }

  function setField(key: keyof EditForm, value: string) {
    setForm((prev) => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      // El consejo profesional debe coincidir con la provincia: lo sincronizamos
      if (key === "province") next.professionalCouncil = value
      return next
    })
  }

  async function saveForm() {
    if (!form) return
    if (form.province && form.professionalCouncil && form.province !== form.professionalCouncil) {
      toast.error("El consejo profesional debe coincidir con la provincia del estudio")
      return
    }
    setSaving(true)
    try {
      const token = await getFreshIdToken()
      const body: Record<string, string> = {}
      for (const [key, value] of Object.entries(form)) {
        if (key === "province" || key === "professionalCouncil") {
          if (value) body[key] = value
        } else {
          body[key] = value
        }
      }
      const res = await fetch(`/api/admin/accounting-firms/${firmId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error ?? "No se pudo guardar")
      toast.success("Datos del estudio actualizados")
      setEditing(false)
      await load()
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  async function handleAction(action: "approve" | "reject") {
    setActionLoading(action)
    try {
      const token = await getFreshIdToken()
      const res = await fetch(`/api/admin/accounting-firms/${firmId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        throw new Error(json?.error ?? "No se pudo ejecutar la acción")
      }
      toast.success(action === "approve" ? "Estudio habilitado" : "Estudio rechazado")
      await load()
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : "Error")
    } finally {
      setActionLoading(null)
    }
  }

  const initials = firm?.legalName
    ?.split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="p-6 space-y-6">
        <button
          onClick={() => router.push("/app/admin/estudios")}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[var(--brand-ink)]"
        >
          <ArrowLeft className="size-4" />
          Volver a Estudios Contables
        </button>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error || !firm ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-sm text-destructive">
            {error ?? "Estudio no encontrado"}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex flex-col gap-5 rounded-xl border border-[var(--brand-line)] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {firm.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={firm.photoUrl}
                    alt={firm.legalName}
                    className="size-20 shrink-0 rounded-full border border-[var(--brand-line)] object-cover"
                  />
                ) : (
                  <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-[var(--brand-green)]/10 text-2xl font-bold text-[var(--brand-green)]">
                    {initials}
                  </div>
                )}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold">{firm.legalName}</h1>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[firm.status].className}`}>
                      {STATUS_META[firm.status].icon}
                      {STATUS_META[firm.status].label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">CUIT {firm.taxId}</p>
                  {firm.createdAt && (
                    <p className="text-xs text-muted-foreground">
                      Registrado el {new Date(firm.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {firm.status === "pending_approval" && (
                  <>
                    <Button
                      onClick={() => handleAction("approve")}
                      disabled={actionLoading !== null}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {actionLoading === "approve" ? "Habilitando..." : "Habilitar"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAction("reject")}
                      disabled={actionLoading !== null}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      {actionLoading === "reject" ? "Rechazando..." : "Rechazar"}
                    </Button>
                  </>
                )}
                {firm.status === "rejected" && (
                  <Button variant="outline" onClick={() => handleAction("approve")} disabled={actionLoading !== null}>
                    {actionLoading === "approve" ? "Reactivando..." : "Reactivar"}
                  </Button>
                )}
                {!editing && (
                  <Button variant="outline" onClick={startEditing}>
                    <Pencil className="mr-1.5 size-4" />
                    Editar datos
                  </Button>
                )}
              </div>
            </div>

            {/* Datos / edicion */}
            {editing && form ? (
              <div className="rounded-xl border border-[var(--brand-line)] bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Editar datos del estudio</h2>
                  <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-[var(--brand-ink)]">
                    <X className="size-5" />
                  </button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="legalName">Razón social</Label>
                    <Input id="legalName" value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactName">Nombre de contacto</Label>
                    <Input id="contactName" value={form.contactName} onChange={(e) => setField("contactName", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contactPhone">Teléfono</Label>
                    <Input id="contactPhone" value={form.contactPhone} onChange={(e) => setField("contactPhone", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="photoUrl">Foto (URL de imagen)</Label>
                    <Input id="photoUrl" value={form.photoUrl} onChange={(e) => setField("photoUrl", e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="address">Dirección</Label>
                    <Input id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Calle y número" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input id="city" value={form.city} onChange={(e) => setField("city", e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="province">Provincia</Label>
                    <select
                      id="province"
                      value={form.province}
                      onChange={(e) => setField("province", e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                    >
                      <option value="">Seleccionar provincia</option>
                      {AR_PROVINCES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="licenseNumber">Matrícula</Label>
                    <Input id="licenseNumber" value={form.licenseNumber} onChange={(e) => setField("licenseNumber", e.target.value)} placeholder="Ej: 10-12345-6" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="professionalCouncil">Consejo profesional</Label>
                    <select
                      id="professionalCouncil"
                      value={form.professionalCouncil}
                      onChange={(e) => setField("professionalCouncil", e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm"
                    >
                      <option value="">Seleccionar consejo</option>
                      {AR_PROVINCES.map((p) => (
                        <option key={p} value={p}>{councilLabel(p)}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      El consejo profesional debe coincidir con la provincia del estudio. Se completa solo al elegir provincia.
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                    Cancelar
                  </Button>
                  <Button onClick={saveForm} disabled={saving}>
                    {saving ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : null}
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <InfoCard icon={<User className="size-4" />} label="Contacto" value={firm.contactName || "—"} secondary={firm.contactPhone} />
                <InfoCard icon={<Phone className="size-4" />} label="Teléfono" value={firm.contactPhone || "—"} />
                <InfoCard
                  icon={<MapPin className="size-4" />}
                  label="Dirección"
                  value={firm.address || "—"}
                  secondary={[firm.city, firm.province].filter(Boolean).join(", ") || undefined}
                />
                <InfoCard icon={<Building2 className="size-4" />} label="Ciudad / Provincia" value={[firm.city, firm.province].filter(Boolean).join(", ") || "—"} />
                <InfoCard icon={<BadgeCheck className="size-4" />} label="Matrícula" value={firm.licenseNumber || "—"} />
                <InfoCard
                  icon={<Landmark className="size-4" />}
                  label="Consejo profesional"
                  value={firm.professionalCouncil ? councilLabel(firm.professionalCouncil) : "—"}
                  warning={
                    firm.professionalCouncil && firm.province && firm.professionalCouncil !== firm.province
                      ? "No coincide con la provincia del estudio"
                      : undefined
                  }
                />
              </div>
            )}
          </>
        )}
      </div>
    </RoleGate>
  )
}

function InfoCard({
  icon,
  label,
  value,
  secondary,
  warning,
}: {
  icon: React.ReactNode
  label: string
  value: string
  secondary?: string
  warning?: string
}) {
  return (
    <div className="rounded-xl border border-[var(--brand-line)] bg-white p-5 shadow-sm">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-2 text-[15px] font-semibold text-[var(--brand-ink)]">{value}</p>
      {secondary && <p className="mt-0.5 text-sm text-muted-foreground">{secondary}</p>}
      {warning && <p className="mt-1 text-xs font-medium text-amber-600">{warning}</p>}
    </div>
  )
}
