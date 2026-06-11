"use client"

import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, getDocs, orderBy, query, where } from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { RoleGate } from "@/components/auth/RoleGate"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Building2, CheckCircle2, Clock } from "lucide-react"

const SUBTYPE_LABELS: Record<string, string> = {
  bank: "Banco",
  financial_entity: "Entidad Financiera",
  agro_company: "Empresa Agro",
  maquinaria_agricola: "Maquinaria Agrícola",
  insumos_agricolas: "Insumos Agrícolas",
}

const SUBTYPE_COLORS: Record<string, string> = {
  bank: "bg-blue-50 text-blue-700 border-blue-200",
  financial_entity: "bg-indigo-50 text-indigo-700 border-indigo-200",
  agro_company: "bg-emerald-50 text-emerald-700 border-emerald-200",
  maquinaria_agricola: "bg-orange-50 text-orange-700 border-orange-200",
  insumos_agricolas: "bg-lime-50 text-lime-700 border-lime-200",
}

const ORG_STATUS_META: Record<string, { label: string; className: string }> = {
  active: { label: "Activa", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending_approval: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200" },
  suspended: { label: "Suspendida", className: "bg-red-50 text-red-700 border-red-200" },
  pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 border-amber-200" },
}

interface RequestingEntity {
  id: string
  legalName: string
  taxId: string
  subtype: string | null
  contactName: string | null
  contactEmail: string | null
  status: string
  createdAt: string | null
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

export default function AdminEntidadesPage() {
  const [entities, setEntities] = useState<RequestingEntity[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [subtypeFilter, setSubtypeFilter] = useState<string>("all")

  useEffect(() => {
    async function fetch() {
      const db = getFirebaseDb()
      if (!db) { setLoading(false); return }
      const q = query(
        collection(db, COLLECTIONS.ORGANIZATIONS),
        where("type", "==", "requesting_entity"),
        orderBy("createdAt", "desc"),
      )
      const snap = await getDocs(q)
      setEntities(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            legalName: data.legalName ?? "Sin nombre",
            taxId: data.taxId ?? "—",
            subtype: data.subtype ?? null,
            contactName: data.contactName ?? null,
            contactEmail: data.contactEmail ?? null,
            status: data.status ?? "pending",
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          } as RequestingEntity
        }),
      )
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = entities.filter((e) => {
    const matchSearch =
      e.legalName.toLowerCase().includes(search.toLowerCase()) ||
      e.taxId.includes(search)
    const matchSubtype = subtypeFilter === "all" || e.subtype === subtypeFilter
    return matchSearch && matchSubtype
  })

  const SUBTYPE_FILTERS = [
    { key: "all", label: "Todos" },
    { key: "bank", label: "Bancos" },
    { key: "financial_entity", label: "Financieras" },
    { key: "agro_company", label: "Empresas Agro" },
    { key: "maquinaria_agricola", label: "Maquinaria" },
    { key: "insumos_agricolas", label: "Insumos" },
  ]

  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Building2 className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-ink)]">
              Entidades / Financistas
            </h1>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Bancos, financieras y empresas agrocomerciales registradas en la plataforma.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: entities.length },
            { label: "Bancos", value: entities.filter((e) => e.subtype === "bank").length },
            { label: "Financieras", value: entities.filter((e) => e.subtype === "financial_entity").length },
            { label: "Empresas Agro", value: entities.filter((e) => e.subtype === "agro_company").length },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-[var(--brand-line)] bg-white p-4">
              <p className="text-xs text-[var(--brand-muted)]">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-[var(--brand-ink)]">{loading ? "…" : s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Buscar por nombre o CUIT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            {SUBTYPE_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setSubtypeFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition border ${
                  subtypeFilter === f.key
                    ? "bg-[var(--brand-green)] text-white border-transparent"
                    : "border-[var(--brand-line)] text-[var(--brand-muted)] hover:bg-[var(--brand-surface-strong)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Building2 className="mx-auto mb-3 size-8 text-[var(--brand-muted)]/40" />
            <p className="text-sm font-semibold text-[var(--brand-ink)]">Sin entidades registradas</p>
            <p className="mt-1 text-xs text-[var(--brand-muted)]">
              Las entidades que se registren como banco, financiera o empresa agro aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--brand-line)] bg-white">
            <div className="divide-y divide-[var(--brand-line)]">
              {filtered.map((e) => {
                const statusMeta = ORG_STATUS_META[e.status] ?? ORG_STATUS_META.pending
                const subtypeColor = SUBTYPE_COLORS[e.subtype ?? ""] ?? "bg-slate-50 text-slate-600 border-slate-200"
                return (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {initials(e.legalName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold text-[var(--brand-ink)]">{e.legalName}</p>
                        {e.subtype && (
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${subtypeColor}`}>
                            {SUBTYPE_LABELS[e.subtype] ?? e.subtype}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                        CUIT: {e.taxId}
                        {e.contactName && ` · ${e.contactName}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.className}`}>
                        {e.status === "active" ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {statusMeta.label}
                      </span>
                      {e.createdAt && (
                        <p className="mt-1 text-[10px] text-[var(--brand-muted)]">
                          {new Date(e.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </RoleGate>
  )
}
