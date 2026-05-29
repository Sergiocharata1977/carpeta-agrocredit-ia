"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { logoutAdmin } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import { cn } from "@/lib/utils"
import {
  Activity,
  Banknote,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  LogOut,
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
  { label: "Usuarios", href: "/app/admin/organizaciones", icon: Users, roles: ["admin_platform"] },
  { label: "Accesos", href: "/app/entidad/accesos", icon: ShieldCheck, roles: ["admin_platform"] },
  { label: "Auditoria", href: "/app/admin/auditoria", icon: FileText, roles: ["admin_platform"] },
  { label: "Configuracion", href: "/app/notificaciones", icon: Settings, roles: ["admin_platform"] },

  { label: "Dashboard", href: "/app/contador", icon: LayoutDashboard, roles: ["accountant", "accounting_firm_admin"] },
  { label: "Productores", href: "/app/contador/productores", icon: Building2, roles: ["accountant", "accounting_firm_admin"] },
]

const ROLE_META: Record<string, { subtitle: string; actionLabel: string; avatar: string }> = {
  producer: { subtitle: "Productor Premium", actionLabel: "Nueva Solicitud", avatar: "CM" },
  bank_user: { subtitle: "Oficial de Credito", actionLabel: "Nueva Solicitud", avatar: "OC" },
  agro_company_user: { subtitle: "Oficial de Credito", actionLabel: "Nueva Solicitud", avatar: "OC" },
  admin_platform: { subtitle: "Super Admin", actionLabel: "Nuevo Acceso", avatar: "AR" },
  accountant: { subtitle: "Contador", actionLabel: "Nueva Carpeta", avatar: "CT" },
  accounting_firm_admin: { subtitle: "Admin Estudio", actionLabel: "Nueva Carpeta", avatar: "AF" },
}

export function AppSidebar() {
  const { user, loading } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  if (loading || !user) return null

  const primaryRole = user.roles[0]
  const roleMeta = ROLE_META[primaryRole] ?? ROLE_META.producer
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.some((role) => user.roles.includes(role)))

  async function handleLogout() {
    await logoutAdmin()
    router.replace("/login")
  }

  return (
    <aside className="hidden min-h-screen w-[20rem] shrink-0 border-r border-[var(--brand-line)] bg-[var(--sidebar)] shadow-[16px_0_34px_rgba(17,33,50,0.06)] lg:flex lg:flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--brand-line)] px-5">
        <Link href="/app" className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#063c31] text-white shadow-sm">
            <Sprout className="size-4" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight tracking-tight text-[var(--brand-ink)]">AgroCredit IA</p>
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
                  ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] shadow-[0_12px_24px_rgba(111,132,246,0.2)]"
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

        <div className="mt-8 flex items-center gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm">
          <div className="flex h-13 w-13 items-center justify-center rounded-full bg-[var(--brand-blue-soft)] text-sm font-bold text-[var(--brand-blue)]">
            {roleMeta.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-[var(--brand-ink)]">
              {user.displayName ?? "Usuario AgroCredit"}
            </p>
            <p className="truncate text-sm text-[var(--brand-muted)]">{roleMeta.subtitle}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[var(--brand-line)] bg-white text-sm font-semibold text-[var(--brand-ink)] transition hover:bg-[var(--brand-surface-strong)]"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  )
}
