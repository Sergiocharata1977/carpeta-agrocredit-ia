"use client"

import { useRef, useState } from "react"
import { UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { uploadDocument, type DocumentMetadata } from "@/lib/services/documents"

const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

interface DocumentUploaderProps {
  producerId: string
  organizationId: string
  periodId: string
  documentType: string
  uploadedBy: string
  onUploadComplete: (metadata: DocumentMetadata) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentUploader({
  producerId,
  organizationId,
  periodId,
  documentType,
  uploadedBy,
  onUploadComplete,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error("Tipo de archivo no soportado. Use PDF, Excel o imagen (JPG, PNG, WEBP).")
      e.target.value = ""
      return
    }

    if (file.size > MAX_SIZE_BYTES) {
      toast.error(`El archivo supera el límite de 10 MB (${formatFileSize(file.size)}).`)
      e.target.value = ""
      return
    }

    setSelectedFile(file)
  }

  function clearFile() {
    setSelectedFile(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function handleUpload() {
    if (!selectedFile) return

    setUploading(true)
    try {
      const metadata = await uploadDocument(selectedFile, {
        producerId,
        organizationId,
        periodId,
        documentType,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        visibility: "private",
        uploadedBy,
        validationStatus: "draft",
      })
      toast.success("Documento subido correctamente")
      clearFile()
      onUploadComplete(metadata)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al subir el documento"
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-muted/30"
        onClick={() => !selectedFile && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !selectedFile) {
            inputRef.current?.click()
          }
        }}
      >
        <UploadCloud className="mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          PDF, Excel, JPG, PNG, WEBP — máx. 10 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFile}
            disabled={uploading}
            className="ml-2 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button
        onClick={handleUpload}
        disabled={!selectedFile || uploading}
        className="w-full"
      >
        {uploading ? "Subiendo..." : "Subir documento"}
      </Button>
    </div>
  )
}
