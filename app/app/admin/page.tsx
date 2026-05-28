"use client"

import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { RoleGate } from "@/components/auth/RoleGate"
import { Building2, Users, ShieldCheck, Activity } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Panel Administración</h1>
          <p className="text-muted-foreground text-sm">Gestión de plataforma AgroCredit IA</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Organizaciones" value="—" icon={Building2} />
          <SummaryCard title="Usuarios activos" value="—" icon={Users} />
          <SummaryCard title="Grants activos" value="—" icon={ShieldCheck} />
          <SummaryCard title="Eventos de auditoría" value="—" icon={Activity} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/app/admin/organizaciones"
            className="rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            <h3 className="font-medium">Organizaciones</h3>
            <p className="text-sm text-muted-foreground">Gestionar tenants y entidades</p>
          </Link>
          <Link
            href="/app/admin/auditoria"
            className="rounded-lg border p-4 hover:bg-muted transition-colors"
          >
            <h3 className="font-medium">Auditoría</h3>
            <p className="text-sm text-muted-foreground">Revisar logs de acciones</p>
          </Link>
        </div>
      </div>
    </RoleGate>
  )
}
