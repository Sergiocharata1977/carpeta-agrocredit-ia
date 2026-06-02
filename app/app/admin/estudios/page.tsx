"use client"

import { useEffect, useState, useCallback } from "react"
import { RoleGate } from "@/components/auth/RoleGate"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { CheckCircle2, Clock, XCircle, RefreshCw, Building2 } from "lucide-react"
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

export default function AdminEstudiosPage() {
  const [firms, setFirms] = useState<AccountingFirm[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("pending_approval")
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

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "pending_approval", label: "Pendientes" },
    { key: "active", label: "Habilitados" },
    { key: "rejected", label: "Rechazados" },
    { key: "all", label: "Todos" },
  ]

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

        {/* Filtros */}
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

        {/* Lista */}
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Cargando estudios...</div>
        ) : firms.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Building2 className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No hay estudios en este estado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {firms.map((firm) => {
              const meta = STATUS_META[firm.status] ?? STATUS_META.pending_approval
              return (
                <div
                  key={firm.id}
                  className="flex flex-col gap-4 rounded-xl border border-[var(--brand-line)] bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
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
                    {firm.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        Registrado: {new Date(firm.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>

                  {firm.status === "pending_approval" && (
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(firm.id, "approve")}
                        disabled={actionLoading !== null}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {actionLoading === firm.id + "approve" ? "..." : "Habilitar"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(firm.id, "reject")}
                        disabled={actionLoading !== null}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        {actionLoading === firm.id + "reject" ? "..." : "Rechazar"}
                      </Button>
                    </div>
                  )}

                  {firm.status === "rejected" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAction(firm.id, "approve")}
                      disabled={actionLoading !== null}
                    >
                      Reactivar
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </RoleGate>
  )
}
