import type React from "react"
import { AuthGuard } from "@/components/auth/AuthGuard"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Shell privado — se implementa en Ola 3 */}
        {children}
      </div>
    </AuthGuard>
  )
}
