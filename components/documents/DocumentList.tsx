"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { DocumentMetadata } from "@/lib/services/documents"

interface DocumentListProps {
  documents: DocumentMetadata[]
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  pending_review: "En revisión",
  validated: "Validado",
  observed: "Observado",
  rejected: "Rechazado",
}

const STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  pending_review: "outline",
  validated: "default",
  observed: "outline",
  rejected: "destructive",
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentList({ documents }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No hay documentos subidos para este período.
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Tamaño</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell className="max-w-[200px] truncate font-medium">
              {doc.fileName}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {doc.documentType}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatFileSize(doc.fileSize)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(doc.createdAt)}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[doc.validationStatus] ?? "secondary"}>
                {STATUS_LABELS[doc.validationStatus] ?? doc.validationStatus}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-1 h-4 w-4" />
                  Descargar
                </a>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
