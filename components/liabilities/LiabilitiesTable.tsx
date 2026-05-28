"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Pencil, Trash2 } from "lucide-react"
import type { Liability, LiabilityType } from "@/types/assets"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const LIABILITY_TYPE_LABELS: Record<LiabilityType, string> = {
  bank_loan: "Préstamo bancario",
  commercial_credit: "Crédito comercial",
  leasing: "Leasing",
  mortgage: "Hipoteca",
  pledge: "Prenda",
  tax_debt: "Deuda fiscal",
  other: "Otro",
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

const LIABILITY_TYPE_VARIANTS: Record<LiabilityType, BadgeVariant> = {
  bank_loan: "default",
  commercial_credit: "secondary",
  leasing: "outline",
  mortgage: "destructive",
  pledge: "destructive",
  tax_debt: "destructive",
  other: "outline",
}

function formatCurrency(value: number, currency: "ARS" | "USD"): string {
  if (currency === "ARS") {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value)
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

function formatDueDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

interface Props {
  liabilities: Liability[]
  onEdit?: (liability: Liability) => void
  onDelete?: (liabilityId: string) => void
}

export function LiabilitiesTable({ liabilities, onEdit, onDelete }: Props) {
  if (liabilities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hay deudas registradas.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Acreedor</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Importe</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Garantía</TableHead>
            {(onEdit || onDelete) && (
              <TableHead className="text-right">Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {liabilities.map((liability) => (
            <TableRow key={liability.id}>
              <TableCell className="font-medium">{liability.creditor}</TableCell>
              <TableCell>
                <Badge variant={LIABILITY_TYPE_VARIANTS[liability.liabilityType]}>
                  {LIABILITY_TYPE_LABELS[liability.liabilityType]}
                </Badge>
              </TableCell>
              <TableCell>
                {formatCurrency(liability.amount, liability.currency)}
              </TableCell>
              <TableCell>{liability.currency}</TableCell>
              <TableCell>{formatDueDate(liability.dueDate)}</TableCell>
              <TableCell>{liability.guaranteeType || "—"}</TableCell>
              {(onEdit || onDelete) && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(liability)}
                        aria-label="Editar deuda"
                      >
                        <Pencil className="size-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label="Eliminar deuda"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar deuda</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Está seguro de que desea eliminar esta deuda? Esta
                              acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(liability.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
