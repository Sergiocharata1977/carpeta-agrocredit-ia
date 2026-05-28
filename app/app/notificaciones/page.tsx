"use client"

import { useCallback, useEffect, useState } from "react"
import { NotificationList } from "@/components/notifications/NotificationList"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/lib/auth/session"
import {
  dismissNotification,
  getNotificationsForUser,
  markNotificationRead,
} from "@/lib/services/notifications"
import { Bell, CheckCircle2, EyeOff } from "lucide-react"
import type { Notification } from "@/types/audit"

export default function NotificationsPage() {
  const { user, loading: sessionLoading } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user) {
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    setNotifications(await getNotificationsForUser(user.uid))
    setLoadingData(false)
  }, [user])

  useEffect(() => {
    if (sessionLoading) return
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar notificaciones")
      setLoadingData(false)
    })
  }, [loadData, sessionLoading])

  async function markRead(notification: Notification) {
    await markNotificationRead(notification.id)
    await loadData()
  }

  async function dismiss(notification: Notification) {
    await dismissNotification(notification.id)
    await loadData()
  }

  const unread = notifications.filter((notification) => notification.status === "unread")
  const dismissed = notifications.filter((notification) => notification.status === "dismissed")

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground text-sm">
          Centro interno de avisos operativos y vencimientos.
        </p>
      </div>

      {error && <div className="rounded-md border border-destructive p-3 text-sm">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard title="Total" value={notifications.length} icon={Bell} />
        <SummaryCard title="Nuevas" value={unread.length} icon={CheckCircle2} />
        <SummaryCard title="Ocultas" value={dismissed.length} icon={EyeOff} />
      </div>

      {sessionLoading || loadingData ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <NotificationList
          notifications={notifications.filter((notification) => notification.status !== "dismissed")}
          onMarkRead={markRead}
          onDismiss={dismiss}
        />
      )}
    </div>
  )
}
