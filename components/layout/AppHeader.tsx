"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AppUserMenu } from "@/components/layout/AppUserMenu"
import { useSession } from "@/lib/auth/session"

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/app/productor": {
    title: "Panel de Control",
    subtitle: "Bienvenido de nuevo. Aqui tienes un resumen de tu actividad financiera.",
  },
  "/app/entidad": {
    title: "Panel de Evaluacion",
    subtitle: "Gestion de cartera agricola y analisis de riesgo en tiempo real.",
  },
  "/app/admin": {
    title: "Consola de Administracion",
    subtitle: "Control central del ecosistema, accesos y operaciones sensibles.",
  },
  "/app/admin/auditoria": {
    title: "Trazabilidad de Auditoria",
    subtitle: "Seguimiento detallado de acciones, accesos y eventos criticos.",
  },
}

function formatToday() {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())
}

export function AppHeader() {
  const pathname = usePathname()
  const { user } = useSession()

  const content = useMemo(() => {
    const directMatch = PAGE_TITLES[pathname]
    if (directMatch) return directMatch
    if (pathname.startsWith("/app/productor")) return PAGE_TITLES["/app/productor"]
    if (pathname.startsWith("/app/entidad")) return PAGE_TITLES["/app/entidad"]
    if (pathname.startsWith("/app/admin/auditoria")) return PAGE_TITLES["/app/admin/auditoria"]
    if (pathname.startsWith("/app/admin")) return PAGE_TITLES["/app/admin"]

    return {
      title: "AgroCredit Hub",
      subtitle: user?.displayName ?? "Operacion agrofinanciera",
    }
  }, [pathname, user?.displayName])

  return (
    <header className="flex flex-col gap-5 rounded-[1.8rem] border border-[var(--brand-line)] bg-white/85 px-5 py-5 shadow-[0_18px_40px_rgba(17,33,50,0.06)] backdrop-blur lg:flex-row lg:items-start lg:justify-between lg:px-7">
      <div className="min-w-0">
        <h1 className="text-[2.2rem] font-extrabold tracking-tight text-[var(--brand-green)] lg:text-[3rem]">
          {content.title}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-[var(--brand-muted)] lg:text-[1.1rem]">
          {content.subtitle}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-[var(--brand-surface-strong)] px-4 py-3 text-[var(--brand-ink)]">
          <span className="h-3.5 w-3.5 rounded-full bg-[var(--brand-success)]" />
          <span className="text-sm font-semibold lg:text-base">Sesion activa</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[var(--brand-line)] bg-white px-4 py-3 text-[var(--brand-ink)]">
          <CalendarDays className="h-5 w-5" />
          <span className="text-sm font-semibold lg:text-base">{formatToday()}</span>
        </div>
        <div className="rounded-2xl border border-[var(--brand-line)] bg-white p-1 shadow-sm">
          <NotificationBell />
        </div>
        <AppUserMenu />
      </div>
    </header>
  )
}
