"use client"

import type { LucideIcon } from "lucide-react"
import type { CSSProperties } from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StepItem {
  id: number
  label: string
}

export interface ApiErrorPayload {
  error?: string
  message?: string
}

export async function postJson<TResponse>(
  url: string,
  body: unknown,
  token?: string | null,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    let payload: ApiErrorPayload | null = null
    try {
      payload = (await response.json()) as ApiErrorPayload
    } catch {
      payload = null
    }

    throw new Error(payload?.error ?? payload?.message ?? "No se pudo completar la operacion")
  }

  return response.json() as Promise<TResponse>
}

export function StepIndicator({ steps, currentStep }: { steps: StepItem[]; currentStep: number }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[repeat(var(--step-count),minmax(0,1fr))]" style={{ "--step-count": steps.length } as CSSProperties}>
      {steps.map((step) => {
        const isDone = step.id < currentStep
        const isCurrent = step.id === currentStep

        return (
          <div
            key={step.id}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-md border px-3 py-2 text-sm",
              isCurrent && "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--brand-primary)]",
              isDone && "border-emerald-200 bg-emerald-50 text-emerald-700",
              !isCurrent && !isDone && "border-border bg-background text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                isCurrent && "border-[var(--brand-primary)]",
                isDone && "border-emerald-500 bg-emerald-500 text-white",
              )}
            >
              {isDone ? <Check className="size-3.5" /> : step.id}
            </span>
            <span className="leading-tight">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export const ACTIVITY_OPTIONS = [
  { value: "agriculture", label: "Agricultura" },
  { value: "livestock", label: "Ganaderia" },
  { value: "mixed", label: "Mixta" },
  { value: "horticulture", label: "Horticultura" },
  { value: "forestry", label: "Forestal" },
  { value: "other", label: "Otra" },
] as const

export const PERSON_TYPE_OPTIONS = [
  { value: "physical", label: "Persona fisica" },
  { value: "legal", label: "Persona juridica" },
] as const

export const REQUESTING_ENTITY_OPTIONS = [
  {
    value: "bank",
    label: "Banco",
    description: "Entidad bancaria regulada.",
  },
  {
    value: "financial_entity",
    label: "Financiera",
    description: "Credito, leasing o mercado de capitales.",
  },
  {
    value: "agro_company",
    label: "Agro",
    description: "Acopio, cooperativa o comercial agricola.",
  },
  {
    value: "maquinaria_agricola",
    label: "Maquinaria agricola",
    description: "Concesionaria o proveedor de equipos.",
  },
  {
    value: "insumos_agricolas",
    label: "Insumos agricolas",
    description: "Semillas, fitosanitarios, fertilizantes u otros insumos.",
  },
] as const

export interface SelectableOption<TValue extends string = string> {
  value: TValue
  label: string
  description?: string
  icon?: LucideIcon
}
