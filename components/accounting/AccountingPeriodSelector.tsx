"use client"

import { useEffect, useState } from "react"
import { PlusCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { AccountingPeriodForm } from "@/components/accounting/AccountingPeriodForm"
import { getPeriodsForProducer } from "@/lib/services/accounting-periods"
import type { AccountingPeriod } from "@/types/accounting"

interface AccountingPeriodSelectorProps {
  producerId: string
  organizationId: string
  createdBy: string
  selectedPeriodId: string | null
  onPeriodChange: (periodId: string) => void
}

export function AccountingPeriodSelector({
  producerId,
  organizationId,
  createdBy,
  selectedPeriodId,
  onPeriodChange,
}: AccountingPeriodSelectorProps) {
  const [periods, setPeriods] = useState<AccountingPeriod[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  async function loadPeriods() {
    try {
      const data = await getPeriodsForProducer(producerId)
      // Ordenar por año descendente
      const sorted = data.sort((a, b) => b.year - a.year)
      setPeriods(sorted)
      // Seleccionar el primero automáticamente si no hay ninguno seleccionado
      if (!selectedPeriodId && sorted.length > 0) {
        onPeriodChange(sorted[0].id)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar períodos"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPeriods()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producerId])

  function handlePeriodCreated(periodId: string) {
    setDialogOpen(false)
    loadPeriods().then(() => {
      onPeriodChange(periodId)
    })
  }

  if (loading) {
    return <Skeleton className="h-9 w-64" />
  }

  return (
    <div className="flex items-center gap-3">
      {periods.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No hay períodos — crear el primero
        </p>
      ) : (
        <Select
          value={selectedPeriodId ?? undefined}
          onValueChange={onPeriodChange}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            {periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label} — {p.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Nuevo período
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo período contable</DialogTitle>
          </DialogHeader>
          <AccountingPeriodForm
            producerId={producerId}
            organizationId={organizationId}
            createdBy={createdBy}
            onSuccess={handlePeriodCreated}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
