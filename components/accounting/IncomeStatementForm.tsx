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
  createIncomeStatementSchema,
  type CreateIncomeStatementInput,
} from "@/lib/schemas/accounting"
import { createIncomeStatement } from "@/lib/services/income-statements"

interface IncomeStatementFormProps {
  producerId: string
  organizationId: string
  periodId: string
  createdBy: string
  defaultValues?: Partial<CreateIncomeStatementInput>
  onSuccess: (id: string) => void
}

export function IncomeStatementForm({
  producerId,
  organizationId,
  periodId,
  createdBy,
  defaultValues,
  onSuccess,
}: IncomeStatementFormProps) {
  const form = useForm<CreateIncomeStatementInput>({
    resolver: zodResolver(createIncomeStatementSchema),
    defaultValues: {
      producerId,
      organizationId,
      periodId,
      sales: 0,
      grossResult: 0,
      netResult: 0,
      currency: "ARS",
      observations: "",
      documentIds: [],
      ...defaultValues,
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: CreateIncomeStatementInput) {
    try {
      const id = await createIncomeStatement(values, createdBy)
      toast.success("Estado de resultados guardado correctamente")
      onSuccess(id)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Error al guardar el estado de resultados"
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="sales"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ventas / Ingresos</FormLabel>
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="grossResult"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resultado bruto</FormLabel>
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
            name="netResult"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resultado neto</FormLabel>
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
          {isSubmitting ? "Guardando..." : "Guardar resultados"}
        </Button>
      </form>
    </Form>
  )
}
