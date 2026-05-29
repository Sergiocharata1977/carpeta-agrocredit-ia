"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Producer, FolderStatus } from "@/types/producer"

interface ProducerTableProps {
  producers: Producer[]
  onSelect?: (producer: Producer) => void
}

const FOLDER_STATUS_LABELS: Record<FolderStatus, string> = {
  incomplete: "Incompleta",
  in_progress: "En proceso",
  complete: "Completa",
  under_review: "En revisión",
  archived: "Archivada",
  outdated: "Desactualizada",
}

const FOLDER_STATUS_CLASSES: Record<FolderStatus, string> = {
  incomplete: "bg-gray-100 text-gray-700",
  in_progress: "bg-yellow-100 text-yellow-800",
  complete: "bg-green-100 text-green-800",
  under_review: "bg-blue-100 text-blue-800",
  archived: "bg-gray-100 text-gray-500",
  outdated: "bg-orange-100 text-orange-700",
}

const ACTIVITY_LABELS: Record<Producer["activity"], string> = {
  agriculture: "Agricultura",
  livestock: "Ganadería",
  mixed: "Mixta",
  horticulture: "Horticultura",
  forestry: "Forestación",
  other: "Otra",
}

function FolderStatusBadge({ status }: { status: FolderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${FOLDER_STATUS_CLASSES[status]}`}
    >
      {FOLDER_STATUS_LABELS[status]}
    </span>
  )
}

export function ProducerTable({ producers, onSelect }: ProducerTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Razón Social</TableHead>
          <TableHead>CUIT</TableHead>
          <TableHead>Actividad</TableHead>
          <TableHead>Provincia</TableHead>
          <TableHead>Estado Carpeta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {producers.map((producer) => (
          <TableRow
            key={producer.id}
            className={onSelect ? "cursor-pointer" : undefined}
            onClick={() => onSelect?.(producer)}
          >
            <TableCell className="font-medium">{producer.legalName}</TableCell>
            <TableCell>{producer.taxId}</TableCell>
            <TableCell>{ACTIVITY_LABELS[producer.activity]}</TableCell>
            <TableCell>{producer.province}</TableCell>
            <TableCell>
              <FolderStatusBadge status={producer.folderStatus} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
