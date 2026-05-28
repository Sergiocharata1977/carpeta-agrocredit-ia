"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/session"
import { cn } from "@/lib/utils"
import { logoutAdmin } from "@/lib/firebase/auth-client"
import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  Wheat,
  ShieldCheck,
  Activity,
} from "lucide-react"
import type { UserRole } from "@/types/auth"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  // Producer
  { label: "Dashboard", href: "/app/productor", icon: LayoutDashboard, roles: ["producer"] },
  { label: "Mi Carpeta", href: "/app/productor/carpeta", icon: FileText, roles: ["producer"] },
  { label: "Autorizaciones", href: "/app/productor/autorizaciones", icon: ShieldCheck, roles: ["producer"] },
  { label: "Financiacion", href: "/app/productor/financiacion", icon: BarChart3, roles: ["producer"] },

  // Accountant
  { label: "Dashboard", href: "/app/contador", icon: LayoutDashboard, roles: ["accountant", "accounting_firm_admin"] },
  { label: "Mis Productores", href: "/app/contador/productores", icon: Users, roles: ["accountant", "accounting_firm_admin"] },

  // Financial Entity
  { label: "Dashboard", href: "/app/entidad", icon: LayoutDashboard, roles: ["bank_user", "agro_company_user"] },
  { label: "Accesos", href: "/app/entidad/accesos", icon: ShieldCheck, roles: ["bank_user", "agro_company_user"] },
  { label: "Financiación", href: "/app/entidad/financiacion", icon: BarChart3, roles: ["bank_user", "agro_company_user"] },

  // Admin Platform
  { label: "Dashboard", href: "/app/admin", icon: LayoutDashboard, roles: ["admin_platform"] },
  { label: "Organizaciones", href: "/app/admin/organizaciones", icon: Building2, roles: ["admin_platform"] },
  { label: "Auditoría", href: "/app/admin/auditoria", icon: Settings, roles: ["admin_platform"] },
]

export function AppSidebar() {
  const { user, loading } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  if (loading || !user) return null

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.some((role) => user.roles.includes(role))
  )

  async function handleLogout() {
    await logoutAdmin()
    router.replace("/login")
  }

  return (
    <aside className="w-64 min-h-screen bg-card border-r flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b">
        <div className="flex items-center gap-2">
          <Wheat className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">AgroCredit IA</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t space-y-1">
        <div className="px-3 py-2">
          <p className="text-sm font-medium truncate">{user.displayName ?? user.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
