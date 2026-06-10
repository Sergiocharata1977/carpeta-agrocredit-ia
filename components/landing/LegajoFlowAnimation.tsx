"use client"

import { motion } from "motion/react"

/* ── paleta ──────────────────────────────────────────────────── */
const C = {
  prod: "#6d28d9", prodSoft: "#f0ebff",
  cont: "#312e81", contSoft: "#eef2ff",
  fin:  "#9333ea", finSoft:  "#f3e8ff",
  hub:  "#5b21b6", hubSoft:  "#ede9fe",
  bd:   "#ddd6fe", text: "#1e1b4b", muted: "#6b7280",
}

/* ── bezier keyframes ──────────────────────────────────────── */
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

/* paths: prod(140,150)→hub(320,270)  cont(560,150)→hub(380,270)  hub(350,320)→fin(350,440) */
const FP  = bez(140,150, 210,200, 280,250, 320,270)
const FPR = bez(140,150, 210,200, 280,250, 320,270, 22,true)
const FC  = bez(560,150, 490,200, 420,250, 380,270)
const FCR = bez(560,150, 490,200, 420,250, 380,270, 22,true)
const FF  = bez(350,320, 350,360, 350,400, 350,440)
const FFR = bez(350,320, 350,360, 350,400, 350,440, 22,true)

/* ── partícula ───────────────────────────────────────────────── */
function Dot({f,color,delay,dur,kind}:{f:BF;color:string;delay:number;dur:number;kind:"folder"|"doc"|"coin"}){
  return (
    <motion.g
      initial={{x:f.xs[0],y:f.ys[0],opacity:0}}
      animate={{x:f.xs,y:f.ys,opacity:f.ops}}
      transition={{
        x:      {duration:dur,repeat:Infinity,delay,ease:"linear",times:f.ts},
        y:      {duration:dur,repeat:Infinity,delay,ease:"linear",times:f.ts},
        opacity:{duration:dur,repeat:Infinity,delay,ease:"linear",times:f.ts},
      }}>
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

/* ── actor ───────────────────────────────────────────────────── */
function Actor({x,y,color,soft,label,sub,icon,d}:{
  x:number;y:number;color:string;soft:string;label:string;sub:string;
  icon:string;d:number
}){
  return (
    <motion.g transform={`translate(${x},${y})`}
      initial={{opacity:0}} whileInView={{opacity:1}}
      viewport={{once:true,margin:"-30px"}}
      transition={{duration:.6,delay:d}}>
      {/* plataforma */}
      <ellipse cx={0} cy={56} rx={52} ry={10} fill={color} opacity={.2}/>
      <ellipse cx={0} cy={52} rx={52} ry={10} fill={color} opacity={.15}/>
      {/* halo */}
      <motion.circle r={44} fill={color} opacity={.06}
        animate={{r:[44,54,44],opacity:[.06,.13,.06]}}
        transition={{duration:4,repeat:Infinity,ease:"easeInOut",delay:d*.4}}/>
      {/* círculo */}
      <circle r={38} fill={soft} stroke={color} strokeWidth={2.5}/>
      <circle r={28} fill="none" stroke={color} strokeWidth={1} opacity={.2}/>
      {/* emoji/ícono */}
      <text y={8} textAnchor="middle" fontSize={26} fontFamily="system-ui">{icon}</text>
      {/* badge */}
      <rect x={-52} y={44} width={104} height={24} rx={12} fill={color}/>
      <text x={0} y={61} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}
        fontFamily="system-ui,sans-serif">{label}</text>
      <text x={0} y={80} textAnchor="middle" fill={C.muted} fontSize={9.5}
        fontFamily="system-ui,sans-serif">{sub}</text>
    </motion.g>
  )
}

/* ── línea de conexión ───────────────────────────────────────── */
function Line({d,color,delay,label,lx,ly}:{d:string;color:string;delay:number;label:string;lx:number;ly:number}){
  return (
    <>
      <motion.path d={d} fill="none" stroke={color} strokeWidth={2}
        strokeDasharray="5 9" strokeLinecap="round"
        initial={{opacity:0,pathLength:0}} whileInView={{opacity:.4,pathLength:1}}
        viewport={{once:true}} transition={{duration:.8,delay,ease:"easeOut"}}/>
      <motion.text x={lx} y={ly} textAnchor="middle" fontSize={9} fill={C.muted}
        fontFamily="system-ui,sans-serif"
        initial={{opacity:0}} whileInView={{opacity:1}}
        viewport={{once:true}} transition={{duration:.5,delay:delay+.3}}>
        {label}
      </motion.text>
    </>
  )
}

/* ── chip tipo doc ───────────────────────────────────────────── */
function TChip({x,y,label,color,delay}:{x:number;y:number;label:string;color:string;delay:number}){
  return (
    <motion.g transform={`translate(${x},${y})`}
      initial={{opacity:0}} whileInView={{opacity:1}}
      viewport={{once:true}} transition={{duration:.45,delay}}>
      <rect x={-38} y={-12} width={76} height={24} rx={12}
        fill={color} fillOpacity={.1} stroke={color} strokeWidth={1.1} strokeOpacity={.4}/>
      <text x={0} y={1} textAnchor="middle" fill={color} fontSize={9.5} fontWeight={600}
        fontFamily="system-ui,sans-serif" dominantBaseline="middle">{label}</text>
    </motion.g>
  )
}

/* ── panel lateral (HTML) ─────────────────────────────────────── */
function SidePanel({ title, items, color, soft, check, side, icon }:{
  title:string; items:string[]; color:string; soft:string;
  check:string; side:"left"|"right"; icon:string
}){
  return (
    <motion.div
      className="flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm"
      style={{ borderColor: "#ddd6fe" }}
      initial={{ opacity:0, x: side==="left" ? -20 : 20 }}
      whileInView={{ opacity:1, x:0 }}
      viewport={{ once:true, margin:"-30px" }}
      transition={{ duration:.55, delay:.5 }}>
      {/* header */}
      <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
        style={{ background: soft }}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ background: color, color:"#fff" }}>{icon}</span>
        <span className="text-[13px] font-bold leading-tight" style={{ color }}>{title}</span>
      </div>
      {/* items */}
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2">
            <svg viewBox="0 0 20 20" className="mt-0.5 h-[15px] w-[15px] shrink-0"
              fill="none" stroke={check} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="10" r="8"/>
              <path d="M7 10l2.5 2.5 4-5"/>
            </svg>
            <span className="text-[12.5px] leading-[1.4]" style={{ color: C.text }}>{item}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── componente principal ────────────────────────────────────── */
export default function LegajoFlowAnimation() {
  const D_PROD = "M140,150 C210,200 280,250 320,270"
  const D_CONT = "M560,150 C490,200 420,250 380,270"
  const D_FIN  = "M350,320 C350,360 350,400 350,440"

  return (
    <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[220px_1fr_220px]">

      {/* ── panel izquierdo (HTML) ── */}
      <SidePanel side="left" title="Seguridad integrada" icon="🔐" color={C.prod} soft={C.prodSoft} check={C.prod}
        items={[
          "Seguridad de la información",
          "Intercambio seguro en la nube",
          "Trazabilidad y auditoría",
          "Aprobaciones y notificaciones",
          "Legajo siempre actualizado",
        ]}/>

      {/* ── SVG central (solo animación) ── */}
      <div style={{ minHeight: 520 }}>
        <svg viewBox="40 40 620 480" width="100%"
          style={{ display:"block", overflow:"hidden" }}>
          <defs>
            <radialGradient id="hg2" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#ffffff"/>
              <stop offset="100%" stopColor={C.hubSoft}/>
            </radialGradient>
          </defs>

          {/* fondo suave */}
          <ellipse cx={350} cy={290} rx={280} ry={200} fill={C.hub} opacity={.04}/>

          {/* conexiones */}
          <Line d={D_PROD} color={C.prod} delay={.2} label="Doc. compartida" lx={218} ly={227}/>
          <Line d={D_CONT} color={C.cont} delay={.3} label="Doc. compartida" lx={482} ly={227}/>
          <Line d={D_FIN}  color={C.fin}  delay={.4} label="Info. confiable"  lx={408} ly={390}/>

          {/* chips tipo doc */}
          <TChip x={230} y={98} label="Documentos"   color={C.prod} delay={.6}/>
          <TChip x={350} y={82} label="Balances"      color={C.hub}  delay={.7}/>
          <TChip x={470} y={98} label="Aprobaciones" color={C.cont} delay={.6}/>

          {/* nube hub */}
          <motion.g transform="translate(350,285)"
            initial={{opacity:0}} whileInView={{opacity:1}}
            viewport={{once:true,margin:"-30px"}}
            transition={{duration:.7,delay:.15}}>
            {/* halo */}
            <motion.ellipse cx={0} cy={6} rx={96} ry={52}
              fill="none" stroke={C.hub} strokeWidth={1.5}
              animate={{rx:[96,112,96],ry:[52,62,52],opacity:[0,.25,0]}}
              transition={{duration:3.4,repeat:Infinity,ease:"easeInOut"}}/>
            {/* cuerpo */}
            <ellipse cx={0}   cy={12} rx={88} ry={36} fill="url(#hg2)" stroke={C.bd} strokeWidth={2}/>
            <circle  cx={-40} cy={-1} r={28}          fill="url(#hg2)" stroke={C.bd} strokeWidth={2}/>
            <circle  cx={5}   cy={-16} r={35}         fill="url(#hg2)" stroke={C.bd} strokeWidth={2}/>
            <circle  cx={46}  cy={-2} r={24}          fill="url(#hg2)" stroke={C.bd} strokeWidth={2}/>
            <ellipse cx={0}   cy={6}  rx={80} ry={32} fill="url(#hg2)"/>
            {/* carpeta flotante */}
            <motion.g animate={{y:[0,-7,0]}} transition={{duration:3,repeat:Infinity,ease:"easeInOut"}}>
              <rect x={-18} y={-43} width={36} height={24} rx={4} fill={C.hub}/>
              <path d="M-18-38a4 4 0 014-4h7l4 4h18v1H-18z" fill={C.hub} opacity={.65}/>
              <rect x={-12} y={-32} width={24} height={1.8} rx={.9} fill="#fff" opacity={.9}/>
              <rect x={-12} y={-28} width={18} height={1.8} rx={.9} fill="#fff" opacity={.65}/>
            </motion.g>
            {/* texto */}
            <text x={0} y={18} textAnchor="middle" fontSize={17} fontWeight={800}
              fill={C.text} fontFamily="system-ui,sans-serif">Legajo App</text>
            <text x={0} y={33} textAnchor="middle" fontSize={8.5} fill={C.muted}
              fontFamily="system-ui,sans-serif">carpeta digital · conectada · segura</text>
            {/* candado */}
            <g transform="translate(-8,42)">
              <rect x={0} y={6} width={16} height={11} rx={3} fill={C.hub}/>
              <path d="M2.5 6V4a5.5 5.5 0 0111 0v2" fill="none" stroke={C.hub} strokeWidth={2} strokeLinecap="round"/>
              <circle cx={8} cy={12} r={2} fill="#fff"/>
            </g>
          </motion.g>

          {/* actores */}
          <Actor x={140} y={100} color={C.prod} soft={C.prodSoft} d={.2}
            label="Productor" sub="Carga y autoriza" icon="👨‍🌾"/>
          <Actor x={560} y={100} color={C.cont} soft={C.contSoft} d={.35}
            label="Contador" sub="Valida y prepara" icon="🧮"/>
          <Actor x={350} y={400} color={C.fin} soft={C.finSoft} d={.5}
            label="Financista" sub="Evalúa y decide" icon="🏦"/>

          {/* partículas */}
          <Dot f={FP}  color={C.prod} delay={0}   dur={4.0} kind="folder"/>
          <Dot f={FP}  color={C.prod} delay={2.1} dur={4.0} kind="doc"/>
          <Dot f={FPR} color={C.prod} delay={1.1} dur={4.0} kind="doc"/>
          <Dot f={FC}  color={C.cont} delay={0.7} dur={3.8} kind="doc"/>
          <Dot f={FC}  color={C.cont} delay={2.6} dur={3.8} kind="folder"/>
          <Dot f={FCR} color={C.cont} delay={1.8} dur={3.8} kind="doc"/>
          <Dot f={FF}  color={C.fin}  delay={1.3} dur={3.6} kind="coin"/>
          <Dot f={FF}  color={C.fin}  delay={2.9} dur={3.6} kind="doc"/>
          <Dot f={FFR} color={C.fin}  delay={0.5} dur={3.6} kind="doc"/>
        </svg>
      </div>

      {/* ── panel derecho (HTML) ── */}
      <SidePanel side="right" title="Un legajo digital, conectado y seguro" icon="✅" color={C.fin} soft={C.finSoft} check={C.fin}
        items={[
          "Visibilidad en tiempo real",
          "Menos papel, más eficiencia",
          "Mejores decisiones de crédito",
          "Colaboración transparente",
          "Relación ágil entre las partes",
        ]}/>

    </div>
  )
}
