import type React from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { AppHeader } from "@/components/layout/AppHeader"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="ag-shell-bg flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1 overflow-auto px-4 py-4 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  )
}
