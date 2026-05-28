"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  createAccessRequestSchema,
  type CreateAccessRequestInput,
} from "@/lib/schemas/access"
import { GrantScopePicker } from "@/components/access/GrantScopePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import type { AccessScope } from "@/types/access"

interface AccessRequestFormProps {
  requesterOrganizationId: string
  onSubmit: (data: CreateAccessRequestInput) => Promise<void> | void
  isLoading?: boolean
}

export function AccessRequestForm({
  requesterOrganizationId,
  onSubmit,
  isLoading = false,
}: AccessRequestFormProps) {
  const [scopes, setScopes] = useState<AccessScope[]>(["profile_basic"])
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateAccessRequestInput>({
    resolver: zodResolver(createAccessRequestSchema),
    defaultValues: {
      requesterOrganizationId,
      requestedScopes: scopes,
      requestedExpirationDays: 90,
      purpose: "",
    },
  })

  function handleScopesChange(nextScopes: AccessScope[]) {
    setScopes(nextScopes)
    setValue("requestedScopes", nextScopes, { shouldValidate: true })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <input
        type="hidden"
        value={requesterOrganizationId}
        {...register("requesterOrganizationId")}
      />

      <div className="space-y-1.5">
        <Label htmlFor="producerId">ID del productor</Label>
        <Input
          id="producerId"
          placeholder="producerId de la carpeta"
          {...register("producerId")}
          aria-invalid={!!errors.producerId}
        />
        {errors.producerId && (
          <p className="text-xs text-destructive">{errors.producerId.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="purpose">Finalidad</Label>
        <Textarea
          id="purpose"
          placeholder="Ej: evaluacion de linea de capital de trabajo"
          {...register("purpose")}
          aria-invalid={!!errors.purpose}
        />
        {errors.purpose && (
          <p className="text-xs text-destructive">{errors.purpose.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="requestedExpirationDays">Vigencia solicitada</Label>
        <Input
          id="requestedExpirationDays"
          type="number"
          min={1}
          max={365}
          {...register("requestedExpirationDays", { valueAsNumber: true })}
          aria-invalid={!!errors.requestedExpirationDays}
        />
        {errors.requestedExpirationDays && (
          <p className="text-xs text-destructive">
            {errors.requestedExpirationDays.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Alcance solicitado</Label>
        <GrantScopePicker value={scopes} onChange={handleScopesChange} />
        {errors.requestedScopes && (
          <p className="text-xs text-destructive">{errors.requestedScopes.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Spinner className="mr-2" />}
        Solicitar acceso
      </Button>
    </form>
  )
}
