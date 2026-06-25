"use client"

import { useRef, useState } from "react"
import { FolderUp, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { getIdToken } from "@/lib/firebase/auth-client"

interface MassUploadDropzoneProps {
  targetOrganizationId: string
  onUploaded?: () => void
}

export function MassUploadDropzone({ targetOrganizationId, onUploaded }: MassUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  async function upload() {
    if (files.length === 0) return
    setUploading(true)
    try {
      const token = await getIdToken()
      if (!token) throw new Error("Sesion no disponible")
      const data = new FormData()
      data.set("targetOrganizationId", targetOrganizationId)
      files.forEach((file) => data.append("files", file))
      const res = await fetch("/api/credito-hub/intake", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "x-staging-data": "true" },
        body: data,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "No se pudo encolar la carga")
      const total = payload.jobIds?.length ?? 0
      const duplicates = payload.duplicateJobIds?.length ?? 0
      if (duplicates > 0) {
        toast.info(`${duplicates} archivo(s) ya estaban cargados. Se reutilizo el procesamiento existente.`)
      } else {
        toast.success(`${total} documento(s) encolados`)
      }
      setFiles([])
      onUploaded?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de carga")
    } finally {
      setUploading(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Carga masiva IA</h2>
          <p className="text-sm text-muted-foreground">PDF, imagen, Excel o ZIP. Se encola para procesamiento async.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          <FolderUp className="mr-2 h-4 w-4" />
          Elegir
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.zip"
        className="hidden"
        onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
      />
      {files.length > 0 && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          {files.map((file) => (
            <div key={`${file.name}-${file.size}`} className="flex justify-between gap-3 py-1">
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-muted-foreground">{Math.round(file.size / 1024)} KB</span>
            </div>
          ))}
        </div>
      )}
      <Button type="button" disabled={files.length === 0 || uploading} onClick={upload}>
        <Upload className="mr-2 h-4 w-4" />
        {uploading ? "Encolando..." : "Encolar documentos"}
      </Button>
    </section>
  )
}
