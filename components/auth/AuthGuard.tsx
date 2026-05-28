"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/session"
import type { UserRole } from "@/types/auth"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: UserRole[]
  redirectTo?: string
}

export function AuthGuard({ children, requiredRoles, redirectTo = "/login" }: AuthGuardProps) {
  const { user, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    if (!user) {
      router.replace(redirectTo)
      return
    }

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRequired = requiredRoles.some((role) => user.roles.includes(role))
      if (!hasRequired) {
        router.replace("/app")
      }
    }
  }, [user, loading, router, requiredRoles, redirectTo])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequired = requiredRoles.some((role) => user.roles.includes(role))
    if (!hasRequired) return null
  }

  return <>{children}</>
}
