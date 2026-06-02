"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion, useInView, useMotionValue, useSpring, useScroll, useTransform } from "motion/react"

const EASE = [0.22, 0.61, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
}

const stagger = (delay = 0.1) => ({
  hidden: {},
  show:   { transition: { staggerChildren: delay } },
})

function AnimatedNumber({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const mv = useMotionValue(0)
  const spring = useSpring(mv, { stiffness: 80, damping: 22, mass: 0.8 })
  const [display, setDisplay] = useState("0")

  useEffect(() => {
    if (inView) mv.set(target)
  }, [inView, mv, target])

  useEffect(() =>
    spring.on("change", (v) => setDisplay(Math.round(v).toString())),
    [spring]
  )

  return <span ref={ref} className="tabular-nums">{prefix}{display}{suffix}</span>
}

export default function LandingPage() {
  const { scrollY } = useScroll()
  const headerBg = useTransform(scrollY, [0, 80], ["rgba(248,249,250,0)", "rgba(248,249,250,0.92)"])
  const headerShadow = useTransform(scrollY, [0, 80], ["0 0 0 0 transparent", "0 1px 0 0 #e7eaee"])

  return (
    <div style={{ background: "#F8F9FA", fontFamily: "'Inter',system-ui,sans-serif", color: "#212529" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes travel{0%{left:0;opacity:0}12%{opacity:1}88%{opacity:1}100%{left:calc(100% - 9px);opacity:0}}
        .dot-pulse{animation:pulse-dot 2.4s infinite;}
        .connector-pulse{position:absolute;top:50%;width:9px;height:9px;border-radius:50%;margin-top:-4.5px;animation:travel 2.6s cubic-bezier(.22,.61,.36,1) infinite;}
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <motion.header style={{ background: headerBg, boxShadow: headerShadow, backdropFilter: "blur(14px)" }}
        className="sticky top-0 z-50 border-b border-transparent">
        <div className="mx-auto flex h-[68px] max-w-[1180px] items-center justify-between px-7">
          <Link href="/" className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-tight text-[#212529]">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-white"
              style={{ background: "linear-gradient(135deg,#2D6A4F,#1D3557)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
                <path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>
              </svg>
            </span>
            Legajo
          </Link>
          <nav className="hidden items-center gap-[30px] md:flex">
            {[["Beneficios","#beneficios"],["Proceso","#proceso"],["Roles","#roles"],["Métricas","#metricas"]].map(([l, h]) => (
              <a key={l} href={h} className="text-[14.5px] font-medium text-[#5A6470] transition-colors hover:text-[#2D6A4F]">{l}</a>
            ))}
            <Link href="/registro"
              className="rounded-[11px] bg-[#2D6A4F] px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-[0_6px_16px_rgba(45,106,79,.28)] transition hover:-translate-y-0.5 hover:bg-[#1B4332]">
              Registrate gratis
            </Link>
          </nav>
        </div>
      </motion.header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="overflow-hidden py-[74px]"
        style={{ background: "radial-gradient(1100px 520px at 88% -10%,rgba(82,183,136,.16),transparent 60%),radial-gradient(900px 480px at -5% 30%,rgba(29,53,87,.10),transparent 55%),#F8F9FA" }}>
        <div className="mx-auto grid max-w-[1180px] grid-cols-1 items-center gap-14 px-7 lg:grid-cols-2">

          <motion.div variants={stagger(0.1)} initial="hidden" animate="show" className="flex flex-col">
            <motion.span variants={fadeUp}
              className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-[#BFE9D2] bg-[#EAF7F0] px-3.5 py-1.5 text-[12.5px] font-semibold text-[#2D6A4F]">
              <span className="dot-pulse h-2 w-2 rounded-full bg-[#52B788]"/>
              Acceso 100% gratuito · Agro & PyMEs
            </motion.span>

            <motion.h1 variants={fadeUp}
              className="mb-5 text-[clamp(38px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-0.035em]">
              De tu negocio al{" "}
              <span style={{ background: "linear-gradient(120deg,#2D6A4F,#52B788)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                crédito aprobado
              </span>
              , sin demoras
            </motion.h1>

            <motion.p variants={fadeUp} className="mb-8 max-w-[520px] text-[18.5px] text-[#5A6470]">
              Legajo digitaliza y centraliza toda la carpeta crediticia de{" "}
              <strong className="text-[#212529]">empresas y productores agropecuarios</strong>{" "}
              en tiempo real — conectando a quien produce, a quien contabiliza y a quien financia.
            </motion.p>

            {/* CTA principal */}
            <motion.div variants={fadeUp} className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-3.5">
                <Link href="/registro"
                  className="inline-flex items-center gap-2 rounded-[13px] bg-[#2D6A4F] px-6 py-[15px] text-[15.5px] font-semibold text-white shadow-[0_6px_16px_rgba(45,106,79,.28)] transition hover:-translate-y-0.5 hover:bg-[#1B4332]">
                  Registrate gratis
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
                </Link>
                <Link href="/login"
                  className="inline-flex items-center gap-2 rounded-[13px] border border-[#E7EAEE] bg-white px-6 py-[15px] text-[15.5px] font-semibold text-[#212529] shadow-sm transition hover:-translate-y-0.5 hover:border-[#52B788] hover:text-[#2D6A4F]">
                  Ya tengo cuenta
                </Link>
              </div>

              {/* 3 accesos directos por rol */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-medium text-[#8A93A0]">Ingresá como:</span>
                {[
                  { label: "Cliente / Productor", href: "/registro/usuario", color: "#2D6A4F", bg: "#EAF7F0", border: "#BFE9D2" },
                  { label: "Contador",             href: "/registro/contador", color: "#1D3557", bg: "#E2EAF3", border: "#C0CEDF" },
                  { label: "Entidad Financiera",   href: "/registro/entidad",  color: "#9a7d2e", bg: "#F6E8C3", border: "#ECDCAF" },
                ].map((r) => (
                  <Link key={r.href} href={r.href}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold transition hover:-translate-y-0.5"
                    style={{ background: r.bg, borderColor: r.border, color: r.color }}>
                    {r.label}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
                  </Link>
                ))}
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-5">
              {[
                { label: "Accesos auditados", d: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></> },
                { label: "Tiempo real",        d: <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/> },
                { label: "Permisos por rol",   d: <><path d="M7 11V7a5 5 0 0110 0v4"/><rect x="4" y="11" width="16" height="10" rx="2"/></> },
              ].map((t) => (
                <span key={t.label} className="flex items-center gap-2 text-[13.5px] font-medium text-[#5A6470]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px] shrink-0">{t.d}</svg>
                  {t.label}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Flow card */}
          <motion.div initial={{ opacity: 0, x: 48 }} animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="rounded-[20px] border border-[#E7EAEE] bg-white p-[30px] shadow-[0_18px_50px_rgba(20,40,65,.13),0_6px_16px_rgba(20,40,65,.06)]">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[.12em] text-[#8A93A0]">Flujo Legajo</span>
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2D6A4F]">
                <span className="dot-pulse h-[7px] w-[7px] rounded-full bg-[#52B788]"/>En vivo
              </span>
            </div>

            <div className="flex items-start justify-between">
              {[
                { name: "Productor\n/ PyME", desc: "Produce y necesita financiamiento", bg: "#EAF7F0", color: "#2D6A4F", border: "#BFE9D2",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]"><path d="M3 21h18"/><path d="M5 21V8l4-4 4 4"/><path d="M13 21V11h6v10"/><path d="M16 14h.01M16 17h.01M8 13h.01M8 17h.01"/></svg> },
                { name: "Contador", desc: "Ordena y carga la documentación", bg: "#EAF7F0", color: "#2D6A4F", border: "#BFE9D2",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg> },
                { name: "Banco", desc: "Recibe la carpeta y aprueba", bg: "#F6E8C3", color: "#9a7d2e", border: "#ECDCAF",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[30px] h-[30px]"><path d="M3 21h18"/><path d="M4 10h16"/><path d="M4 10L12 4l8 6"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/></svg> },
              ].map((node, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2.5 text-center">
                  <motion.div className="flex h-[62px] w-[62px] items-center justify-center rounded-2xl border"
                    style={{ background: node.bg, color: node.color, borderColor: node.border }}
                    whileHover={{ y: -4, scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                    {node.icon}
                  </motion.div>
                  <span className="text-[12px] font-bold uppercase leading-tight tracking-[.08em] text-[#212529] whitespace-pre-line">{node.name}</span>
                  <span className="max-w-[100px] text-[11px] leading-[1.35] text-[#8A93A0]">{node.desc}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-4">
              {[0,1].map((i) => (
                <div key={i} className="relative h-0.5 flex-1" style={{ background: "#E7EAEE" }}>
                  <div className="connector-pulse"
                    style={{ background: i === 0 ? "#52B788" : "#3A6491", boxShadow: i === 0 ? "0 0 0 4px rgba(82,183,136,.2)" : "0 0 0 4px rgba(58,100,145,.2)", animationDelay: i === 0 ? "0s" : "1.3s" }}/>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-dashed border-[#E7EAEE] pt-4">
              <span className="text-[12.5px] text-[#5A6470]">Carpeta sincronizada entre los tres actores</span>
              <span className="rounded-full bg-[#EAF7F0] px-3 py-1 text-[11px] font-bold tracking-[.04em] text-[#2D6A4F]">— 70% tiempo</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── COMPARACIÓN ─────────────────────────────────────────────────── */}
      <section id="beneficios" className="bg-white py-[88px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mb-12 text-center">
            <motion.span variants={fadeUp} className="mb-3.5 inline-block text-[12px] font-bold uppercase tracking-[.12em] text-[#2D6A4F]">El cambio</motion.span>
            <motion.h2 variants={fadeUp} className="text-[clamp(28px,3.6vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em]">Simplificá el acceso al financiamiento</motion.h2>
            <motion.p variants={fadeUp} className="mt-3.5 text-[17px] text-[#5A6470]">De carpetas en papel dispersas a una carpeta crediticia digital, ordenada y trazable.</motion.p>
          </motion.div>

          <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-[1fr_84px_1fr]">
            <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE }} viewport={{ once: true }}
              className="rounded-[20px] border border-[#f3cdd1] p-8" style={{ background: "linear-gradient(160deg,#fcecee,#fbe4e6)" }}>
              <h3 className="mb-5 flex items-center gap-2.5 text-[18px] font-bold text-[#B23A48]">
                <span className="rounded-[6px] bg-[#f6d2d6] px-2 py-1 text-[10.5px] font-bold uppercase tracking-[.08em]">Antes</span>
                Sin Legajo
              </h3>
              <div className="flex flex-col gap-4">
                {["Documentación en papel y dispersa entre oficinas y correos.","Comunicación por WhatsApp y email, sin trazabilidad.","Semanas de espera para reunir la información completa.","Créditos rechazados por documentación incompleta."].map((t) => (
                  <div key={t} className="flex items-start gap-3 text-[14.5px] leading-[1.4] text-[#7d2f3a]">
                    <span className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#f8d7db] text-[#B23A48]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
                    </span>{t}
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2, ease: EASE }} viewport={{ once: true }}
              className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#E7EAEE] bg-white text-[#2D6A4F] shadow-[0_18px_50px_rgba(20,40,65,.13)]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7 animate-spin" style={{ animationDuration: "7s" }}>
                  <path d="M21 12a9 9 0 01-9 9M3 12a9 9 0 019-9"/><path d="M21 12l-3-3M21 12l-3 3M3 12l3-3M3 12l3 3"/>
                </svg>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE }} viewport={{ once: true }}
              className="rounded-[20px] border border-[#bfe9d2] p-8" style={{ background: "linear-gradient(160deg,#e7f7ee,#d8f3e6)" }}>
              <h3 className="mb-5 flex items-center gap-2.5 text-[18px] font-bold text-[#1B4332]">
                <span className="rounded-[6px] bg-[#c2ead4] px-2 py-1 text-[10.5px] font-bold uppercase tracking-[.08em]">Ahora</span>
                Con Legajo
              </h3>
              <div className="flex flex-col gap-4">
                {["Carpeta digital centralizada y ordenada en la nube.","Acceso controlado y trazable por rol, con historial.","Información disponible en tiempo real para todos.","Proceso de crédito ágil, transparente y auditable."].map((t) => (
                  <div key={t} className="flex items-start gap-3 text-[14.5px] leading-[1.4] text-[#1f5240]">
                    <span className="mt-0.5 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#c8ecd8] text-[#2D6A4F]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>
                    </span>{t}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ───────────────────────────────────────────────── */}
      <section id="proceso" className="py-[88px]" style={{ background: "linear-gradient(180deg,#F8F9FA,#eef1f4)" }}>
        <div className="mx-auto max-w-[1180px] px-7">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mb-12 text-center">
            <motion.span variants={fadeUp} className="mb-3.5 inline-block text-[12px] font-bold uppercase tracking-[.12em] text-[#2D6A4F]">Proceso</motion.span>
            <motion.h2 variants={fadeUp} className="text-[clamp(28px,3.6vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em]">Cómo funciona, en 4 pasos</motion.h2>
            <motion.p variants={fadeUp} className="mt-3.5 text-[17px] text-[#5A6470]">El mismo flujo simple para un productor agropecuario o una PyME que busca capital de trabajo.</motion.p>
          </motion.div>

          <motion.div variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
            className="relative grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-[11%] right-[11%] top-[46px] hidden h-0.5 lg:block" style={{ background: "linear-gradient(90deg,#D8F3E6,#E2EAF3,#F6E8C3)" }}/>
            {[
              { num: "1", numBg: "#2D6A4F", sBg: "#EAF7F0", sC: "#2D6A4F", title: "El contador habilitado carga los datos", desc: "Solo estudios contables verificados por la plataforma pueden cargar información. Balances, EECC y documentos desde un panel multi-cliente.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M14 3v4a1 1 0 001 1h4"/><path d="M5 3h9l5 5v11a1 1 0 01-1 1H6a1 1 0 01-1-1z"/><path d="M12 17v-5M9.5 14.5L12 12l2.5 2.5"/></svg> },
              { num: "2", numBg: "#52B788", sBg: "#EAF7F0", sC: "#2D6A4F", title: "El cliente autoriza el acceso", desc: "El productor o la PyME decide quién ve su información y por cuánto tiempo.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M7 10V7a5 5 0 019.6-2"/><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M12 14v3"/></svg> },
              { num: "3", numBg: "#1D3557", sBg: "#E2EAF3", sC: "#1D3557", title: "El banco recibe la carpeta", desc: "Completa, actualizada y auditada — lista para evaluar sin idas y vueltas.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M21 12a9 9 0 00-9-9 9 9 0 00-6.7 3"/><path d="M3 12a9 9 0 009 9 9 9 0 006.7-3"/><path d="M21 3v5h-5M3 21v-5h5"/></svg> },
              { num: "4", numBg: "#c79a2e", sBg: "#F6E8C3", sC: "#9a7d2e", title: "Crédito aprobado más rápido", desc: "Menos fricción, menos riesgo y una decisión de financiamiento en menos tiempo.", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-6.2-8.56"/></svg> },
            ].map((s) => (
              <motion.div key={s.num} variants={fadeUp}
                className="relative z-10 rounded-[20px] border border-[#E7EAEE] bg-white p-6 shadow-sm"
                whileHover={{ y: -6, boxShadow: "0 12px 32px rgba(20,40,65,.1)" }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                <span className="absolute -top-[15px] left-5 flex h-[30px] w-[30px] items-center justify-center rounded-[9px] text-[14px] font-extrabold text-white" style={{ background: s.numBg, boxShadow: "0 4px 10px rgba(0,0,0,.2)" }}>{s.num}</span>
                <div className="mt-3.5 mb-4 flex h-[54px] w-[54px] items-center justify-center rounded-[14px]" style={{ background: s.sBg, color: s.sC }}>{s.icon}</div>
                <h4 className="mb-1.5 text-[16px] font-bold tracking-[-0.01em]">{s.title}</h4>
                <p className="text-[13.5px] leading-[1.45] text-[#5A6470]">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── ROLES ───────────────────────────────────────────────────────── */}
      <section id="roles" className="bg-white py-[88px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mb-12 text-center">
            <motion.span variants={fadeUp} className="mb-3.5 inline-block text-[12px] font-bold uppercase tracking-[.12em] text-[#2D6A4F]">Los 3 actores</motion.span>
            <motion.h2 variants={fadeUp} className="text-[clamp(28px,3.6vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em]">Una plataforma, tres roles conectados</motion.h2>
            <motion.p variants={fadeUp} className="mt-3.5 text-[17px] text-[#5A6470]">Cada actor entra con su propia vista y permisos — sin mezclar información ni perder el control.</motion.p>
          </motion.div>

          <motion.div variants={stagger(0.14)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { accent: "#2D6A4F", iBg: "#EAF7F0", iC: "#2D6A4F", chk: "#52B788", btnBg: "#2D6A4F", btnHover: "#1B4332", btnLabel: "Registrate gratis", rol: "Quien produce", name: "Cliente / Productor", href: "/registro/usuario",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[27px] h-[27px]"><path d="M3 21h18"/><path d="M5 21V8l4-4 4 4"/><path d="M13 21V11h6v10"/><path d="M16 14h.01M16 17h.01M8 13h.01M8 17h.01"/></svg>,
                items: ["Autoriza quién ve su información y revoca cuando quiere.","Trazabilidad total de cada acceso a su carpeta.","Sin papeles ni viajes innecesarios al banco.","Acceso totalmente gratuito, sin costos ocultos."] },
              { accent: "#1D3557", iBg: "#E2EAF3", iC: "#1D3557", chk: "#3A6491", btnBg: "#1D3557", btnHover: "#142841", btnLabel: "Solicitar habilitación", rol: "Estudio contable · Requiere habilitación", name: "Contador", href: "/registro/contador",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[27px] h-[27px]"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><rect x="8" y="11" width="3" height="3"/><rect x="13" y="11" width="3" height="3"/><rect x="8" y="16" width="3" height="2"/><rect x="13" y="16" width="3" height="2"/></svg>,
                items: ["Únicos autorizados para cargar información contable de clientes.","La plataforma verifica y habilita al estudio antes de que pueda operar.","Multi-cliente sin mezclar información entre empresas.","Validación con checklist inteligente antes de enviar."] },
              { accent: "#c79a2e", iBg: "#F6E8C3", iC: "#9a7d2e", chk: "#c79a2e", btnBg: "#c79a2e", btnHover: "#a8841e", btnLabel: "Registrate gratis", rol: "Banco / Financiera / Empresa", name: "Entidad Financiera", href: "/registro/entidad",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-[27px] h-[27px]"><path d="M3 21h18"/><path d="M4 10h16"/><path d="M4 10L12 4l8 6"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/></svg>,
                items: ["Solo accedés a la información que el cliente autorizó explícitamente.","El acceso tiene fecha de vencimiento — cuando vence, se corta automáticamente.","El cliente elige qué tipos de datos podés ver: balance, resultados, impuestos, bienes.","Menor riesgo y mayor velocidad de aprobación."] },
            ].map((r) => (
              <motion.div key={r.name} variants={fadeUp}
                className="flex flex-col overflow-hidden rounded-[20px] border border-[#E7EAEE] bg-white shadow-sm"
                whileHover={{ y: -6, boxShadow: "0 18px 50px rgba(20,40,65,.13),0 6px 16px rgba(20,40,65,.06)" }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <div className="h-1.5" style={{ background: r.accent }}/>
                <div className="flex flex-1 flex-col gap-5 p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[13px]" style={{ background: r.iBg, color: r.iC }}>{r.icon}</span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[.08em] text-[#8A93A0]">{r.rol}</p>
                      <p className="text-[18px] font-extrabold tracking-[-0.02em]">{r.name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {r.items.map((b) => (
                      <div key={b} className="flex items-start gap-2.5 text-[14px] leading-[1.4] text-[#5A6470]">
                        <svg viewBox="0 0 24 24" fill="none" stroke={r.chk} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px] shrink-0 mt-0.5"><path d="M5 12l4 4 10-10"/></svg>
                        {b}
                      </div>
                    ))}
                  </div>
                </div>
                {/* CTA por rol */}
                <div className="border-t border-[#E7EAEE] px-7 py-5">
                  <Link href={r.href}
                    className="flex w-full items-center justify-center gap-2 rounded-[11px] py-3 text-[14.5px] font-semibold text-white transition hover:opacity-90"
                    style={{ background: r.btnBg }}>
                    {r.btnLabel}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
                  </Link>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── MÉTRICAS ────────────────────────────────────────────────────── */}
      <section id="metricas" className="py-[88px]" style={{ background: "linear-gradient(180deg,#F8F9FA,#eef1f4)" }}>
        <div className="mx-auto max-w-[1180px] px-7">
          <motion.div variants={stagger(0.08)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mb-12 text-center">
            <motion.span variants={fadeUp} className="mb-3.5 inline-block text-[12px] font-bold uppercase tracking-[.12em] text-[#2D6A4F]">Impacto</motion.span>
            <motion.h2 variants={fadeUp} className="text-[clamp(28px,3.6vw,38px)] font-extrabold leading-[1.1] tracking-[-0.03em]">Resultados que mueven la aguja</motion.h2>
            <motion.p variants={fadeUp} className="mt-3.5 text-[17px] text-[#5A6470]">Datos de referencia del flujo digitalizado de carpeta crediticia, para agro y PyMEs.</motion.p>
          </motion.div>

          <motion.div variants={stagger(0.12)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: -70, pre: "-", suf: "%",  label: "Tiempo en reunir la documentación",    iBg: "#EAF7F0", iC: "#2D6A4F", vC: "#2D6A4F", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg> },
              { t: 3,   pre: "",  suf: "",   label: "Roles conectados en una sola plataforma", iBg: "#E2EAF3", iC: "#1D3557", vC: "#1D3557", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0"/><circle cx="17" cy="9" r="2.4"/><path d="M15 20a5 5 0 016-4.6"/></svg> },
              { t: 100, pre: "",  suf: "%",  label: "Trazabilidad de accesos y autorizaciones", iBg: "#EAF7F0", iC: "#2D6A4F", vC: "#2D6A4F", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg> },
              { t: 40,  pre: "+", suf: "%",  label: "Velocidad en la aprobación de créditos",  iBg: "#F6E8C3", iC: "#9a7d2e", vC: "#b88a1e", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M3 17l6-6 4 4 7-8"/><path d="M14 7h7v7"/></svg> },
            ].map((k) => (
              <motion.div key={k.label} variants={fadeUp}
                className="rounded-[20px] border border-[#E7EAEE] bg-white p-7 text-center shadow-sm"
                whileHover={{ y: -5, boxShadow: "0 12px 32px rgba(20,40,65,.08)" }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}>
                <div className="mx-auto mb-4 flex h-[46px] w-[46px] items-center justify-center rounded-[12px]" style={{ background: k.iBg, color: k.iC }}>{k.icon}</div>
                <div className="text-[clamp(34px,4.4vw,46px)] font-black leading-none tracking-[-0.04em]" style={{ color: k.vC }}>
                  <AnimatedNumber target={k.t} prefix={k.pre} suffix={k.suf}/>
                </div>
                <p className="mt-2.5 text-[13.5px] leading-[1.4] text-[#5A6470]">{k.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────── */}
      <section id="registro" className="py-[88px]">
        <div className="mx-auto max-w-[1180px] px-7">
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} whileInView={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }} viewport={{ once: true, margin: "-80px" }}
            className="overflow-hidden rounded-[28px] p-14 shadow-[0_18px_50px_rgba(20,40,65,.2)]"
            style={{ background: "radial-gradient(700px 360px at 85% 10%,rgba(82,183,136,.28),transparent 60%),radial-gradient(600px 300px at 10% 90%,rgba(233,196,106,.16),transparent 60%),linear-gradient(135deg,#1B4332,#142841)" }}>

            {/* Titular */}
            <div className="mb-10 text-center text-white">
              <h2 className="text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.08] tracking-[-0.03em]">
                Tu carpeta crediticia, lista cuando el banco la necesita
              </h2>
              <p className="mt-4 text-[16.5px] text-white/80">
                Gratis para todos los roles. Sin tarjeta de crédito. Sin contrato.
              </p>
            </div>

            {/* 3 cards de registro por rol */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { rol: "Cliente / Productor", desc: "Autorizo accesos y llevo mi carpeta.", href: "/registro/usuario",
                  bg: "rgba(45,106,79,.55)", border: "rgba(82,183,136,.35)", iconColor: "#52B788",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M3 21h18"/><path d="M5 21V8l4-4 4 4"/><path d="M13 21V11h6v10"/></svg> },
                { rol: "Contador", desc: "Cargo carpetas de mis clientes. Requiere verificación de la plataforma.", href: "/registro/contador",
                  bg: "rgba(29,53,87,.55)", border: "rgba(58,100,145,.40)", iconColor: "#7EAAD4",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></svg> },
                { rol: "Entidad Financiera", desc: "Accedo a carpetas con permiso acotado en tiempo e información.", href: "/registro/entidad",
                  bg: "rgba(150,120,40,.45)", border: "rgba(233,196,106,.35)", iconColor: "#E9C46A",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7"><path d="M3 21h18"/><path d="M4 10h16"/><path d="M4 10L12 4l8 6"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/></svg> },
              ].map((r) => (
                <motion.div key={r.rol}
                  whileHover={{ y: -5, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 360, damping: 22 }}
                  className="flex flex-col gap-4 rounded-[18px] border p-6"
                  style={{ background: r.bg, borderColor: r.border, backdropFilter: "blur(6px)" }}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-[12px] border border-white/20 bg-white/12" style={{ color: r.iconColor }}>
                      {r.icon}
                    </span>
                    <div>
                      <p className="text-[15px] font-extrabold text-white">{r.rol}</p>
                      <p className="text-[12.5px] text-white/70">{r.desc}</p>
                    </div>
                  </div>
                  <Link href={r.href}
                    className="flex items-center justify-center gap-2 rounded-[10px] bg-white/18 border border-white/25 py-2.5 text-[14px] font-semibold text-white transition hover:bg-white/28">
                    Registrate gratis
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
                  </Link>
                </motion.div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-[14px] font-medium text-white/60 transition hover:text-white/90 underline-offset-2 hover:underline">
                Ya tengo cuenta — Ingresar
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-[#E7EAEE] bg-white py-10">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-7">
          <Link href="/" className="flex items-center gap-2.5 text-[16px] font-extrabold tracking-tight text-[#212529]">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] text-white" style={{ background: "linear-gradient(135deg,#2D6A4F,#1D3557)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]"><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>
            </span>
            Legajo
          </Link>
          <div className="flex flex-wrap gap-6">
            {["Privacidad","Términos","Contacto","LinkedIn"].map((l) => (
              <a key={l} href="#" className="text-[13.5px] text-[#5A6470] transition-colors hover:text-[#2D6A4F]">{l}</a>
            ))}
          </div>
          <p className="text-[13px] text-[#8A93A0]">© 2024 Legajo. Tecnología para el agro.</p>
        </div>
      </footer>
    </div>
  )
}
