"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getIdToken } from "@/lib/firebase/auth-client"
import { FieldReviewRow } from "@/components/credito-hub/FieldReviewRow"
import type { ExtractedField } from "@/types/credito-hub"

interface ReviewWorkbenchProps {
  targetOrganizationId: string
}

interface SourceDocument {
  id: string
  fileName?: string
  name?: string
  mimeType?: string
  fileSize?: number
}

interface PreviewState {
  url: string
  mimeType?: string
  fileName?: string
  expiresAt?: string
}

export function ReviewWorkbench({ targetOrganizationId }: ReviewWorkbenchProps) {
  const [fields, setFields] = useState<ExtractedField[]>([])
  const [documents, setDocuments] = useState<Record<string, SourceDocument>>({})
  const [selectedField, setSelectedField] = useState<ExtractedField | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const load = useCallback(async () => {
    const token = await getIdToken()
    if (!token) return
    const res = await fetch(`/api/credito-hub/review/${targetOrganizationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const payload = await res.json()
    if (res.ok) {
      const nextFields = payload.fields ?? []
      setFields(nextFields)
      setDocuments(payload.documents ?? {})
      setSelectedField((current) => current ?? nextFields[0] ?? null)
    }
  }, [targetOrganizationId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    async function loadPreview() {
      if (!selectedField) {
        setPreview(null)
        return
      }
      const token = await getIdToken()
      if (!token) return
      setPreviewLoading(true)
      try {
        const params = new URLSearchParams({ targetOrganizationId })
        const res = await fetch(`/api/credito-hub/review/documents/${selectedField.documentId}/preview?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error ?? "No se pudo obtener el documento")
        setPreview(payload)
      } catch (error) {
        setPreview(null)
        toast.error(error instanceof Error ? error.message : "No se pudo obtener el documento")
      } finally {
        setPreviewLoading(false)
      }
    }
    void loadPreview()
  }, [selectedField, targetOrganizationId])

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
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Documento origen</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedField
                ? `${documents[selectedField.documentId]?.fileName ?? documents[selectedField.documentId]?.name ?? "Documento"}${selectedField.pageNumber ? ` - pagina ${selectedField.pageNumber}` : ""}`
                : "Selecciona un campo para ubicar su documento y pagina de origen."}
            </p>
          </div>
          {preview?.url && (
            <a className="rounded-md border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted" href={preview.url} target="_blank" rel="noreferrer">
              Abrir
            </a>
          )}
        </div>
        <DocumentPreview preview={preview} loading={previewLoading} />
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h2 className="text-base font-semibold">Campos pendientes</h2>
        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay campos pendientes de revision.</p>
        ) : (
          fields.map((field) => (
            <FieldReviewRow
              key={field.id}
              field={field}
              selected={selectedField?.id === field.id}
              onSelect={setSelectedField}
              onAction={onAction}
            />
          ))
        )}
      </section>
    </div>
  )
}

function DocumentPreview({ preview, loading }: { preview: PreviewState | null; loading: boolean }) {
  if (loading) {
    return <div className="flex h-[450px] items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">Cargando documento...</div>
  }

  if (!preview?.url) {
    return <div className="flex h-[450px] items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">Sin documento seleccionado.</div>
  }

  if (preview.mimeType?.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={preview.url} alt={preview.fileName ?? "Documento origen"} className="max-h-[450px] w-full rounded-md border bg-background object-contain" />
    )
  }

  if (preview.mimeType === "application/pdf") {
    return <iframe title={preview.fileName ?? "Documento origen"} src={preview.url} className="h-[450px] w-full rounded-md border bg-background" />
  }

  return (
    <div className="flex h-[450px] flex-col items-center justify-center gap-2 rounded-md border bg-background text-center text-sm text-muted-foreground">
      <p>Este tipo de archivo no se puede previsualizar en el navegador.</p>
      <a className="rounded-md border px-3 py-1.5 font-medium text-foreground hover:bg-muted" href={preview.url} target="_blank" rel="noreferrer">
        Abrir o descargar
      </a>
    </div>
  )
}
