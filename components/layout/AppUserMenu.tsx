"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Bell, FileText, LayoutDashboard, LogOut, Mail, ShieldCheck, UserCircle2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSession } from "@/lib/auth/session"
import { logoutAdmin } from "@/lib/firebase/auth-client"
import type { UserRole } from "@/types/auth"

const ROLE_LABELS: Record<UserRole, string> = {
  admin_platform: "Administrador",
  producer: "Usuario del sistema",
  accountant: "Contador",
  accounting_firm_admin: "Admin estudio",
  bank_user: "Entidad solicitante",
  agro_company_user: "Entidad solicitante",
}

const HOME_BY_ROLE: Partial<Record<UserRole, string>> = {
  admin_platform: "/app/admin",
  producer: "/app/usuario",
  accountant: "/app/contador",
  accounting_firm_admin: "/app/contador",
  bank_user: "/app/entidad",
  agro_company_user: "/app/entidad",
}

function getInitials(displayName: string | null, email: string | null) {
  const source = displayName?.trim() || email?.trim() || "Usuario"
  const parts = source.split(/\s+/).filter(Boolean)

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  return source.slice(0, 2).toUpperCase()
}

export function AppUserMenu() {
  const router = useRouter()
  const { user } = useSession()

  const profile = useMemo(() => {
    if (!user) return null

    const primaryRole = user.roles[0]
    return {
      initials: getInitials(user.displayName, user.email),
      displayName: user.displayName || user.email || "Usuario AgroCredit",
      roleLabel: primaryRole ? ROLE_LABELS[primaryRole] : "Usuario",
      homeHref: primaryRole ? HOME_BY_ROLE[primaryRole] ?? "/app" : "/app",
    }
  }, [user])

  if (!user || !profile) return null

  async function handleLogout() {
    await logoutAdmin()
    router.replace("/login")
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[var(--brand-green)] text-sm font-bold text-white shadow-[0_12px_28px_rgba(6,60,49,0.22)] ring-2 ring-[var(--brand-green-soft)] transition hover:scale-[1.03] hover:bg-[var(--brand-green)]/95"
          aria-label="Menu de usuario"
        >
          {profile.initials}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.4rem] border-[var(--brand-line)] bg-white p-0 shadow-[0_28px_70px_rgba(17,33,50,0.18)]"
      >
        <div className="border-b border-[var(--brand-line)] bg-[linear-gradient(180deg,#f5fbf7_0%,#eef7f1_100%)] px-5 py-5">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-green)] text-lg font-bold text-white shadow-[0_16px_32px_rgba(6,60,49,0.18)]">
              {profile.initials}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-green)]">
                Sesion activa
              </p>
              <p className="mt-1 truncate text-lg font-semibold text-[var(--brand-ink)]">
                {profile.displayName}
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm text-[var(--brand-muted)]">
                <Mail className="h-4 w-4 text-[var(--brand-green)]" />
                <span className="truncate">{user.email ?? "Email no disponible"}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-ink)]">
                  {profile.roleLabel}
                </span>
                {user.defaultOrganizationId ? (
                  <span className="rounded-full bg-[var(--brand-green-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand-green)]">
                    Tenant activo
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <DropdownMenuItem
            onClick={() => router.push(profile.homeHref)}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--brand-line)] px-4 py-3 focus:bg-[var(--brand-surface-strong)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-green-soft)] text-[var(--brand-green)]">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--brand-ink)]">Mi panel</p>
              <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">
                Volver al espacio principal de trabajo.
              </p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/app/notificaciones")}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--brand-line)] px-4 py-3 focus:bg-[var(--brand-surface-strong)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--brand-ink)]">Notificaciones</p>
              <p className="mt-1 text-xs leading-5 text-[var(--brand-muted)]">
                Revisar avisos, autorizaciones y novedades.
              </p>
            </div>
          </DropdownMenuItem>

          <div className="rounded-2xl border border-[var(--brand-line)] bg-[var(--brand-surface)] px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--brand-green)]" />
              Identidad del acceso
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm text-[var(--brand-ink)]">
              <UserCircle2 className="h-4 w-4 text-[var(--brand-muted)]" />
              <span className="truncate">Perfil validado por Firebase Auth</span>
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm text-[var(--brand-ink)]">
              <FileText className="h-4 w-4 text-[var(--brand-muted)]" />
              <span className="truncate">Permisos por rol y organizacion</span>
            </div>
          </div>

          <DropdownMenuItem
            onClick={handleLogout}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#ffd2ce] bg-[#fff1ef] px-4 py-3 text-sm font-semibold text-[#a32b2b] focus:bg-[#ffe4e0] focus:text-[#a32b2b]"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesion
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
