import Link from "next/link"
import {
  ArrowRight,
  Banknote,
  BellRing,
  ChartNoAxesColumn,
  ShieldCheck,
  Sprout,
} from "lucide-react"

const valueCards = [
  {
    icon: Sprout,
    title: "Agilidad para Productores",
    description:
      "Solicita tu credito en minutos, carga documentacion productiva y accede a seguimiento claro del proceso.",
  },
  {
    icon: Banknote,
    title: "Evaluacion para Entidades",
    description:
      "Analiza riesgo, revisa solicitudes priorizadas y administra cartera con contexto operativo real.",
  },
  {
    icon: ShieldCheck,
    title: "Transparencia Administrativa",
    description:
      "Centraliza accesos, auditoria, trazabilidad y control del ecosistema agrofinanciero.",
  },
]

const roleCards = [
  {
    title: "Productor",
    description:
      "Gestiona solicitudes de credito, documentacion del lote y seguimiento de desembolsos.",
    href: "/login",
    image:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Entidad Financiera",
    description:
      "Evalua carpetas, revisa indicadores de riesgo y administra cartera en tiempo real.",
    href: "/login",
    image:
      "https://images.unsplash.com/photo-1518186233392-c232efbf2373?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Administrador",
    description:
      "Supervisa usuarios, accesos, auditoria y reglas operativas de toda la plataforma.",
    href: "/login",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
  },
]

const stats = [
  { value: "500+", label: "Productores" },
  { value: "$12M", label: "Financiados" },
  { value: "15", label: "Entidades" },
  { value: "0.5%", label: "Mora Promedio" },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--brand-surface)] text-[var(--brand-ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--brand-line)] bg-white/92 backdrop-blur">
        <div className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="text-[2rem] font-black tracking-tight text-[var(--brand-green)]">
            AgroCredit Hub
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-[var(--brand-ink)] md:flex">
            <a href="#inicio" className="border-b-2 border-[var(--brand-green)] pb-1 font-semibold">
              Inicio
            </a>
            <a href="#valor" className="transition hover:text-[var(--brand-blue)]">
              Nosotros
            </a>
            <a href="#roles" className="transition hover:text-[var(--brand-blue)]">
              Servicios
            </a>
            <Link
              href="/login"
              className="rounded-xl bg-[var(--brand-green)] px-5 py-2.5 font-semibold text-white transition hover:opacity-95"
            >
              Login
            </Link>
          </nav>
        </div>
      </header>

      <section id="inicio" className="relative isolate min-h-[44rem] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=80"
          alt="Campo productivo con maquinaria en operacion"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="ag-hero-overlay absolute inset-0" />
        <div className="relative mx-auto flex min-h-[44rem] max-w-7xl items-center px-5 py-16 lg:px-8">
          <div className="max-w-3xl text-white">
            <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
              Financiamiento inteligente para el futuro del campo
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/90 md:text-xl">
              Conectamos productores agricolas con soluciones financieras agiles, trazables y listas
              para operar con evaluacion de riesgo moderna.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/login"
                className="rounded-2xl bg-[var(--brand-green)] px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-black/15 transition hover:-translate-y-0.5"
              >
                Comenzar ahora
              </Link>
              <Link
                href="/app"
                className="rounded-2xl border border-white/45 bg-white/85 px-8 py-4 text-lg font-semibold text-[var(--brand-ink)] backdrop-blur transition hover:bg-white"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="valor" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-[var(--brand-green)]">
            Nuestra Propuesta de Valor
          </h2>
          <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-[var(--brand-green)]" />
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {valueCards.map((card) => {
            const Icon = card.icon
            return (
              <article key={card.title} className="ag-card flex min-h-80 flex-col p-8">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-surface-strong)] text-[var(--brand-green)]">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-8 text-3xl font-semibold tracking-tight text-[var(--brand-ink)]">
                  {card.title}
                </h3>
                <p className="mt-5 text-base leading-7 text-[var(--brand-muted)]">
                  {card.description}
                </p>
                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-[var(--brand-blue)]">
                  Saber mas <ArrowRight className="h-4 w-4" />
                </span>
              </article>
            )
          })}
        </div>
      </section>

      <section id="roles" className="bg-[var(--brand-surface-strong)] py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-[var(--brand-green)]">
              Como queres ingresar?
            </h2>
            <p className="mt-5 text-base leading-7 text-[var(--brand-muted)]">
              Selecciona tu perfil para acceder a herramientas especificas dentro del circuito
              agrofinanciero.
            </p>
          </div>
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {roleCards.map((card, index) => (
              <article key={card.title} className="overflow-hidden rounded-[1.4rem] border border-[var(--brand-line)] bg-white shadow-[0_16px_34px_rgba(17,33,50,0.08)]">
                <div className="relative h-52">
                  <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <p className="text-3xl font-semibold tracking-tight">{card.title}</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="min-h-20 text-sm leading-6 text-[var(--brand-muted)]">{card.description}</p>
                  <Link
                    href={card.href}
                    className={`mt-5 flex h-12 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                      index === 1
                        ? "border-[var(--brand-blue)] bg-[var(--brand-blue)] text-white"
                        : index === 2
                          ? "border-[var(--brand-ink)] text-[var(--brand-ink)] hover:bg-[var(--brand-surface-strong)]"
                          : "border-[var(--brand-green)] bg-[var(--brand-green)] text-white"
                    }`}
                  >
                    {index === 0 ? "Entrar como Productor" : index === 1 ? "Entrar como Entidad" : "Panel Administrativo"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--brand-green)] py-12 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label}>
              <div className="text-5xl font-black tracking-tight">{stat.value}</div>
              <div className="mt-3 text-sm uppercase tracking-[0.18em] text-white/75">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-[var(--brand-green)] pb-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 border-t border-white/15 px-5 pt-8 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-3xl font-bold tracking-tight">AgroCredit Hub</p>
            <p className="mt-3 text-sm text-white/75">
              © 2024 AgroCredit Hub. Plataforma de financiacion y trazabilidad para el agro.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-white/75">
            <span>Contacto</span>
            <span>Legal</span>
            <span>Privacidad</span>
            <span>Soporte</span>
            <BellRing className="h-5 w-5" />
            <ChartNoAxesColumn className="h-5 w-5" />
          </div>
        </div>
      </footer>
    </main>
  )
}
