"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  LockKeyhole,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { RoleGate } from "@/components/auth/RoleGate"
import { useSession } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const nextSteps = [
  {
    title: "Completar datos del cliente",
    description: "Carga los datos basicos de tu actividad y tu carpeta para que el contador pueda trabajar con informacion ordenada.",
    href: "/app/productor/autorizaciones",
    action: "Ir a configuracion",
    icon: UserRound,
  },
  {
    title: "Elegir o confirmar contador",
    description: "El contador te ayuda a preparar balances, impuestos, documentos y carpeta crediticia.",
    href: "/app/productor/autorizaciones",
    action: "Gestionar contador",
    icon: ShieldCheck,
  },
  {
    title: "Preparar una solicitud",
    description: "Cuando tu carpeta este lista, vas a poder iniciar una solicitud para una entidad financiera o comercial.",
    href: "/app/productor/financiacion",
    action: "Ver solicitudes",
    icon: ClipboardList,
  },
]

const systemGuides = [
  {
    question: "Que puedo hacer desde este panel?",
    shortAnswer: "Este es tu punto de entrada como cliente/productor.",
    answer: [
      "Desde este panel vas a ordenar tu carpeta crediticia: tus datos, contador, documentacion, autorizaciones y solicitudes.",
      "La idea es que no tengas que enviar papeles sueltos cada vez que una entidad te pide informacion. Primero completas la carpeta y despues autorizas accesos concretos.",
    ],
  },
  {
    question: "Por que no veo importes ni creditos cargados?",
    shortAnswer: "Porque esta cuenta es nueva y no tiene solicitudes reales todavia.",
    answer: [
      "Se quitaron los datos ficticios del dashboard. A partir de ahora el panel no inventa montos, aprobaciones ni notificaciones.",
      "Cuando existan solicitudes reales, el sistema podra mostrar estados, avances y mensajes vinculados a tu cuenta.",
    ],
  },
  {
    question: "Para que elijo un contador?",
    shortAnswer: "Para que pueda cargar y mantener tu informacion contable.",
    answer: [
      "El contador prepara o actualiza la informacion que normalmente piden bancos, financieras y empresas agro: balances, resultados, impuestos, bienes, pasivos y documentos.",
      "Vos seguis siendo quien autoriza el acceso a tu carpeta. El contador ayuda a cargar; la autorizacion frente a terceros queda controlada.",
    ],
  },
  {
    question: "Quien puede ver mi carpeta?",
    shortAnswer: "Solo quien tenga permiso o un acceso aprobado.",
    answer: [
      "Tu carpeta no queda publica. Las entidades solo deberian ver informacion si existe una autorizacion o invitacion aprobada con alcance definido.",
      "El sistema esta pensado para que los accesos sean trazables: quien pidio, que pidio, para que y por cuanto tiempo.",
    ],
  },
  {
    question: "Que datos tengo que completar primero?",
    shortAnswer: "Primero identidad y datos productivos; despues contador y documentacion.",
    answer: [
      "El orden recomendado es: datos del cliente, actividad principal, contador asociado, empresas o campos vinculados si corresponde, y documentacion de respaldo.",
      "Despues de eso, una solicitud de credito tiene mucha menos friccion porque la informacion ya esta centralizada.",
    ],
  },
  {
    question: "Puedo usar el sistema sin contador?",
    shortAnswer: "Si, pero la carpeta puede quedar incompleta.",
    answer: [
      "Podrias iniciar tu cuenta sin contador, pero muchas partes contables van a necesitar carga tecnica.",
      "Lo recomendable es elegir un contador cuando quieras avanzar hacia una carpeta lista para evaluar.",
    ],
  },
]

type SystemGuide = (typeof systemGuides)[number]

export default function ProducerDashboard() {
  const { user } = useSession()
  const [selectedGuide, setSelectedGuide] = useState<SystemGuide | null>(null)

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="space-y-6">
        <section className="ag-panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="p-6 lg:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-3.5" />
                  Cuenta activa
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <FileText className="size-3.5" />
                  Carpeta pendiente
                </span>
              </div>

              <div className="mt-6 max-w-3xl">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-ink)]">
                  Bienvenido, {user?.displayName ?? "cliente"}
                </h1>
                <p className="mt-3 text-base leading-7 text-[var(--brand-muted)]">
                  Tu acceso ya esta creado. El proximo paso es completar tu carpeta, elegir un contador
                  y preparar la informacion para futuras solicitudes de credito.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/95">
                  <Link href="/app/productor/autorizaciones">
                    <Settings className="size-4" />
                    Completar configuracion
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/app/productor/financiacion">
                    <ClipboardList className="size-4" />
                    Ver solicitudes
                  </Link>
                </Button>
              </div>
            </div>

            <aside className="border-t border-[var(--brand-line)] bg-[var(--brand-surface-strong)] p-6 lg:border-l lg:border-t-0 lg:p-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
                Estado actual
              </h2>
              <dl className="mt-5 space-y-4">
                <div>
                  <dt className="text-sm text-[var(--brand-muted)]">Usuario</dt>
                  <dd className="mt-1 text-base font-semibold text-[var(--brand-ink)]">
                    {user?.email ?? "Sesion activa"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--brand-muted)]">Rol</dt>
                  <dd className="mt-1 text-base font-semibold text-[var(--brand-ink)]">Cliente / Productor</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--brand-muted)]">Organizacion</dt>
                  <dd className="mt-1 break-all text-sm font-medium text-[var(--brand-ink)]">
                    {user?.defaultOrganizationId ?? "Pendiente"}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {nextSteps.map((step) => {
            const Icon = step.icon
            return (
              <article key={step.title} className="ag-card flex min-h-60 flex-col p-6">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-[#dceee7] text-[var(--brand-green)]">
                  <Icon className="size-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold tracking-tight text-[var(--brand-ink)]">{step.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-[var(--brand-muted)]">{step.description}</p>
                <Button asChild variant="outline" className="mt-5 justify-between">
                  <Link href={step.href}>
                    {step.action}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </article>
            )
          })}
        </section>

        <section className="ag-panel p-6 lg:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-[var(--brand-ink)]">
                    Manual del sistema
                  </h2>
                  <p className="mt-1 text-sm text-[var(--brand-muted)]">
                    Preguntas frecuentes para entender que hacer dentro de AgroCredit.
                  </p>
                </div>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--brand-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--brand-muted)]">
              <LockKeyhole className="size-3.5" />
              Guia privada para usuarios
            </span>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {systemGuides.map((guide) => (
              <button
                key={guide.question}
                type="button"
                onClick={() => setSelectedGuide(guide)}
                className="group flex min-h-24 items-start gap-4 rounded-lg border border-[var(--brand-line)] bg-white p-4 text-left transition hover:border-[var(--brand-green)] hover:shadow-sm"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-surface-strong)] text-[var(--brand-green)] group-hover:bg-[#dceee7]">
                  <HelpCircle className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold leading-5 text-[var(--brand-ink)]">
                    {guide.question}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-[var(--brand-muted)]">
                    {guide.shortAnswer}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <Dialog open={Boolean(selectedGuide)} onOpenChange={(open) => !open && setSelectedGuide(null)}>
          <DialogContent className="sm:max-w-2xl">
            {selectedGuide ? (
              <>
                <DialogHeader>
                  <DialogTitle className="pr-8 text-2xl leading-8">{selectedGuide.question}</DialogTitle>
                  <DialogDescription>{selectedGuide.shortAnswer}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm leading-7 text-[var(--brand-ink)]">
                  {selectedGuide.answer.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  )
}
