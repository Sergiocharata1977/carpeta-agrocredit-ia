import Link from "next/link"
import {
  ArrowRight,
  Calculator,
  ClipboardCheck,
  FileCheck2,
  Landmark,
  Route,
  Send,
  Tractor,
  Users,
} from "lucide-react"

const valueCards = [
  {
    icon: ClipboardCheck,
    title: "Carpeta lista para financistas",
    description:
      "Clientes y contadores cargan balances, impuestos, patrimonio y documentos en un solo lugar.",
  },
  {
    icon: Send,
    title: "Envio directo y trazable",
    description:
      "La informacion se comparte con bancos, financieras y proveedores con permisos claros y auditoria.",
  },
  {
    icon: Route,
    title: "Menos viajes, mas gestion",
    description:
      "La carpeta digital evita traslados de hasta 100 kilometros para entregar papeles o actualizar datos.",
  },
]

const flowSteps = [
  {
    icon: Users,
    label: "Cliente",
    title: "Autoriza su carpeta",
    description: "Define que entidad puede ver la informacion y por cuantos dias.",
  },
  {
    icon: Calculator,
    label: "Contador",
    title: "Carga y mantiene datos",
    description: "Ordena la documentacion contable, fiscal y patrimonial del cliente.",
  },
  {
    icon: Landmark,
    label: "Financista",
    title: "Evalua con contexto",
    description: "Recibe una carpeta completa para decidir credito, venta a plazo o cupos.",
  },
]

const roleCards = [
  {
    title: "Soy Productor / Cliente",
    description:
      "Solicita financiamiento, autoriza accesos temporales y seguí el estado de cada pedido desde tu cuenta.",
    href: "/registro/usuario",
    button: "Registrarme como productor",
    image:
      "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80",
    tone: "green",
  },
  {
    title: "Soy Contador",
    description:
      "Administra carpetas de tus clientes desde un panel unificado y envia informacion validada a financistas.",
    href: "/registro/contador",
    button: "Registrar mi estudio",
    image:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
    tone: "amber",
  },
  {
    title: "Soy Financista o empresa Agro",
    description:
      "Solicita acceso a carpetas, evalua indicadores y gestioná credito o ventas a plazo con permisos temporizados.",
    href: "/registro/entidad",
    button: "Registrar mi entidad",
    image:
      "https://images.unsplash.com/photo-1518186233392-c232efbf2373?auto=format&fit=crop&w=1200&q=80",
    tone: "blue",
  },
]

const stats = [
  { value: "100 km", label: "viaje evitado" },
  { value: "3", label: "perfiles conectados" },
  { value: "1", label: "carpeta compartida" },
  { value: "365", label: "dias max. de acceso" },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] text-[#10221c]">
      <header className="sticky top-0 z-40 border-b border-[#dde4dc] bg-white/94 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-black tracking-tight text-[#10221c]">
            <Tractor className="h-5 w-5" />
            AgroCredit IA
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-[#48574f] md:flex">
            <a href="#inicio" className="border-b-2 border-[#10221c] pb-1 text-[#10221c]">
              Inicio
            </a>
            <a href="#valor" className="transition hover:text-[#10221c]">
              Valor
            </a>
            <a href="#flujo" className="transition hover:text-[#10221c]">
              Flujo
            </a>
            <Link
              href="/login"
              className="rounded-full bg-[#063c31] px-5 py-2.5 text-white shadow-sm transition hover:bg-[#0a4a3d]"
            >
              Acceso clientes
            </Link>
          </nav>
          <Link
            href="/login"
            className="rounded-full bg-[#063c31] px-4 py-2 text-sm font-semibold text-white shadow-sm md:hidden"
          >
            Acceso
          </Link>
        </div>
      </header>

      <section id="inicio" className="relative isolate overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1800&q=80"
          alt="Lotes agricolas vistos desde el aire al atardecer"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,42,34,0.9)_0%,rgba(4,42,34,0.66)_38%,rgba(4,42,34,0.18)_72%,rgba(4,42,34,0.04)_100%)]" />
        <div className="relative mx-auto flex min-h-[min(620px,calc(100svh-8rem))] max-w-7xl items-center px-5 py-14 lg:px-8">
          <div className="max-w-3xl text-white">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-sm font-semibold backdrop-blur">
              <FileCheck2 className="h-4 w-4" />
              Carpeta crediticia digital
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-extrabold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Financiacion agro sin viajes de 100 kilometros
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/92 sm:text-lg">
              AgroCredit IA conecta clientes, contadores y financistas para que la informacion
              productiva, contable y patrimonial viaje segura, ordenada y con permisos temporizados.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/registro"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#063c31] px-7 text-sm font-bold text-white shadow-lg shadow-black/20 transition hover:bg-[#0a4a3d]"
              >
                Comenzar ahora
              </Link>
              <Link
                href="/app"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/55 bg-white/12 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Ver demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="valor" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-normal text-[#10221c] sm:text-4xl">
            Nuestra propuesta de valor
          </h2>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-[#10221c]" />
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {valueCards.map((card) => {
            const Icon = card.icon
            return (
              <article
                key={card.title}
                className="flex min-h-72 flex-col rounded-lg border border-[#dde4dc] bg-white p-7 shadow-[0_12px_28px_rgba(16,34,28,0.06)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dcefe5] text-[#063c31]">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-7 text-2xl font-semibold tracking-normal text-[#10221c]">
                  {card.title}
                </h3>
                <p className="mt-4 text-sm leading-6 text-[#59675f]">{card.description}</p>
                <span className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-semibold text-[#063c31]">
                  Saber mas <ArrowRight className="h-4 w-4" />
                </span>
              </article>
            )
          })}
        </div>
      </section>

      <section id="flujo" className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#b56f2b]">
                Como circula la informacion
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-normal text-[#10221c] sm:text-4xl">
                Contador y cliente preparan la carpeta; el financista la recibe lista para evaluar.
              </h2>
              <p className="mt-5 text-base leading-7 text-[#59675f]">
                El circuito reemplaza mails sueltos, papeles impresos y viajes innecesarios por una
                entrega digital con permisos, vencimiento y trazabilidad.
              </p>
            </div>
            <div className="grid gap-4">
              {flowSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <article
                    key={step.title}
                    className="grid gap-4 rounded-lg border border-[#dde4dc] bg-[#f7f8f4] p-5 sm:grid-cols-[auto_1fr]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#063c31] shadow-sm">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#b56f2b]">
                        Paso {index + 1} - {step.label}
                      </p>
                      <h3 className="mt-1 text-xl font-semibold tracking-normal text-[#10221c]">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-[#59675f]">{step.description}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="roles" className="bg-[#f7f8f4] py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-normal text-[#10221c] sm:text-4xl">
              Como queres ingresar?
            </h2>
            <p className="mt-4 text-base leading-7 text-[#59675f]">
              Elegi tu perfil para entrar al circuito agrofinanciero con las herramientas que
              corresponden a tu rol.
            </p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {roleCards.map((card) => (
              <article
                key={card.title}
                className="overflow-hidden rounded-lg border border-[#dde4dc] bg-white shadow-[0_12px_28px_rgba(16,34,28,0.06)]"
              >
                <div className="relative h-48">
                  <img src={card.image} alt={card.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <p className="text-2xl font-bold tracking-normal">{card.title}</p>
                  </div>
                </div>
                <div className="flex min-h-56 flex-col p-6">
                  <p className="text-sm leading-6 text-[#59675f]">{card.description}</p>
                  <Link
                    href={card.href}
                    className={`mt-auto inline-flex h-11 items-center justify-center rounded-full border px-5 text-sm font-bold transition ${
                      card.tone === "amber"
                        ? "border-[#d7a06b] bg-[#d7a06b] text-white hover:bg-[#c88e56]"
                        : card.tone === "blue"
                          ? "border-[#2f5d74] bg-[#2f5d74] text-white hover:bg-[#274f63]"
                          : "border-[#063c31] bg-[#063c31] text-white hover:bg-[#0a4a3d]"
                    }`}
                  >
                    {card.button}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#174c3b] py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {stats.map((stat) => (
            <div key={stat.label} className="border-white/16 lg:border-l lg:pl-8 first:lg:border-l-0 first:lg:pl-0">
              <div className="text-4xl font-black tracking-normal sm:text-5xl">{stat.value}</div>
              <div className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-white/72">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-[#063c31] py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-2 text-2xl font-black tracking-normal">
              <Tractor className="h-5 w-5" />
              AgroCredit IA
            </Link>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/75">
              Soluciones financieras agiles y trazables para el ecosistema agroindustrial argentino.
            </p>
            <p className="mt-8 text-xs text-white/62">
              &copy; 2024 AgroCredit IA. Un producto de ingenieria argentina para el mundo agro.
            </p>
          </div>
          <div className="grid gap-3 text-sm font-medium text-white/75">
            <Link href="/login" className="transition hover:text-white">
              Acceso clientes
            </Link>
            <Link href="/registro" className="transition hover:text-white">
              Registro
            </Link>
            <span>Privacidad</span>
            <span>Contacto</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
