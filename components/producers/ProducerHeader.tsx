"use client"

import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { OrganizationProfile, TaxCondition } from "@/types/producer-profile"
import type { Producer } from "@/types/producer"

const PERSON_TYPE_LABELS: Record<string, string> = {
  physical: "Persona fisica",
  legal: "Persona juridica",
}

const ACTIVITY_LABELS: Record<string, string> = {
  agriculture: "Agricultura",
  livestock: "Ganaderia",
  mixed: "Mixta",
  horticulture: "Horticultura",
  forestry: "Forestal",
  other: "Otra",
}

const FOLDER_STATUS_LABELS: Record<string, string> = {
  incomplete: "Incompleto",
  in_progress: "En progreso",
  complete: "Completo",
  under_review: "En revision",
  outdated: "Desactualizado",
  archived: "Archivado",
}

const TAX_CONDITION_LABELS: Record<TaxCondition, string> = {
  responsable_inscripto: "Resp. inscripto",
  monotributista: "Monotributo",
  exento: "Exento",
  consumidor_final: "Consumidor final",
  otro: "Otra condicion",
}

interface ProducerHeaderProps {
  producer: Producer | null
  profile?: OrganizationProfile | null
  loading?: boolean
}

export function ProducerHeader({ producer, profile, loading }: ProducerHeaderProps) {
  if (loading) {
    return (
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight">
          {producer?.legalName ?? "Productor"}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>CUIT: {producer?.taxId ?? "-"}</span>
          <span aria-hidden="true">|</span>
          <span>{PERSON_TYPE_LABELS[producer?.personType ?? ""] ?? "Tipo no informado"}</span>
          <span aria-hidden="true">|</span>
          <span>{ACTIVITY_LABELS[producer?.activity ?? ""] ?? "Actividad no informada"}</span>
        </div>
        {(producer?.province || producer?.city) && (
          <p className="mt-1 text-sm text-muted-foreground">
            {[producer?.city, producer?.province].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {profile?.taxCondition && (
          <Badge variant="secondary">{TAX_CONDITION_LABELS[profile.taxCondition]}</Badge>
        )}
        <Badge variant="outline">
          {FOLDER_STATUS_LABELS[producer?.folderStatus ?? ""] ?? "Sin estado"}
        </Badge>
      </div>
    </div>
  )
}
