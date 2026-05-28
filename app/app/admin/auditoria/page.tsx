"use client"

import { useEffect, useState } from "react"
import { RoleGate } from "@/components/auth/RoleGate"
import { getRecentAuditLogs } from "@/lib/services/audit-logs"
import { Activity, AlertTriangle, Download, Filter, MapPin, ShieldCheck } from "lucide-react"
import type { AuditLog } from "@/types/audit"

const accessRows = [
  {
    producer: "Cooperativa Agraria Sud",
    entity: "Banco Nacional de Fomento",
    badge: "Lectura/Escritura",
  },
  {
    producer: "Rural del Oeste",
    entity: "Banco Pampa Credito",
    badge: "Solo Lectura",
  },
]

const fallbackLogs: AuditLog[] = [
  {
    id: "demo-1",
    actorUid: "demo-1",
    actorOrganizationId: null,
    action: "financing_request.status_changed",
    targetType: "financing_request",
    targetId: "452",
    metadata: {
      actorName: "Juan Delgado",
      actorEmail: "juan.d@bancopampa.com",
      ipAddress: "190.15.22.104",
      actionLabel: "Cambio de estado en solicitud #452 a Aprobado",
    },
    createdAt: "14 May 2024 10:42 AM",
  },
  {
    id: "demo-2",
    actorUid: "demo-2",
    actorOrganizationId: null,
    action: "document.uploaded",
    targetType: "document",
    targetId: "balance-2023",
    metadata: {
      actorName: "Marta Sanchez",
      actorEmail: "msanchez@agropro.cl",
      ipAddress: "201.18.5.66",
      actionLabel: "Actualizacion de documentos financieros: Balance_2023.pdf",
    },
    createdAt: "14 May 2024 09:15 AM",
  },
  {
    id: "demo-3",
    actorUid: "demo-3",
    actorOrganizationId: null,
    action: "access_grant.created",
    targetType: "access_grant",
    targetId: "grant-34",
    metadata: {
      actorName: "Admin Root",
      actorEmail: "admin@agrocredit.hub",
      ipAddress: "VPN Endpoint 04",
      actionLabel: "Modificacion de permisos de acceso para Banco Rural x Coop. Maiz",
    },
    createdAt: "13 May 2024 06:22 PM",
  },
]

function formatTimestamp(value: unknown) {
  if (typeof value === "string" && value.trim()) return value
  return "14 May 2024 10:42 AM"
}

function readMetadataText(log: AuditLog, key: string, fallback: string) {
  const value = log.metadata?.[key]
  return typeof value === "string" && value.trim() ? value : fallback
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRecentAuditLogs()
      .then(setLogs)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar auditoria")
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-[#ffd2ce] bg-[#fff1ef] px-5 py-4 text-sm text-[#a32b2b]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
              <article className="ag-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[1.1rem] text-[var(--brand-ink)]">Acciones Hoy</p>
                    <p className="mt-6 text-[3rem] font-extrabold tracking-tight text-[var(--brand-ink)]">
                      {loading ? "..." : logs.length || 1429}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-[#37b87d]">+12% vs ayer</p>
                  </div>
                  <Activity className="h-7 w-7 text-[var(--brand-green)]" />
                </div>
              </article>

              <article className="ag-card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[1.1rem] text-[var(--brand-ink)]">Alertas Criticas</p>
                    <p className="mt-6 text-[3rem] font-extrabold tracking-tight text-[var(--brand-ink)]">0</p>
                    <p className="mt-2 text-lg text-[var(--brand-ink)]">Sistema estable</p>
                  </div>
                  <AlertTriangle className="h-7 w-7 text-[#d92d20]" />
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

            <section className="ag-panel overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-[var(--brand-line)] px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-[2rem] font-bold tracking-tight text-[var(--brand-ink)]">
                  Log de Actividad Reciente
                </h2>
                <div className="flex flex-wrap gap-3">
                  <button className="flex h-12 items-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-white px-5 text-lg font-medium text-[var(--brand-ink)]">
                    <Filter className="h-5 w-5" />
                    Filtrar
                  </button>
                  <button className="flex h-12 items-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-white px-5 text-lg font-medium text-[var(--brand-ink)]">
                    <Download className="h-5 w-5" />
                    Exportar CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[var(--brand-surface-strong)] text-left text-sm uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Usuario</th>
                      <th className="px-6 py-4 font-semibold">Accion</th>
                      <th className="px-6 py-4 font-semibold">IP / Ubicacion</th>
                      <th className="px-6 py-4 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs.length ? logs : fallbackLogs).map((log) => (
                      <tr key={log.id} className="border-t border-[var(--brand-line)] bg-white align-top">
                        <td className="px-6 py-5">
                          <p className="text-[1.35rem] font-semibold tracking-tight text-[var(--brand-ink)]">
                            {readMetadataText(log, "actorName", "Usuario del sistema")}
                          </p>
                          <p className="mt-1 text-base text-[var(--brand-muted)]">
                            {readMetadataText(log, "actorEmail", "sin-email@agrocredit.hub")}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-[1.15rem] leading-8 text-[var(--brand-ink)]">
                          {readMetadataText(log, "actionLabel", log.action)}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-3 text-[1.1rem] text-[var(--brand-ink)]">
                            <MapPin className="mt-1 h-5 w-5 text-[var(--brand-muted)]" />
                            <span>{readMetadataText(log, "ipAddress", "VPN Endpoint 04")}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-[1.05rem] font-semibold text-[var(--brand-ink)]">
                          {formatTimestamp(log.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-[var(--brand-line)] px-6 py-5 text-center">
                <button className="text-lg font-semibold text-[var(--brand-green)]">Cargar mas registros</button>
              </div>
            </section>

            <section className="ag-panel overflow-hidden">
              <div className="border-b border-[var(--brand-line)] px-6 py-6">
                <h2 className="text-[2rem] font-bold tracking-tight text-[var(--brand-ink)]">
                  Gestion de Accesos Bancarios
                </h2>
                <p className="mt-2 text-lg text-[var(--brand-muted)]">
                  Configura que bancos pueden visualizar las carpetas de los productores.
                </p>
              </div>
              <div className="space-y-4 p-6">
                {accessRows.map((row) => (
                  <article
                    key={`${row.producer}-${row.entity}`}
                    className="rounded-[1.4rem] border border-[var(--brand-line)] bg-white px-5 py-5 shadow-sm"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-center">
                      <div>
                        <p className="text-sm text-[var(--brand-muted)]">Productor</p>
                        <p className="mt-1 text-[1.35rem] font-semibold tracking-tight text-[var(--brand-ink)]">
                          {row.producer}
                        </p>
                      </div>
                      <ShieldCheck className="h-6 w-6 text-[var(--brand-muted)]" />
                      <div>
                        <p className="text-sm text-[var(--brand-muted)]">Entidad Financiera</p>
                        <p className="mt-1 text-[1.35rem] font-semibold tracking-tight text-[var(--brand-ink)]">
                          {row.entity}
                        </p>
                      </div>
                      <span className="ag-chip bg-[#e4f7ec] text-[#2fa572]">{row.badge}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-[1.8rem] bg-[var(--brand-green)] p-6 text-white shadow-[0_18px_36px_rgba(6,60,49,0.24)]">
            <h2 className="text-[2rem] font-bold tracking-tight">Estado de Nodos</h2>
            <div className="mt-8 space-y-6">
              {[
                "API Gateway",
                "Base de Datos",
                "Storage (AWS S3)",
              ].map((service) => (
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
          </aside>
        </section>
      </div>
    </RoleGate>
  )
}
