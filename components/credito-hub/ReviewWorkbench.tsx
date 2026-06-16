"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getIdToken } from "@/lib/firebase/auth-client"
import { FieldReviewRow } from "@/components/credito-hub/FieldReviewRow"
import type { ExtractedField } from "@/types/credito-hub"

interface ReviewWorkbenchProps {
  targetOrganizationId: string
}

export function ReviewWorkbench({ targetOrganizationId }: ReviewWorkbenchProps) {
  const [fields, setFields] = useState<ExtractedField[]>([])

  const load = useCallback(async () => {
    const token = await getIdToken()
    if (!token) return
    const res = await fetch(`/api/credito-hub/review/${targetOrganizationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json()
    if (res.ok) setFields(payload.fields ?? [])
  }, [targetOrganizationId])

  useEffect(() => {
    void load()
  }, [load])

  async function onAction(fieldId: string, action: "confirm" | "correct" | "reject", value?: unknown, reason?: string) {
    const token = await getIdToken()
    if (!token) return
    const res = await fetch(`/api/credito-hub/review/fields/${fieldId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, value, reason }),
    })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "No se pudo revisar el campo")
      return
    }
    toast.success("Campo actualizado")
    await load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="min-h-[520px] rounded-lg border bg-muted/20 p-4">
        <h2 className="text-base font-semibold">Documento origen</h2>
        <p className="mt-2 text-sm text-muted-foreground">Selecciona un campo para ubicar su documento y pagina de origen.</p>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">Campos pendientes</h2>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay campos pendientes de revision.</p>
        ) : (
          fields.map((field) => <FieldReviewRow key={field.id} field={field} onAction={onAction} />)
        )}
      </section>
    </div>
  )
}
