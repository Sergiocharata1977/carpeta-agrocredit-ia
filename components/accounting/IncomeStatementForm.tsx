"use client"

import { useEffect } from "react"
import { useForm, type Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DEFAULT_INCOME_STATEMENT_DETAILS,
  INCOME_FIELD_GROUPS,
  calculateIncomeTotals,
} from "@/lib/accounting/statement-fields"
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

function toNumber(value: string): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function formatAmount(value: number): string {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
      details: defaultValues?.details ?? structuredClone(DEFAULT_INCOME_STATEMENT_DETAILS),
    },
  })

  const { isSubmitting } = form.formState
  const details = form.watch("details") ?? structuredClone(DEFAULT_INCOME_STATEMENT_DETAILS)
  const totals = calculateIncomeTotals(details)

  useEffect(() => {
    form.setValue("sales", details.netSales, { shouldValidate: true })
    form.setValue("grossResult", totals.grossResult, { shouldValidate: true })
    form.setValue("netResult", totals.netResult, { shouldValidate: true })
  }, [details.netSales, form, totals.grossResult, totals.netResult])

  async function onSubmit(values: CreateIncomeStatementInput) {
    try {
      const id = await createIncomeStatement(
        {
          ...values,
          sales: details.netSales,
          grossResult: totals.grossResult,
          netResult: totals.netResult,
        },
        createdBy,
      )
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <p className="text-sm font-medium">Estado de resultados</p>
            <p className="text-xs text-muted-foreground">
              Carga los conceptos del modelo. Resultado bruto, ordinario y final se calculan solos.
            </p>
          </div>

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
                    <SelectItem value="ARS">ARS - Pesos</SelectItem>
                    <SelectItem value="USD">USD - Dolares</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Accordion
          type="multiple"
          defaultValue={["Operaciones que continuan", "Operaciones en discontinuacion y extraordinarias"]}
          className="rounded-md border"
        >
          {INCOME_FIELD_GROUPS.map((group) => (
            <AccordionItem key={group.title} value={group.title} className="px-4">
              <AccordionTrigger className="hover:no-underline">
                {group.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.fields.map((field) => (
                    <FormField
                      key={field.name}
                      control={form.control}
                      name={`details.${field.name}` as Path<CreateIncomeStatementInput>}
                      render={({ field: formField }) => (
                        <FormItem>
                          <FormLabel>{field.label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              name={formField.name}
                              onBlur={formField.onBlur}
                              ref={formField.ref}
                              value={typeof formField.value === "number" ? formField.value : 0}
                              onChange={(event) => formField.onChange(toNumber(event.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="grid gap-4 rounded-md border bg-muted/25 p-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Ganancia / perdida bruta</p>
            <p className="text-lg font-semibold">{formatAmount(totals.grossResult)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ganancia / perdida ordinaria</p>
            <p className="text-lg font-semibold">{formatAmount(totals.ordinaryResult)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ganancia / perdida del ejercicio</p>
            <p className="text-lg font-semibold">{formatAmount(totals.netResult)}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-md border p-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-muted-foreground">Antes de impuesto a las ganancias</p>
            <p className="font-medium">{formatAmount(totals.continuingBeforeTax)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Operaciones que continuan</p>
            <p className="font-medium">{formatAmount(totals.continuingOrdinaryResult)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Operaciones en discontinuacion</p>
            <p className="font-medium">{formatAmount(totals.discontinuedResult)}</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas adicionales..." rows={3} {...field} />
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
