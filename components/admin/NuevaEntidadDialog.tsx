"use client"

import { useState } from "react"
import { toast } from "sonner"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const SUBTYPES: { value: string; label: string }[] = [
  { value: "bank", label: "Banco" },
  { value: "financial_entity", label: "Financiera" },
  { value: "agro_company", label: "Empresa Agro" },
  { value: "maquinaria_agricola", label: "Maquinaria Agrícola" },
  { value: "insumos_agricolas", label: "Insumos Agrícolas" },
]

interface NuevaEntidadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const EMPTY = {
  legalName: "",
  taxId: "",
  subtype: "bank",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  sector: "",
}

export function NuevaEntidadDialog({ open, onOpenChange, onSuccess }: NuevaEntidadDialogProps) {
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function close(next: boolean) {
    if (!next) setForm({ ...EMPTY })
    onOpenChange(next)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.legalName.trim().length < 3) {
      toast.error("Ingresá la razón social (mín. 3 caracteres)")
      return
    }
    if (form.taxId.length !== 11) {
      toast.error("El CUIT debe tener 11 dígitos sin guiones")
      return
    }
    setLoading(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo obtener el token de sesión")
      const res = await fetch("/api/admin/entities", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          legalName: form.legalName.trim(),
          taxId: form.taxId,
          subtype: form.subtype,
          contactName: form.contactName.trim() || undefined,
          contactEmail: form.contactEmail.trim() || undefined,
          contactPhone: form.contactPhone.trim() || undefined,
          sector: form.sector.trim() || undefined,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "No se pudo crear la entidad")
      toast.success("Entidad creada")
      close(false)
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear la entidad")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva entidad / financista</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tipo de entidad *</label>
            <select
              value={form.subtype}
              onChange={(e) => set("subtype", e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {SUBTYPES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Razón social *</label>
            <Input
              value={form.legalName}
              onChange={(e) => set("legalName", e.target.value)}
              placeholder="Ej: Banco Agro del Sur S.A."
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">CUIT *</label>
            <Input
              value={form.taxId}
              inputMode="numeric"
              onChange={(e) => set("taxId", e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="11 dígitos sin guiones"
            />
            {form.taxId.length > 0 && form.taxId.length !== 11 && (
              <p className="mt-1 text-xs text-amber-600">Faltan {11 - form.taxId.length} dígitos.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Contacto</label>
              <Input
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Teléfono</label>
              <Input
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Email de contacto</label>
            <Input
              type="email"
              value={form.contactEmail}
              onChange={(e) => set("contactEmail", e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando…" : "Crear entidad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
