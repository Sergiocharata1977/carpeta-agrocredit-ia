"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import {
  BALANCE_FIELD_GROUPS,
  DEFAULT_BALANCE_SHEET_DETAILS,
  DEFAULT_INCOME_STATEMENT_DETAILS,
  INCOME_FIELD_GROUPS,
  calculateBalanceTotals,
  calculateIncomeTotals,
  type BalanceSheetDetails,
  type IncomeStatementDetails,
} from "@/lib/accounting/statement-fields"
import type { FinancialStatementImport } from "@/types/statement-imports"
import { StatementImportConfidenceBadge } from "@/components/accounting/StatementImportConfidenceBadge"

interface StatementImportReviewProps {
  importId: string
  onApplied: () => void
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function fmt(value: number) {
  return value.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function StatementImportReview({ importId, onApplied }: StatementImportReviewProps) {
  const [statementImport, setStatementImport] = useState<FinancialStatementImport | null>(null)
  const [balanceDetails, setBalanceDetails] = useState<BalanceSheetDetails>(() => structuredClone(DEFAULT_BALANCE_SHEET_DETAILS))
  const [equityTotal, setEquityTotal] = useState(0)
  const [incomeDetails, setIncomeDetails] = useState<IncomeStatementDetails>(() => structuredClone(DEFAULT_INCOME_STATEMENT_DETAILS))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState<"balance" | "income" | "combined" | null>(null)
  const [dirty, setDirty] = useState(false)

  const loadImport = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getFreshIdToken()
      const res = await fetch(`/api/accounting/statement-imports/${importId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo cargar la importacion")
      const loaded = json.import as FinancialStatementImport
      setStatementImport(loaded)
      if (loaded.extractedBalance) {
        setBalanceDetails(loaded.extractedBalance.details)
        setEquityTotal(loaded.extractedBalance.equityTotal)
      }
      if (loaded.extractedIncomeStatement) {
        setIncomeDetails(loaded.extractedIncomeStatement.details)
      }
      setDirty(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al cargar importacion")
    } finally {
      setLoading(false)
    }
  }, [importId])

  useEffect(() => {
    void loadImport()
  }, [loadImport])

  const balanceTotals = useMemo(
    () => calculateBalanceTotals(balanceDetails, equityTotal),
    [balanceDetails, equityTotal],
  )
  const balanceDiff = balanceTotals.assetsTotal - balanceTotals.liabilitiesAndEquityTotal
  const incomeTotals = useMemo(() => calculateIncomeTotals(incomeDetails), [incomeDetails])

  function setBalanceValue(
    group: keyof BalanceSheetDetails,
    field: string,
    value: number,
  ) {
    setBalanceDetails((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [field]: value,
      },
    }))
    setDirty(true)
  }

  function setIncomeValue(field: keyof IncomeStatementDetails, value: number) {
    setIncomeDetails((current) => ({ ...current, [field]: value }))
    setDirty(true)
  }

  async function saveReview() {
    if (!statementImport) return
    setSaving(true)
    try {
      const token = await getFreshIdToken()
      const body: Record<string, unknown> = {}
      if (statementImport.extractedBalance) {
        body.extractedBalance = {
          details: balanceDetails,
          equityTotal,
          currency: statementImport.extractedBalance.currency,
        }
      }
      if (statementImport.extractedIncomeStatement) {
        body.extractedIncomeStatement = {
          details: incomeDetails,
          currency: statementImport.extractedIncomeStatement.currency,
        }
      }

      const res = await fetch(`/api/accounting/statement-imports/${importId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar la revision")
      setStatementImport(json.import)
      setDirty(false)
      toast.success("Revision guardada")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar revision")
    } finally {
      setSaving(false)
    }
  }

  async function apply(kind: "balance" | "income" | "combined") {
    if (dirty) {
      await saveReview()
    }

    setApplying(kind)
    try {
      const token = await getFreshIdToken()
      const res = await fetch(`/api/accounting/statement-imports/${importId}/apply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applyBalance: kind === "balance" || kind === "combined",
          applyIncomeStatement: kind === "income" || kind === "combined",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo aplicar la importacion")
      toast.success("Importacion aplicada al periodo")
      onApplied()
      await loadImport()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al aplicar importacion")
    } finally {
      setApplying(null)
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border p-4 text-sm text-muted-foreground">
        Cargando importacion...
      </div>
    )
  }

  if (!statementImport) return null

  const canApply = statementImport.status !== "applied" && statementImport.status !== "failed"
  const hasBalance = Boolean(statementImport.extractedBalance)
  const hasIncome = Boolean(statementImport.extractedIncomeStatement)

  return (
    <div className="space-y-5 rounded-md border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold">Revision de importacion</p>
          <p className="text-xs text-muted-foreground">
            {statementImport.sourceFileName} · proveedor {statementImport.provider} · confianza {Math.round(statementImport.overallConfidence * 100)}%
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!dirty || saving || !canApply}
          onClick={() => void saveReview()}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Guardar revision
        </Button>
      </div>

      {statementImport.status === "failed" && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>La extraccion fallo. La carga manual sigue disponible.</AlertDescription>
        </Alert>
      )}

      {statementImport.warnings.length > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertDescription>
            {statementImport.warnings.slice(0, 4).join(" ")}
          </AlertDescription>
        </Alert>
      )}

      {hasBalance && (
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium">Estado de situacion patrimonial</p>
            <p className="text-xs text-muted-foreground">
              Diferencia de cuadre: {fmt(balanceDiff)}
            </p>
          </div>

          {BALANCE_FIELD_GROUPS.map((group) => (
            <div key={group.path} className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{group.title}</p>
              {group.fields.map((field) => {
                const key = `${group.path}.${field.name}`
                const confidence = statementImport.fieldConfidence[key]
                return (
                  <label key={key} className="grid gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_120px_180px] sm:items-center">
                    <span>{field.label}</span>
                    <StatementImportConfidenceBadge confidence={confidence?.confidence} source={confidence?.source} />
                    <Input
                      type="number"
                      step="0.01"
                      value={balanceDetails[group.path][field.name as keyof typeof balanceDetails[typeof group.path]]}
                      onChange={(event) => setBalanceValue(group.path, field.name, toNumber(event.target.value))}
                    />
                  </label>
                )
              })}
            </div>
          ))}

          <label className="grid gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_120px_180px] sm:items-center">
            <span>Patrimonio neto</span>
            <StatementImportConfidenceBadge
              confidence={statementImport.fieldConfidence.equityTotal?.confidence}
              source={statementImport.fieldConfidence.equityTotal?.source}
            />
            <Input
              type="number"
              step="0.01"
              value={equityTotal}
              onChange={(event) => {
                setEquityTotal(toNumber(event.target.value))
                setDirty(true)
              }}
            />
          </label>
        </section>
      )}

      {hasIncome && (
        <section className="space-y-4">
          <div>
            <p className="text-sm font-medium">Estado de resultados</p>
            <p className="text-xs text-muted-foreground">
              Resultado neto calculado: {fmt(incomeTotals.netResult)}
            </p>
          </div>

          {INCOME_FIELD_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{group.title}</p>
              {group.fields.map((field) => {
                const name = field.name as keyof IncomeStatementDetails
                const confidence = statementImport.fieldConfidence[field.name]
                return (
                  <label key={field.name} className="grid gap-2 text-sm sm:grid-cols-[minmax(0,1fr)_120px_180px] sm:items-center">
                    <span>{field.label}</span>
                    <StatementImportConfidenceBadge confidence={confidence?.confidence} source={confidence?.source} />
                    <Input
                      type="number"
                      step="0.01"
                      value={incomeDetails[name]}
                      onChange={(event) => setIncomeValue(name, toNumber(event.target.value))}
                    />
                  </label>
                )
              })}
            </div>
          ))}
        </section>
      )}

      <div className="flex flex-wrap gap-2 border-t pt-4">
        {hasBalance && hasIncome && (
          <Button
            type="button"
            className="gap-2"
            disabled={!canApply || applying !== null}
            onClick={() => void apply("combined")}
          >
            {applying === "combined" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Aplicar balance y resultados
          </Button>
        )}
        {hasBalance && !hasIncome && (
          <Button
            type="button"
            className="gap-2"
            disabled={!canApply || applying !== null}
            onClick={() => void apply("balance")}
          >
            {applying === "balance" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Aplicar al balance
          </Button>
        )}
        {hasIncome && !hasBalance && (
          <Button
            type="button"
            className="gap-2"
            disabled={!canApply || applying !== null}
            onClick={() => void apply("income")}
          >
            {applying === "income" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Aplicar a resultados
          </Button>
        )}
      </div>
    </div>
  )
}
