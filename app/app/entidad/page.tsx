"use client"

import Link from "next/link"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { RoleGate } from "@/components/auth/RoleGate"
import { Button } from "@/components/ui/button"
import { ShieldCheck, BarChart3, Clock, AlertCircle } from "lucide-react"

export default function EntidadDashboard() {
  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Panel Entidad</h1>
          <p className="text-muted-foreground text-sm">
            Carpetas autorizadas y solicitudes de financiacion
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Accesos activos" value="0" icon={ShieldCheck} />
          <SummaryCard title="Solicitudes en analisis" value="0" icon={BarChart3} />
          <SummaryCard title="Accesos por vencer" value="0" icon={Clock} />
          <SummaryCard title="Observaciones pendientes" value="0" icon={AlertCircle} />
        </div>

        <div className="flex flex-wrap gap-3 rounded-lg border p-4">
          <Button asChild>
            <Link href="/app/entidad/accesos">Gestionar accesos</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app/entidad/financiacion">Abrir Kanban</Link>
          </Button>
        </div>
      </div>
    </RoleGate>
  )
}
