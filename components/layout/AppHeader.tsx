"use client"

import { useSession } from "@/lib/auth/session"
import { NotificationBell } from "@/components/notifications/NotificationBell"

export function AppHeader() {
  const { user } = useSession()

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="text-sm text-muted-foreground">
          {user?.displayName ?? user?.email}
        </div>
      </div>
    </header>
  )
}
