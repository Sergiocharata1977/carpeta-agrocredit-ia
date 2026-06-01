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
import { TaxGridForm } from "@/components/accounting/TaxGridForm"
import { MachineryTable } from "@/components/accounting/MachineryTable"
import { RealEstateTable } from "@/components/accounting/RealEstateTable"
import { DocumentUploader } from "@/components/documents/DocumentUploader"
import { DocumentList } from "@/components/documents/DocumentList"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { useSession } from "@/lib/auth/session"
import { getBalanceSheetsForPeriod } from "@/lib/services/balance-sheets"
import { getIncomeStatementsForPeriod } from "@/lib/services/income-statements"
import { getTaxDocumentsForPeriod } from "@/lib/services/tax-documents"
import { getDocumentsForPeriod, type DocumentMetadata } from "@/lib/services/documents"
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

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<AccountingPeriod | null>(null)

  const [balanceSheets, setBalanceSheets] = useState<BalanceSheet[]>([])
  const [incomeStatements, setIncomeStatements] = useState<IncomeStatement[]>([])
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([])
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [loadingPeriodData, setLoadingPeriodData] = useState(false)

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
        // Cargar periodo para obtener el año
        const db = getFirebaseDb()
        if (db) {
          const periodSnap = await getDoc(doc(db, COLLECTIONS.ACCOUNTING_PERIODS, selectedPeriodId!))
          if (periodSnap.exists()) {
            setSelectedPeriod({ id: periodSnap.id, ...periodSnap.data() } as AccountingPeriod)
          }
        }
        const [bs, is, td, docs] = await Promise.all([
          getBalanceSheetsForPeriod(producerId, selectedPeriodId!),
          getIncomeStatementsForPeriod(producerId, selectedPeriodId!),
          getTaxDocumentsForPeriod(producerId, selectedPeriodId!),
          getDocumentsForPeriod(producerId, selectedPeriodId!),
        ])
        setBalanceSheets(bs)
        setIncomeStatements(is)
        setTaxDocuments(td)
        setDocuments(docs)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al cargar datos del período")
      } finally {
        setLoadingPeriodData(false)
      }
    }
    loadPeriodData()
  }, [producerId, selectedPeriodId])

  const organizationId = producer?.organizationId ?? user?.defaultOrganizationId ?? ""
  const createdBy = user?.uid ?? ""
  const periodYear = selectedPeriod?.year ?? new Date().getFullYear()

  function fmt(n: number, currency: string) {
    return `${currency} ${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-6">
      {/* Selector de período */}
      {!loadingProducer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Período contable</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountingPeriodSelector
              producerId={producerId}
              organizationId={organizationId}
              createdBy={createdBy}
              selectedPeriodId={selectedPeriodId}
              onPeriodChange={setSelectedPeriodId}
            />
          </CardContent>
        </Card>
      )}

      {/* Tabs verticales */}
      {selectedPeriodId && (
        <Tabs defaultValue="balance" className="flex gap-5 items-start">

          {/* Nav lateral */}
          <TabsList className="flex flex-col h-auto w-40 shrink-0 items-stretch gap-0.5 bg-muted/40 rounded-xl p-1.5">
            <TabsTrigger value="balance"    className="justify-start text-sm">Balance</TabsTrigger>
            <TabsTrigger value="resultados" className="justify-start text-sm">Resultados</TabsTrigger>
            <TabsTrigger value="impuestos"  className="justify-start text-sm">Impuestos</TabsTrigger>
            <TabsTrigger value="bienes"     className="justify-start text-sm">Bienes</TabsTrigger>
            <TabsTrigger value="inmuebles"  className="justify-start text-sm">Inmuebles</TabsTrigger>
            <TabsTrigger value="documentos" className="justify-start text-sm">Documentos</TabsTrigger>
          </TabsList>

          <div className="flex-1 min-w-0">

            {/* ── BALANCE ── */}
            <TabsContent value="balance" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Estado de situación patrimonial</CardTitle></CardHeader>
                <CardContent>
                  {loadingPeriodData ? (
                    <div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
                  ) : balanceSheets.length === 0 ? (
                    <BalanceSheetForm
                      producerId={producerId}
                      organizationId={organizationId}
                      periodId={selectedPeriodId}
                      createdBy={createdBy}
                      onSuccess={() => getBalanceSheetsForPeriod(producerId, selectedPeriodId).then(setBalanceSheets)}
                    />
                  ) : (
                    <div className="space-y-3">
                      {balanceSheets.map((bs) => (
                        <div key={bs.id} className="rounded-md border p-4 text-sm">
                          <div className="grid grid-cols-3 gap-4">
                            <div><p className="text-muted-foreground text-xs">Total activo</p><p className="font-semibold">{fmt(bs.assetsTotal, bs.currency)}</p></div>
                            <div><p className="text-muted-foreground text-xs">Total pasivo</p><p className="font-semibold">{fmt(bs.liabilitiesTotal, bs.currency)}</p></div>
                            <div><p className="text-muted-foreground text-xs">Patrimonio neto</p><p className="font-semibold">{fmt(bs.equityTotal, bs.currency)}</p></div>
                          </div>
                          {bs.observations && <p className="mt-2 text-xs text-muted-foreground">{bs.observations}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── RESULTADOS ── */}
            <TabsContent value="resultados" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Estado de resultados</CardTitle></CardHeader>
                <CardContent>
                  {loadingPeriodData ? (
                    <div className="space-y-3"><Skeleton className="h-9 w-full" /><Skeleton className="h-9 w-full" /></div>
                  ) : incomeStatements.length === 0 ? (
                    <IncomeStatementForm
                      producerId={producerId}
                      organizationId={organizationId}
                      periodId={selectedPeriodId}
                      createdBy={createdBy}
                      onSuccess={() => getIncomeStatementsForPeriod(producerId, selectedPeriodId).then(setIncomeStatements)}
                    />
                  ) : (
                    <div className="space-y-3">
                      {incomeStatements.map((is) => (
                        <div key={is.id} className="rounded-md border p-4 text-sm">
                          <div className="grid grid-cols-3 gap-4">
                            <div><p className="text-muted-foreground text-xs">Ventas netas</p><p className="font-semibold">{fmt(is.sales, is.currency)}</p></div>
                            <div><p className="text-muted-foreground text-xs">Resultado bruto</p><p className="font-semibold">{fmt(is.grossResult, is.currency)}</p></div>
                            <div><p className="text-muted-foreground text-xs">Resultado neto</p><p className="font-semibold">{fmt(is.netResult, is.currency)}</p></div>
                          </div>
                          {is.observations && <p className="mt-2 text-xs text-muted-foreground">{is.observations}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── IMPUESTOS ── */}
            <TabsContent value="impuestos" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Impuestos mensuales — {periodYear}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <TaxGridForm
                    producerId={producerId}
                    organizationId={organizationId}
                    periodId={selectedPeriodId}
                    year={periodYear}
                    createdBy={createdBy}
                    onSuccess={() => getTaxDocumentsForPeriod(producerId, selectedPeriodId).then(setTaxDocuments)}
                  />

                  {!loadingPeriodData && taxDocuments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Registros cargados en este período</p>
                      <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/40">
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Período</th>
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
                                <td className="px-3 py-2 text-muted-foreground">{td.observations ?? "—"}</td>
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

            {/* ── BIENES: MAQUINARIA ── */}
            <TabsContent value="bienes" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Maquinaria agrícola y vehículos</CardTitle></CardHeader>
                <CardContent>
                  <MachineryTable
                    producerId={producerId}
                    organizationId={organizationId}
                    createdBy={createdBy}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── BIENES: INMUEBLES ── */}
            <TabsContent value="inmuebles" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Inmuebles rurales y urbanos</CardTitle></CardHeader>
                <CardContent>
                  <RealEstateTable
                    producerId={producerId}
                    organizationId={organizationId}
                    createdBy={createdBy}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── DOCUMENTOS ── */}
            <TabsContent value="documentos" className="mt-0">
              <Card>
                <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  <DocumentUploader
                    producerId={producerId}
                    organizationId={organizationId}
                    periodId={selectedPeriodId}
                    documentType="general"
                    uploadedBy={createdBy}
                    onUploadComplete={(metadata) => setDocuments((prev) => [metadata, ...prev])}
                  />
                  {loadingPeriodData ? <Skeleton className="h-32 w-full" /> : <DocumentList documents={documents} />}
                </CardContent>
              </Card>
            </TabsContent>

          </div>
        </Tabs>
      )}
    </div>
  )
}
