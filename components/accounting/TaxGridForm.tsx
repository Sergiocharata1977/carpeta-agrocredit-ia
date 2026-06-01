"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createTaxDocument } from "@/lib/services/tax-documents"

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

type TaxRow = {
  iva: string
  rentas: string
  seg931: string
  comprobante: string
}

const emptyRow = (): TaxRow => ({ iva: "", rentas: "", seg931: "", comprobante: "" })

interface TaxGridFormProps {
  producerId: string
  organizationId: string
  periodId: string
  year: number
  createdBy: string
  onSuccess: () => void
}

export function TaxGridForm({
  producerId,
  organizationId,
  periodId,
  year,
  createdBy,
  onSuccess,
}: TaxGridFormProps) {
  const [rows, setRows] = useState<TaxRow[]>(MONTHS.map(() => emptyRow()))
  const [saving, setSaving] = useState(false)

  function update(monthIdx: number, field: keyof TaxRow, value: string) {
    setRows((prev) => {
      const next = [...prev]
      next[monthIdx] = { ...next[monthIdx], [field]: value }
      return next
    })
  }

  async function handleSave() {
    const saves: Promise<string>[] = []

    rows.forEach((row, i) => {
      const monthStr = String(i + 1).padStart(2, "0")
      const fiscalPeriod = `${year}-${monthStr}`
      const comprobante = row.comprobante.trim() || undefined

      if (row.iva !== "" && Number(row.iva) !== 0) {
        saves.push(
          createTaxDocument(
            { producerId, organizationId, periodId, taxType: "iva_monthly", fiscalPeriod, amount: Number(row.iva), currency: "ARS", observations: comprobante ?? "", documentIds: [] },
            createdBy,
          ),
        )
      }
      if (row.rentas !== "" && Number(row.rentas) !== 0) {
        saves.push(
          createTaxDocument(
            { producerId, organizationId, periodId, taxType: "income_tax_advance", fiscalPeriod, amount: Number(row.rentas), currency: "ARS", observations: comprobante ?? "", documentIds: [] },
            createdBy,
          ),
        )
      }
      if (row.seg931 !== "" && Number(row.seg931) !== 0) {
        saves.push(
          createTaxDocument(
            { producerId, organizationId, periodId, taxType: "social_security", fiscalPeriod, amount: Number(row.seg931), currency: "ARS", observations: comprobante ?? "", documentIds: [] },
            createdBy,
          ),
        )
      }
    })

    if (saves.length === 0) {
      toast.info("No hay valores para guardar")
      return
    }

    setSaving(true)
    try {
      await Promise.all(saves)
      toast.success(`${saves.length} registro${saves.length > 1 ? "s" : ""} guardado${saves.length > 1 ? "s" : ""}`)
      setRows(MONTHS.map(() => emptyRow()))
      onSuccess()
    } catch {
      toast.error("Error al guardar impuestos")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium">Impuestos mensuales — {year}</p>
        <p className="text-xs text-muted-foreground">Completá los importes del año. Los campos vacíos se ignoran.</p>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Mes</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">IVA</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Rentas</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">931</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comprobante</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {MONTHS.map((month, i) => (
              <tr key={month} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-1.5 font-medium">{month}</td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={rows[i].iva}
                    onChange={(e) => update(i, "iva", e.target.value)}
                    className="h-7 text-right text-xs w-28"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={rows[i].rentas}
                    onChange={(e) => update(i, "rentas", e.target.value)}
                    className="h-7 text-right text-xs w-28"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={rows[i].seg931}
                    onChange={(e) => update(i, "seg931", e.target.value)}
                    className="h-7 text-right text-xs w-28"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="Nro. comprobante"
                    value={rows[i].comprobante}
                    onChange={(e) => update(i, "comprobante", e.target.value)}
                    className="h-7 text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Guardando..." : "Guardar impuestos anuales"}
      </Button>
    </div>
  )
}
