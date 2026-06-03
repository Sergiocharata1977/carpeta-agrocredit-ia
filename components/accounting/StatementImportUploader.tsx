"use client"

import { useRef, useState } from "react"
import { AlertTriangle, FileUp, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import type { StatementImportKind } from "@/types/statement-imports"

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

function isExcel(mimeType: string) {
  return mimeType.includes("excel") || mimeType.includes("spreadsheetml")
}

interface StatementImportUploaderProps {
  producerId: string
  periodId: string
  kind: StatementImportKind
  onExtracted: (importId: string) => void
}

export function StatementImportUploader({
  producerId,
  periodId,
  kind,
  onExtracted,
}: StatementImportUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle")
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function validateFile(file: File) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return "Formato no permitido. Usa PDF, imagen, XLS o XLSX."
    }
    const maxSize = isExcel(file.type) ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return `Archivo muy grande. Limite: ${Math.round(maxSize / 1024 / 1024)} MB.`
    }
    return null
  }

  async function handleFile(file: File | null) {
    if (!file) return

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      setStatus("error")
      return
    }

    setStatus("processing")
    setFileName(file.name)
    setError(null)

    try {
      const token = await getFreshIdToken()
      const formData = new FormData()
      formData.append("file", file)
      formData.append("producerId", producerId)
      formData.append("periodId", periodId)
      formData.append("kind", kind)
      formData.append("currency", "ARS")

      const res = await fetch("/api/accounting/statements/extract", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo extraer el archivo")

      toast.success("Archivo extraido. Revisa los importes antes de aplicar.")
      onExtracted(json.importId)
      setStatus("idle")
      setFileName(null)
      if (inputRef.current) inputRef.current.value = ""
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado"
      setError(message)
      setStatus("error")
      toast.error(message)
    }
  }

  return (
    <div className="space-y-3 rounded-md border border-dashed p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Cargar desde archivo</p>
          <p className="text-xs text-muted-foreground">
            PDF, imagen o Excel. La IA solo crea un borrador editable.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.xls,.xlsx"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={status === "processing"}
            onClick={() => inputRef.current?.click()}
          >
            {status === "processing" ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            {status === "processing" ? "Procesando" : "Seleccionar"}
          </Button>
        </div>
      </div>

      {status === "processing" && (
        <div className="space-y-2">
          <Progress value={65} />
          <p className="text-xs text-muted-foreground">
            Analizando {fileName ?? "archivo"}...
          </p>
        </div>
      )}

      {status === "error" && error && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => {
                setStatus("idle")
                setError(null)
                inputRef.current?.click()
              }}
            >
              <RotateCcw className="size-3.5" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
