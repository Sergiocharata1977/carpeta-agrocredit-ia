"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AuthorizationDecisionDialog } from "@/components/access/AuthorizationDecisionDialog"
import { AccessRequestTable } from "@/components/access/AccessRequestTable"
import { RoleGate } from "@/components/auth/RoleGate"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import { getProducersByOrg } from "@/lib/services/producers"
import {
  decideAccessRequest,
  getAccessRequestsForProducer,
} from "@/lib/services/access-requests"
import {
  getActiveGrants,
  getGrantsForProducer,
  revokeAccessGrant,
} from "@/lib/services/access-grants"
import { ShieldCheck, Clock, AlertCircle, Ban } from "lucide-react"
import type { AccessGrant, AccessRequest, AccessScope } from "@/types/access"
import type { Producer } from "@/types/producer"

export default function ProducerAuthorizationsPage() {
  const { user, loading: sessionLoading } = useSession()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
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
      const [nextRequests, nextGrants] = await Promise.all([
        getAccessRequestsForProducer(currentProducer.id),
        getGrantsForProducer(currentProducer.id),
      ])
      setRequests(nextRequests)
      setGrants(nextGrants)
    }

    setLoadingData(false)
  }, [user])

  useEffect(() => {
    if (sessionLoading) return
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar autorizaciones")
      setLoadingData(false)
    })
  }, [loadData, sessionLoading])

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status === "requested"),
    [requests],
  )
  const activeGrants = useMemo(() => getActiveGrants(grants), [grants])

  async function approveSelected(params: {
    allowedScopes: AccessScope[]
    expirationDays: number
  }) {
    if (!selectedRequest) return
    const token = await getIdToken()
    if (!token) throw new Error("Sesion no disponible")

    setSaving(true)
    try {
      await decideAccessRequest(selectedRequest.id, token, {
        decision: "approved",
        allowedScopes: params.allowedScopes,
        expirationDays: params.expirationDays,
      })
      setSelectedRequest(null)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function rejectSelected(reason?: string) {
    if (!selectedRequest) return
    const token = await getIdToken()
    if (!token) throw new Error("Sesion no disponible")

    setSaving(true)
    try {
      await decideAccessRequest(selectedRequest.id, token, {
        decision: "rejected",
        rejectionReason: reason,
      })
      setSelectedRequest(null)
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  async function revokeGrant(grant: AccessGrant) {
    const token = await getIdToken()
    if (!token) throw new Error("Sesion no disponible")

    setSaving(true)
    try {
      await revokeAccessGrant(grant.id, token, "Revocado desde bandeja del productor")
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const isLoading = sessionLoading || loadingData

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Autorizaciones</h1>
          <p className="text-muted-foreground text-sm">
            Bandeja de solicitudes, grants activos y revocaciones.
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
              <SummaryCard title="Pendientes" value={pendingRequests.length} icon={AlertCircle} />
              <SummaryCard title="Activos" value={activeGrants.length} icon={ShieldCheck} />
              <SummaryCard title="Historicos" value={grants.length} icon={Clock} />
              <SummaryCard title="Revocados" value={grants.filter((g) => g.status === "revoked").length} icon={Ban} />
            </div>

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Solicitudes recibidas</h2>
              <AccessRequestTable requests={requests} onDecide={setSelectedRequest} />
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-medium">Grants activos</h2>
              {activeGrants.length === 0 ? (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay accesos activos.
                </div>
              ) : (
                <div className="divide-y rounded-md border">
                  {activeGrants.map((grant) => (
                    <div key={grant.id} className="flex items-center justify-between gap-4 p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{grant.purpose}</p>
                        <p className="text-xs text-muted-foreground">
                          Entidad {grant.grantedToOrganizationId} · vence{" "}
                          {new Date(grant.expiresAt).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={saving}
                        onClick={() => revokeGrant(grant)}
                      >
                        Revocar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <AuthorizationDecisionDialog
          request={selectedRequest}
          open={!!selectedRequest}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
          onApprove={approveSelected}
          onReject={rejectSelected}
          isLoading={saving}
        />
      </div>
    </RoleGate>
  )
}
