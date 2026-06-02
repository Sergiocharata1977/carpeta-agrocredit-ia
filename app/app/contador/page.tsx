"use client"

import { useState } from "react"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { RoleGate } from "@/components/auth/RoleGate"
import { NuevoProductorDialog } from "@/components/producers/NuevoProductorDialog"
import { PendingApprovalScreen } from "@/components/contador/PendingApprovalScreen"
import { useSession } from "@/lib/auth/session"
import { Users, FileText, AlertCircle, CheckCircle, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ContadorDashboard() {
  const [showDialog, setShowDialog] = useState(false)
  const { user, loading } = useSession()

  if (loading) return null

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
            value="—"
            icon={Users}
            description="Cargando..."
          />
          <SummaryCard title="Carpetas completas" value="—" icon={CheckCircle} />
          <SummaryCard title="Pendientes de carga" value="—" icon={FileText} />
          <SummaryCard title="Vencimientos próximos" value="—" icon={AlertCircle} />
        </div>

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
      />
    </RoleGate>
  )
}
