"use client"

import { use, useEffect, useState } from "react"
import { getDoc, doc } from "firebase/firestore"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AccountingPeriodSelector } from "@/components/accounting/AccountingPeriodSelector"
import { BalanceSheetForm } from "@/components/accounting/BalanceSheetForm"
import { IncomeStatementForm } from "@/components/accounting/IncomeStatementForm"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { useSession } from "@/lib/auth/session"
import { getBalanceSheetsForPeriod } from "@/lib/services/balance-sheets"
import { getIncomeStatementsForPeriod } from "@/lib/services/income-statements"
import type { AccountingPeriod, BalanceSheet, IncomeStatement } from "@/types/accounting"

interface PageProps {
  params: Promise<{ empresaId: string }>
}

export default function EmpresaCarpetaPage({ params }: PageProps) {
  const { empresaId } = use(params)
  const { user } = useSession()

  const createdBy = user?.uid ?? ""

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null)
  const [balanceSheets, setBalanceSheets] = useState<BalanceSheet[]>([])
  const [incomeStatements, setIncomeStatements] = useState<IncomeStatement[]>([])
  const [loadingPeriodData, setLoadingPeriodData] = useState(false)

  useEffect(() => {
    setSelectedPeriodId(null)
    setSelectedPeriod(null)
    setBalanceSheets([])
    setIncomeStatements([])
  }, [empresaId])

  useEffect(() => {
    if (!selectedPeriodId) return

    async function loadPeriodData() {
      setLoadingPeriodData(true)
      try {
        const db = getFirebaseDb()
        if (db) {
          const periodSnap = await getDoc(doc(db, COLLECTIONS.ACCOUNTING_PERIODS, selectedPeriodId!))
          if (periodSnap.exists()) {
            setSelectedPeriod({ id: periodSnap.id, ...periodSnap.data() } as AccountingPeriod)
          }
        }

        const [bs, income] = await Promise.all([
          getBalanceSheetsForPeriod(empresaId, selectedPeriodId!),
          getIncomeStatementsForPeriod(empresaId, selectedPeriodId!),
        ])
        setBalanceSheets(bs)
        setIncomeStatements(income)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar datos del periodo")
      } finally {
        setLoadingPeriodData(false)
      }
    }

    void loadPeriodData()
  }, [empresaId, selectedPeriodId])

  function fmt(n: number, currency: string) {
    return `${currency} ${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Carpeta contable</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountingPeriodSelector
            key={empresaId}
            producerId={empresaId}
            organizationId={empresaId}
            createdBy={createdBy}
            selectedPeriodId={selectedPeriodId}
            onPeriodChange={setSelectedPeriodId}
          />
        </CardContent>
      </Card>

      {selectedPeriodId && (
        <Tabs defaultValue="balance" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-[340px]">
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="balance" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estado de situacion patrimonial</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPeriodData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : balanceSheets.length === 0 ? (
                  <BalanceSheetForm
                    producerId={empresaId}
                    organizationId={empresaId}
                    periodId={selectedPeriodId}
                    createdBy={createdBy}
                    onSuccess={() =>
                      getBalanceSheetsForPeriod(empresaId, selectedPeriodId).then(setBalanceSheets)
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {balanceSheets.map((bs) => (
                      <div key={bs.id} className="rounded-md border p-4 text-sm">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Total activo</p>
                            <p className="font-semibold">{fmt(bs.assetsTotal, bs.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total pasivo</p>
                            <p className="font-semibold">{fmt(bs.liabilitiesTotal, bs.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Patrimonio neto</p>
                            <p className="font-semibold">{fmt(bs.equityTotal, bs.currency)}</p>
                          </div>
                        </div>
                        {bs.observations && (
                          <p className="mt-2 text-xs text-muted-foreground">{bs.observations}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resultados" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estado de resultados</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPeriodData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : incomeStatements.length === 0 ? (
                  <IncomeStatementForm
                    producerId={empresaId}
                    organizationId={empresaId}
                    periodId={selectedPeriodId}
                    createdBy={createdBy}
                    onSuccess={() =>
                      getIncomeStatementsForPeriod(empresaId, selectedPeriodId).then(
                        setIncomeStatements,
                      )
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {incomeStatements.map((st) => (
                      <div key={st.id} className="rounded-md border p-4 text-sm">
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Ventas netas</p>
                            <p className="font-semibold">{fmt(st.sales, st.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Resultado bruto</p>
                            <p className="font-semibold">{fmt(st.grossResult, st.currency)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Resultado neto</p>
                            <p className="font-semibold">{fmt(st.netResult, st.currency)}</p>
                          </div>
                        </div>
                        {st.observations && (
                          <p className="mt-2 text-xs text-muted-foreground">{st.observations}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
