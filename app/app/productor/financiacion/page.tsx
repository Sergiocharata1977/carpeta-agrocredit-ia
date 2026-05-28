"use client"

import { useCallback, useEffect, useState } from "react"
import { FinancingRequestCard } from "@/components/financing/FinancingRequestCard"
import { RoleGate } from "@/components/auth/RoleGate"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/lib/auth/session"
import { getProducersByOrg } from "@/lib/services/producers"
import { getFinancingRequestsByProducer } from "@/lib/services/financing-requests"
import { BarChart3, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import type { FinancingRequest } from "@/types/financing"
import type { Producer } from "@/types/producer"

export default function ProducerFinancingPage() {
  const { user, loading: sessionLoading } = useSession()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [requests, setRequests] = useState<FinancingRequest[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user?.defaultOrganizationId) {
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    const producers = await getProducersByOrg(user.defaultOrganizationId)
    const currentProducer = producers[0] ?? null
    setProducer(currentProducer)

    if (currentProducer) {
      setRequests(await getFinancingRequestsByProducer(currentProducer.id))
    }

    setLoadingData(false)
  }, [user])

  useEffect(() => {
    if (sessionLoading) return
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudo cargar financiacion")
      setLoadingData(false)
    })
  }, [loadData, sessionLoading])

  const isLoading = sessionLoading || loadingData

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financiacion</h1>
          <p className="text-muted-foreground text-sm">
            Solicitudes asociadas a tu carpeta agrofinanciera.
          </p>
        </div>

        {error && <div className="rounded-md border border-destructive p-3 text-sm">{error}</div>}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : !producer ? (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No hay productor asociado a tu organizacion por defecto.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard title="Total" value={requests.length} icon={BarChart3} />
              <SummaryCard
                title="En analisis"
                value={requests.filter((request) => request.status === "in_review").length}
                icon={Clock}
              />
              <SummaryCard
                title="Observadas"
                value={requests.filter((request) => request.status === "observed").length}
                icon={AlertCircle}
              />
              <SummaryCard
                title="Aprobadas"
                value={requests.filter((request) => request.status === "approved").length}
                icon={CheckCircle2}
              />
            </div>

            {requests.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Todavia no hay solicitudes de financiacion para tu carpeta.
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {requests.map((request) => (
                  <FinancingRequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </RoleGate>
  )
}
