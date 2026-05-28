"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/session"
import { getDefaultDashboardRoute } from "@/lib/auth/roles"

export default function AppIndexPage() {
  const { user, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace("/login")
      return
    }
    router.replace(getDefaultDashboardRoute(user.roles))
  }, [user, loading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}
