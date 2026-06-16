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
  ClipboardList,
  FileText,
  LayoutDashboard,
  Plus,
  Settings,
  ShieldCheck,
  Sprout,
  UserRound,
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
  // Productor
  { label: "Dashboard", href: "/app/productor", icon: LayoutDashboard, roles: ["producer"] },
  { label: "Mi Perfil", href: "/app/productor/perfil", icon: UserRound, roles: ["producer"] },
  { label: "Mi Contador", href: "/app/productor/contador", icon: Building2, roles: ["producer"] },
  { label: "Mi Carpeta", href: "/app/productor/carpeta", icon: FileText, roles: ["producer"] },
  { label: "Habilitaciones", href: "/app/productor/financiacion", icon: ShieldCheck, roles: ["producer"] },
  { label: "Autorizaciones", href: "/app/productor/autorizaciones", icon: Settings, roles: ["producer"] },
  { label: "Notificaciones", href: "/app/notificaciones", icon: Bell, roles: ["producer"] },

  // Entidad financiera / comercial
  { label: "Dashboard", href: "/app/entidad", icon: LayoutDashboard, roles: ["bank_user", "agro_company_user"] },
  { label: "Pedidos", href: "/app/entidad/financiacion", icon: FileText, roles: ["bank_user", "agro_company_user"] },
  { label: "Accesos", href: "/app/entidad/accesos", icon: ShieldCheck, roles: ["bank_user", "agro_company_user"] },
  { label: "Requisitos", href: "/app/entidad/requisitos", icon: ClipboardList, roles: ["bank_user", "agro_company_user"] },
  { label: "Riesgo", href: "/app/notificaciones", icon: Activity, roles: ["bank_user", "agro_company_user"] },
  { label: "Reportes", href: "/app/notificaciones", icon: Banknote, roles: ["bank_user", "agro_company_user"] },
  { label: "Configuracion", href: "/app/notificaciones", icon: Settings, roles: ["bank_user", "agro_company_user"] },

  // Admin plataforma
  { label: "Dashboard", href: "/app/admin", icon: LayoutDashboard, roles: ["admin_platform"] },
  { label: "Contadores", href: "/app/admin/estudios", icon: Building2, roles: ["admin_platform"] },
  { label: "Clientes", href: "/app/admin/clientes", icon: Sprout, roles: ["admin_platform"] },
  { label: "Entidades", href: "/app/admin/entidades", icon: Users, roles: ["admin_platform"] },
  { label: "Organizaciones", href: "/app/admin/organizaciones", icon: LayoutDashboard, roles: ["admin_platform"] },
  { label: "Auditoria", href: "/app/admin/auditoria", icon: FileText, roles: ["admin_platform"] },
  { label: "Configuracion", href: "/app/notificaciones", icon: Settings, roles: ["admin_platform"] },

  // Contador
  { label: "Dashboard", href: "/app/contador", icon: LayoutDashboard, roles: ["accountant", "accounting_firm_admin"] },
  { label: "Clientes", href: "/app/contador/clientes", icon: Users, roles: ["accountant", "accounting_firm_admin"] },
  { label: "Empresas", href: "/app/contador/empresas", icon: Building2, roles: ["accountant", "accounting_firm_admin"] },
]

const ROLE_META: Record<string, { actionLabel: string; roleLabel: string; badgeClass: string }> = {
  producer: {
    actionLabel: "Habilitar legajo",
    roleLabel: "Productor / Cliente",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  bank_user: {
    actionLabel: "Nueva Solicitud",
    roleLabel: "Entidad Financiera",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
  },
  agro_company_user: {
    actionLabel: "Nueva Solicitud",
    roleLabel: "Empresa Agrocomercial",
    badgeClass: "bg-cyan-50 text-cyan-800 border-cyan-200",
  },
  admin_platform: {
    actionLabel: "Nuevo Acceso",
    roleLabel: "Administrador",
    badgeClass: "bg-violet-50 text-violet-800 border-violet-200",
  },
  accountant: {
    actionLabel: "Nuevo Cliente",
    roleLabel: "Estudio Contable",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
  accounting_firm_admin: {
    actionLabel: "Nuevo Cliente",
    roleLabel: "Estudio Contable",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
  },
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
      {/* Logo */}
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

      {/* Role indicator */}
      <div className="px-4 py-3 border-b border-[var(--brand-line)]">
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${roleMeta.badgeClass}`}>
          <div className="size-2 rounded-full bg-current opacity-60 shrink-0" />
          <span className="text-xs font-semibold">{roleMeta.roleLabel}</span>
          <span className="ml-auto text-[10px] opacity-60 truncate max-w-[8rem]">
            {user.email ?? user.displayName ?? ""}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-4 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className={cn(
                "flex h-12 items-center gap-4 rounded-2xl px-5 text-[1rem] font-medium transition",
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

      {/* Action button */}
      <div className="border-t border-[var(--brand-line)] px-5 py-6">
        <button className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[var(--brand-green)] text-base font-semibold text-white shadow-[0_16px_32px_rgba(6,60,49,0.22)] transition hover:opacity-95">
          <Plus className="h-5 w-5" />
          {roleMeta.actionLabel}
        </button>
      </div>
    </aside>
  )
}
