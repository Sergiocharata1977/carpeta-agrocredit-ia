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
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  createBalanceSheetSchema,
  type CreateBalanceSheetInput,
} from "@/lib/schemas/accounting"
import { createBalanceSheet } from "@/lib/services/balance-sheets"

interface BalanceSheetFormProps {
  producerId: string
  organizationId: string
  periodId: string
  createdBy: string
  defaultValues?: Partial<CreateBalanceSheetInput>
  onSuccess: (id: string) => void
}

export function BalanceSheetForm({
  producerId,
  organizationId,
  periodId,
  createdBy,
  defaultValues,
  onSuccess,
}: BalanceSheetFormProps) {
  const form = useForm<CreateBalanceSheetInput>({
    resolver: zodResolver(createBalanceSheetSchema),
    defaultValues: {
      producerId,
      organizationId,
      periodId,
      assetsTotal: 0,
      liabilitiesTotal: 0,
      equityTotal: 0,
      currency: "ARS",
      observations: "",
      documentIds: [],
      ...defaultValues,
    },
  })

  const { isSubmitting } = form.formState
  const assets = form.watch("assetsTotal") ?? 0
  const liabilities = form.watch("liabilitiesTotal") ?? 0
  const equity = form.watch("equityTotal") ?? 0

  // Activos = Pasivos + Patrimonio
  const isBalanced = Math.abs(assets - (liabilities + equity)) < 0.01
  const balanceDiff = assets - (liabilities + equity)

  async function onSubmit(values: CreateBalanceSheetInput) {
    try {
      const id = await createBalanceSheet(values, createdBy)
      toast.success("Balance guardado correctamente")
      onSuccess(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar el balance"
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="assetsTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total activos</FormLabel>
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
            name="liabilitiesTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total pasivos</FormLabel>
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
            name="equityTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total patrimonio neto</FormLabel>
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

        {/* Validación visual: Activo = Pasivo + Patrimonio */}
        {(assets > 0 || liabilities > 0 || equity > 0) && (
          <Alert variant={isBalanced ? "default" : "destructive"}>
            <AlertDescription>
              {isBalanced
                ? "El balance cuadra: Activo = Pasivo + Patrimonio"
                : `Descuadre de ${Math.abs(balanceDiff).toLocaleString("es-AR", { minimumFractionDigits: 2 })} — Activo debe ser igual a Pasivo + Patrimonio`}
            </AlertDescription>
          </Alert>
        )}

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
          {isSubmitting ? "Guardando..." : "Guardar balance"}
        </Button>
      </form>
    </Form>
  )
}
