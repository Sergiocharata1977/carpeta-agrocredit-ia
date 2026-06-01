"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createAsset } from "@/lib/services/assets"
import type { Asset } from "@/types/assets"

type RealEstateCategory = "rural" | "urbano"

type RealEstateRow = {
  category: RealEstateCategory
  description: string
  province: string
  city: string
  address: string
  hectares: string
  cadastralRef: string
  fiscalValuation: string
  estimatedValue: string
  currency: "ARS" | "USD"
  lienStatus: Asset["lienStatus"]
}

const emptyRow = (): RealEstateRow => ({
  category: "rural",
  description: "",
  province: "",
  city: "",
  address: "",
  hectares: "",
  cadastralRef: "",
  fiscalValuation: "",
  estimatedValue: "",
  currency: "ARS",
  lienStatus: "free",
})

interface RealEstateTableProps {
  producerId: string
  organizationId: string
  createdBy: string
  onSuccess?: () => void
}

export function RealEstateTable({
  producerId,
  organizationId,
  createdBy,
  onSuccess,
}: RealEstateTableProps) {
  const [rows, setRows] = useState<RealEstateRow[]>([emptyRow()])
  const [saving, setSaving] = useState(false)

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function update<K extends keyof RealEstateRow>(idx: number, field: K, value: RealEstateRow[K]) {
    setRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.description.trim() && r.estimatedValue !== "")
    if (valid.length === 0) {
      toast.info("Completá al menos la descripción y el valor de un inmueble")
      return
    }

    setSaving(true)
    try {
      await Promise.all(
        valid.map((r) =>
          createAsset(
            {
              producerId,
              organizationId,
              assetType: "real_estate",
              category: r.category,
              description: r.description.trim(),
              province: r.province.trim() || undefined,
              city: r.city.trim() || undefined,
              address: r.address.trim() || undefined,
              hectares: r.hectares ? Number(r.hectares) : undefined,
              cadastralRef: r.cadastralRef.trim() || undefined,
              fiscalValuation: r.fiscalValuation ? Number(r.fiscalValuation) : undefined,
              estimatedValue: Number(r.estimatedValue) || 0,
              currency: r.currency,
              lienStatus: r.lienStatus,
              ownershipType: "own",
              documentIds: [],
              createdBy,
            } as Omit<Asset, "id" | "createdAt" | "updatedAt">,
            createdBy,
          ),
        ),
      )
      toast.success(`${valid.length} inmueble${valid.length > 1 ? "s" : ""} guardado${valid.length > 1 ? "s" : ""}`)
      setRows([emptyRow()])
      onSuccess?.()
    } catch {
      toast.error("Error al guardar inmuebles")
    } finally {
      setSaving(false)
    }
  }

  const rurales = rows.filter((r) => r.category === "rural")
  const urbanos = rows.filter((r) => r.category === "urbano")

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Inmuebles</p>
          <p className="text-xs text-muted-foreground">
            Rurales: campos, lotes, establecimientos — Urbanos: casas, galpones, depósitos
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Agregar fila
        </Button>
      </div>

      {/* Resumen por tipo */}
      {rows.some((r) => r.estimatedValue) && (
        <div className="flex gap-4 rounded-md border bg-muted/20 px-4 py-2 text-sm">
          <div>
            <span className="text-muted-foreground">Rurales: </span>
            <span className="font-medium">{rurales.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Urbanos: </span>
            <span className="font-medium">{urbanos.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total ARS: </span>
            <span className="font-medium">
              {rows
                .filter((r) => r.currency === "ARS" && r.estimatedValue)
                .reduce((sum, r) => sum + Number(r.estimatedValue), 0)
                .toLocaleString("es-AR", { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-6">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-24">Tipo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Descripción *</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Provincia</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Localidad</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground w-24">Ha / m²</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Ref. catastral</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Val. fiscal</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Val. actual *</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">Mon.</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-28">Gravamen</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`hover:bg-muted/20 transition-colors ${row.category === "rural" ? "bg-green-50/30" : "bg-blue-50/30"}`}
              >
                <td className="px-3 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-2 py-1.5">
                  <Select
                    value={row.category}
                    onValueChange={(v) => update(i, "category", v as RealEstateCategory)}
                  >
                    <SelectTrigger className="h-7 text-xs w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rural">🌾 Rural</SelectItem>
                      <SelectItem value="urbano">🏢 Urbano</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="Campo La Esperanza..."
                    value={row.description}
                    onChange={(e) => update(i, "description", e.target.value)}
                    className="h-7 text-xs min-w-36"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="Chaco"
                    value={row.province}
                    onChange={(e) => update(i, "province", e.target.value)}
                    className="h-7 text-xs w-24"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="Charata"
                    value={row.city}
                    onChange={(e) => update(i, "city", e.target.value)}
                    className="h-7 text-xs w-24"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={row.hectares}
                    onChange={(e) => update(i, "hectares", e.target.value)}
                    className="h-7 text-right text-xs w-24"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="123-456-789"
                    value={row.cadastralRef}
                    onChange={(e) => update(i, "cadastralRef", e.target.value)}
                    className="h-7 text-xs w-28"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={row.fiscalValuation}
                    onChange={(e) => update(i, "fiscalValuation", e.target.value)}
                    className="h-7 text-right text-xs w-28"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0"
                    value={row.estimatedValue}
                    onChange={(e) => update(i, "estimatedValue", e.target.value)}
                    className="h-7 text-right text-xs w-28"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={row.currency}
                    onValueChange={(v) => update(i, "currency", v as "ARS" | "USD")}
                  >
                    <SelectTrigger className="h-7 text-xs w-16">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={row.lienStatus}
                    onValueChange={(v) => update(i, "lienStatus", v as Asset["lienStatus"])}
                  >
                    <SelectTrigger className="h-7 text-xs w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Libre</SelectItem>
                      <SelectItem value="mortgaged">Hipotecado</SelectItem>
                      <SelectItem value="pledged">Prendado</SelectItem>
                      <SelectItem value="seized">Embargado</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-1 py-1.5 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Guardando..." : "Guardar inmuebles"}
      </Button>
    </div>
  )
}
