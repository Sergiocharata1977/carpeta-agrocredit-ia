"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { accountingFirmOnboardingSchema } from "@/lib/schemas/onboarding"

const firmSchema = accountingFirmOnboardingSchema.shape.firm
export type AccountingFirmValues = z.infer<typeof firmSchema>

interface AccountingFirmFormProps {
  defaultValues?: Partial<AccountingFirmValues>
  loading?: boolean
  onBack: () => void
  onSubmit: (values: AccountingFirmValues) => void
}

export function AccountingFirmForm({
  defaultValues,
  loading,
  onBack,
  onSubmit,
}: AccountingFirmFormProps) {
  const form = useForm<AccountingFirmValues>({
    resolver: zodResolver(firmSchema),
    defaultValues: {
      legalName: defaultValues?.legalName ?? "",
      taxId: defaultValues?.taxId ?? "",
      contactName: defaultValues?.contactName ?? "",
      contactPhone: defaultValues?.contactPhone ?? "",
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos del estudio contable</CardTitle>
        <p className="text-sm text-muted-foreground">
          El estudio queda creado como organizacion accounting_firm y tu usuario como miembro activo.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="firmLegalName">Razon social</Label>
              <Input id="firmLegalName" {...form.register("legalName")} />
              {form.formState.errors.legalName && (
                <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firmTaxId">CUIT</Label>
              <Input id="firmTaxId" inputMode="numeric" maxLength={11} {...form.register("taxId")} />
              {form.formState.errors.taxId && (
                <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">Responsable</Label>
              <Input id="contactName" {...form.register("contactName")} />
              {form.formState.errors.contactName && (
                <p className="text-sm text-destructive">{form.formState.errors.contactName.message}</p>
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
