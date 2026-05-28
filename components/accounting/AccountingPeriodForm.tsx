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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createAccountingPeriodSchema,
  type CreateAccountingPeriodInput,
} from "@/lib/schemas/accounting"
import { createPeriod } from "@/lib/services/accounting-periods"

interface AccountingPeriodFormProps {
  producerId: string
  organizationId: string
  createdBy: string
  onSuccess: (periodId: string) => void
}

const PERIOD_TYPE_LABELS: Record<string, string> = {
  fiscal_year: "Año fiscal",
  campaign: "Campaña",
  semester: "Semestre",
  quarter: "Trimestre",
}

export function AccountingPeriodForm({
  producerId,
  organizationId,
  createdBy,
  onSuccess,
}: AccountingPeriodFormProps) {
  const form = useForm<CreateAccountingPeriodInput>({
    resolver: zodResolver(createAccountingPeriodSchema),
    defaultValues: {
      producerId,
      organizationId,
      year: new Date().getFullYear(),
      periodType: "fiscal_year",
      label: "",
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: CreateAccountingPeriodInput) {
    try {
      const id = await createPeriod(values, createdBy)
      toast.success("Período creado correctamente")
      onSuccess(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear el período"
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="periodType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de período</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Object.entries(PERIOD_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Año</FormLabel>
              <FormControl>
                <Input
                  type="number"
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
          name="label"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Etiqueta</FormLabel>
              <FormControl>
                <Input placeholder="ej: 2024, Campaña 2023/2024" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creando..." : "Crear período"}
        </Button>
      </form>
    </Form>
  )
}
