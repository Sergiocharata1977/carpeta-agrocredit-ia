"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { createLiabilitySchema } from "@/lib/schemas/assets"
import { createLiability, updateLiability } from "@/lib/services/liabilities"
import type { Liability, LiabilityType } from "@/types/assets"
import type { CreateLiabilityInput } from "@/lib/schemas/assets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LIABILITY_TYPE_OPTIONS: { value: LiabilityType; label: string }[] = [
  { value: "bank_loan", label: "Préstamo bancario" },
  { value: "commercial_credit", label: "Crédito comercial" },
  { value: "leasing", label: "Leasing" },
  { value: "mortgage", label: "Hipoteca" },
  { value: "pledge", label: "Prenda" },
  { value: "tax_debt", label: "Deuda fiscal" },
  { value: "other", label: "Otro" },
]

interface Props {
  producerId: string
  organizationId: string
  createdBy: string
  defaultValues?: Partial<Liability>
  onSuccess: () => void
}

export function LiabilityForm({
  producerId,
  organizationId,
  createdBy,
  defaultValues,
  onSuccess,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateLiabilityInput>({
    resolver: zodResolver(createLiabilitySchema),
    defaultValues: {
      producerId,
      organizationId,
      creditor: defaultValues?.creditor ?? "",
      liabilityType: defaultValues?.liabilityType ?? "bank_loan",
      amount: defaultValues?.amount ?? 0,
      currency: defaultValues?.currency ?? "ARS",
      dueDate: defaultValues?.dueDate ?? "",
      guaranteeType: defaultValues?.guaranteeType ?? "",
      observations: defaultValues?.observations ?? "",
      documentIds: defaultValues?.documentIds ?? [],
    },
  })

  async function onSubmit(values: CreateLiabilityInput) {
    setIsSubmitting(true)
    try {
      if (isEditing && defaultValues?.id) {
        await updateLiability(defaultValues.id, values)
        toast.success("Deuda actualizada correctamente")
      } else {
        await createLiability(
          {
            ...values,
            producerId,
            organizationId,
            createdBy,
          },
          createdBy
        )
        toast.success("Deuda registrada correctamente")
      }
      onSuccess()
    } catch {
      toast.error("Ocurrió un error al guardar la deuda")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="creditor"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Acreedor</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Banco Nación Argentina" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="liabilityType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de deuda</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LIABILITY_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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
                    placeholder="0.00"
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
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ARS">ARS — Peso argentino</SelectItem>
                    <SelectItem value="USD">USD — Dólar estadounidense</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fecha de vencimiento</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="guaranteeType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de garantía (opcional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Hipotecaria, Prendaria, Personal..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre la deuda..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : isEditing
              ? "Guardar cambios"
              : "Agregar deuda"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
