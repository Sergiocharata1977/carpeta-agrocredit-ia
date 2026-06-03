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
import { StatementImportReview } from "@/components/accounting/StatementImportReview"
import { StatementImportUploader } from "@/components/accounting/StatementImportUploader"
import { TaxGridForm } from "@/components/accounting/TaxGridForm"
import { EntitySelector } from "@/components/producers/EntitySelector"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { useSession } from "@/lib/auth/session"
import { getBalanceSheetsForPeriod } from "@/lib/services/balance-sheets"
import { getIncomeStatementsForPeriod } from "@/lib/services/income-statements"
import { getTaxDocumentsForPeriod } from "@/lib/services/tax-documents"
import type { Producer } from "@/types/producer"
import type { AccountingPeriod, BalanceSheet, IncomeStatement, TaxDocument } from "@/types/accounting"

interface CarpetaPageProps {
  params: Promise<{ producerId: string }>
}

export default function CarpetaPage({ params }: CarpetaPageProps) {
  const { producerId } = use(params)
  const { user } = useSession()

  const [producer, setProducer] = useState<Producer | null>(null)
  const [loadingProducer, setLoadingProducer] = useState(true)
  const [activeEntityId, setActiveEntityId] = useState(producerId)
  const [activeTab, setActiveTab] = useState("balance")

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null)

  const [balanceSheets, setBalanceSheets] = useState<BalanceSheet[]>([])
  const [incomeStatements, setIncomeStatements] = useState<IncomeStatement[]>([])
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([])
  const [loadingPeriodData, setLoadingPeriodData] = useState(false)
  const [balanceImportId, setBalanceImportId] = useState<string | null>(null)
  const [incomeImportId, setIncomeImportId] = useState<string | null>(null)
  const [combinedImportId, setCombinedImportId] = useState<string | null>(null)

  const isRootEntity = activeEntityId === producerId
  const createdBy = user?.uid ?? ""
  const periodYear = selectedPeriod?.year ?? new Date().getFullYear()

  useEffect(() => {
    setActiveEntityId(producerId)
    setSelectedPeriodId(null)
    setSelectedPeriod(null)
  }, [producerId])

  useEffect(() => {
    async function loadProducer() {
      const db = getFirebaseDb()
      if (!db) return
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, producerId))
        if (snap.exists()) setProducer({ id: snap.id, ...snap.data() } as Producer)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar el productor")
      } finally {
        setLoadingProducer(false)
      }
    }
    loadProducer()
  }, [producerId])

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

        const [bs, income, taxes] = await Promise.all([
          getBalanceSheetsForPeriod(activeEntityId, selectedPeriodId!),
          getIncomeStatementsForPeriod(activeEntityId, selectedPeriodId!),
          isRootEntity
            ? getTaxDocumentsForPeriod(activeEntityId, selectedPeriodId!)
            : Promise.resolve([] as TaxDocument[]),
        ])

        setBalanceSheets(bs)
        setIncomeStatements(income)
        setTaxDocuments(taxes)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar datos del periodo")
      } finally {
        setLoadingPeriodData(false)
      }
    }
    loadPeriodData()
  }, [activeEntityId, isRootEntity, selectedPeriodId])

  function handleEntityChange(entityId: string) {
    setActiveEntityId(entityId)
    setSelectedPeriodId(null)
    setSelectedPeriod(null)
    setBalanceSheets([])
    setIncomeStatements([])
    setTaxDocuments([])
    setBalanceImportId(null)
    setIncomeImportId(null)
    setCombinedImportId(null)
    if (entityId !== producerId && activeTab === "impuestos") {
      setActiveTab("balance")
    }
  }

  async function refreshPeriodData() {
    if (!selectedPeriodId) return
    const [bs, income, taxes] = await Promise.all([
      getBalanceSheetsForPeriod(activeEntityId, selectedPeriodId),
      getIncomeStatementsForPeriod(activeEntityId, selectedPeriodId),
      isRootEntity
        ? getTaxDocumentsForPeriod(activeEntityId, selectedPeriodId)
        : Promise.resolve([] as TaxDocument[]),
    ])
    setBalanceSheets(bs)
    setIncomeStatements(income)
    setTaxDocuments(taxes)
  }

  function handlePeriodChange(periodId: string | null) {
    setSelectedPeriodId(periodId)
    setBalanceImportId(null)
    setIncomeImportId(null)
    setCombinedImportId(null)
  }

  function fmt(n: number, currency: string) {
    return `${currency} ${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {!loadingProducer ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carpeta contable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <EntitySelector
              rootProducerId={producerId}
              rootLabel={producer?.legalName ?? "Declaracion personal"}
              activeEntityId={activeEntityId}
              onEntityChange={handleEntityChange}
            />

            <div className="border-t pt-5">
              <AccountingPeriodSelector
                key={activeEntityId}
                producerId={activeEntityId}
                organizationId={activeEntityId}
                createdBy={createdBy}
                selectedPeriodId={selectedPeriodId}
                onPeriodChange={handlePeriodChange}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Skeleton className="h-44 w-full" />
      )}

      {selectedPeriodId && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-[520px] md:grid-cols-3">
            <TabsTrigger value="balance">Balance</TabsTrigger>
            <TabsTrigger value="resultados">Resultados</TabsTrigger>
            {isRootEntity && <TabsTrigger value="impuestos">Impuestos</TabsTrigger>}
          </TabsList>

          <TabsContent value="balance" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estado de situacion patrimonial</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPeriodData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 lg:grid-cols-2">
                      <StatementImportUploader
                        producerId={activeEntityId}
                        periodId={selectedPeriodId}
                        kind="balance_sheet"
                        onExtracted={setBalanceImportId}
                      />
                      <StatementImportUploader
                        producerId={activeEntityId}
                        periodId={selectedPeriodId}
                        kind="combined"
                        onExtracted={setCombinedImportId}
                      />
                    </div>

                    {(combinedImportId ?? balanceImportId) && (
                      <StatementImportReview
                        importId={(combinedImportId ?? balanceImportId)!}
                        onApplied={() => {
                          setBalanceImportId(null)
                          setCombinedImportId(null)
                          void refreshPeriodData()
                        }}
                      />
                    )}

                    {balanceSheets.length === 0 ? (
                      <BalanceSheetForm
                        producerId={activeEntityId}
                        organizationId={activeEntityId}
                        periodId={selectedPeriodId}
                        createdBy={createdBy}
                        onSuccess={() => getBalanceSheetsForPeriod(activeEntityId, selectedPeriodId).then(setBalanceSheets)}
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
                            {bs.observations && <p className="mt-2 text-xs text-muted-foreground">{bs.observations}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resultados" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estado de resultados</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingPeriodData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : (
                  <>
                    <StatementImportUploader
                      producerId={activeEntityId}
                      periodId={selectedPeriodId}
                      kind="income_statement"
                      onExtracted={setIncomeImportId}
                    />

                    {incomeImportId && (
                      <StatementImportReview
                        importId={incomeImportId}
                        onApplied={() => {
                          setIncomeImportId(null)
                          void refreshPeriodData()
                        }}
                      />
                    )}

                    {incomeStatements.length === 0 ? (
                      <IncomeStatementForm
                        producerId={activeEntityId}
                        organizationId={activeEntityId}
                        periodId={selectedPeriodId}
                        createdBy={createdBy}
                        onSuccess={() =>
                          getIncomeStatementsForPeriod(activeEntityId, selectedPeriodId).then(setIncomeStatements)
                        }
                      />
                    ) : (
                      <div className="space-y-3">
                        {incomeStatements.map((statement) => (
                          <div key={statement.id} className="rounded-md border p-4 text-sm">
                            <div className="grid gap-4 sm:grid-cols-3">
                              <div>
                                <p className="text-xs text-muted-foreground">Ventas netas</p>
                                <p className="font-semibold">{fmt(statement.sales, statement.currency)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Resultado bruto</p>
                                <p className="font-semibold">{fmt(statement.grossResult, statement.currency)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Resultado neto</p>
                                <p className="font-semibold">{fmt(statement.netResult, statement.currency)}</p>
                              </div>
                            </div>
                            {statement.observations && (
                              <p className="mt-2 text-xs text-muted-foreground">{statement.observations}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {isRootEntity && (
            <TabsContent value="impuestos" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Impuestos mensuales - {periodYear}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <TaxGridForm
                    producerId={producerId}
                    organizationId={producerId}
                    periodId={selectedPeriodId}
                    year={periodYear}
                    createdBy={createdBy}
                    onSuccess={() => getTaxDocumentsForPeriod(producerId, selectedPeriodId).then(setTaxDocuments)}
                  />

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
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Comprobante</th>
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
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}
