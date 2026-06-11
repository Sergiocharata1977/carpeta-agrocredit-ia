"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { RoleGate } from "@/components/auth/RoleGate"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { CheckCircle2, Clock, XCircle, RefreshCw, Building2, List, LayoutGrid, MapPin, BadgeCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

type OrgStatus = "pending_approval" | "active" | "rejected"

interface AccountingFirm {
  id: string
  legalName: string
  taxId: string
  contactName: string
  contactPhone?: string
  status: OrgStatus
  createdAt: string | null
  city?: string
  province?: string
  address?: string
  photoUrl?: string
  licenseNumber?: string
  professionalCouncil?: string
}

const STATUS_META: Record<OrgStatus, { label: string; className: string; icon: React.ReactNode }> = {
  pending_approval: {
    label: "Pendiente",
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

type Filter = "all" | OrgStatus
type ViewMode = "list" | "grid"

function FirmAvatar({ firm, size = "md" }: { firm: AccountingFirm; size?: "md" | "lg" }) {
  const initials = firm.legalName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
  const sizeClass = size === "lg" ? "size-16 text-xl" : "size-11 text-sm"

  if (firm.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={firm.photoUrl}
        alt={firm.legalName}
        className={`${sizeClass} shrink-0 rounded-full border border-[var(--brand-line)] object-cover`}
      />
    )
  }
  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[var(--brand-green)]/10 font-bold text-[var(--brand-green)]`}>
      {initials}
    </div>
  )
}

export default function AdminEstudiosPage() {
  const router = useRouter()
  const [firms, setFirms] = useState<AccountingFirm[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getFreshIdToken()
      const qs = filter !== "all" ? `?status=${filter}` : ""
      const res = await fetch(`/api/admin/accounting-firms${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      setFirms(json.firms ?? [])
    } catch {
      setFirms([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleAction(orgId: string, action: "approve" | "reject") {
    setActionLoading(orgId + action)
    try {
      const token = await getFreshIdToken()
      await fetch(`/api/admin/accounting-firms/${orgId}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      await load()
    } finally {
      setActionLoading(null)
    }
  }

  function openFirm(firmId: string) {
    router.push(`/app/admin/estudios/${firmId}`)
  }

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "pending_approval", label: "Pendientes" },
    { key: "active", label: "Habilitados" },
    { key: "rejected", label: "Rechazados" },
    { key: "all", label: "Todos" },
  ]

  function ActionButtons({ firm }: { firm: AccountingFirm }) {
    if (firm.status === "pending_approval") {
      return (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              handleAction(firm.id, "approve")
            }}
            disabled={actionLoading !== null}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {actionLoading === firm.id + "approve" ? "..." : "Habilitar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation()
              handleAction(firm.id, "reject")
            }}
            disabled={actionLoading !== null}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            {actionLoading === firm.id + "reject" ? "..." : "Rechazar"}
          </Button>
        </div>
      )
    }
    if (firm.status === "rejected") {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation()
            handleAction(firm.id, "approve")
          }}
          disabled={actionLoading !== null}
        >
          Reactivar
        </Button>
      )
    }
    return null
  }

  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Estudios Contables</h1>
            <p className="text-muted-foreground text-sm">
              Solo los estudios habilitados pueden cargar información de clientes.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Filtros + toggle de vista */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition border ${
                  filter === f.key
                    ? "bg-[var(--brand-green)] text-white border-transparent"
                    : "border-[var(--brand-line)] text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-[var(--brand-line)] p-0.5">
            <button
              onClick={() => setViewMode("list")}
              aria-label="Vista lista"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "list" ? "bg-[var(--brand-green)] text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <List className="size-4" />
              Lista
            </button>
            <button
              onClick={() => setViewMode("grid")}
              aria-label="Vista tarjetas"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === "grid" ? "bg-[var(--brand-green)] text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="size-4" />
              Tarjetas
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando estudios...</div>
        ) : firms.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Building2 className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay estudios en este estado.</p>
          </div>
        ) : viewMode === "list" ? (
          <div className="space-y-3">
            {firms.map((firm) => {
              const meta = STATUS_META[firm.status] ?? STATUS_META.pending_approval
              return (
                <div
                  key={firm.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => openFirm(firm.id)}
                  onKeyDown={(e) => e.key === "Enter" && openFirm(firm.id)}
                  className="flex cursor-pointer flex-col gap-4 rounded-xl border border-[var(--brand-line)] bg-white p-5 shadow-sm transition hover:border-[var(--brand-green)] hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <FirmAvatar firm={firm} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold leading-tight">{firm.legalName}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        CUIT: {firm.taxId} · Contacto: {firm.contactName}
                        {firm.contactPhone ? ` · ${firm.contactPhone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {[firm.city, firm.province].filter(Boolean).join(", ") || "Sin ubicación cargada"}
                        {firm.licenseNumber ? ` · Mat. ${firm.licenseNumber}` : ""}
                        {firm.createdAt
                          ? ` · Registrado: ${new Date(firm.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <ActionButtons firm={firm} />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {firms.map((firm) => {
              const meta = STATUS_META[firm.status] ?? STATUS_META.pending_approval
              return (
                <div
                  key={firm.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => openFirm(firm.id)}
                  onKeyDown={(e) => e.key === "Enter" && openFirm(firm.id)}
                  className="flex cursor-pointer flex-col gap-4 rounded-xl border border-[var(--brand-line)] bg-white p-5 shadow-sm transition hover:border-[var(--brand-green)] hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <FirmAvatar firm={firm} size="lg" />
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>
                      {meta.icon}
                      {meta.label}
                    </span>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[15px] font-semibold leading-tight">{firm.legalName}</p>
                    <p className="text-sm text-muted-foreground">CUIT: {firm.taxId}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {[firm.city, firm.province].filter(Boolean).join(", ") || "Sin ubicación cargada"}
                    </p>
                    {firm.licenseNumber && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <BadgeCheck className="size-3" />
                        Matrícula {firm.licenseNumber}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto">
                    <ActionButtons firm={firm} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </RoleGate>
  )
}
