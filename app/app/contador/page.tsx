"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle, FileText, Plus, Users } from "lucide-react"
import Link from "next/link"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { RoleGate } from "@/components/auth/RoleGate"
import { NuevoProductorDialog } from "@/components/producers/NuevoProductorDialog"
import { PendingApprovalScreen } from "@/components/contador/PendingApprovalScreen"
import { VinculoPendienteCard } from "@/components/contador/VinculoPendienteCard"
import type { VinculoPendiente } from "@/components/contador/VinculoPendienteCard"
import { useSession } from "@/lib/auth/session"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export default function ContadorDashboard() {
  const [showDialog, setShowDialog] = useState(false)
  const { user, loading: sessionLoading } = useSession()
  const [clientCount, setClientCount] = useState<number | null>(null)
  const [pendingLinks, setPendingLinks] = useState<VinculoPendiente[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    if (!user) return
    setLoadingData(true)
    try {
      const token = await getFreshIdToken()
      if (!token) return

      const [clientsRes, linksRes] = await Promise.all([
        fetch("/api/contador/productores", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        fetch("/api/contador/vinculos-pendientes", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
      ])

      if (clientsRes.ok) {
        const json = await clientsRes.json()
        setClientCount((json.producers ?? []).length)
      }

      if (linksRes.ok) {
        const json = await linksRes.json()
        setPendingLinks(json.links ?? [])
      }
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    if (sessionLoading || !user) return
    void fetchDashboardData()
  }, [sessionLoading, user, fetchDashboardData])

  function handleLinkDecision(linkId: string) {
    setPendingLinks((prev) => prev.filter((l) => l.id !== linkId))
    void fetchDashboardData()
  }

  if (sessionLoading) return null

  if (user?.orgStatus === "pending_approval") {
    return (
      <RoleGate allowedRoles={["accountant", "accounting_firm_admin"]}>
        <PendingApprovalScreen />
      </RoleGate>
    )
  }

  return (
    <RoleGate allowedRoles={["accountant", "accounting_firm_admin", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Panel Contador</h1>
            <p className="text-muted-foreground text-sm">Gestión de carpetas de clientes</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Clientes asignados"
            value={loadingData ? "..." : (clientCount ?? "—")}
            icon={Users}
            description={clientCount !== null ? `${clientCount} cliente${clientCount !== 1 ? "s" : ""} activo${clientCount !== 1 ? "s" : ""}` : "Cargando..."}
          />
          <SummaryCard
            title="Solicitudes pendientes"
            value={loadingData ? "..." : pendingLinks.length}
            icon={AlertCircle}
            description={pendingLinks.length > 0 ? "Requieren decision" : "Sin pendientes"}
          />
          <SummaryCard title="Carpetas completas" value="—" icon={CheckCircle} />
          <SummaryCard title="Pendientes de carga" value="—" icon={FileText} />
        </div>

        {pendingLinks.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Solicitudes de vinculo pendientes</h2>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                {pendingLinks.length} pendiente{pendingLinks.length !== 1 ? "s" : ""}
              </span>
            </div>
            {loadingData ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingLinks.map((link) => (
                  <VinculoPendienteCard
                    key={link.id}
                    link={link}
                    onDecision={() => handleLinkDecision(link.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          <p>
            Accedé a tus clientes desde{" "}
            <Link href="/app/contador/clientes" className="underline">
              Mis Clientes
            </Link>
          </p>
        </div>
      </div>

      <NuevoProductorDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={fetchDashboardData}
      />
    </RoleGate>
  )
}
