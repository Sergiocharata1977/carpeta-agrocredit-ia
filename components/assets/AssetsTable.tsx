"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import type { Asset, AssetType } from "@/types/assets"
import { Button } from "@/components/ui/button"
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

const LIEN_STATUS_LABELS: Record<string, string> = {
  free: "Libre",
  mortgaged: "Hipotecado",
  pledged: "Prendado",
  seized: "Embargado",
  other: "Otro",
}

const OWNERSHIP_TYPE_LABELS: Record<string, string> = {
  own: "Propio",
  shared: "Compartido",
  leased: "Arrendado",
  other: "Otro",
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

const REAL_ESTATE_TYPES: AssetType[] = ["real_estate"]

interface Props {
  assets: Asset[]
  onEdit?: (asset: Asset) => void
  onDelete?: (assetId: string) => void
}

export function AssetsTable({ assets, onEdit, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No hay bienes registrados.</p>
      </div>
    )
  }

  const isRealEstate = assets.length > 0 && REAL_ESTATE_TYPES.includes(assets[0].assetType)

  const handleDelete = (assetId: string) => {
    setDeletingId(assetId)
    onDelete?.(assetId)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descripción</TableHead>
            {isRealEstate ? (
              <>
                <TableHead>Hectáreas</TableHead>
                <TableHead>Provincia / Ciudad</TableHead>
                <TableHead>Titularidad</TableHead>
              </>
            ) : (
              <>
                <TableHead>Marca / Modelo</TableHead>
                <TableHead>Año</TableHead>
              </>
            )}
            <TableHead>Valor estimado</TableHead>
            <TableHead>Gravamen</TableHead>
            {(onEdit || onDelete) && (
              <TableHead className="text-right">Acciones</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id}>
              <TableCell className="font-medium">{asset.description}</TableCell>
              {isRealEstate ? (
                <>
                  <TableCell>
                    {asset.hectares != null ? `${asset.hectares} ha` : "—"}
                  </TableCell>
                  <TableCell>
                    {[asset.province, asset.city].filter(Boolean).join(", ") || "—"}
                  </TableCell>
                  <TableCell>
                    {OWNERSHIP_TYPE_LABELS[asset.ownershipType] ?? asset.ownershipType}
                    {asset.ownershipType === "shared" && asset.ownershipPercentage != null
                      ? ` (${asset.ownershipPercentage}%)`
                      : ""}
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell>
                    {[asset.brand, asset.model].filter(Boolean).join(" / ") || "—"}
                  </TableCell>
                  <TableCell>{asset.year ?? "—"}</TableCell>
                </>
              )}
              <TableCell>
                {formatCurrency(asset.estimatedValue, asset.currency)}
              </TableCell>
              <TableCell>
                {LIEN_STATUS_LABELS[asset.lienStatus] ?? asset.lienStatus}
              </TableCell>
              {(onEdit || onDelete) && (
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(asset)}
                        aria-label="Editar bien"
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
                            aria-label="Eliminar bien"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar bien</AlertDialogTitle>
                            <AlertDialogDescription>
                              ¿Está seguro de que desea eliminar este bien? Esta
                              acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(asset.id)}
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
