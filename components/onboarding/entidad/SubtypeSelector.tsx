"use client"

import { Banknote, Building2, CheckCircle2, Sprout, Truck, Wheat } from "lucide-react"
import type { RequestingEntitySubtype } from "@/types/auth"
import { REQUESTING_ENTITY_OPTIONS } from "@/components/onboarding/shared"
import { cn } from "@/lib/utils"

const subtypeIcons = {
  bank: Banknote,
  financial_entity: Building2,
  agro_company: Wheat,
  maquinaria_agricola: Truck,
  insumos_agricolas: Sprout,
} satisfies Record<RequestingEntitySubtype, typeof Building2>

interface SubtypeSelectorProps {
  value?: RequestingEntitySubtype
  onChange: (value: RequestingEntitySubtype) => void
  disabled?: boolean
}

export function SubtypeSelector({ value, onChange, disabled }: SubtypeSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {REQUESTING_ENTITY_OPTIONS.map((option) => {
        const Icon = subtypeIcons[option.value]
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            className={cn(
              "flex min-h-28 items-start gap-3 rounded-md border p-4 text-left transition-colors",
              isSelected
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                : "border-border hover:bg-muted/60",
            )}
            onClick={() => onChange(option.value)}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
              <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                {option.label}
                {isSelected && <CheckCircle2 className="size-4 text-[var(--brand-primary)]" />}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.description}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
