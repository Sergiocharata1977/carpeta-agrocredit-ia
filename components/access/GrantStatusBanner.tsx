"use client"

import { Clock, Shield, ShieldAlert, ShieldOff } from "lucide-react"
import type { AccessGrant, AccessScope } from "@/types/access"

const SCOPE_LABELS: Record<AccessScope, string> = {
  profile_basic: "Perfil",
  accounting_summary: "Resumen",
  balance_sheets: "Balance",
  income_statements: "Resultados",
  tax_documents: "Impuestos",
  assets: "Bienes",
  liabilities: "Deudas",
  documents: "Documentos",
  full_credit_folder: "Carpeta completa",
}

interface GrantStatusBannerProps {
  grant: AccessGrant | null
}

export function GrantStatusBanner({ grant }: GrantStatusBannerProps) {
  if (!grant) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <ShieldOff className="size-5 shrink-0 text-red-500" />
        <p className="text-sm font-medium text-red-700">Sin acceso activo a esta carpeta.</p>
      </div>
    )
  }

  const expiresAt = new Date(grant.expiresAt)
  const now = new Date()
  const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (daysLeft <= 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <ShieldAlert className="size-5 shrink-0 text-red-500" />
        <p className="text-sm font-medium text-red-700">
          Acceso vencido el {expiresAt.toLocaleDateString("es-AR")}.
        </p>
      </div>
    )
  }

  const expiringSoon = daysLeft <= 14
  const colorClass = expiringSoon
    ? "border-amber-200 bg-amber-50"
    : "border-emerald-200 bg-emerald-50"
  const textClass = expiringSoon ? "text-amber-700" : "text-emerald-700"
  const chipClass = expiringSoon
    ? "bg-amber-100 text-amber-800"
    : "bg-emerald-100 text-emerald-800"

  return (
    <div className={`rounded-xl border px-4 py-3 ${colorClass}`}>
      <div className="flex flex-wrap items-center gap-3">
        {expiringSoon ? (
          <Clock className="size-5 shrink-0 text-amber-600" />
        ) : (
          <Shield className="size-5 shrink-0 text-emerald-600" />
        )}
        <p className={`text-sm font-medium ${textClass}`}>
          Acceso activo · vence en {daysLeft} día{daysLeft !== 1 ? "s" : ""} (
          {expiresAt.toLocaleDateString("es-AR")})
        </p>
        <div className="flex flex-wrap gap-1.5">
          {grant.allowedScopes.map((scope) => (
            <span
              key={scope}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipClass}`}
            >
              {SCOPE_LABELS[scope] ?? scope}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
