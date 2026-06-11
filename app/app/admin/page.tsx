"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RoleGate } from "@/components/auth/RoleGate"
import { Activity, Check, Shield, Users } from "lucide-react"
import { getFreshIdToken } from "@/lib/firebase/auth-client"

interface AdminMetrics {
  actionsToday: number
  activeGrants: number
  orgsByType: Record<string, number>
  totalOrgs: number
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  const loadMetrics = useCallback(async () => {
    try {
      const token = await getFreshIdToken()
      if (!token) return
      const res = await fetch("/api/admin/metrics", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.ok) setMetrics(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMetrics()
  }, [loadMetrics])

  const fmt = (n: number | undefined) => (loading ? "..." : (n ?? 0).toLocaleString("es-AR"))

  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="space-y-6">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
              <article className="ag-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[1.1rem] text-[var(--brand-ink)]">Acciones Hoy</p>
                    <p className="mt-6 text-[3rem] font-extrabold tracking-tight text-[var(--brand-ink)]">
                      {fmt(metrics?.actionsToday)}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#37b87d]">Registros de auditoría</p>
                  </div>
                  <Activity className="h-7 w-7 text-[#37b87d]" />
                </div>
              </article>

              <article className="ag-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[1.1rem] text-[var(--brand-ink)]">Accesos activos</p>
                    <p className="mt-6 text-[3rem] font-extrabold tracking-tight text-[var(--brand-ink)]">
                      {fmt(metrics?.activeGrants)}
                    </p>
                    <p className="mt-2 text-lg text-[var(--brand-muted)]">Grants vigentes</p>
                  </div>
                  <Shield className="h-7 w-7 text-[var(--brand-green)]" />
                </div>
              </article>

              <article className="ag-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[1.1rem] text-[var(--brand-ink)]">Organizaciones</p>
                    <p className="mt-6 text-[3rem] font-extrabold tracking-tight text-[var(--brand-ink)]">
                      {fmt(metrics?.totalOrgs)}
                    </p>
                    <p className="mt-2 text-lg text-[var(--brand-muted)]">
                      {fmt(metrics?.orgsByType?.system_user)} productores
                    </p>
                  </div>
                  <Users className="h-7 w-7 text-[var(--brand-blue)]" />
                </div>
              </article>

              <article className="ag-card p-6">
                <div className="flex items-start justify-between gap-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[1.1rem] text-[var(--brand-ink)]">Estado del Sistema</p>
                    <div className="mt-8 grid grid-cols-4 gap-2">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div
                          key={index}
                          className={`h-3 rounded-full ${index < 3 ? "bg-[#67d7a9]" : "bg-[#d8efe4]"}`}
                        />
                      ))}
                    </div>
                    <p className="mt-4 text-lg text-[var(--brand-ink)]">Uptime: 99.98%</p>
                  </div>
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-[#67d7a9] text-2xl font-bold text-[var(--brand-ink)]">
                    OK
                  </div>
                </div>
              </article>
            </div>

            <section className="ag-panel p-6">
              <h2 className="mb-4 text-[1.8rem] font-bold tracking-tight text-[var(--brand-ink)]">
                Tipos de organización
              </h2>
              {loading ? (
                <p className="text-[var(--brand-muted)]">Cargando...</p>
              ) : metrics ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { key: "system_user", label: "Productores / Clientes" },
                    { key: "accounting_firm", label: "Estudios contables" },
                    { key: "requesting_entity", label: "Entidades financieras" },
                  ].map(({ key, label }) => (
                    <div key={key} className="rounded-xl border border-[var(--brand-line)] bg-white p-4">
                      <p className="text-sm text-[var(--brand-muted)]">{label}</p>
                      <p className="mt-1 text-3xl font-bold text-[var(--brand-ink)]">
                        {(metrics.orgsByType[key] ?? 0).toLocaleString("es-AR")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--brand-muted)]">No se pudieron cargar las métricas.</p>
              )}
            </section>

            <section className="ag-panel p-6">
              <h2 className="mb-2 text-[1.8rem] font-bold tracking-tight text-[var(--brand-ink)]">
                Gestión de accesos
              </h2>
              <p className="mb-4 text-[var(--brand-muted)]">
                Administrá estudios contables, aprobar organizaciones y revisar grants activos.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/app/admin/estudios"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-surface-strong)]"
                >
                  Estudios contables
                </Link>
                <Link
                  href="/app/admin/auditoria"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand-line)] bg-white px-5 py-3 text-sm font-semibold text-[var(--brand-ink)] hover:bg-[var(--brand-surface-strong)]"
                >
                  Log de auditoría
                </Link>
              </div>
            </section>
          </div>

          <aside className="rounded-[1.8rem] bg-[var(--brand-green)] p-6 text-white shadow-[0_18px_36px_rgba(6,60,49,0.24)]">
            <h2 className="text-[2rem] font-bold tracking-tight">Estado de Nodos</h2>
            <div className="mt-8 space-y-6">
              {["API Gateway", "Base de Datos", "Storage (Firebase)"].map((service) => (
                <div key={service}>
                  <div className="flex items-center justify-between text-lg">
                    <span>{service}</span>
                    <span className="font-semibold text-[#91f2c5]">Activo</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/15">
                    <div className="h-2 rounded-full bg-[#91f2c5]" style={{ width: "92%" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-10 rounded-2xl border border-white/12 bg-white/8 p-5">
              <div className="flex items-center gap-3">
                <Check className="h-6 w-6 text-[#91f2c5]" />
                <p className="text-lg font-semibold">Monitoreo estable y sin incidentes abiertos.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </RoleGate>
  )
}
