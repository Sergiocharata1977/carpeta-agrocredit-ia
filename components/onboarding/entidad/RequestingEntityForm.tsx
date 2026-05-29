"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestingEntityOnboardingSchema } from "@/lib/schemas/onboarding"
import { SubtypeSelector } from "@/components/onboarding/entidad/SubtypeSelector"

const entitySchema = requestingEntityOnboardingSchema.shape.entity
export type RequestingEntityValues = z.infer<typeof entitySchema>

interface RequestingEntityFormProps {
  defaultValues?: Partial<RequestingEntityValues>
  loading?: boolean
  onBack: () => void
  onSubmit: (values: RequestingEntityValues) => void
}

export function RequestingEntityForm({
  defaultValues,
  loading,
  onBack,
  onSubmit,
}: RequestingEntityFormProps) {
  const form = useForm<RequestingEntityValues>({
    resolver: zodResolver(entitySchema),
    defaultValues: {
      legalName: defaultValues?.legalName ?? "",
      taxId: defaultValues?.taxId ?? "",
      subtype: defaultValues?.subtype ?? "bank",
      contactName: defaultValues?.contactName ?? "",
      contactEmail: defaultValues?.contactEmail ?? "",
      contactPhone: defaultValues?.contactPhone ?? "",
      sector: defaultValues?.sector ?? "",
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la entidad</CardTitle>
        <p className="text-sm text-muted-foreground">
          La entidad queda unificada en organizations con type requesting_entity y subtipo canonico.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label>Tipo de entidad</Label>
            <SubtypeSelector
              value={form.watch("subtype")}
              disabled={loading}
              onChange={(value) => form.setValue("subtype", value, { shouldValidate: true })}
            />
            {form.formState.errors.subtype && (
              <p className="text-sm text-destructive">{form.formState.errors.subtype.message}</p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="entityLegalName">Razon social</Label>
              <Input id="entityLegalName" {...form.register("legalName")} />
              {form.formState.errors.legalName && (
                <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entityTaxId">CUIT</Label>
              <Input id="entityTaxId" inputMode="numeric" maxLength={11} {...form.register("taxId")} />
              {form.formState.errors.taxId && (
                <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector">Sector</Label>
              <Input id="sector" placeholder="Ej: credito agro, maquinaria, insumos" {...form.register("sector")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Responsable</Label>
              <Input id="contactName" {...form.register("contactName")} />
              {form.formState.errors.contactName && (
                <p className="text-sm text-destructive">{form.formState.errors.contactName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email de contacto</Label>
              <Input id="contactEmail" type="email" {...form.register("contactEmail")} />
              {form.formState.errors.contactEmail && (
                <p className="text-sm text-destructive">{form.formState.errors.contactEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Telefono</Label>
              <Input id="contactPhone" {...form.register("contactPhone")} />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
              <ArrowLeft className="mr-2 size-4" />
              Volver
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Finalizar registro
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
