"use client"

import { Lock } from "lucide-react"
import type { AccessGrant, AccessScope } from "@/types/access"

interface ScopeGuardProps {
  grant: AccessGrant | null
  requiredScope: AccessScope
  sectionLabel?: string
  children: React.ReactNode
}

function isGrantCurrentlyActive(grant: AccessGrant): boolean {
  if (grant.status !== "approved") return false
  const expires = new Date(grant.expiresAt)
  return expires > new Date()
}

export function ScopeGuard({ grant, requiredScope, sectionLabel, children }: ScopeGuardProps) {
  const active = grant && isGrantCurrentlyActive(grant)
  const hasScope =
    active &&
    (grant.allowedScopes.includes(requiredScope) ||
      grant.allowedScopes.includes("full_credit_folder"))

  if (!hasScope) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--brand-line)] bg-[var(--brand-surface)] px-6 py-10 text-center">
        <Lock className="size-7 text-muted-foreground/40" />
        <p className="text-sm font-medium text-muted-foreground">
          {sectionLabel
            ? `${sectionLabel} no está incluida en tu acceso`
            : "Esta sección no está incluida en tu acceso"}
        </p>
        <p className="text-xs text-muted-foreground/70">
          Solicitá al cliente que amplíe el alcance del acceso.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
