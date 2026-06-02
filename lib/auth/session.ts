"use client"

import { useState, useEffect } from "react"
import { subscribeAuthState } from "@/lib/firebase/auth-client"
import type { User } from "@/lib/firebase/auth-client"
import type { UserRole } from "@/types/auth"

export interface SessionUser {
  uid: string
  email: string | null
  displayName: string | null
  roles: UserRole[]
  defaultOrganizationId: string | null
  orgStatus: string | null
}

// Hook: estado de sesión reactivo
export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = subscribeAuthState(async (firebaseUser: User | null) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      // Leer custom claims del token (roles y defaultOrganizationId los setea el Admin SDK)
      const token = await firebaseUser.getIdTokenResult()
      const claims = token.claims as Record<string, unknown>

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        roles: (claims.roles as UserRole[]) ?? [],
        defaultOrganizationId: (claims.defaultOrganizationId as string) ?? null,
        orgStatus: (claims.orgStatus as string) ?? null,
      })
      setLoading(false)
    })

    return unsubscribe
  }, [])

  return { user, loading }
}
