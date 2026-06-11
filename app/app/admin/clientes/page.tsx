"use client"

import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, getDocs, orderBy, query, where } from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { RoleGate } from "@/components/auth/RoleGate"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, Clock, FileX, Sprout } from "lucide-react"

const FOLDER_STATUS_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  complete: {
    label: "Completa",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="size-3" />,
  },
  in_progress: {
    label: "En progreso",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Clock className="size-3" />,
  },
  incomplete: {
    label: "Incompleta",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <FileX className="size-3" />,
  },
  under_review: {
    label: "En revisión",
    className: "bg-purple-50 text-purple-700 border-purple-200",
    icon: <Clock className="size-3" />,
  },
  outdated: {
    label: "Desactualizada",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <FileX className="size-3" />,
  },
  archived: {
    label: "Archivada",
    className: "bg-slate-100 text-slate-600 border-slate-200",
    icon: <FileX className="size-3" />,
  },
}

interface Producer {
  id: string
  legalName: string
  taxId: string
  province: string | null
  city: string | null
  activity: string | null
  folderStatus: string | null
  createdAt: string | null
}

const ACTIVITY_LABELS: Record<string, string> = {
  agriculture: "Agricultura",
  livestock: "Ganadería",
  mixed: "Mixto",
  horticulture: "Horticultura",
  forestry: "Forestación",
  other: "Otro",
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

export default function AdminClientesPage() {
  const [producers, setProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [folderFilter, setFolderFilter] = useState<string>("all")

  useEffect(() => {
    async function fetch() {
      const db = getFirebaseDb()
      if (!db) { setLoading(false); return }
      const q = query(
        collection(db, COLLECTIONS.ORGANIZATIONS),
        where("type", "==", "system_user"),
        orderBy("createdAt", "desc"),
      )
      const snap = await getDocs(q)
      setProducers(
        snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            legalName: data.legalName ?? "Sin nombre",
            taxId: data.taxId ?? "—",
            province: data.province ?? null,
            city: data.city ?? null,
            activity: data.activity ?? null,
            folderStatus: data.folderStatus ?? null,
            createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          } as Producer
        }),
      )
      setLoading(false)
    }
    fetch()
  }, [])

  const filtered = producers.filter((p) => {
    const matchSearch = p.legalName.toLowerCase().includes(search.toLowerCase()) ||
      p.taxId.includes(search)
    const matchFolder = folderFilter === "all" || p.folderStatus === folderFilter
    return matchSearch && matchFolder
  })

  const FOLDER_FILTERS = [
    { key: "all", label: "Todos" },
    { key: "complete", label: "Completas" },
    { key: "in_progress", label: "En progreso" },
    { key: "incomplete", label: "Incompletas" },
  ]

  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <Sprout className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-ink)]">
              Clientes / Productores
            </h1>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Todos los titulares de carpeta registrados en la plataforma.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: producers.length },
            { label: "Completas", value: producers.filter((p) => p.folderStatus === "complete").length },
            { label: "En progreso", value: producers.filter((p) => p.folderStatus === "in_progress").length },
            { label: "Incompletas", value: producers.filter((p) => p.folderStatus === "incomplete").length },
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
            {FOLDER_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFolderFilter(f.key)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition border ${
                  folderFilter === f.key
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
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center">
            <Sprout className="mx-auto mb-3 size-8 text-[var(--brand-muted)]/40" />
            <p className="text-sm text-[var(--brand-muted)]">No hay clientes que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--brand-line)] bg-white">
            <div className="divide-y divide-[var(--brand-line)]">
              {filtered.map((p) => {
                const fs = FOLDER_STATUS_META[p.folderStatus ?? "incomplete"] ?? FOLDER_STATUS_META.incomplete
                return (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {initials(p.legalName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[var(--brand-ink)]">{p.legalName}</p>
                      <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                        CUIT: {p.taxId}
                        {p.activity && ` · ${ACTIVITY_LABELS[p.activity] ?? p.activity}`}
                        {p.province && ` · ${p.city ? `${p.city}, ` : ""}${p.province}`}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${fs.className}`}>
                        {fs.icon}
                        {fs.label}
                      </span>
                      {p.createdAt && (
                        <p className="mt-1 text-[10px] text-[var(--brand-muted)]">
                          {new Date(p.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}
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
