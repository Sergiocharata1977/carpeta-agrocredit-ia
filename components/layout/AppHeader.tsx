"use client"

import { useSession } from "@/lib/auth/session"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export function AppHeader() {
  const { user } = useSession()

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <div /> {/* espacio para breadcrumb futuro */}
      <div className="flex items-center gap-3">
        {/* Campana de notificaciones — se conecta en Ola 4 */}
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/notificaciones">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
        <div className="text-sm text-muted-foreground">
          {user?.displayName ?? user?.email}
        </div>
      </div>
    </header>
  )
}
