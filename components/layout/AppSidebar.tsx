"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "@/lib/auth/session"
import { cn } from "@/lib/utils"
import {
  Activity,
  Banknote,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  Plus,
  Settings,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react"
import type { UserRole } from "@/types/auth"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app/productor", icon: LayoutDashboard, roles: ["producer"] },
  { label: "Solicitudes", href: "/app/productor/financiacion", icon: FileText, roles: ["producer"] },
  { label: "Notificaciones", href: "/app/notificaciones", icon: Bell, roles: ["producer"] },
  { label: "Configuracion", href: "/app/productor/autorizaciones", icon: Settings, roles: ["producer"] },

  { label: "Dashboard", href: "/app/entidad", icon: LayoutDashboard, roles: ["bank_user", "agro_company_user"] },
  { label: "Solicitudes", href: "/app/entidad/financiacion", icon: FileText, roles: ["bank_user", "agro_company_user"] },
  { label: "Accesos", href: "/app/entidad/accesos", icon: ShieldCheck, roles: ["bank_user", "agro_company_user"] },
  { label: "Riesgo", href: "/app/notificaciones", icon: Activity, roles: ["bank_user", "agro_company_user"] },
  { label: "Reportes", href: "/app/notificaciones", icon: Banknote, roles: ["bank_user", "agro_company_user"] },
  { label: "Configuracion", href: "/app/notificaciones", icon: Settings, roles: ["bank_user", "agro_company_user"] },

  { label: "Dashboard", href: "/app/admin", icon: LayoutDashboard, roles: ["admin_platform"] },
  { label: "Estudios", href: "/app/admin/estudios", icon: Building2, roles: ["admin_platform"] },
  { label: "Usuarios", href: "/app/admin/organizaciones", icon: Users, roles: ["admin_platform"] },
  { label: "Accesos", href: "/app/entidad/accesos", icon: ShieldCheck, roles: ["admin_platform"] },
  { label: "Auditoria", href: "/app/admin/auditoria", icon: FileText, roles: ["admin_platform"] },
  { label: "Configuracion", href: "/app/notificaciones", icon: Settings, roles: ["admin_platform"] },

  { label: "Dashboard", href: "/app/contador", icon: LayoutDashboard, roles: ["accountant", "accounting_firm_admin"] },
  { label: "Clientes", href: "/app/contador/clientes", icon: Users, roles: ["accountant", "accounting_firm_admin"] },
  { label: "Empresas", href: "/app/contador/empresas", icon: Building2, roles: ["accountant", "accounting_firm_admin"] },
]

const ROLE_META: Record<string, { actionLabel: string }> = {
  producer: { actionLabel: "Nueva Solicitud" },
  bank_user: { actionLabel: "Nueva Solicitud" },
  agro_company_user: { actionLabel: "Nueva Solicitud" },
  admin_platform: { actionLabel: "Nuevo Acceso" },
  accountant: { actionLabel: "Nuevo Cliente" },
  accounting_firm_admin: { actionLabel: "Nuevo Cliente" },
}

export function AppSidebar() {
  const { user, loading } = useSession()
  const pathname = usePathname()

  if (loading || !user) return null

  const primaryRole = user.roles[0]
  const roleMeta = ROLE_META[primaryRole] ?? ROLE_META.producer
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.some((role) => user.roles.includes(role)))

  return (
    <aside className="hidden min-h-screen w-[20rem] shrink-0 border-r border-[var(--brand-line)] bg-[var(--sidebar)] shadow-[16px_0_34px_rgba(17,33,50,0.06)] lg:flex lg:flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--brand-line)] px-5">
        <Link href="/app" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand-primary)] text-white shadow-sm">
            <Sprout className="size-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight tracking-tight text-[var(--brand-ink)]">Legajo</p>
            <p className="text-[10px] font-medium leading-none text-[var(--brand-muted)]">Carpeta agrofinanciera</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2 px-4">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex h-14 items-center gap-4 rounded-2xl px-5 text-[1.05rem] font-medium transition",
                isActive
                  ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-[0_12px_24px_var(--brand-accent-shadow)]"
                  : "text-[var(--brand-ink)] hover:bg-white hover:shadow-sm"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-[var(--brand-line)] px-5 py-6">
        <button className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[var(--brand-green)] text-lg font-semibold text-white shadow-[0_16px_32px_rgba(6,60,49,0.22)] transition hover:opacity-95">
          <Plus className="h-5 w-5" />
          {roleMeta.actionLabel}
        </button>
      </div>
    </aside>
  )
}
