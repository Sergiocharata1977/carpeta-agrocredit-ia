"use client"

import { useState } from "react"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { RoleGate } from "@/components/auth/RoleGate"
import { NuevoProductorDialog } from "@/components/producers/NuevoProductorDialog"
import { Users, FileText, AlertCircle, CheckCircle, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function ContadorDashboard() {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <RoleGate allowedRoles={["accountant", "accounting_firm_admin", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Panel Contador</h1>
            <p className="text-muted-foreground text-sm">Gestión de carpetas de productores</p>
          </div>
          <Button onClick={() => setShowDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo productor
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Productores asignados"
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
            Accedé a tus productores desde{" "}
            <Link href="/app/contador/productores" className="underline">
              Mis Productores
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
