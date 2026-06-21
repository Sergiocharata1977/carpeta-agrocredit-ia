"use client"

import { use, useEffect, useState } from "react"
import { getDoc, doc } from "firebase/firestore"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountingPeriodSelector } from "@/components/accounting/AccountingPeriodSelector"
import { TaxGridForm } from "@/components/accounting/TaxGridForm"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { useSession } from "@/lib/auth/session"
import { getPeriodById } from "@/lib/services/accounting-periods"
import { getTaxDocumentsForPeriod } from "@/lib/services/tax-documents"
import type { AccountingPeriod, TaxDocument } from "@/types/accounting"

interface PageProps {
  params: Promise<{ empresaId: string }>
}

export default function EmpresaImpuestosPage({ params }: PageProps) {
  const { empresaId } = use(params)
  const { user } = useSession()

  const createdBy = user?.uid ?? ""

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null)
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([])
  const [loadingPeriodData, setLoadingPeriodData] = useState(false)

  useEffect(() => {
    setSelectedPeriodId(null)
    setSelectedPeriod(null)
    setTaxDocuments([])
  }, [empresaId])

  useEffect(() => {
    if (!selectedPeriodId) return

    async function loadData() {
      setLoadingPeriodData(true)
      try {
        setSelectedPeriod(await getPeriodById(selectedPeriodId!))
        const taxes = await getTaxDocumentsForPeriod(empresaId, selectedPeriodId!)
        setTaxDocuments(taxes)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar impuestos")
      } finally {
        setLoadingPeriodData(false)
      }
    }

    void loadData()
  }, [empresaId, selectedPeriodId])

  const periodYear = selectedPeriod?.year ?? new Date().getFullYear()

  function fmt(n: number, currency: string) {
    return `${currency} ${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Impuestos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <AccountingPeriodSelector
            key={empresaId}
            producerId={empresaId}
            organizationId={empresaId}
            createdBy={createdBy}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={setSelectedPeriodId}
          />

          {selectedPeriodId && (
            <>
              <div className="border-t pt-5">
                <TaxGridForm
                  producerId={empresaId}
                  organizationId={empresaId}
                  periodId={selectedPeriodId}
                  year={periodYear}
                  createdBy={createdBy}
                  onSuccess={() =>
                    getTaxDocumentsForPeriod(empresaId, selectedPeriodId).then(setTaxDocuments)
                  }
                />
              </div>

              {!loadingPeriodData && taxDocuments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Registros cargados en este periodo</p>
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Periodo</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Importe</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {taxDocuments.map((td) => (
                          <tr key={td.id} className="hover:bg-muted/20">
                            <td className="px-3 py-2 capitalize">{td.taxType.replace(/_/g, " ")}</td>
                            <td className="px-3 py-2 text-muted-foreground">{td.fiscalPeriod}</td>
                            <td className="px-3 py-2 text-right font-medium">{fmt(td.amount, td.currency)}</td>
                            <td className="px-3 py-2 text-muted-foreground">{td.observations ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {loadingPeriodData && (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
