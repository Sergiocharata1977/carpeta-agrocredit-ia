"use client"

import Link from "next/link"
import { RoleGate } from "@/components/auth/RoleGate"
import { useSession } from "@/lib/auth/session"
import { ArrowRight, CreditCard, Search, SlidersHorizontal, WalletCards } from "lucide-react"

const summaryCards = [
  {
    label: "Credito Utilizado",
    value: "$145,200.00",
    meta: "+12% vs mes anterior",
    icon: CreditCard,
    tone: "bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]",
  },
  {
    label: "Linea Disponible",
    value: "$350,000.00",
    meta: "80% disponible",
    icon: WalletCards,
    tone: "bg-[#dceee7] text-[var(--brand-green)]",
  },
  {
    label: "Solicitudes",
    value: "08 Totales",
    meta: "3 en curso",
    icon: CreditCard,
    tone: "bg-[#dff5ea] text-[#2da67a]",
  },
]

const requests = [
  { id: "#AC-9821", project: "Cosecha Fina 2024", amount: "$85,000.00", date: "12 Oct 2024", status: "Aprobado", statusTone: "bg-[#d8f5e7] text-[#178a5f]" },
  { id: "#AC-9755", project: "Riego Inteligente Sector B", amount: "$42,500.00", date: "08 Oct 2024", status: "Revision", statusTone: "bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]" },
  { id: "#AC-9702", project: "Renovacion Tractor J-D", amount: "$120,000.00", date: "25 Sep 2024", status: "Analisis", statusTone: "bg-[#dfefff] text-[#3661c4]" },
  { id: "#AC-9540", project: "Fertilizantes de Invierno", amount: "$18,000.00", date: "15 Sep 2024", status: "Listo", statusTone: "bg-[#d8f5e7] text-[#178a5f]" },
]

const notifications = [
  {
    title: "Credito Aprobado",
    detail: "Tu solicitud #AC-9821 para Cosecha Fina 2024 ha sido aprobada.",
    time: "Hace 2 horas",
    dot: "bg-[var(--brand-green)]",
  },
  {
    title: "Documentacion Pendiente",
    detail: "Sube tu titulo de propiedad para completar el perfil.",
    time: "Hace 5 horas",
    dot: "bg-[var(--brand-blue)]",
  },
  {
    title: "Ajuste de Tasas",
    detail: "Nuevas tasas de interes para el sector sojero actualizadas.",
    time: "Ayer",
    dot: "bg-[#c9d2da]",
  },
]

const creditLines = [
  { title: "Agro-Insumos", detail: "Hasta $200,000 con TNA 35%" },
  { title: "Maquinaria Pesada", detail: "Hasta $500,000 con TNA 32%" },
]

export default function ProducerDashboard() {
  const { user } = useSession()

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="space-y-6">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {summaryCards.map((card) => {
                const Icon = card.icon
                return (
                  <article key={card.label} className="ag-card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${card.tone}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-[#37b87d]">{card.meta}</span>
                    </div>
                    <p className="mt-6 text-lg text-[var(--brand-muted)]">{card.label}</p>
                    <p className="mt-2 text-[2.2rem] font-bold tracking-tight text-[var(--brand-ink)]">{card.value}</p>
                  </article>
                )
              })}
            </div>

            <section className="ag-panel overflow-hidden">
              <div className="flex flex-col gap-5 border-b border-[var(--brand-line)] px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-[2rem] font-bold tracking-tight text-[var(--brand-ink)]">Mis Solicitudes</h2>
                  <p className="mt-1 text-lg text-[var(--brand-muted)]">
                    Gestion de creditos activos y pendientes para {user?.displayName ?? "tu cuenta"}.
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <div className="flex h-14 min-w-72 items-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-white px-4">
                    <Search className="h-5 w-5 text-[var(--brand-muted)]" />
                    <span className="text-base text-[var(--brand-muted)]">Buscar proyecto...</span>
                  </div>
                  <button className="flex h-14 items-center justify-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-white px-6 text-lg font-medium text-[var(--brand-ink)]">
                    <SlidersHorizontal className="h-5 w-5" />
                    Filtrar
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-[var(--brand-surface-strong)] text-left text-sm uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                    <tr>
                      <th className="px-6 py-4 font-semibold">ID Credito</th>
                      <th className="px-6 py-4 font-semibold">Proyecto</th>
                      <th className="px-6 py-4 font-semibold">Monto</th>
                      <th className="px-6 py-4 font-semibold">Fecha</th>
                      <th className="px-6 py-4 font-semibold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id} className="border-t border-[var(--brand-line)] bg-white">
                        <td className="px-6 py-5 text-[1.1rem] font-medium text-[var(--brand-ink)]">{request.id}</td>
                        <td className="px-6 py-5 text-[1.1rem] font-semibold text-[var(--brand-ink)]">{request.project}</td>
                        <td className="px-6 py-5 text-[1.1rem] text-[var(--brand-ink)]">{request.amount}</td>
                        <td className="px-6 py-5 text-[1.1rem] text-[var(--brand-ink)]">{request.date}</td>
                        <td className="px-6 py-5">
                          <span className={`ag-chip ${request.statusTone}`}>{request.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--brand-line)] px-6 py-5 text-base text-[var(--brand-muted)]">
                <span>Mostrando 4 de 8 registros</span>
                <div className="flex items-center gap-2">
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white text-[var(--brand-ink)]">
                    ‹
                  </button>
                  <button className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--brand-line)] bg-white text-[var(--brand-ink)]">
                    ›
                  </button>
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="ag-card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[2rem] font-bold tracking-tight text-[var(--brand-ink)]">Notificaciones</h2>
                <Link href="/app/notificaciones" className="text-base font-semibold text-[var(--brand-blue)]">
                  Ver todas
                </Link>
              </div>
              <div className="mt-6 space-y-5">
                {notifications.map((item) => (
                  <article key={item.title} className="border-b border-[var(--brand-line)] pb-5 last:border-b-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <span className={`mt-2 h-3 w-3 rounded-full ${item.dot}`} />
                      <div>
                        <p className="text-[1.45rem] font-semibold tracking-tight text-[var(--brand-ink)]">{item.title}</p>
                        <p className="mt-1 text-base leading-7 text-[var(--brand-ink)]">{item.detail}</p>
                        <p className="mt-2 text-base text-[var(--brand-muted)]">{item.time}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[1.7rem] bg-[var(--brand-green)] p-6 text-white shadow-[0_18px_36px_rgba(6,60,49,0.22)]">
              <h2 className="text-[2rem] font-bold tracking-tight">Lineas Disponibles</h2>
              <div className="mt-6 space-y-4">
                {creditLines.map((line) => (
                  <article key={line.title} className="rounded-2xl border border-white/14 bg-white/6 px-5 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[1.4rem] font-semibold">{line.title}</p>
                        <p className="mt-2 text-base text-white/78">{line.detail}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 shrink-0" />
                    </div>
                  </article>
                ))}
              </div>
              <Link
                href="/app/productor/financiacion"
                className="mt-6 flex h-14 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-[var(--brand-green)] transition hover:bg-white/92"
              >
                Solicitar Incremento
              </Link>
            </section>
          </aside>
        </section>
      </div>
    </RoleGate>
  )
}
