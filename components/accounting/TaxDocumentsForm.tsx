"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createTaxDocumentSchema,
  type CreateTaxDocumentInput,
} from "@/lib/schemas/accounting"
import { createTaxDocument } from "@/lib/services/tax-documents"
import type { TaxDocumentType } from "@/types/accounting"

interface TaxDocumentsFormProps {
  producerId: string
  organizationId: string
  periodId: string
  createdBy: string
  onSuccess: (id: string) => void
}

const TAX_TYPE_LABELS: Record<TaxDocumentType, string> = {
  iva_monthly: "IVA mensual",
  income_tax_annual: "Ganancias anual",
  income_tax_advance: "Ganancias anticipo",
  social_security: "931 — Seguridad Social",
  gross_income: "IIBB",
  other: "Otro",
}

export function TaxDocumentsForm({
  producerId,
  organizationId,
  periodId,
  createdBy,
  onSuccess,
}: TaxDocumentsFormProps) {
  const form = useForm<CreateTaxDocumentInput>({
    resolver: zodResolver(createTaxDocumentSchema),
    defaultValues: {
      producerId,
      organizationId,
      periodId,
      taxType: "iva_monthly",
      fiscalPeriod: "",
      amount: 0,
      currency: "ARS",
      observations: "",
      documentIds: [],
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: CreateTaxDocumentInput) {
    try {
      const id = await createTaxDocument(values, createdBy)
      toast.success("Documento fiscal guardado correctamente")
      form.reset({
        producerId,
        organizationId,
        periodId,
        taxType: "iva_monthly",
        fiscalPeriod: "",
        amount: 0,
        currency: "ARS",
        observations: "",
        documentIds: [],
      })
      onSuccess(id)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al guardar el documento fiscal"
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="taxType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de impuesto</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(Object.entries(TAX_TYPE_LABELS) as [TaxDocumentType, string][]).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fiscalPeriod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Período fiscal</FormLabel>
                <FormControl>
                  <Input placeholder="ej: 2024-03, 2024" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Importe</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ARS">ARS — Pesos</SelectItem>
                    <SelectItem value="USD">USD — Dólares</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Guardando..." : "Guardar impuesto"}
        </Button>
      </form>
    </Form>
  )
}
