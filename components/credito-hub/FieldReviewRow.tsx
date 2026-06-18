"use client"

import { useState } from "react"
import { Check, Eye, Pencil, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { ExtractedField } from "@/types/credito-hub"

interface FieldReviewRowProps {
  field: ExtractedField
  selected?: boolean
  onSelect?: (field: ExtractedField) => void
  onAction: (fieldId: string, action: "confirm" | "correct" | "reject", value?: unknown, reason?: string) => Promise<void>
}

export function FieldReviewRow({ field, selected = false, onSelect, onAction }: FieldReviewRowProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(field.normalizedValue ?? ""))
  const [reason, setReason] = useState("")

  return (
    <div className={`space-y-2 rounded-md border p-3 ${selected ? "border-primary bg-primary/5" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{field.fieldCode}</p>
          <p className="truncate text-sm text-muted-foreground">{String(field.normalizedValue ?? field.rawValue ?? "")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Doc. {field.documentId.slice(0, 8)}{field.pageNumber ? ` - pag. ${field.pageNumber}` : ""}
          </p>
        </div>
        <Badge variant={field.confidence < 0.7 ? "destructive" : "secondary"}>{Math.round(field.confidence * 100)}%</Badge>
      </div>
      {editing && (
        <div className="grid gap-2">
          <Input value={value} onChange={(event) => setValue(event.target.value)} />
          <Input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo" />
        </div>
      )}
      <div className="flex gap-2">
        {onSelect && (
          <Button size="sm" variant={selected ? "secondary" : "outline"} onClick={() => onSelect(field)}>
            <Eye className="mr-1 h-4 w-4" />
            Ver
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => onAction(field.id, "confirm")}>
          <Check className="mr-1 h-4 w-4" />
          Confirmar
        </Button>
        {editing ? (
          <Button size="sm" onClick={() => onAction(field.id, "correct", value, reason)}>
            Guardar
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-4 w-4" />
            Corregir
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => onAction(field.id, "reject", undefined, reason)}>
          <X className="mr-1 h-4 w-4" />
          Rechazar
        </Button>
      </div>
    </div>
  )
}
