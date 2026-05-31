"use client"

import type React from "react"
import { useEffect } from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { useSession } from "@/lib/auth/session"

function resolveRoleTheme(roles: string[]): string {
  if (roles.includes("accounting_firm_admin")) return "accounting_firm_admin"
  if (roles.includes("accountant")) return "accountant"
  if (roles.includes("bank_user") || roles.includes("agro_company_user")) return "requesting_entity"
  if (roles.includes("admin_platform")) return "admin_platform"
  return "producer"
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { user } = useSession()
  const roleTheme = resolveRoleTheme(user?.roles ?? [])

  useEffect(() => {
    document.body.dataset.roleTheme = roleTheme

    return () => {
      delete document.body.dataset.roleTheme
    }
  }, [roleTheme])

  return (
    <div data-role-theme={roleTheme} className="ag-shell-bg flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AppShellContent>{children}</AppShellContent>
    </AuthGuard>
  )
}
