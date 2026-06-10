"use client"

import Link from "next/link"
import { motion } from "motion/react"
import {
  ArrowRight,
  Banknote,
  Calculator,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  ShieldCheck,
  Sprout,
} from "lucide-react"

const EASE = [0.22, 0.61, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

const stagger = (delay = 0.1) => ({
  hidden: {},
  show: { transition: { staggerChildren: delay } },
})

const roleOptions = [
  {
    href: "/registro/usuario",
    eyebrow: "Quien produce",
    title: "Productor / Cliente",
    description: "Solicita financiamiento, autoriza accesos y sigue el estado de cada pedido.",
    cta: "Crear cuenta",
    accent: "#6d28d9",
    soft: "#f0ebff",
    border: "#ddd6fe",
    icon: Sprout,
    items: ["Carpeta crediticia propia", "Permisos trazables", "Acceso gratuito"],
  },
  {
    href: "/registro/contador",
    eyebrow: "Estudio contable",
    title: "Contador",
    description: "Administra clientes, ordena documentacion y envia informacion validada.",
    cta: "Registrar estudio",
    accent: "#312e81",
    soft: "#eef2ff",
    border: "#c7d2fe",
    icon: Calculator,
    items: ["Panel multi-cliente", "Carga contable", "Checklists por carpeta"],
  },
  {
    href: "/registro/entidad",
    eyebrow: "Banco / Empresa agro",
    title: "Financista",
    description: "Pide acceso a carpetas, evalua indicadores y gestiona credito con permisos.",
    cta: "Registrar entidad",
    accent: "#9333ea",
    soft: "#f3e8ff",
    border: "#e9d5ff",
    icon: Banknote,
    items: ["Scoring documental", "Acceso por scope", "Decision mas rapida"],
  },
]

export default function RegistroPage() {
  return (
    <main
      className="min-h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(980px 520px at 88% -8%,rgba(139,92,246,.16),transparent 60%),radial-gradient(850px 480px at -5% 28%,rgba(91,33,182,.10),transparent 58%),#faf8ff",
        color: "#212529",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes travel{0%{left:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:calc(100% - 9px);opacity:0}}
        .dot-pulse{animation:pulse-dot 2.4s infinite;}
        .connector-pulse{position:absolute;top:50%;width:9px;height:9px;border-radius:50%;margin-top:-4.5px;animation:travel 2.6s cubic-bezier(.22,.61,.36,1) infinite;}
      `}</style>

      <header className="sticky top-0 z-40 border-b border-[#ede9fe] bg-[#faf8ff]/90 backdrop-blur-[14px]">
        <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-7">
          <Link href="/" className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-tight text-[#212529]">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white"
              style={{ background: "linear-gradient(135deg,#6d28d9,#312e81)" }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
              >
                <path d="M3 12l9-9 9 9" />
                <path d="M5 10v10h14V10" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </span>
            Legajo
          </Link>

          <nav className="hidden items-center gap-[30px] md:flex">
            <Link href="/#beneficios" className="text-[14.5px] font-medium text-[#5A6470] transition-colors hover:text-[#6d28d9]">
              Beneficios
            </Link>
            <Link href="/#proceso" className="text-[14.5px] font-medium text-[#5A6470] transition-colors hover:text-[#6d28d9]">
              Proceso
            </Link>
            <Link href="/login" className="text-[14.5px] font-semibold text-[#6d28d9] transition-colors hover:text-[#4c1d95]">
              Ingresar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-12 px-7 py-[72px] lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div variants={stagger(0.1)} initial="hidden" animate="show" className="flex flex-col">
          <motion.div variants={fadeUp}>
            <Link
              href="/"
              className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#ddd6fe] bg-[#f0ebff] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#6d28d9] transition hover:border-[#a78bfa]"
            >
              <span className="dot-pulse h-2 w-2 rounded-full bg-[#a78bfa]" />
              Volver al inicio
            </Link>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mb-5 text-[clamp(38px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.035em]"
          >
            Elegi tu rol y entra al{" "}
            <span
              style={{
                background: "linear-gradient(120deg,#6d28d9,#a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              flujo crediticio digital
            </span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mb-8 max-w-[540px] text-[18.5px] leading-[1.55] text-[#5A6470]">
            Legajo conecta clientes, contadores y financistas sobre una carpeta ordenada,
            auditable y lista para acelerar decisiones de credito.
          </motion.p>

          <motion.div variants={fadeUp} className="grid max-w-[560px] grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, label: "Accesos auditados", tone: "#6d28d9", bg: "#f0ebff" },
              { icon: FileCheck2, label: "Carpetas validadas", tone: "#312e81", bg: "#eef2ff" },
              { icon: LockKeyhole, label: "Permisos por rol", tone: "#7e22ce", bg: "#f3e8ff" },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="rounded-[18px] border border-[#ede9fe] bg-white px-4 py-4 shadow-sm">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: item.bg, color: item.tone }}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-[13.5px] font-bold leading-[1.25] text-[#212529]">{item.label}</p>
                </div>
              )
            })}
          </motion.div>
        </motion.div>

        <motion.div variants={stagger(0.12)} initial="hidden" animate="show" className="grid gap-5">
          {roleOptions.map((option) => {
            const Icon = option.icon
            return (
              <motion.article
                key={option.href}
                variants={fadeUp}
                whileHover={{ y: -5, boxShadow: "0 18px 50px rgba(91,33,182,.1),0 6px 16px rgba(91,33,182,.06)" }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="overflow-hidden rounded-[22px] border border-[#ede9fe] bg-white shadow-sm"
              >
                <Link href={option.href} className="grid gap-0 sm:grid-cols-[9px_1fr]">
                  <span className="hidden sm:block" style={{ background: option.accent }} />
                  <div className="p-6 sm:p-7">
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div
                          className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[16px] border"
                          style={{ background: option.soft, color: option.accent, borderColor: option.border }}
                        >
                          <Icon className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#8A93A0]">{option.eyebrow}</p>
                          <h2 className="mt-1 text-[24px] font-extrabold leading-[1.05] tracking-[-0.025em] text-[#212529]">
                            {option.title}
                          </h2>
                          <p className="mt-2 max-w-[520px] text-[14.5px] leading-[1.45] text-[#5A6470]">{option.description}</p>
                        </div>
                      </div>

                      <span
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[13px] px-5 text-[14px] font-bold text-white shadow-[0_6px_16px_rgba(91,33,182,.2)]"
                        style={{ background: option.accent }}
                      >
                        {option.cta}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>

                    <div className="mt-5 grid gap-2 sm:grid-cols-3">
                      {option.items.map((item) => (
                        <div key={item} className="flex items-center gap-2 rounded-[12px] border border-[#ede9fe] bg-[#faf8ff] px-3 py-2 text-[12.5px] font-semibold text-[#5A6470]">
                          <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: option.accent }} />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.article>
            )
          })}
        </motion.div>
      </section>

      <section className="border-t border-[#ede9fe] bg-white py-10">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-7 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[.12em] text-[#6d28d9]">Flujo conectado</p>
            <p className="mt-2 text-[16px] font-semibold text-[#212529]">Cliente, contador y financista trabajan sobre la misma carpeta.</p>
          </div>

          <div className="relative flex items-center gap-4">
            {["Cliente", "Contador", "Financista"].map((label, index) => (
              <div key={label} className="relative flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-[#ede9fe] bg-[#faf8ff] text-[12px] font-extrabold text-[#212529]">
                  {index + 1}
                </div>
                {index < 2 ? (
                  <div className="relative h-0.5 w-12 bg-[#ede9fe]">
                    <span
                      className="connector-pulse"
                      style={{
                        background: index === 0 ? "#a78bfa" : "#4f46e5",
                        boxShadow: index === 0 ? "0 0 0 4px rgba(167,139,250,.2)" : "0 0 0 4px rgba(99,102,241,.2)",
                        animationDelay: index === 0 ? "0s" : "1.3s",
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <p className="text-[14px] leading-[1.55] text-[#5A6470] lg:text-right">
            Si ya tenes cuenta, podes entrar directo con tu usuario y continuar desde tu panel.
            <Link href="/login" className="ml-1 font-bold text-[#6d28d9] hover:text-[#4c1d95]">
              Iniciar sesion
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}
