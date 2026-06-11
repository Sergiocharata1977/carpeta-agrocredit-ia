"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FinancingKanban } from "@/components/financing/FinancingKanban"
import { FinancingRequestForm } from "@/components/financing/FinancingRequestForm"
import { RoleGate } from "@/components/auth/RoleGate"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import { getActiveGrants, getGrantsForEntity } from "@/lib/services/access-grants"
import {
  createFinancingRequest,
  getFinancingRequestsByEntity,
  updateFinancingStatus,
} from "@/lib/services/financing-requests"
import { BarChart3, CheckCircle2, Clock, AlertCircle, Plus } from "lucide-react"
import type { AccessGrant } from "@/types/access"
import type { CreateFinancingRequestInput } from "@/lib/schemas/financing"
import type { FinancingRequest, FinancingStatus } from "@/types/financing"

export default function EntityFinancingPage() {
  const { user, loading: sessionLoading } = useSession()
  const [requests, setRequests] = useState<FinancingRequest[]>([])
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)

  const organizationId = user?.defaultOrganizationId ?? ""

  const loadData = useCallback(async () => {
    if (!organizationId) {
      setLoadingData(false)
      return
    }

    setLoadingData(true)
    const [nextRequests, nextGrants] = await Promise.all([
      getFinancingRequestsByEntity(organizationId),
      getGrantsForEntity(organizationId),
    ])
    setRequests(nextRequests)
    setGrants(nextGrants)
    setLoadingData(false)
  }, [organizationId])

  useEffect(() => {
    if (sessionLoading) return
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : "No se pudo cargar los pedidos")
      setLoadingData(false)
    })
  }, [loadData, sessionLoading])

  const activeGrants = useMemo(() => getActiveGrants(grants), [grants])

  async function submitFinancingRequest(data: CreateFinancingRequestInput) {
    const token = await getIdToken()
    if (!token) throw new Error("Sesion no disponible")

    setSaving(true)
    setError(null)
    try {
      await createFinancingRequest(data, token)
      await loadData()
      setShowDialog(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el pedido")
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(request: FinancingRequest, status: FinancingStatus) {
    const token = await getIdToken()
    if (!token) throw new Error("Sesion no disponible")

    setSaving(true)
    setError(null)
    try {
      await updateFinancingStatus(request.id, status, token, "Actualizado desde Kanban")
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado")
    } finally {
      setSaving(false)
    }
  }

  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="p-6 space-y-6">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Pedidos de información</h1>
            <p className="text-muted-foreground text-sm">
              Pedidos de acceso a carpetas enviados y su estado de gestión.
            </p>
          </div>
          <Button onClick={() => setShowDialog(true)} disabled={!organizationId}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo pedido
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-3 text-sm">{error}</div>
        )}

        {/* summary cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total" value={requests.length} icon={BarChart3} />
          <SummaryCard
            title="En revisión"
            value={requests.filter((r) => r.status === "in_review").length}
            icon={Clock}
          />
          <SummaryCard
            title="Observados"
            value={requests.filter((r) => r.status === "observed").length}
            icon={AlertCircle}
          />
          <SummaryCard
            title="Aprobados"
            value={requests.filter((r) => r.status === "approved").length}
            icon={CheckCircle2}
          />
        </div>

        {/* kanban */}
        {sessionLoading || loadingData ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <FinancingKanban requests={requests} onStatusChange={changeStatus} />
        )}

        {/* modal */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo pedido de información</DialogTitle>
            </DialogHeader>
            {organizationId ? (
              <FinancingRequestForm
                requesterOrganizationId={organizationId}
                grants={activeGrants}
                onSubmit={submitFinancingRequest}
                isLoading={saving}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Tu usuario no tiene organización por defecto en custom claims.
              </p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </RoleGate>
  )
}
