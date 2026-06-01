"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, UploadCloud } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DocumentUploader } from "@/components/documents/DocumentUploader"
import { getDocumentsForPeriod, type DocumentMetadata } from "@/lib/services/documents"

interface DocumentChecklistProps {
  producerId: string
  organizationId: string
  uploadedBy: string
  hasEmployees?: boolean
}

type ChecklistStatus = "presented" | "pending" | "expired"

type ChecklistItem = {
  type: string
  label: string
  validDays: number
  requiresEmployees?: boolean
}

const PROFILE_DOCUMENT_PERIOD_ID = "producer_profile_documents"

const CHECKLIST_ITEMS: ChecklistItem[] = [
  { type: "constancia_afip", label: "Constancia AFIP", validDays: 365 },
  { type: "inscripcion_rentas", label: "Inscripcion rentas", validDays: 365 },
  { type: "ddjj_iva_anual", label: "DDJJ IVA anual", validDays: 365 },
  { type: "ddjj_ganancias", label: "DDJJ Ganancias", validDays: 365 },
  { type: "formulario_931", label: "Formulario 931", validDays: 45, requiresEmployees: true },
  { type: "resumen_bancario", label: "Resumen bancario", validDays: 90 },
  { type: "certificacion_ingresos", label: "Certificacion de ingresos", validDays: 180 },
]

function toMillis(value: unknown): number {
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().getTime()
  }

  return 0
}

function formatDate(value: unknown): string {
  const millis = toMillis(value)
  if (!millis) return "-"

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(millis))
}

function getStatus(item: ChecklistItem, document?: DocumentMetadata): ChecklistStatus {
  if (!document) return "pending"

  const uploadedAt = toMillis(document.createdAt)
  if (!uploadedAt) return "presented"

  const ageMs = Date.now() - uploadedAt
  const maxAgeMs = item.validDays * 24 * 60 * 60 * 1000
  return ageMs > maxAgeMs ? "expired" : "presented"
}

function StatusBadge({ status }: { status: ChecklistStatus }) {
  if (status === "presented") {
    return (
      <Badge className="gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Presentado
      </Badge>
    )
  }

  if (status === "expired") {
    return (
      <Badge variant="destructive" className="gap-1">
        <Clock3 className="h-3 w-3" />
        Vencido
      </Badge>
    )
  }

  return <Badge variant="outline">Pendiente</Badge>
}

export function DocumentChecklist({
  producerId,
  organizationId,
  uploadedBy,
  hasEmployees,
}: DocumentChecklistProps) {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [activeType, setActiveType] = useState<string | null>(null)

  const items = useMemo(
    () => CHECKLIST_ITEMS.filter((item) => !item.requiresEmployees || hasEmployees === true),
    [hasEmployees],
  )

  const activeItem = items.find((item) => item.type === activeType) ?? null

  useEffect(() => {
    async function loadDocuments() {
      setLoading(true)
      try {
        setDocuments(await getDocumentsForPeriod(producerId, PROFILE_DOCUMENT_PERIOD_ID))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudieron cargar los documentos")
      } finally {
        setLoading(false)
      }
    }

    void loadDocuments()
  }, [producerId])

  function latestDocumentFor(type: string) {
    return documents
      .filter((document) => document.documentType === type)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))[0]
  }

  if (loading) {
    return <Skeleton className="h-64 w-full" />
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Archivo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Accion</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const document = latestDocumentFor(item.type)
              const status = getStatus(item, document)

              return (
                <TableRow key={item.type}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {document?.fileName ?? "-"}
                  </TableCell>
                  <TableCell>{formatDate(document?.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant={status === "presented" ? "outline" : "default"}
                      className="gap-2"
                      onClick={() => setActiveType(item.type)}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {status === "presented" ? "Reemplazar" : "Subir"}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(activeItem)} onOpenChange={(open) => !open && setActiveType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeItem?.label ?? "Subir documento"}</DialogTitle>
          </DialogHeader>
          {activeItem && (
            <DocumentUploader
              producerId={producerId}
              organizationId={organizationId}
              periodId={PROFILE_DOCUMENT_PERIOD_ID}
              documentType={activeItem.type}
              uploadedBy={uploadedBy}
              onUploadComplete={(metadata) => {
                setDocuments((prev) => [metadata, ...prev])
                setActiveType(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
