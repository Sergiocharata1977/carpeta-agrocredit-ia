"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import type { AgroActivity, OrganizationType } from "@/types/auth"

const ACTIVITY_LABELS: Record<AgroActivity, string> = {
  agriculture: "Agricultura",
  livestock: "Ganaderia",
  mixed: "Mixta",
  horticulture: "Horticultura",
  forestry: "Forestal",
  other: "Otra",
}

interface EmpresaHeaderProps {
  legalName?: string
  taxId?: string
  activity?: AgroActivity
  province?: string
  city?: string
  orgType?: OrganizationType
  parentLegalName?: string
  parentClientId?: string
  loading?: boolean
}

export function EmpresaHeader({
  legalName,
  taxId,
  activity,
  province,
  city,
  orgType,
  parentLegalName,
  parentClientId,
  loading,
}: EmpresaHeaderProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-4 w-48" />
      </div>
    )
  }

  const isPersonaFisica = orgType === "system_user"

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-bold tracking-tight">
            {legalName ?? "Empresa"}
          </h1>
          <Badge variant={isPersonaFisica ? "secondary" : "outline"}>
            {isPersonaFisica ? "Persona Fisica" : "Empresa"}
          </Badge>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          {taxId && <span>CUIT: {taxId}</span>}
          {activity && (
            <>
              <span aria-hidden="true">|</span>
              <span>{ACTIVITY_LABELS[activity] ?? activity}</span>
            </>
          )}
          {(city || province) && (
            <>
              <span aria-hidden="true">|</span>
              <span>{[city, province].filter(Boolean).join(", ")}</span>
            </>
          )}
        </div>

        {parentLegalName && (
          <p className="mt-1 text-sm text-muted-foreground">
            Cliente:{" "}
            {parentClientId ? (
              <Link
                href={`/app/contador/clientes/${parentClientId}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {parentLegalName}
              </Link>
            ) : (
              parentLegalName
            )}
          </p>
        )}
      </div>
    </div>
  )
}
