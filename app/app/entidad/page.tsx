"use client"

import Link from "next/link"
import { RoleGate } from "@/components/auth/RoleGate"
import { AlertTriangle, CircleAlert, Search, SlidersHorizontal } from "lucide-react"

const portfolioCards = [
  {
    title: "Volumen Pendiente",
    value: "$4.2M",
    meta: "+12% vs mes ant.",
    footer: "14 solicitudes esperando aprobacion.",
  },
  {
    title: "Estado de Cartera",
    value: "82%",
    meta: "Sano",
    footer: "Al dia y en proceso",
  },
]

const reviewRows = [
  {
    name: "Ricardo Mendez",
    company: "Finca La Esmeralda",
    amount: "$125,000",
    purpose: "Compra de Maquinaria",
    score: "Bajo (820/1000)",
    scoreTone: "bg-[#d8f5e7] text-[#178a5f]",
    date: "Hace 2 horas",
    action: "Revisar",
    actionTone: "bg-[var(--brand-green)] text-white",
  },
  {
    name: "AgroExport S.A.",
    company: "Division Lacteos",
    amount: "$450,000",
    purpose: "Expansion de Planta",
    score: "Medio (640/1000)",
    scoreTone: "bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]",
    date: "Hace 5 horas",
    action: "Revisar",
    actionTone: "bg-[var(--brand-green)] text-white",
  },
  {
    name: "Mariana Costa",
    company: "Huerto Organico Sur",
    amount: "$42,500",
    purpose: "Sistema de Riego Solar",
    score: "Bajo (790/1000)",
    scoreTone: "bg-[#d8f5e7] text-[#178a5f]",
    date: "Ayer",
    action: "Revisar",
    actionTone: "bg-[var(--brand-green)] text-white",
  },
  {
    name: "Juan Perez",
    company: "Revision Urgente",
    amount: "$310,000",
    purpose: "Capital de Trabajo",
    score: "Alto (410/1000)",
    scoreTone: "bg-[#ffe0dc] text-[#c43f33]",
    date: "Expirado (48h)",
    action: "Atender Ya",
    actionTone: "bg-[#d92d20] text-white",
  },
]

const alerts = [
  {
    title: "Plazo Expirado",
    detail: "Sol. #8492 - Juan Perez supero 48h sin revision.",
    tone: "text-[#c43f33]",
    icon: AlertTriangle,
  },
  {
    title: "Documento Faltante",
    detail: "Cooperativa Norte requiere firma digital.",
    tone: "text-[var(--brand-blue)]",
    icon: CircleAlert,
  },
]

export default function EntidadDashboard() {
  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="space-y-6">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_1fr]">
              {portfolioCards.map((card, index) => (
                <article key={card.title} className="ag-card p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--brand-ink)]">
                        {card.title}
                      </p>
                      <div className="mt-7 flex items-center gap-3">
                        <p className="text-[3rem] font-extrabold tracking-tight text-[var(--brand-green)]">
                          {card.value}
                        </p>
                        <span
                          className={`ag-chip ${
                            index === 0 ? "bg-[#d8f5e7] text-[#178a5f]" : "bg-[var(--brand-surface-strong)] text-[var(--brand-ink)]"
                          }`}
                        >
                          {card.meta}
                        </span>
                      </div>
                    </div>
                    <div className="h-28 w-28 rounded-full border-[14px] border-[var(--brand-green)] border-r-[var(--brand-blue)] border-b-[var(--brand-blue-soft)]" />
                  </div>
                  <p className="mt-6 text-lg text-[var(--brand-muted)]">{card.footer}</p>
                </article>
              ))}
            </div>

            <section className="ag-panel overflow-hidden">
              <div className="flex flex-col gap-5 border-b border-[var(--brand-line)] px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-[2rem] font-bold tracking-tight text-[var(--brand-ink)]">
                  Solicitudes por Evaluar
                </h2>
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="flex h-14 min-w-80 items-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-[var(--brand-surface)] px-4">
                    <Search className="h-5 w-5 text-[var(--brand-muted)]" />
                    <span className="text-base text-[var(--brand-muted)]">Buscar productor...</span>
                  </div>
                  <button className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-white px-6 text-lg font-medium text-[var(--brand-ink)]">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filtros
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[var(--brand-surface-strong)] text-left text-sm uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Productor / Empresa</th>
                      <th className="px-6 py-4 font-semibold">Monto Solicitado</th>
                      <th className="px-6 py-4 font-semibold">Proposito</th>
                      <th className="px-6 py-4 font-semibold">Score Riesgo</th>
                      <th className="px-6 py-4 font-semibold">Fecha</th>
                      <th className="px-6 py-4 font-semibold">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewRows.map((row) => (
                      <tr key={`${row.name}-${row.amount}`} className="border-t border-[var(--brand-line)] bg-white align-top">
                        <td className={`px-6 py-5 ${row.action === "Atender Ya" ? "border-l-4 border-[#d92d20]" : ""}`}>
                          <p className="text-[1.3rem] font-semibold tracking-tight text-[var(--brand-ink)]">{row.name}</p>
                          <p className={`mt-1 text-lg ${row.action === "Atender Ya" ? "text-[#d92d20]" : "text-[var(--brand-muted)]"}`}>
                            {row.company}
                          </p>
                        </td>
                        <td className="px-6 py-5 text-[1.25rem] font-medium text-[var(--brand-ink)]">{row.amount}</td>
                        <td className="px-6 py-5 text-[1.2rem] text-[var(--brand-ink)]">{row.purpose}</td>
                        <td className="px-6 py-5">
                          <span className={`ag-chip ${row.scoreTone}`}>{row.score}</span>
                        </td>
                        <td className={`px-6 py-5 text-[1.15rem] ${row.action === "Atender Ya" ? "font-semibold text-[#d92d20]" : "text-[var(--brand-ink)]"}`}>
                          {row.date}
                        </td>
                        <td className="px-6 py-5">
                          <Link
                            href="/app/entidad/financiacion"
                            className={`inline-flex h-12 items-center justify-center rounded-2xl px-5 text-lg font-semibold ${row.actionTone}`}
                          >
                            {row.action}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--brand-line)] px-6 py-5 text-base text-[var(--brand-muted)]">
                <span>Mostrando 4 de 14 solicitudes pendientes</span>
                <div className="flex items-center gap-2">
                  <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--brand-line)] bg-white text-lg">
                    ‹
                  </button>
                  <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-green)] text-lg font-semibold text-white">
                    1
                  </button>
                  <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--brand-line)] bg-white text-lg">
                    2
                  </button>
                  <button className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--brand-line)] bg-white text-lg">
                    ›
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className="ag-card border-[#f2c7c2] p-6">
            <div className="flex items-center justify-between text-[#c43f33]">
              <h2 className="text-[1.9rem] font-bold tracking-tight">Alertas Criticas</h2>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="mt-6 space-y-4">
              {alerts.map((alert) => {
                const Icon = alert.icon
                return (
                  <article key={alert.title} className="rounded-2xl border border-[#f4d5d2] bg-[#fff9f8] p-5">
                    <div className="flex items-start gap-4">
                      <Icon className={`mt-1 h-6 w-6 shrink-0 ${alert.tone}`} />
                      <div>
                        <p className={`text-[1.35rem] font-semibold tracking-tight ${alert.tone}`}>{alert.title}</p>
                        <p className="mt-2 text-base leading-7 text-[var(--brand-ink)]">{alert.detail}</p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </aside>
        </section>
      </div>
    </RoleGate>
  )
}
