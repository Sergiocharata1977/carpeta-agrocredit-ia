"use client"

import { use, useEffect, useState } from "react"
import { getDoc, doc } from "firebase/firestore"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { AccountingPeriodSelector } from "@/components/accounting/AccountingPeriodSelector"
import { BalanceSheetForm } from "@/components/accounting/BalanceSheetForm"
import { IncomeStatementForm } from "@/components/accounting/IncomeStatementForm"
import { TaxDocumentsForm } from "@/components/accounting/TaxDocumentsForm"
import { DocumentUploader } from "@/components/documents/DocumentUploader"
import { DocumentList } from "@/components/documents/DocumentList"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { useSession } from "@/lib/auth/session"
import {
  getBalanceSheetsForPeriod,
} from "@/lib/services/balance-sheets"
import {
  getIncomeStatementsForPeriod,
} from "@/lib/services/income-statements"
import {
  getTaxDocumentsForPeriod,
} from "@/lib/services/tax-documents"
import { getDocumentsForPeriod, type DocumentMetadata } from "@/lib/services/documents"
import type { Producer } from "@/types/producer"
import type { BalanceSheet, IncomeStatement, TaxDocument } from "@/types/accounting"

interface CarpetaPageProps {
  params: Promise<{ producerId: string }>
}

export default function CarpetaPage({ params }: CarpetaPageProps) {
  const { producerId } = use(params)
  const { user } = useSession()

  const [producer, setProducer] = useState<Producer | null>(null)
  const [loadingProducer, setLoadingProducer] = useState(true)

  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)

  const [balanceSheets, setBalanceSheets] = useState<BalanceSheet[]>([])
  const [incomeStatements, setIncomeStatements] = useState<IncomeStatement[]>([])
  const [taxDocuments, setTaxDocuments] = useState<TaxDocument[]>([])
  const [documents, setDocuments] = useState<DocumentMetadata[]>([])
  const [loadingPeriodData, setLoadingPeriodData] = useState(false)

  // Cargar datos del productor
  useEffect(() => {
    async function loadProducer() {
      const db = getFirebaseDb()
      if (!db) return
      try {
        const snap = await getDoc(doc(db, COLLECTIONS.PRODUCERS, producerId))
        if (snap.exists()) {
          setProducer({ id: snap.id, ...snap.data() } as Producer)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error al cargar el productor"
        toast.error(message)
      } finally {
        setLoadingProducer(false)
      }
    }
    loadProducer()
  }, [producerId])

  // Cargar datos del período seleccionado
  useEffect(() => {
    if (!selectedPeriodId) return

    async function loadPeriodData() {
      setLoadingPeriodData(true)
      try {
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
        const message = err instanceof Error ? err.message : "Error al cargar datos del período"
        toast.error(message)
      } finally {
        setLoadingPeriodData(false)
      }
    }

    loadPeriodData()
  }, [producerId, selectedPeriodId])

  async function refreshDocuments() {
    if (!selectedPeriodId) return
    try {
      const docs = await getDocumentsForPeriod(producerId, selectedPeriodId)
      setDocuments(docs)
    } catch {
      // silencioso
    }
  }

  const organizationId = producer?.organizationId ?? user?.defaultOrganizationId ?? ""
  const createdBy = user?.uid ?? ""

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted-foreground">
        <span>Productores</span>
        <span className="mx-2">/</span>
        {loadingProducer ? (
          <Skeleton className="inline-block h-4 w-32" />
        ) : (
          <span>{producer?.legalName ?? producerId}</span>
        )}
        <span className="mx-2">/</span>
        <span className="text-foreground font-medium">Carpeta contable</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {loadingProducer ? (
            <>
              <Skeleton className="mb-2 h-7 w-64" />
              <Skeleton className="h-4 w-32" />
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                {producer?.legalName ?? "Productor"}
              </h1>
              <p className="text-sm text-muted-foreground">
                CUIT: {producer?.taxId ?? "—"}
              </p>
            </>
          )}
        </div>
        {producer && (
          <Badge variant="outline" className="capitalize">
            {producer.folderStatus.replace("_", " ")}
          </Badge>
        )}
      </div>

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

      {/* Contenido del período */}
      {selectedPeriodId && (
        <Tabs defaultValue="balance">
          <TabsList className="w-full">
            <TabsTrigger value="balance" className="flex-1">Balance</TabsTrigger>
            <TabsTrigger value="resultados" className="flex-1">Resultados</TabsTrigger>
            <TabsTrigger value="impuestos" className="flex-1">Impuestos</TabsTrigger>
            <TabsTrigger value="documentos" className="flex-1">Documentos</TabsTrigger>
          </TabsList>

          {/* Tab: Balance */}
          <TabsContent value="balance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Balance general</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingPeriodData ? (
                  <div className="space-y-3">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : balanceSheets.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No hay balance cargado para este período.
                    </p>
                    <BalanceSheetForm
                      producerId={producerId}
                      organizationId={organizationId}
                      periodId={selectedPeriodId}
                      createdBy={createdBy}
                      onSuccess={() => {
                        getBalanceSheetsForPeriod(producerId, selectedPeriodId).then(
                          setBalanceSheets
                        )
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {balanceSheets.map((bs) => (
                      <div
                        key={bs.id}
                        className="rounded-md border p-4 text-sm"
                      >
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-muted-foreground">Activos</p>
                            <p className="font-semibold">
                              {bs.currency}{" "}
                              {bs.assetsTotal.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pasivos</p>
                            <p className="font-semibold">
                              {bs.currency}{" "}
                              {bs.liabilitiesTotal.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Patrimonio</p>
                            <p className="font-semibold">
                              {bs.currency}{" "}
                              {bs.equityTotal.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                        {bs.observations && (
                          <p className="mt-2 text-muted-foreground">
                            {bs.observations}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Resultados */}
          <TabsContent value="resultados" className="space-y-4">
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
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      No hay estado de resultados cargado para este período.
                    </p>
                    <IncomeStatementForm
                      producerId={producerId}
                      organizationId={organizationId}
                      periodId={selectedPeriodId}
                      createdBy={createdBy}
                      onSuccess={() => {
                        getIncomeStatementsForPeriod(producerId, selectedPeriodId).then(
                          setIncomeStatements
                        )
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {incomeStatements.map((is) => (
                      <div key={is.id} className="rounded-md border p-4 text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-muted-foreground">Ventas</p>
                            <p className="font-semibold">
                              {is.currency}{" "}
                              {is.sales.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Resultado bruto</p>
                            <p className="font-semibold">
                              {is.currency}{" "}
                              {is.grossResult.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Resultado neto</p>
                            <p className="font-semibold">
                              {is.currency}{" "}
                              {is.netResult.toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          </div>
                        </div>
                        {is.observations && (
                          <p className="mt-2 text-muted-foreground">
                            {is.observations}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Impuestos */}
          <TabsContent value="impuestos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documentos fiscales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <TaxDocumentsForm
                  producerId={producerId}
                  organizationId={organizationId}
                  periodId={selectedPeriodId}
                  createdBy={createdBy}
                  onSuccess={() => {
                    getTaxDocumentsForPeriod(producerId, selectedPeriodId).then(
                      setTaxDocuments
                    )
                  }}
                />

                {loadingPeriodData ? (
                  <Skeleton className="h-20 w-full" />
                ) : taxDocuments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Cargados en este período</p>
                    {taxDocuments.map((td) => (
                      <div key={td.id} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{td.taxType}</span>
                          <span className="text-muted-foreground">
                            {td.fiscalPeriod}
                          </span>
                        </div>
                        <p className="mt-1">
                          {td.currency}{" "}
                          {td.amount.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Documentos */}
          <TabsContent value="documentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documentos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <DocumentUploader
                  producerId={producerId}
                  organizationId={organizationId}
                  periodId={selectedPeriodId}
                  documentType="general"
                  uploadedBy={createdBy}
                  onUploadComplete={(metadata) => {
                    setDocuments((prev) => [metadata, ...prev])
                  }}
                />
                {loadingPeriodData ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <DocumentList documents={documents} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
