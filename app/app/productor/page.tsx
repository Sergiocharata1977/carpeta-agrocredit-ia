"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  HelpCircle,
  LockKeyhole,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { ProducerLegajoHabilitationsPanel } from "@/components/access/ProducerLegajoHabilitationsPanel"
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

const setupSteps = [
  {
    title: "Completar mi perfil",
    description: "Carga tus datos de identidad y actividad para que el contador pueda iniciar la carpeta.",
    href: "/app/productor/perfil",
    action: "Ir a mi perfil",
    icon: UserRound,
  },
  {
    title: "Elegir un contador",
    description: "El contador prepara balances, impuestos, documentos y la carpeta crediticia completa.",
    href: "/app/productor/contador",
    action: "Buscar contador",
    icon: ShieldCheck,
  },
  {
    title: "Habilitar accesos",
    description: "Controla quién puede ver tu carpeta, con qué alcance y por cuánto tiempo.",
    href: "/app/productor/autorizaciones",
    action: "Ver autorizaciones",
    icon: Settings,
  },
]

const systemGuides = [
  {
    question: "Que puedo hacer desde este panel?",
    shortAnswer: "Este es tu punto de entrada como cliente/productor.",
    answer: [
      "Desde este panel vas a ordenar tu legajo: tus datos, contador, documentacion, habilitaciones y comunicacion con entidades.",
      "La idea es que no tengas que enviar papeles sueltos cada vez que una entidad te pide informacion. Primero completas el legajo y despues habilitas accesos concretos por tiempo determinado.",
    ],
  },
  {
    question: "Que hace y que no hace el sistema?",
    shortAnswer: "Ordena y habilita el legajo; no decide operaciones financieras.",
    answer: [
      "AgroCredit IA funciona como legajo y comunicacion entre cliente, contador y financista.",
      "El sistema habilita la visualizacion de informacion por alcance y tiempo, pero no decide operaciones comerciales ni reemplaza la evaluacion de cada entidad.",
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
      "Despues de eso, habilitar el legajo a una entidad es mas simple porque la informacion ya esta centralizada.",
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
                  Tu acceso ya esta creado. Completa tu perfil, elige un contador y habilita el
                  legajo cuando lo necesites.
                </p>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-[var(--brand-green)] text-white hover:bg-[var(--brand-green)]/95">
                  <Link href="/app/productor/perfil">
                    <UserRound className="size-4" />
                    Completar mi perfil
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/app/productor/contador">
                    <ShieldCheck className="size-4" />
                    Elegir contador
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

        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">
            Proximos pasos
          </h2>
          <div className="grid gap-5 lg:grid-cols-3">
            {setupSteps.map((step, index) => {
              const Icon = step.icon
              return (
                <article key={step.title} className="ag-card flex min-h-52 flex-col p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-[#dceee7] text-[var(--brand-green)]">
                      <Icon className="size-5" />
                    </div>
                    <span className="flex size-6 items-center justify-center rounded-full border border-[var(--brand-line)] text-xs font-bold text-[var(--brand-muted)]">
                      {index + 1}
                    </span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight text-[var(--brand-ink)]">{step.title}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-[var(--brand-muted)]">{step.description}</p>
                  <Button asChild variant="outline" className="mt-5 justify-between">
                    <Link href={step.href}>
                      {step.action}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </article>
              )
            })}
          </div>
        </section>

        <ProducerLegajoHabilitationsPanel organizationId={user?.defaultOrganizationId ?? null} compact />

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
