"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { NotificationBell } from "@/components/notifications/NotificationBell"
import { AppUserMenu } from "@/components/layout/AppUserMenu"
import { useSession } from "@/lib/auth/session"

const PAGE_TITLES: Record<string, { title: string; subtitle: string; roleLabel?: string }> = {
  "/app/productor": {
    title: "Panel de Control",
    subtitle: "Resumen de tu carpeta, autorizaciones y estado del legajo.",
    roleLabel: "Productor / Cliente",
  },
  "/app/entidad": {
    title: "Panel de Entidad",
    subtitle: "Carpetas autorizadas y pedidos de informacion activos.",
    roleLabel: "Entidad Financiera / Comercial",
  },
  "/app/entidad/financiacion": {
    title: "Pedidos de Informacion",
    subtitle: "Pedidos de acceso a carpetas enviados y su estado de gestion.",
    roleLabel: "Entidad Financiera / Comercial",
  },
  "/app/entidad/accesos": {
    title: "Accesos y Grants",
    subtitle: "Solicitudes de acceso y grants vigentes a carpetas de clientes.",
    roleLabel: "Entidad Financiera / Comercial",
  },
  "/app/admin": {
    title: "Consola de Administracion",
    subtitle: "Control central del ecosistema, accesos y operaciones sensibles.",
    roleLabel: "Administrador de Plataforma",
  },
  "/app/admin/auditoria": {
    title: "Auditoria del Sistema",
    subtitle: "Registro completo de acciones sensibles: registros, aprobaciones, accesos y cambios de estado.",
    roleLabel: "Administrador de Plataforma",
  },
  "/app/admin/estudios": {
    title: "Estudios Contables",
    subtitle: "Contadores y estudios registrados. Desde aqui podés habilitar o rechazar cuentas pendientes.",
    roleLabel: "Administrador de Plataforma",
  },
  "/app/admin/clientes": {
    title: "Clientes / Productores",
    subtitle: "Todos los titulares de carpeta registrados y el estado de su legajo.",
    roleLabel: "Administrador de Plataforma",
  },
  "/app/admin/entidades": {
    title: "Entidades y Financistas",
    subtitle: "Bancos, financieras y empresas agrocomerciales registradas en la plataforma.",
    roleLabel: "Administrador de Plataforma",
  },
  "/app/admin/organizaciones": {
    title: "Todas las Organizaciones",
    subtitle: "Vista consolidada de todas las organizaciones registradas por tipo.",
    roleLabel: "Administrador de Plataforma",
  },
  "/app/contador": {
    title: "Panel Contador",
    subtitle: "Gestion de carpetas de clientes y estudios contables.",
    roleLabel: "Estudio Contable",
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
    if (pathname.startsWith("/app/admin/auditoria")) return PAGE_TITLES["/app/admin/auditoria"]
    if (pathname.startsWith("/app/admin/estudios")) return PAGE_TITLES["/app/admin/estudios"]
    if (pathname.startsWith("/app/admin/clientes")) return PAGE_TITLES["/app/admin/clientes"]
    if (pathname.startsWith("/app/admin/entidades")) return PAGE_TITLES["/app/admin/entidades"]
    if (pathname.startsWith("/app/admin/organizaciones")) return PAGE_TITLES["/app/admin/organizaciones"]
    if (pathname.startsWith("/app/admin")) return PAGE_TITLES["/app/admin"]
    if (pathname.startsWith("/app/productor")) return PAGE_TITLES["/app/productor"]
    if (pathname.startsWith("/app/entidad/financiacion")) return PAGE_TITLES["/app/entidad/financiacion"]
    if (pathname.startsWith("/app/entidad/accesos")) return PAGE_TITLES["/app/entidad/accesos"]
    if (pathname.startsWith("/app/entidad")) return PAGE_TITLES["/app/entidad"]
    if (pathname.startsWith("/app/contador")) return PAGE_TITLES["/app/contador"]
    return {
      title: "AgroCredit Hub",
      subtitle: user?.displayName ?? "Operacion agrofinanciera",
    }
  }, [pathname, user?.displayName])

  return (
    <header className="flex flex-col gap-5 rounded-[1.8rem] border border-[var(--brand-line)] bg-white/85 px-5 py-5 shadow-[0_18px_40px_rgba(17,33,50,0.06)] backdrop-blur lg:flex-row lg:items-start lg:justify-between lg:px-7">
      <div className="min-w-0">
        {content.roleLabel && (
          <span className="mb-2 inline-flex items-center rounded-full border border-[var(--brand-line)] bg-[var(--brand-surface-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
            {content.roleLabel}
          </span>
        )}
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
