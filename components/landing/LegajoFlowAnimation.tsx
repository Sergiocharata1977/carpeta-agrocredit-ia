"use client"

import { motion, useInView } from "motion/react"
import { useRef } from "react"

/* ── paleta ──────────────────────────────────────────────────────────── */
const C = {
  prod:    "#6d28d9",
  prodMid: "#7c3aed",
  prodSoft:"#f0ebff",
  cont:    "#312e81",
  contMid: "#4338ca",
  contSoft:"#eef2ff",
  fin:     "#7e22ce",
  finMid:  "#9333ea",
  finSoft: "#f3e8ff",
  hub:     "#5b21b6",
  hubSoft: "#ede9fe",
  border:  "#ddd6fe",
  text:    "#1e1b4b",
  muted:   "#6b7280",
}

/* ── bezier keyframes para motion ──────────────────────────────────── */
function bez(
  p0x:number, p0y:number, p1x:number, p1y:number,
  p2x:number, p2y:number, p3x:number, p3y:number,
  steps = 24, rev = false
) {
  const xs:number[] = [], ys:number[] = [], ops:number[] = [], ts:number[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, m = 1 - t
    xs.push(m**3*p0x + 3*m**2*t*p1x + 3*m*t**2*p2x + t**3*p3x)
    ys.push(m**3*p0y + 3*m**2*t*p1y + 3*m*t**2*p2y + t**3*p3y)
    ts.push(t)
    ops.push(t < 0.1 ? t/0.1 : t > 0.88 ? (1-t)/0.12 : 1)
  }
  if (rev) { xs.reverse(); ys.reverse(); ops.reverse() }
  return { xs, ys, ops, ts }
}

type BF = ReturnType<typeof bez>

/* paths: prod(238,180)→hub(470,295), cont(762,180)→hub(530,295), hub(500,348)→fin(500,482) */
const FP  = bez(238,180, 310,220, 400,270, 470,295)
const FPR = bez(238,180, 310,220, 400,270, 470,295, 24, true)
const FC  = bez(762,180, 690,220, 600,270, 530,295)
const FCR = bez(762,180, 690,220, 600,270, 530,295, 24, true)
const FF  = bez(500,348, 500,390, 500,440, 500,482)
const FFR = bez(500,348, 500,390, 500,440, 500,482, 24, true)

/* ── partícula animada ───────────────────────────────────────────────── */
function Particle({ f, color, delay, dur, shape }:{
  f: BF; color: string; delay: number; dur: number; shape: "doc"|"folder"|"coin"
}) {
  return (
    <motion.g
      initial={{ x: f.xs[0], y: f.ys[0], opacity: 0 }}
      animate={{ x: f.xs, y: f.ys, opacity: f.ops }}
      transition={{
        x:       { duration: dur, repeat: Infinity, delay, ease: "linear", times: f.ts },
        y:       { duration: dur, repeat: Infinity, delay, ease: "linear", times: f.ts },
        opacity: { duration: dur, repeat: Infinity, delay, ease: "linear", times: f.ts },
      }}
    >
      {shape === "doc" && (
        <g transform="translate(-9,-11)">
          <rect x={0} y={0} width={18} height={22} rx={3} fill="#fff" stroke={color} strokeWidth={1.8}/>
          <path d="M5 0v5h7" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"/>
          <rect x={3} y={8}  width={12} height={1.8} rx={0.9} fill={color} opacity={0.7}/>
          <rect x={3} y={12} width={9}  height={1.8} rx={0.9} fill={color} opacity={0.5}/>
          <rect x={3} y={16} width={10} height={1.8} rx={0.9} fill={color} opacity={0.35}/>
        </g>
      )}
      {shape === "folder" && (
        <g transform="translate(-12,-9)">
          <rect x={0} y={5} width={24} height={14} rx={3} fill={color}/>
          <path d="M0 8a3 3 0 013-3h5l3 3h13v.5H0z" fill={color} opacity={0.65}/>
          <rect x={3} y={10} width={18} height={1.8} rx={0.9} fill="#fff" opacity={0.85}/>
          <rect x={3} y={13.5} width={12} height={1.8} rx={0.9} fill="#fff" opacity={0.55}/>
        </g>
      )}
      {shape === "coin" && (
        <g transform="translate(-8,-8)">
          <circle cx={8} cy={8} r={8} fill={color} opacity={0.9}/>
          <text x={8} y={12} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700} fontFamily="system-ui">$</text>
        </g>
      )}
    </motion.g>
  )
}

/* ── nodo actor con plataforma ───────────────────────────────────────── */
function ActorNode({ x, y, color, soft, label, sub, icon, delay, platformColor }:{
  x:number; y:number; color:string; soft:string; label:string; sub:string
  icon:React.ReactNode; delay:number; platformColor:string
}) {
  return (
    <motion.g transform={`translate(${x},${y})`}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: [0.22,0.61,0.36,1] }}>

      {/* sombra de plataforma */}
      <ellipse cx={0} cy={76} rx={64} ry={10} fill={color} opacity={0.18}/>
      {/* plataforma circular */}
      <ellipse cx={0} cy={66} rx={62} ry={14} fill={platformColor}/>
      <ellipse cx={0} cy={62} rx={62} ry={14} fill={platformColor} opacity={0.7}/>

      {/* halo pulsante */}
      <motion.circle r={52} fill={color} opacity={0.07}
        animate={{ r:[52,66,52], opacity:[0.07,0.15,0.07] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: delay * 0.5 }}/>

      {/* círculo principal */}
      <circle r={46} fill={soft} stroke={color} strokeWidth={2.5}/>
      <circle r={36} fill={soft} stroke={color} strokeWidth={1} opacity={0.35}/>

      {/* ícono */}
      <g fill={color}>{icon}</g>

      {/* badge etiqueta */}
      <rect x={-62} y={52} width={124} height={30} rx={15} fill={color}/>
      <rect x={-62} y={52} width={124} height={30} rx={15} fill="url(#actorGrad)" opacity={0.4}/>
      <text x={0} y={73} textAnchor="middle" fill="#fff" fontSize={12.5} fontWeight={700}
        fontFamily="system-ui,sans-serif">{label}</text>

      {/* subtítulo */}
      <text x={0} y={100} textAnchor="middle" fill={C.muted} fontSize={10.5}
        fontFamily="system-ui,sans-serif">{sub}</text>
    </motion.g>
  )
}

/* ── línea de conexión ─────────────────────────────────────────────── */
function ConnLine({ d, color, delay, label, lx, ly }:{
  d:string; color:string; delay:number; label:string; lx:number; ly:number
}) {
  return (
    <>
      <motion.path d={d} fill="none" stroke={color} strokeWidth={1.8}
        strokeDasharray="5 9" strokeLinecap="round" opacity={0}
        animate={{ opacity: 0.4 }} transition={{ duration: 0.6, delay }}/>
      <motion.text x={lx} y={ly} textAnchor="middle" fontSize={10} fill={C.muted}
        fontFamily="system-ui,sans-serif"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: delay + 0.3 }}>
        {label}
      </motion.text>
    </>
  )
}

/* ── chip de tipo doc ─────────────────────────────────────────────── */
function TypeChip({ x, y, label, color, icon, delay }:{
  x:number; y:number; label:string; color:string; icon:React.ReactNode; delay:number
}) {
  return (
    <motion.g transform={`translate(${x},${y})`}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}>
      <rect x={-44} y={-16} width={88} height={32} rx={16}
        fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1.2} strokeOpacity={0.4}/>
      <g transform="translate(-30,0)" fill={color} opacity={0.8}>{icon}</g>
      <text x={6} y={0} textAnchor="middle" fill={color} fontSize={10} fontWeight={600}
        fontFamily="system-ui,sans-serif" dominantBaseline="middle">{label}</text>
    </motion.g>
  )
}

/* ── fila panel izquierdo ──────────────────────────────────────────── */
function LRow({ y, icon, text, color, delay }:{y:number; icon:React.ReactNode; text:string; color:string; delay:number}) {
  return (
    <motion.g transform={`translate(18,${y})`}
      initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }}
      transition={{ duration: 0.4, delay }}>
      <rect x={-4} y={-14} width={28} height={28} rx={8} fill={color} opacity={0.12}/>
      <g fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{icon}</g>
      <text x={32} y={1} fill={C.text} fontSize={11} fontFamily="system-ui,sans-serif"
        dominantBaseline="middle">{text}</text>
    </motion.g>
  )
}

/* ── fila panel derecho ────────────────────────────────────────────── */
function RRow({ y, text, color, delay }:{y:number; text:string; color:string; delay:number}) {
  return (
    <motion.g transform={`translate(18,${y})`}
      initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
      transition={{ duration: 0.4, delay }}>
      <circle r={10} fill={color} opacity={0.13}/>
      <path d="M-5 0l3.5 3.5 6.5-7" fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"/>
      <text x={17} y={1} fill={C.text} fontSize={11} fontFamily="system-ui,sans-serif"
        dominantBaseline="middle">{text}</text>
    </motion.g>
  )
}

/* ── componente principal ─────────────────────────────────────────── */
export default function LegajoFlowAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  const D_PROD = "M238,180 C310,220 400,270 470,295"
  const D_CONT = "M762,180 C690,220 600,270 530,295"
  const D_FIN  = "M500,348 C500,390 500,440 500,482"

  return (
    <div ref={ref} style={{ width: "100%", maxWidth: 1040, margin: "0 auto" }}>
      <motion.svg viewBox="0 0 1040 660" width="100%"
        style={{ display: "block", overflow: "visible" }}
        initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}>
        <defs>
          <radialGradient id="hubGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffffff"/>
            <stop offset="100%" stopColor={C.hubSoft}/>
          </radialGradient>
          <radialGradient id="actorGrad" cx="50%" cy="0%" r="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.35}/>
            <stop offset="100%" stopColor="#000000" stopOpacity={0}/>
          </radialGradient>
          <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor={C.hub} floodOpacity="0.2"/>
          </filter>
        </defs>

        {/* ── fondo suave ── */}
        <ellipse cx={500} cy={300} rx={420} ry={280}
          fill={C.hub} opacity={0.03}/>

        {/* ── conexiones ── */}
        {inView && <>
          <ConnLine d={D_PROD} color={C.prod} delay={0.3}
            label="Documentación compartida" lx={315} ly={262}/>
          <ConnLine d={D_CONT} color={C.cont} delay={0.4}
            label="Documentación compartida" lx={685} ly={262}/>
          <ConnLine d={D_FIN}  color={C.fin}  delay={0.5}
            label="Información confiable" lx={572} ly={425}/>
        </>}

        {/* ── nube central ── */}
        {inView && (
          <motion.g transform="translate(500,312)"
            initial={{ opacity: 0, scale: 0.75 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.22,0.61,0.36,1] }}>

            {/* halo exterior pulsante */}
            <motion.ellipse cx={0} cy={8} rx={128} ry={68}
              fill="none" stroke={C.hub} strokeWidth={1.5}
              animate={{ rx:[128,148,128], ry:[68,80,68], opacity:[0,0.3,0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}/>

            {/* cuerpo nube con sombra */}
            <g filter="url(#shadow)">
              <ellipse cx={0}    cy={16}  rx={114} ry={46} fill="url(#hubGrad)" stroke={C.border} strokeWidth={2}/>
              <circle  cx={-52}  cy={-2}  r={36}           fill="url(#hubGrad)" stroke={C.border} strokeWidth={2}/>
              <circle  cx={6}    cy={-24} r={46}           fill="url(#hubGrad)" stroke={C.border} strokeWidth={2}/>
              <circle  cx={60}   cy={-4}  r={32}           fill="url(#hubGrad)" stroke={C.border} strokeWidth={2}/>
              <ellipse cx={0}    cy={10}  rx={104} ry={42} fill="url(#hubGrad)"/>
            </g>

            {/* carpeta flotante con glow */}
            <motion.g filter="url(#glow)"
              animate={{ y: [0,-8,0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
              <rect x={-22} y={-52} width={44} height={30} rx={5} fill={C.hub}/>
              <path d="M-22-47a5 5 0 015-5h9l5 5h21a5 5 0 015 5v1H-22z" fill={C.hub} opacity={0.65}/>
              <rect x={-15} y={-40} width={30} height={2.2} rx={1.1} fill="#fff" opacity={0.9}/>
              <rect x={-15} y={-35} width={22} height={2.2} rx={1.1} fill="#fff" opacity={0.65}/>
              <rect x={-15} y={-30} width={16} height={2.2} rx={1.1} fill="#fff" opacity={0.4}/>
            </motion.g>

            {/* texto hub */}
            <text x={0} y={22} textAnchor="middle" fontSize={21} fontWeight={800}
              fill={C.text} fontFamily="system-ui,sans-serif">Legajo App</text>
            <text x={0} y={40} textAnchor="middle" fontSize={10} fill={C.muted}
              fontFamily="system-ui,sans-serif">Un legajo digital, conectado y seguro</text>

            {/* candado */}
            <g transform="translate(-10,52)">
              <rect x={0} y={8} width={20} height={14} rx={4} fill={C.hub}/>
              <path d="M3 8V5a7 7 0 0114 0v3" fill="none" stroke={C.hub} strokeWidth={2.5}
                strokeLinecap="round"/>
              <circle cx={10} cy={15} r={2.5} fill="#fff"/>
              <rect x={8.5} y={15} width={3} height={4} rx={1.5} fill="#fff"/>
            </g>
          </motion.g>
        )}

        {/* ── actores ── */}
        {inView && <>
          <ActorNode x={238} y={126} color={C.prod} soft={C.prodSoft} delay={0.2}
            platformColor={C.prodMid} label="Cliente / Productor" sub="Carga y autoriza accesos"
            icon={
              <g transform="translate(-14,-18)">
                <circle cx={14} cy={8} r={8} fill={C.prod}/>
                <path d="M2 30a12 12 0 0124 0z" fill={C.prod}/>
                {/* ícono tablet */}
                <rect x={8} y={18} width={12} height={10} rx={2} fill={C.prod} opacity={0.4}/>
              </g>
            }/>

          <ActorNode x={802} y={126} color={C.cont} soft={C.contSoft} delay={0.35}
            platformColor={C.contMid} label="Contador" sub="Prepara y valida carpetas"
            icon={
              <g transform="translate(-14,-15)" strokeWidth={1.8} fill="none" stroke={C.cont}>
                <rect x={1} y={0} width={26} height={28} rx={3}/>
                <rect x={4} y={5} width={18} height={4} rx={1} fill={C.cont} stroke="none"/>
                <rect x={4} y={12} width={5} height={5} rx={1} fill={C.cont} stroke="none"/>
                <rect x={12} y={12} width={5} height={5} rx={1} fill={C.cont} stroke="none"/>
                <rect x={20} y={12} width={5} height={12} rx={1} fill={C.cont} stroke="none" opacity={0.8}/>
                <rect x={4}  y={19} width={5} height={5} rx={1} fill={C.cont} stroke="none" opacity={0.65}/>
                <rect x={12} y={19} width={5} height={5} rx={1} fill={C.cont} stroke="none" opacity={0.65}/>
              </g>
            }/>

          <ActorNode x={520} y={510} color={C.fin} soft={C.finSoft} delay={0.5}
            platformColor={C.finMid} label="Financista" sub="Evalúa y decide crédito"
            icon={
              <g transform="translate(-14,-14)" fill={C.fin}>
                <path d="M14 0L28 9H0z"/>
                <rect x={2}  y={11} width={6} height={11} rx={1.5}/>
                <rect x={11} y={11} width={6} height={11} rx={1.5}/>
                <rect x={20} y={11} width={6} height={11} rx={1.5}/>
                <rect x={0}  y={23} width={28} height={3.5} rx={1.75}/>
              </g>
            }/>
        </>}

        {/* ── chips de tipo doc (centro-arriba) ── */}
        {inView && (
          <g>
            {[
              { x:280, y:75,  label:"Documentos",       color:C.prod, d:0.65,
                icon:<path d="M0-5v10M-4-2l4-4 4 4" fill="none" stroke={C.prod} strokeWidth={1.5} strokeLinecap="round"/> },
              { x:380, y:60,  label:"Reg. Financieros", color:C.cont, d:0.72,
                icon:<><rect x={-4} y={-5} width={8} height={10} rx={1} fill="none" stroke={C.cont} strokeWidth={1.5}/><path d="M-2-2h4M-2 1h4M-2 4h2" stroke={C.cont} strokeWidth={1.2} strokeLinecap="round"/></> },
              { x:500, y:52,  label:"Balances",         color:C.hub,  d:0.78,
                icon:<><rect x={-4} y={1} width={8} height={5} rx={1} fill={C.hub} opacity={0.6}/><path d="M-4-1l2-5 2 3 2-5 2 7" fill="none" stroke={C.hub} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round"/></> },
              { x:620, y:60,  label:"Aprobaciones",     color:C.cont, d:0.72,
                icon:<><circle cx={0} cy={0} r={5} fill="none" stroke={C.cont} strokeWidth={1.5}/><path d="M-2 0l2 2 4-4" fill="none" stroke={C.cont} strokeWidth={1.5} strokeLinecap="round"/></> },
              { x:720, y:75,  label:"Impuestos",        color:C.fin,  d:0.65,
                icon:<><path d="M-4-4l8 8M4-4l-8 8" fill="none" stroke={C.fin} strokeWidth={1.5} strokeLinecap="round"/><circle cx={0} cy={0} r={5} fill="none" stroke={C.fin} strokeWidth={1.2} opacity={0.4}/></> },
            ].map((c) => (
              <TypeChip key={c.label} x={c.x} y={c.y} label={c.label}
                color={c.color} icon={c.icon} delay={c.d}/>
            ))}
          </g>
        )}

        {/* ── panel izquierdo (seguridad) ── */}
        {inView && (
          <motion.g transform="translate(14,252)"
            initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
            transition={{ duration: 0.55, delay: 0.5 }}>
            <rect x={0} y={0} width={186} height={262} rx={16}
              fill="#fff" stroke={C.border} strokeWidth={1.5} opacity={0.96}
              style={{ filter: "drop-shadow(0 4px 16px rgba(109,40,217,0.08))" }}/>
            {/* header panel */}
            <rect x={8} y={8} width={170} height={36} rx={10} fill={C.prodSoft}/>
            <circle cx={24} cy={26} r={10} fill={C.prod} opacity={0.15}/>
            <path d="M19 26l3 3 6-6" fill="none" stroke={C.prod} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"/>
            <text x={38} y={30} fill={C.text} fontSize={11} fontWeight={700}
              fontFamily="system-ui,sans-serif">Seguridad integrada</text>

            {[
              { y:72,  txt:"Seguridad de la información",
                ico:<><path d="M0-7a7 7 0 100 14a7 7 0 000-14z"/><path d="M-3 0l2.5 2.5 5-5"/></> },
              { y:112, txt:"Intercambio seguro en la nube",
                ico:<><path d="M-5 0a5 5 0 0110 0"/><path d="M0-5v3"/><circle cx={0} cy={4} r={2}/></> },
              { y:152, txt:"Trazabilidad y auditoría",
                ico:<><circle r={6} fill="none"/><path d="M0-3.5v3.5l2.5 2.5"/></> },
              { y:192, txt:"Aprobaciones y notificaciones",
                ico:<><path d="M0-7a7 7 0 100 14"/><path d="M0-3.5v3.5l4 1.5"/></> },
              { y:232, txt:"Legajo siempre actualizado",
                ico:<path d="M-6 4l3-8 3 4 3-6 2.5 8" fill="none"/> },
            ].map((r,i) => (
              <LRow key={r.y} y={r.y} icon={r.ico} text={r.txt} color={C.prod} delay={0.6 + i*0.07}/>
            ))}
          </motion.g>
        )}

        {/* ── panel derecho (beneficios) ── */}
        {inView && (
          <motion.g transform="translate(840,252)"
            initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }}
            transition={{ duration: 0.55, delay: 0.55 }}>
            <rect x={0} y={0} width={186} height={262} rx={16}
              fill="#fff" stroke={C.border} strokeWidth={1.5} opacity={0.96}
              style={{ filter: "drop-shadow(0 4px 16px rgba(109,40,217,0.08))" }}/>
            {/* header */}
            <rect x={8} y={8} width={170} height={52} rx={10} fill={C.hubSoft}/>
            <circle cx={24} cy={34} r={12} fill={C.hub} opacity={0.15}/>
            <path d="M19 34l3.5 3.5 7-7" fill="none" stroke={C.hub} strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round"/>
            <text x={40} y={27} fill={C.text} fontSize={10.5} fontWeight={700}
              fontFamily="system-ui,sans-serif">Un legajo digital,</text>
            <text x={40} y={43} fill={C.text} fontSize={10.5} fontWeight={700}
              fontFamily="system-ui,sans-serif">conectado y seguro</text>

            {[
              { y: 88,  txt: "Visibilidad en tiempo real" },
              { y: 128, txt: "Menos papel, más eficiencia" },
              { y: 168, txt: "Mejores decisiones de crédito" },
              { y: 208, txt: "Colaboración transparente" },
              { y: 248, txt: "Relación ágil entre las partes" },
            ].map((b,i) => (
              <RRow key={b.y} y={b.y} text={b.txt} color={C.fin} delay={0.65 + i*0.07}/>
            ))}
          </motion.g>
        )}

        {/* ── etiqueta "Colaboración transparente" ── */}
        {inView && (
          <motion.g transform="translate(272,430)"
            initial={{ opacity:0 }} animate={{ opacity:1 }}
            transition={{ delay: 0.9 }}>
            <rect x={-68} y={-13} width={136} height={26} rx={13}
              fill={C.prod} fillOpacity={0.08} stroke={C.prod} strokeWidth={1} strokeOpacity={0.3}/>
            <text x={0} y={1} textAnchor="middle" fill={C.prod} fontSize={10} fontWeight={600}
              fontFamily="system-ui,sans-serif" dominantBaseline="middle">Colaboración transparente</text>
          </motion.g>
        )}

        {/* ── partículas animadas ── */}
        {inView && <>
          {/* prod → hub */}
          <Particle f={FP}  color={C.prod} delay={0}   dur={4.2} shape="folder"/>
          <Particle f={FP}  color={C.prod} delay={2.2} dur={4.2} shape="doc"/>
          {/* hub → prod */}
          <Particle f={FPR} color={C.prod} delay={1.0} dur={4.2} shape="doc"/>
          {/* cont → hub */}
          <Particle f={FC}  color={C.cont} delay={0.7} dur={4.0} shape="doc"/>
          <Particle f={FC}  color={C.cont} delay={2.8} dur={4.0} shape="folder"/>
          {/* hub → cont */}
          <Particle f={FCR} color={C.cont} delay={1.8} dur={4.0} shape="doc"/>
          {/* hub → fin */}
          <Particle f={FF}  color={C.fin}  delay={1.4} dur={3.8} shape="coin"/>
          <Particle f={FF}  color={C.fin}  delay={3.0} dur={3.8} shape="doc"/>
          {/* fin → hub */}
          <Particle f={FFR} color={C.fin}  delay={0.4} dur={3.8} shape="doc"/>
        </>}

      </motion.svg>
    </div>
  )
}
