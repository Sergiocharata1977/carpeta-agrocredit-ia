"use client"

import Link from "next/link"
import { RoleGate } from "@/components/auth/RoleGate"
import { Activity, ArrowRightLeft, Check, Shield, UserCog } from "lucide-react"

const topCards = [
  { title: "Acciones Hoy", value: "1,429", meta: "+12% vs ayer", icon: Activity, tone: "text-[#37b87d]" },
  { title: "Alertas Criticas", value: "0", meta: "Sistema estable", icon: Shield, tone: "text-[#d92d20]" },
]

const accessRows = [
  {
    producer: "Cooperativa Agraria Sud",
    entity: "Banco Nacional de Fomento",
    badge: "Lectura/Escritura",
  },
  {
    producer: "Agroinsumos del Litoral",
    entity: "Banco Regional del Norte",
    badge: "Solo Lectura",
  },
]

export default function AdminDashboard() {
  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="space-y-6">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
              {topCards.map((card) => {
                const Icon = card.icon
                return (
                  <article key={card.title} className="ag-card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[1.1rem] text-[var(--brand-ink)]">{card.title}</p>
                        <p className="mt-6 text-[3rem] font-extrabold tracking-tight text-[var(--brand-ink)]">{card.value}</p>
                        <p className={`mt-2 text-lg font-semibold ${card.tone}`}>{card.meta}</p>
                      </div>
                      <Icon className={`h-7 w-7 ${card.tone}`} />
                    </div>
                  </article>
                )
              })}

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
              <div className="flex items-center justify-between border-b border-[var(--brand-line)] px-6 py-6">
                <div>
                  <h2 className="text-[2rem] font-bold tracking-tight text-[var(--brand-ink)]">
                    Gestion de Accesos Bancarios
                  </h2>
                  <p className="mt-2 text-lg text-[var(--brand-muted)]">
                    Configura que bancos pueden visualizar las carpetas de los productores.
                  </p>
                </div>
                <Link
                  href="/app/entidad/accesos"
                  className="flex h-16 items-center gap-3 rounded-2xl bg-[var(--brand-green)] px-6 text-xl font-semibold text-white shadow-[0_16px_32px_rgba(6,60,49,0.22)]"
                >
                  <UserCog className="h-6 w-6" />
                  Asignar Nuevo
                </Link>
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
                        <p className="mt-1 text-[1.45rem] font-semibold tracking-tight text-[var(--brand-ink)]">
                          {row.producer}
                        </p>
                      </div>
                      <ArrowRightLeft className="h-6 w-6 text-[var(--brand-muted)]" />
                      <div>
                        <p className="text-sm text-[var(--brand-muted)]">Entidad Financiera</p>
                        <p className="mt-1 text-[1.45rem] font-semibold tracking-tight text-[var(--brand-ink)]">
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
