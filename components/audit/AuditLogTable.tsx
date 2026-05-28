"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AuditLog } from "@/types/audit"

interface AuditLogTableProps {
  logs: AuditLog[]
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No hay eventos de auditoria.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Fecha</TableHead>
          <TableHead>Accion</TableHead>
          <TableHead>Actor</TableHead>
          <TableHead>Objetivo</TableHead>
          <TableHead>Productor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap text-xs">
              {formatDate(log.createdAt)}
            </TableCell>
            <TableCell className="font-medium">{log.action}</TableCell>
            <TableCell className="font-mono text-xs">{log.actorUid}</TableCell>
            <TableCell className="font-mono text-xs">
              {log.targetType}/{log.targetId}
            </TableCell>
            <TableCell className="font-mono text-xs">{log.producerId ?? "-"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function formatDate(value: unknown): string {
  if (typeof value === "string") return new Date(value).toLocaleString("es-AR")
  if (value && typeof value === "object" && "toDate" in value) {
    const toDate = (value as { toDate?: () => Date }).toDate
    if (typeof toDate === "function") return toDate().toLocaleString("es-AR")
  }
  return "-"
}
