"use client"

import { motion } from "motion/react"
import type { ReactNode } from "react"

/* ── paleta ──────────────────────────────────────────────────────── */
const C = {
  prod: "#6d28d9", prodSoft: "#f0ebff",
  cont: "#312e81", contSoft: "#eef2ff",
  fin:  "#9333ea", finSoft:  "#f3e8ff",
  hub:  "#5b21b6", hubSoft:  "#ede9fe",
  bd:   "#ddd6fe", text: "#1e1b4b", muted: "#6b7280",
}

/* ── bezier keyframes ────────────────────────────────────────────── */
function bez(
  p0x:number,p0y:number,p1x:number,p1y:number,
  p2x:number,p2y:number,p3x:number,p3y:number,
  steps=22,rev=false
){
  const xs:number[]=[],ys:number[]=[],ops:number[]=[],ts:number[]=[]
  for(let i=0;i<=steps;i++){
    const t=i/steps,m=1-t
    xs.push(m**3*p0x+3*m**2*t*p1x+3*m*t**2*p2x+t**3*p3x)
    ys.push(m**3*p0y+3*m**2*t*p1y+3*m*t**2*p2y+t**3*p3y)
    ts.push(t)
    ops.push(t<0.1?t/0.1:t>0.87?(1-t)/0.13:1)
  }
  if(rev){xs.reverse();ys.reverse();ops.reverse()}
  return {xs,ys,ops,ts}
}

type BF = ReturnType<typeof bez>

/* paths  productor(238,178)→hub(468,296)  contador(762,178)→hub(532,296)  hub(500,346)→fin(500,474) */
const FP  = bez(238,178,310,220,400,268,468,296)
const FPR = bez(238,178,310,220,400,268,468,296,22,true)
const FC  = bez(762,178,690,220,600,268,532,296)
const FCR = bez(762,178,690,220,600,268,532,296,22,true)
const FF  = bez(500,346,500,388,500,432,500,474)
const FFR = bez(500,346,500,388,500,432,500,474,22,true)

/* ── partícula animada ────────────────────────────────────────────── */
function Dot({f,color,delay,dur,kind}:{f:BF;color:string;delay:number;dur:number;kind:"folder"|"doc"|"coin"}){
  return (
    <motion.g
      initial={{x:f.xs[0],y:f.ys[0],opacity:0}}
      animate={{x:f.xs,y:f.ys,opacity:f.ops}}
      transition={{
        x:      {duration:dur,repeat:Infinity,delay,ease:"linear",times:f.ts},
        y:      {duration:dur,repeat:Infinity,delay,ease:"linear",times:f.ts},
        opacity:{duration:dur,repeat:Infinity,delay,ease:"linear",times:f.ts},
      }}
    >
      {kind==="doc"&&(
        <g transform="translate(-9,-11)">
          <rect x={0} y={0} width={18} height={22} rx={3} fill="#fff" stroke={color} strokeWidth={1.8}/>
          <path d="M10.5 0v5h5" fill="none" stroke={color} strokeWidth={1.5}/>
          <rect x={3} y={8}  width={12} height={1.8} rx={.9} fill={color} opacity={.7}/>
          <rect x={3} y={12} width={9}  height={1.8} rx={.9} fill={color} opacity={.5}/>
          <rect x={3} y={16} width={10} height={1.8} rx={.9} fill={color} opacity={.35}/>
        </g>
      )}
      {kind==="folder"&&(
        <g transform="translate(-12,-9)">
          <rect x={0} y={5} width={24} height={14} rx={3} fill={color}/>
          <path d="M0 8a3 3 0 013-3h5l3 3h13v1H0z" fill={color} opacity={.65}/>
          <rect x={3} y={10} width={18} height={1.8} rx={.9} fill="#fff" opacity={.85}/>
          <rect x={3} y={13.5} width={12} height={1.8} rx={.9} fill="#fff" opacity={.55}/>
        </g>
      )}
      {kind==="coin"&&(
        <g>
          <circle r={8} fill={color} opacity={.9}/>
          <text y={4} textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}
            fontFamily="system-ui">$</text>
        </g>
      )}
    </motion.g>
  )
}

/* ── nodo actor ─────────────────────────────────────────────────── */
function Actor({x,y,color,soft,label,sub,icon,d}:{
  x:number;y:number;color:string;soft:string;label:string;sub:string;
  icon:ReactNode;d:number
}){
  return (
    <motion.g transform={`translate(${x},${y})`}
      initial={{opacity:0}} whileInView={{opacity:1}}
      viewport={{once:true,margin:"-40px"}}
      transition={{duration:.65,delay:d,ease:[.22,.61,.36,1]}}>
      {/* plataforma */}
      <ellipse cx={0} cy={66} rx={60} ry={12} fill={color} opacity={.22}/>
      <ellipse cx={0} cy={62} rx={60} ry={12} fill={color} opacity={.18}/>
      {/* halo */}
      <motion.circle r={52} fill={color} opacity={.06}
        animate={{r:[52,64,52],opacity:[.06,.14,.06]}}
        transition={{duration:4,repeat:Infinity,ease:"easeInOut",delay:d*.5}}/>
      {/* círculo */}
      <circle r={44} fill={soft} stroke={color} strokeWidth={2.5}/>
      <circle r={34} fill="none" stroke={color} strokeWidth={1} opacity={.25}/>
      {/* ícono */}
      <g fill={color}>{icon}</g>
      {/* badge */}
      <rect x={-62} y={52} width={124} height={28} rx={14} fill={color}/>
      <text x={0} y={71} textAnchor="middle" fill="#fff" fontSize={12.5} fontWeight={700}
        fontFamily="system-ui,sans-serif">{label}</text>
      <text x={0} y={93} textAnchor="middle" fill={C.muted} fontSize={10.5}
        fontFamily="system-ui,sans-serif">{sub}</text>
    </motion.g>
  )
}

/* ── línea de conexión ──────────────────────────────────────────── */
function Line({d,color,delay,label,lx,ly}:{d:string;color:string;delay:number;label:string;lx:number;ly:number}){
  return (
    <>
      <motion.path d={d} fill="none" stroke={color} strokeWidth={2}
        strokeDasharray="5 9" strokeLinecap="round"
        initial={{opacity:0,pathLength:0}} whileInView={{opacity:.4,pathLength:1}}
        viewport={{once:true}} transition={{duration:.8,delay,ease:"easeOut"}}/>
      <motion.text x={lx} y={ly} textAnchor="middle" fontSize={10} fill={C.muted}
        fontFamily="system-ui,sans-serif"
        initial={{opacity:0}} whileInView={{opacity:1}}
        viewport={{once:true}} transition={{duration:.5,delay:delay+.3}}>
        {label}
      </motion.text>
    </>
  )
}

/* ── chip tipo doc (encabezado) ─────────────────────────────────── */
function TChip({x,y,label,color,delay}:{x:number;y:number;label:string;color:string;delay:number}){
  return (
    <motion.g transform={`translate(${x},${y})`}
      initial={{opacity:0,y:8}} whileInView={{opacity:1,y:0}}
      viewport={{once:true}} transition={{duration:.45,delay}}>
      <rect x={-42} y={-14} width={84} height={28} rx={14}
        fill={color} fillOpacity={.1} stroke={color} strokeWidth={1.2} strokeOpacity={.4}/>
      <text x={0} y={1} textAnchor="middle" fill={color} fontSize={10} fontWeight={600}
        fontFamily="system-ui,sans-serif" dominantBaseline="middle">{label}</text>
    </motion.g>
  )
}

/* ── fila izquierda ─────────────────────────────────────────────── */
function LRow({y,icon,text,color,d}:{y:number;icon:ReactNode;text:string;color:string;d:number}){
  return (
    <motion.g transform={`translate(16,${y})`}
      initial={{opacity:0}} whileInView={{opacity:1}}
      viewport={{once:true}} transition={{duration:.4,delay:d}}>
      <rect x={-3} y={-13} width={26} height={26} rx={7} fill={color} opacity={.12}/>
      <g fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">{icon}</g>
      <text x={30} y={1} fill={C.text} fontSize={11} fontFamily="system-ui,sans-serif"
        dominantBaseline="middle">{text}</text>
    </motion.g>
  )
}

/* ── fila derecha ────────────────────────────────────────────────── */
function RRow({y,text,color,d}:{y:number;text:string;color:string;d:number}){
  return (
    <motion.g transform={`translate(16,${y})`}
      initial={{opacity:0}} whileInView={{opacity:1}}
      viewport={{once:true}} transition={{duration:.4,delay:d}}>
      <circle r={10} fill={color} opacity={.12}/>
      <path d="M-5 0l3.5 3.5 6.5-7" fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"/>
      <text x={16} y={1} fill={C.text} fontSize={11} fontFamily="system-ui,sans-serif"
        dominantBaseline="middle">{text}</text>
    </motion.g>
  )
}

/* ── componente principal ─────────────────────────────────────────── */
export default function LegajoFlowAnimation() {
  const D_PROD = "M238,178 C310,220 400,268 468,296"
  const D_CONT = "M762,178 C690,220 600,268 532,296"
  const D_FIN  = "M500,346 C500,388 500,432 500,474"

  return (
    <svg viewBox="0 0 1000 640" width="100%" style={{display:"block"}}>
      <defs>
        <radialGradient id="hg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffffff"/>
          <stop offset="100%" stopColor={C.hubSoft}/>
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* fondo elipse suave */}
      <ellipse cx={500} cy={310} rx={440} ry={290} fill={C.hub} opacity={.03}/>

      {/* ── conexiones ── */}
      <Line d={D_PROD} color={C.prod} delay={.2} label="Documentación compartida" lx={318} ly={260}/>
      <Line d={D_CONT} color={C.cont} delay={.3} label="Documentación compartida" lx={682} ly={260}/>
      <Line d={D_FIN}  color={C.fin}  delay={.4} label="Información confiable"    lx={562} ly={422}/>

      {/* ── nube hub ── */}
      <motion.g transform="translate(500,310)"
        initial={{opacity:0,scale:.8}} whileInView={{opacity:1,scale:1}}
        viewport={{once:true,margin:"-40px"}}
        transition={{duration:.7,delay:.1,ease:[.22,.61,.36,1]}}>
        {/* halo exterior */}
        <motion.ellipse cx={0} cy={8} rx={124} ry={66}
          fill="none" stroke={C.hub} strokeWidth={1.5}
          animate={{rx:[124,144,124],ry:[66,78,66],opacity:[0,.28,0]}}
          transition={{duration:3.4,repeat:Infinity,ease:"easeInOut"}}/>
        {/* cuerpo */}
        <ellipse cx={0}   cy={14} rx={112} ry={45} fill="url(#hg)" stroke={C.bd} strokeWidth={2}/>
        <circle  cx={-52} cy={-2} r={35}           fill="url(#hg)" stroke={C.bd} strokeWidth={2}/>
        <circle  cx={6}   cy={-22} r={44}          fill="url(#hg)" stroke={C.bd} strokeWidth={2}/>
        <circle  cx={58}  cy={-2} r={30}           fill="url(#hg)" stroke={C.bd} strokeWidth={2}/>
        <ellipse cx={0}   cy={8}  rx={102} ry={41} fill="url(#hg)"/>
        {/* carpeta flotante */}
        <motion.g filter="url(#glow)"
          animate={{y:[0,-8,0]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}>
          <rect x={-22} y={-52} width={44} height={30} rx={5} fill={C.hub}/>
          <path d="M-22-47a5 5 0 015-5h9l5 5h21v1H-22z" fill={C.hub} opacity={.65}/>
          <rect x={-15} y={-40} width={30} height={2.2} rx={1.1} fill="#fff" opacity={.9}/>
          <rect x={-15} y={-34} width={22} height={2.2} rx={1.1} fill="#fff" opacity={.65}/>
          <rect x={-15} y={-28} width={16} height={2.2} rx={1.1} fill="#fff" opacity={.4}/>
        </motion.g>
        {/* texto */}
        <text x={0} y={22} textAnchor="middle" fontSize={21} fontWeight={800}
          fill={C.text} fontFamily="system-ui,sans-serif">Legajo App</text>
        <text x={0} y={40} textAnchor="middle" fontSize={10} fill={C.muted}
          fontFamily="system-ui,sans-serif">Un legajo digital, conectado y seguro</text>
        {/* candado */}
        <g transform="translate(-10,52)">
          <rect x={0} y={8} width={20} height={14} rx={4} fill={C.hub}/>
          <path d="M3 8V5a7 7 0 0114 0v3" fill="none" stroke={C.hub} strokeWidth={2.5} strokeLinecap="round"/>
          <circle cx={10} cy={15} r={2.5} fill="#fff"/>
          <rect x={8.5} y={15} width={3} height={4} rx={1.5} fill="#fff"/>
        </g>
      </motion.g>

      {/* ── actores ── */}
      <Actor x={238} y={122} color={C.prod} soft={C.prodSoft} d={.2}
        label="Cliente / Productor" sub="Carga y autoriza accesos"
        icon={<g transform="translate(-13,-17)"><circle cx={13} cy={8} r={8}/><path d="M1 28a12 12 0 0124 0z"/></g>}/>

      <Actor x={762} y={122} color={C.cont} soft={C.contSoft} d={.35}
        label="Contador" sub="Prepara y valida carpetas"
        icon={
          <g transform="translate(-13,-14)" fill="none" stroke={C.cont} strokeWidth={1.8}>
            <rect x={1} y={0} width={24} height={26} rx={3}/>
            <rect x={4} y={5} width={16} height={3.5} rx={1} fill={C.cont} stroke="none"/>
            <rect x={4} y={11} width={4.5} height={4.5} rx={1} fill={C.cont} stroke="none"/>
            <rect x={11} y={11} width={4.5} height={4.5} rx={1} fill={C.cont} stroke="none"/>
            <rect x={18} y={11} width={4.5} height={11} rx={1} fill={C.cont} stroke="none" opacity={.8}/>
            <rect x={4}  y={17} width={4.5} height={5} rx={1} fill={C.cont} stroke="none" opacity={.65}/>
            <rect x={11} y={17} width={4.5} height={5} rx={1} fill={C.cont} stroke="none" opacity={.65}/>
          </g>
        }/>

      <Actor x={500} y={516} color={C.fin} soft={C.finSoft} d={.5}
        label="Financista" sub="Evalúa y decide crédito"
        icon={
          <g transform="translate(-14,-13)" fill={C.fin}>
            <path d="M14 0L28 9H0z"/>
            <rect x={2}  y={11} width={6} height={11} rx={1.5}/>
            <rect x={11} y={11} width={6} height={11} rx={1.5}/>
            <rect x={20} y={11} width={6} height={11} rx={1.5}/>
            <rect x={0}  y={23} width={28} height={3.5} rx={1.75}/>
          </g>
        }/>

      {/* ── chips tipo doc (arriba) ── */}
      {[
        {x:280,y:72, label:"Documentos",       color:C.prod, d:.6},
        {x:378,y:58, label:"Reg. Financieros", color:C.cont, d:.67},
        {x:500,y:50, label:"Balances",          color:C.hub,  d:.73},
        {x:622,y:58, label:"Aprobaciones",     color:C.cont, d:.67},
        {x:720,y:72, label:"Impuestos",         color:C.fin,  d:.6},
      ].map(c=>(
        <TChip key={c.label} x={c.x} y={c.y} label={c.label} color={c.color} delay={c.d}/>
      ))}

      {/* ── etiqueta central inferior ── */}
      <motion.g transform="translate(268,430)"
        initial={{opacity:0}} whileInView={{opacity:1}}
        viewport={{once:true}} transition={{delay:.9}}>
        <rect x={-72} y={-13} width={144} height={26} rx={13}
          fill={C.prod} fillOpacity={.08} stroke={C.prod} strokeWidth={1} strokeOpacity={.3}/>
        <text x={0} y={1} textAnchor="middle" fill={C.prod} fontSize={10} fontWeight={600}
          fontFamily="system-ui,sans-serif" dominantBaseline="middle">Colaboración transparente</text>
      </motion.g>

      {/* ── panel izquierdo ── */}
      <motion.g transform="translate(10,252)"
        initial={{opacity:0}} whileInView={{opacity:1}}
        viewport={{once:true}} transition={{duration:.6,delay:.45}}>
        <rect x={0} y={0} width={178} height={258} rx={16}
          fill="#fff" stroke={C.bd} strokeWidth={1.5} opacity={.97}/>
        {/* header */}
        <rect x={8} y={8} width={162} height={38} rx={10} fill={C.prodSoft}/>
        <circle cx={22} cy={27} r={9} fill={C.prod} opacity={.15}/>
        <path d="M17 27l3 3 5.5-6" fill="none" stroke={C.prod} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"/>
        <text x={36} y={31} fill={C.text} fontSize={11} fontWeight={700}
          fontFamily="system-ui,sans-serif">Seguridad integrada</text>
        {/* filas */}
        {[
          {y:68, txt:"Seguridad de la información",
           ico:<><path d="M0-7a7 7 0 100 14a7 7 0 000-14"/><path d="M-3 0l2.5 2.5 5-5"/></>},
          {y:105,txt:"Intercambio seguro en la nube",
           ico:<><path d="M-5 0a5 5 0 0110 0"/><circle cy={5} r={2}/><path d="M0-5v3"/></>},
          {y:142,txt:"Trazabilidad y auditoría",
           ico:<><circle r={6} fill="none"/><path d="M0-3.5v3.5l2.5 2.5"/></>},
          {y:179,txt:"Aprobaciones y notificaciones",
           ico:<><circle r={6} fill="none"/><path d="M-2 0l2 2 5-5"/></>},
          {y:216,txt:"Legajo siempre actualizado",
           ico:<path d="M-6 4l3-8 3 4 3-6 2.5 8" fill="none"/>},
        ].map((r,i)=>(
          <LRow key={r.y} y={r.y} icon={<>{r.ico}</>} text={r.txt} color={C.prod} d={.6+i*.07}/>
        ))}
      </motion.g>

      {/* ── panel derecho ── */}
      <motion.g transform="translate(812,252)"
        initial={{opacity:0}} whileInView={{opacity:1}}
        viewport={{once:true}} transition={{duration:.6,delay:.5}}>
        <rect x={0} y={0} width={178} height={258} rx={16}
          fill="#fff" stroke={C.bd} strokeWidth={1.5} opacity={.97}/>
        {/* header */}
        <rect x={8} y={8} width={162} height={52} rx={10} fill={C.hubSoft}/>
        <circle cx={22} cy={34} r={10} fill={C.hub} opacity={.15}/>
        <path d="M17 34l3.5 3.5 7-7" fill="none" stroke={C.hub} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"/>
        <text x={38} y={27} fill={C.text} fontSize={10.5} fontWeight={700}
          fontFamily="system-ui,sans-serif">Un legajo digital,</text>
        <text x={38} y={43} fill={C.text} fontSize={10.5} fontWeight={700}
          fontFamily="system-ui,sans-serif">conectado y seguro</text>
        {/* filas */}
        {[
          {y:82,  txt:"Visibilidad en tiempo real"},
          {y:119, txt:"Menos papel, más eficiencia"},
          {y:156, txt:"Mejores decisiones de crédito"},
          {y:193, txt:"Colaboración transparente"},
          {y:230, txt:"Relación ágil entre las partes"},
        ].map((b,i)=>(
          <RRow key={b.y} y={b.y} text={b.txt} color={C.fin} d={.65+i*.07}/>
        ))}
      </motion.g>

      {/* ── partículas animadas (siempre activas) ── */}
      <Dot f={FP}  color={C.prod} delay={0}   dur={4.2} kind="folder"/>
      <Dot f={FP}  color={C.prod} delay={2.2} dur={4.2} kind="doc"/>
      <Dot f={FPR} color={C.prod} delay={1.1} dur={4.2} kind="doc"/>
      <Dot f={FC}  color={C.cont} delay={0.7} dur={4.0} kind="doc"/>
      <Dot f={FC}  color={C.cont} delay={2.8} dur={4.0} kind="folder"/>
      <Dot f={FCR} color={C.cont} delay={1.8} dur={4.0} kind="doc"/>
      <Dot f={FF}  color={C.fin}  delay={1.4} dur={3.8} kind="coin"/>
      <Dot f={FF}  color={C.fin}  delay={3.1} dur={3.8} kind="doc"/>
      <Dot f={FFR} color={C.fin}  delay={0.5} dur={3.8} kind="doc"/>
    </svg>
  )
}
