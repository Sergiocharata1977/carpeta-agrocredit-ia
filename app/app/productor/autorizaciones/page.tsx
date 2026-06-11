"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
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
import { ShieldCheck, Clock, AlertCircle, Ban, Send, Info } from "lucide-react"
import Link from "next/link"
import type { AccessGrant, AccessInvitation, AccessRequest, AccessScope } from "@/types/access"
import type { Producer } from "@/types/producer"
import { AccessInvitationTable } from "@/components/access/AccessInvitationTable"
import { CreateAccessInvitationDialog } from "@/components/access/CreateAccessInvitationDialog"

export default function ProducerAuthorizationsPage() {
  const { user, loading: sessionLoading } = useSession()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [grants, setGrants] = useState<AccessGrant[]>([])
  const [selectedRequest, setSelectedRequest] = useState<AccessRequest | null>(null)
  const [invitations, setInvitations] = useState<AccessInvitation[]>([])
  const [hasActiveContador, setHasActiveContador] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)
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

    const token = await getIdToken()

    // Verificar si tiene contador activo
    if (token) {
      const linksRes = await fetch("/api/producer-accountant-links", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (linksRes.ok) {
        const linksJson = await linksRes.json()
        const active = (linksJson.links ?? []).some(
          (l: { status: string }) => l.status === "active",
        )
        setHasActiveContador(active)
      }
    }

    if (currentProducer) {
      const [nextRequests, nextGrants] = await Promise.all([
        getAccessRequestsForProducer(currentProducer.id),
        getGrantsForProducer(currentProducer.id),
      ])
      setRequests(nextRequests)
      setGrants(nextGrants)

      // Cargar invitaciones
      if (token) {
        const res = await fetch(
          `/api/access-invitations?ownerOrganizationId=${user?.defaultOrganizationId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        )
        if (res.ok) {
          const json = await res.json()
          setInvitations(json.invitations ?? [])
        }
      }
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

  async function revokeInvitation(invitationId: string) {
    const token = await getIdToken()
    if (!token) return
    setRevoking(invitationId)
    try {
      await fetch(`/api/access-invitations/${invitationId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      await loadData()
    } finally {
      setRevoking(null)
    }
  }

  async function approveInvitation(invitationId: string) {
    const token = await getIdToken()
    if (!token) return null
    try {
      const res = await fetch(`/api/access-invitations/${invitationId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo aprobar la invitacion")
      await loadData()
      const url = json.inviteUrl ? `${window.location.origin}${json.inviteUrl}` : null
      if (url) toast.success("Invitacion aprobada. Link copiado.")
      return url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo aprobar la invitacion")
      return null
    }
  }

  async function copyInvitationLink(invitationId: string) {
    const token = await getIdToken()
    if (!token) return null
    try {
      const res = await fetch(`/api/access-invitations/${invitationId}/link`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo generar el link")
      toast.success("Link regenerado y copiado.")
      return json.inviteUrl ? `${window.location.origin}${json.inviteUrl}` : null
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo generar el link")
      return null
    }
  }

  const isLoading = sessionLoading || loadingData

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Autorizaciones</h1>
            <p className="text-muted-foreground text-sm">
              Solicitudes recibidas, links de acceso y grants activos.
            </p>
          </div>
          {producer && (
            <Button onClick={() => setShowInviteDialog(true)} className="gap-2">
              <Send className="size-4" />
              Compartir carpeta
            </Button>
          )}
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
            {/* Aviso si no tiene contador activo */}
            {!hasActiveContador && (
              <div className="flex items-start gap-4 rounded-xl border border-[#fbbf24] bg-[#fffbeb] p-5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7]">
                  <Info className="size-4 text-[#d97706]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[#92400e]">
                    Necesitás un contador para poder compartir tu carpeta
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[#78350f]">
                    Para que un banco o financiera pueda evaluar tu solicitud, tu contador
                    debe haber cargado la información financiera (balances, impuestos,
                    documentos). Sin esa información, compartir el acceso no tiene utilidad.
                  </p>
                  <Link
                    href="/app/productor/contador"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#d97706] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b45309] transition-colors"
                  >
                    Vincular un contador
                  </Link>
                </div>
              </div>
            )}

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

            {invitations.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-lg font-medium">Links de acceso compartidos</h2>
                <AccessInvitationTable
                  invitations={invitations}
                  onRevoke={revokeInvitation}
                  onApprove={approveInvitation}
                  onCopyLink={copyInvitationLink}
                  revoking={revoking}
                />
              </section>
            )}
          </>
        )}

        {producer && (
          <CreateAccessInvitationDialog
            open={showInviteDialog}
            onOpenChange={setShowInviteDialog}
            targetOrganizationId={user?.defaultOrganizationId ?? ""}
            onCreated={loadData}
          />
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
