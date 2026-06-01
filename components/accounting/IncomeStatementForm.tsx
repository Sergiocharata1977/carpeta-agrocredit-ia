"use client"

import { useEffect } from "react"
import { useForm, type Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
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

type IncomeDetailField = keyof CreateIncomeStatementInput["details"]

interface MoneyFieldConfig {
  name: IncomeDetailField
  label: string
}

const CONTINUING_OPERATION_FIELDS: MoneyFieldConfig[] = [
  { name: "netSales", label: "Ventas netas de bienes o servicios" },
  { name: "costOfGoodsSold", label: "Costo de los bienes vendidos o servicios prestados" },
  { name: "inventoryValuationResult", label: "Resultado por valuacion de bienes de cambio al VNR" },
  { name: "sellingExpenses", label: "Gastos de comercializacion" },
  { name: "administrativeExpenses", label: "Gastos de administracion" },
  { name: "otherExpenses", label: "Otros gastos" },
  { name: "relatedInvestmentResults", label: "Resultados de inversiones en entes relacionados" },
  { name: "otherInvestmentResults", label: "Resultados de otras inversiones" },
  { name: "financialResultsGeneratedByAssets", label: "Resultados financieros por tenencia - generados por activos" },
  { name: "financialResultsGeneratedByLiabilities", label: "Resultados financieros por tenencia - generados por pasivos" },
  { name: "otherIncomeAndExpenses", label: "Otros ingresos y egresos" },
  { name: "incomeTax", label: "Impuesto a las ganancias" },
]

const DISCONTINUED_OPERATION_FIELDS: MoneyFieldConfig[] = [
  { name: "discontinuedOperationsResult", label: "Resultados de las operaciones en discontinuacion" },
  { name: "discontinuedDisposalResult", label: "Resultados por disposicion de activos y liquidacion de deudas" },
]

const EXTRAORDINARY_FIELD: MoneyFieldConfig = {
  name: "extraordinaryResults",
  label: "Resultados de las operaciones extraordinarias",
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

function ResultRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="grid gap-2 rounded-md bg-muted/35 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
      <p className={strong ? "text-sm font-semibold" : "text-sm font-medium"}>{label}</p>
      <p className={strong ? "text-right text-base font-semibold" : "text-right text-sm font-medium"}>
        {formatAmount(value)}
      </p>
    </div>
  )
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

  function renderMoneyField(field: MoneyFieldConfig) {
    return (
      <FormField
        key={field.name}
        control={form.control}
        name={`details.${field.name}` as Path<CreateIncomeStatementInput>}
        render={({ field: formField }) => (
          <FormItem className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
            <FormLabel className="text-sm font-normal">{field.label}</FormLabel>
            <div>
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
            </div>
          </FormItem>
        )}
      />
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div>
            <p className="text-sm font-medium">Estado de resultados</p>
            <p className="text-xs text-muted-foreground">
              Carga los conceptos en orden vertical. Los resultados se calculan automaticamente.
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

        <section className="space-y-3 rounded-md border p-4">
          <h3 className="text-sm font-semibold">Resultados de las operaciones que continuan</h3>
          {renderMoneyField(CONTINUING_OPERATION_FIELDS[0])}
          {renderMoneyField(CONTINUING_OPERATION_FIELDS[1])}
          <ResultRow label="Ganancia / perdida bruta" value={totals.grossResult} strong />
          {CONTINUING_OPERATION_FIELDS.slice(2, 11).map(renderMoneyField)}
          <ResultRow label="Ganancia / perdida antes del impuesto a las ganancias" value={totals.continuingBeforeTax} />
          {renderMoneyField(CONTINUING_OPERATION_FIELDS[11])}
          <ResultRow label="Ganancia / perdida ordinaria de las operaciones que continuan" value={totals.continuingOrdinaryResult} strong />
        </section>

        <section className="space-y-3 rounded-md border p-4">
          <h3 className="text-sm font-semibold">Resultados por las operaciones en discontinuacion</h3>
          {DISCONTINUED_OPERATION_FIELDS.map(renderMoneyField)}
          <ResultRow label="Ganancia / perdida por las operaciones en discontinuacion" value={totals.discontinuedResult} strong />
        </section>

        <section className="space-y-3 rounded-md border p-4">
          <h3 className="text-sm font-semibold">Resultados de las operaciones extraordinarias</h3>
          {renderMoneyField(EXTRAORDINARY_FIELD)}
          <ResultRow label="Ganancia / perdida de las operaciones ordinarias" value={totals.ordinaryResult} />
          <ResultRow label="Ganancia / perdida del ejercicio" value={totals.netResult} strong />
        </section>

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
