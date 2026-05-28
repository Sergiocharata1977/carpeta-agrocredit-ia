"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  createFinancingRequestSchema,
  type CreateFinancingRequestInput,
} from "@/lib/schemas/financing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { AccessGrant } from "@/types/access"

interface FinancingRequestFormProps {
  requesterOrganizationId: string
  grants?: AccessGrant[]
  onSubmit: (data: CreateFinancingRequestInput) => Promise<void> | void
  isLoading?: boolean
}

const FINANCING_TYPE_OPTIONS = [
  { value: "working_capital", label: "Capital de trabajo" },
  { value: "investment", label: "Inversion" },
  { value: "mortgage", label: "Hipotecario" },
  { value: "commercial_credit", label: "Credito comercial" },
  { value: "leasing", label: "Leasing" },
  { value: "other", label: "Otro" },
] as const

export function FinancingRequestForm({
  requesterOrganizationId,
  grants = [],
  onSubmit,
  isLoading = false,
}: FinancingRequestFormProps) {
  const [requiredDocumentsText, setRequiredDocumentsText] = useState("")
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateFinancingRequestInput>({
    resolver: zodResolver(createFinancingRequestSchema),
    defaultValues: {
      requesterOrganizationId,
      grantId: null,
      financingType: "working_capital",
      currency: "ARS",
      termMonths: 12,
      requiredDocuments: [],
    },
  })

  const financingType = watch("financingType")
  const currency = watch("currency")
  const grantId = watch("grantId")

  function submit(data: CreateFinancingRequestInput) {
    const requiredDocuments = requiredDocumentsText
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean)

    return onSubmit({
      ...data,
      requesterOrganizationId,
      grantId: data.grantId || null,
      requiredDocuments,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-5">
      <input
        type="hidden"
        value={requesterOrganizationId}
        {...register("requesterOrganizationId")}
      />

      <div className="space-y-1.5">
        <Label htmlFor="producerId">ID del productor</Label>
        <Input id="producerId" {...register("producerId")} />
        {errors.producerId && (
          <p className="text-xs text-destructive">{errors.producerId.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Grant asociado</Label>
        <Select
          value={grantId ?? "none"}
          onValueChange={(value) =>
            setValue("grantId", value === "none" ? null : value, { shouldValidate: true })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar grant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin grant vigente</SelectItem>
            {grants.map((grant) => (
              <SelectItem key={grant.id} value={grant.id}>
                {grant.producerId} · vence {new Date(grant.expiresAt).toLocaleDateString("es-AR")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select
            value={financingType}
            onValueChange={(value) =>
              setValue("financingType", value as CreateFinancingRequestInput["financingType"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FINANCING_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Moneda</Label>
          <Select
            value={currency}
            onValueChange={(value) =>
              setValue("currency", value as CreateFinancingRequestInput["currency"], {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ARS">ARS</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Monto</Label>
          <Input id="amount" type="number" min={1} {...register("amount", { valueAsNumber: true })} />
          {errors.amount && (
            <p className="text-xs text-destructive">{errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="termMonths">Plazo en meses</Label>
          <Input
            id="termMonths"
            type="number"
            min={1}
            max={360}
            {...register("termMonths", { valueAsNumber: true })}
          />
          {errors.termMonths && (
            <p className="text-xs text-destructive">{errors.termMonths.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="purpose">Destino</Label>
        <Textarea id="purpose" {...register("purpose")} />
        {errors.purpose && (
          <p className="text-xs text-destructive">{errors.purpose.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requiredDocuments">Documentacion requerida</Label>
        <Textarea
          id="requiredDocuments"
          value={requiredDocumentsText}
          onChange={(event) => setRequiredDocumentsText(event.target.value)}
          placeholder="Una por linea o separadas por coma"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="observations">Observaciones</Label>
        <Textarea id="observations" {...register("observations")} />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Spinner className="mr-2" />}
        Crear solicitud
      </Button>
    </form>
  )
}
