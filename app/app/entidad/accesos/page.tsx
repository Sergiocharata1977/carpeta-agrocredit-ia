"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AccessRequestForm } from "@/components/access/AccessRequestForm"
import { AccessRequestTable } from "@/components/access/AccessRequestTable"
import { RoleGate } from "@/components/auth/RoleGate"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { getIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import { createAccessRequest, getAccessRequestsForEntity } from "@/lib/services/access-requests"
import { getActiveGrants, getGrantsForEntity } from "@/lib/services/access-grants"
import { ShieldCheck, Clock, AlertCircle, FileText } from "lucide-react"
import type { AccessGrant, AccessRequest } from "@/types/access"
import type { CreateAccessRequestInput } from "@/lib/schemas/access"

export default function EntityAccessPage() {
  const { user, loading: sessionLoading } = useSession()
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const organizationId = user?.defaultOrganizationId ?? ""

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    const [nextRequests, nextGrants] = await Promise.all([
      getAccessRequestsForEntity(organizationId),
      getGrantsForEntity(organizationId),
    ])
    setRequests(nextRequests)
    setGrants(nextGrants)
    setLoadingData(false)
  }, [organizationId])

  useEffect(() => {
    if (sessionLoading) return
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudieron cargar accesos")
      setLoadingData(false)
    })
  }, [loadData, sessionLoading])

  const activeGrants = useMemo(() => getActiveGrants(grants), [grants])

  async function submitAccessRequest(data: CreateAccessRequestInput) {
    const token = await getIdToken()
    if (!token) throw new Error("Sesion no disponible")

    setSaving(true)
    setError(null)
    try {
      await createAccessRequest(data, token)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo solicitar acceso")
    } finally {
      setSaving(false)
    }
  }

  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Accesos</h1>
            <p className="text-muted-foreground text-sm">
              Solicita acceso a carpetas y consulta grants vigentes.
            </p>
          </div>
          <Button variant="outline" disabled>
            Org {organizationId || "sin claims"}
          </Button>
        </div>

        {error && <div className="rounded-md border border-destructive p-3 text-sm">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <section className="rounded-md border p-4">
            <h2 className="mb-4 text-lg font-medium">Nueva solicitud</h2>
            {organizationId ? (
              <AccessRequestForm
                requesterOrganizationId={organizationId}
                onSubmit={submitAccessRequest}
                isLoading={saving}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Tu usuario no tiene organizacion por defecto en custom claims.
              </p>
            )}
          </section>

          <section className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard title="Solicitudes" value={requests.length} icon={FileText} />
              <SummaryCard
                title="Pendientes"
                value={requests.filter((request) => request.status === "requested").length}
                icon={AlertCircle}
              />
              <SummaryCard title="Grants activos" value={activeGrants.length} icon={ShieldCheck} />
              <SummaryCard title="Historicos" value={grants.length} icon={Clock} />
            </div>

            {sessionLoading || loadingData ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <AccessRequestTable
                requests={requests}
                emptyMessage="Todavia no hay solicitudes creadas por esta entidad."
              />
            )}
          </section>
        </div>
      </div>
    </RoleGate>
  )
}
