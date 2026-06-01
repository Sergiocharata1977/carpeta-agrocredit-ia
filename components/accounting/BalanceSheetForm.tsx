"use client"

import { useEffect } from "react"
import { useForm, type Path } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  BALANCE_FIELD_GROUPS,
  DEFAULT_BALANCE_SHEET_DETAILS,
  calculateBalanceTotals,
} from "@/lib/accounting/statement-fields"
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

function getBalanceGroupTotal(
  path: (typeof BALANCE_FIELD_GROUPS)[number]["path"],
  totals: ReturnType<typeof calculateBalanceTotals>,
): number {
  if (path === "currentAssets") return totals.currentAssetsTotal
  if (path === "nonCurrentAssets") return totals.nonCurrentAssetsTotal
  if (path === "currentLiabilities") return totals.currentLiabilitiesTotal
  return totals.nonCurrentLiabilitiesTotal
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
      details: defaultValues?.details ?? structuredClone(DEFAULT_BALANCE_SHEET_DETAILS),
    },
  })

  const { isSubmitting } = form.formState
  const details = form.watch("details") ?? structuredClone(DEFAULT_BALANCE_SHEET_DETAILS)
  const equityTotal = form.watch("equityTotal") ?? 0
  const totals = calculateBalanceTotals(details, equityTotal)
  const balanceDiff = totals.assetsTotal - totals.liabilitiesAndEquityTotal
  const hasValues = totals.assetsTotal > 0 || totals.liabilitiesTotal > 0 || equityTotal !== 0
  const isBalanced = Math.abs(balanceDiff) < 0.01

  useEffect(() => {
    form.setValue("assetsTotal", totals.assetsTotal, { shouldValidate: true })
    form.setValue("liabilitiesTotal", totals.liabilitiesTotal, { shouldValidate: true })
  }, [form, totals.assetsTotal, totals.liabilitiesTotal])

  async function onSubmit(values: CreateBalanceSheetInput) {
    try {
      const id = await createBalanceSheet(
        {
          ...values,
          assetsTotal: totals.assetsTotal,
          liabilitiesTotal: totals.liabilitiesTotal,
          equityTotal,
        },
        createdBy,
      )
      toast.success("Balance guardado correctamente")
      onSuccess(id)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al guardar el balance"
      toast.error(message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <div>
            <p className="text-sm font-medium">Estado de situacion patrimonial</p>
            <p className="text-xs text-muted-foreground">
              Carga los rubros del modelo. Los totales se calculan automaticamente.
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

        <div className="space-y-4">
          {BALANCE_FIELD_GROUPS.map((group) => {
            const groupTotal = getBalanceGroupTotal(group.path, totals)

            return (
              <section key={group.path} className="rounded-md border p-4">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold">{group.title}</h3>
                  <span className="text-sm font-medium text-muted-foreground">
                    {formatAmount(groupTotal)}
                  </span>
                </div>
                <div className="grid gap-3">
                  {group.fields.map((field) => (
                    <FormField
                      key={`${group.path}.${field.name}`}
                      control={form.control}
                      name={`details.${group.path}.${field.name}` as Path<CreateBalanceSheetInput>}
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
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <div className="grid gap-4 rounded-md border bg-muted/25 p-4 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Total activo</p>
            <p className="text-lg font-semibold">{formatAmount(totals.assetsTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total pasivo</p>
            <p className="text-lg font-semibold">{formatAmount(totals.liabilitiesTotal)}</p>
          </div>
          <FormField
            control={form.control}
            name="equityTotal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Patrimonio neto</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    {...field}
                    onChange={(event) => field.onChange(toNumber(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div>
            <p className="text-xs text-muted-foreground">Pasivo + patrimonio neto</p>
            <p className="text-lg font-semibold">{formatAmount(totals.liabilitiesAndEquityTotal)}</p>
          </div>
        </div>

        {hasValues && (
          <Alert variant={isBalanced ? "default" : "destructive"}>
            <AlertDescription>
              {isBalanced
                ? "El balance cuadra: Activo = Pasivo + Patrimonio neto"
                : `Descuadre de ${formatAmount(Math.abs(balanceDiff))}. El total activo debe coincidir con pasivo + patrimonio neto.`}
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
                <Textarea placeholder="Notas adicionales..." rows={3} {...field} />
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
