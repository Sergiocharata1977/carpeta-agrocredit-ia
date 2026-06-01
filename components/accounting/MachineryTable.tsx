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

type MachineryRow = {
  description: string
  brand: string
  model: string
  year: string
  identifier: string
  estimatedValue: string
  currency: "ARS" | "USD"
}

const emptyRow = (): MachineryRow => ({
  description: "",
  brand: "",
  model: "",
  year: "",
  identifier: "",
  estimatedValue: "",
  currency: "ARS",
})

interface MachineryTableProps {
  producerId: string
  organizationId: string
  createdBy: string
  onSuccess?: () => void
}

export function MachineryTable({
  producerId,
  organizationId,
  createdBy,
  onSuccess,
}: MachineryTableProps) {
  const [rows, setRows] = useState<MachineryRow[]>([emptyRow()])
  const [saving, setSaving] = useState(false)

  function addRow() {
    setRows((prev) => [...prev, emptyRow()])
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx))
  }

  function update<K extends keyof MachineryRow>(idx: number, field: K, value: MachineryRow[K]) {
    setRows((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  async function handleSave() {
    const valid = rows.filter((r) => r.description.trim() && r.estimatedValue !== "")
    if (valid.length === 0) {
      toast.info("Completá al menos la descripción y el valor de un ítem")
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
              assetType: "machinery",
              category: "machinery",
              description: r.description.trim(),
              brand: r.brand.trim() || undefined,
              model: r.model.trim() || undefined,
              year: r.year ? Number(r.year) : undefined,
              identifier: r.identifier.trim() || undefined,
              estimatedValue: Number(r.estimatedValue) || 0,
              currency: r.currency,
              lienStatus: "free",
              ownershipType: "own",
              documentIds: [],
              createdBy,
            } as Omit<Asset, "id" | "createdAt" | "updatedAt">,
            createdBy,
          ),
        ),
      )
      toast.success(`${valid.length} ítem${valid.length > 1 ? "s" : ""} guardado${valid.length > 1 ? "s" : ""}`)
      setRows([emptyRow()])
      onSuccess?.()
    } catch {
      toast.error("Error al guardar maquinaria")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Maquinaria agrícola y vehículos</p>
          <p className="text-xs text-muted-foreground">Tractores, cosechadoras, camionetas, implementos, etc.</p>
        </div>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Agregar fila
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-6">#</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Descripción *</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Marca</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Modelo</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground w-20">Año</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Dominio / Serie</th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">Valor actual *</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground w-16">Mon.</th>
              <th className="px-2 py-2 w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors">
                <td className="px-3 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="Tractor John Deere 5090..."
                    value={row.description}
                    onChange={(e) => update(i, "description", e.target.value)}
                    className="h-7 text-xs min-w-40"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="John Deere"
                    value={row.brand}
                    onChange={(e) => update(i, "brand", e.target.value)}
                    className="h-7 text-xs w-28"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="5090E"
                    value={row.model}
                    onChange={(e) => update(i, "model", e.target.value)}
                    className="h-7 text-xs w-24"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min="1900"
                    max="2099"
                    placeholder="2020"
                    value={row.year}
                    onChange={(e) => update(i, "year", e.target.value)}
                    className="h-7 text-xs w-20"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    placeholder="ABC 123 / Serie..."
                    value={row.identifier}
                    onChange={(e) => update(i, "identifier", e.target.value)}
                    className="h-7 text-xs w-32"
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
                    className="h-7 text-right text-xs w-32"
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
        {saving ? "Guardando..." : "Guardar maquinaria"}
      </Button>
    </div>
  )
}
