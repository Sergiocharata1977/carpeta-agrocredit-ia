"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useSession } from "@/lib/auth/session"
import { countUnreadNotifications, getNotificationsForUser } from "@/lib/services/notifications"
import type { Notification } from "@/types/audit"

export function NotificationBell() {
  const { user } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (!user) return

    getNotificationsForUser(user.uid, "unread").then(setNotifications).catch(() => {
      setNotifications([])
    })
  }, [user])

  const unreadCount = countUnreadNotifications(notifications)

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/app/notificaciones" aria-label="Notificaciones">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center px-1 text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Link>
    </Button>
  )
}
