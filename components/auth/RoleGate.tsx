"use client"

import { useSession } from "@/lib/auth/session"
import type { UserRole } from "@/types/auth"

interface RoleGateProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallback?: React.ReactNode
}

export function RoleGate({ children, allowedRoles, fallback = null }: RoleGateProps) {
  const { user, loading } = useSession()

  if (loading) return null
  if (!user) return <>{fallback}</>

  const hasRole = allowedRoles.some((role) => user.roles.includes(role))
  return hasRole ? <>{children}</> : <>{fallback}</>
}
