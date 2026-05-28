"use client"

import Link from "next/link"
import { useSession } from "@/lib/auth/session"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { RoleGate } from "@/components/auth/RoleGate"
import { Button } from "@/components/ui/button"
import { FileText, ShieldCheck, AlertCircle, Clock } from "lucide-react"

export default function ProducerDashboard() {
  const { user } = useSession()

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Mi Carpeta</h1>
          <p className="text-muted-foreground text-sm">
            Bienvenido, {user?.displayName ?? "Productor"}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Estado carpeta"
            value="Incompleta"
            description="Faltan documentos"
            icon={FileText}
          />
          <SummaryCard
            title="Autorizaciones activas"
            value="0"
            description="Se actualiza al cargar datos"
            icon={ShieldCheck}
          />
          <SummaryCard
            title="Solicitudes pendientes"
            value="0"
            description="Ver bandeja de autorizaciones"
            icon={AlertCircle}
          />
          <SummaryCard
            title="Proximo vencimiento"
            value="-"
            description="Sin vencimientos proximos"
            icon={Clock}
          />
        </div>

        <div className="flex flex-wrap gap-3 rounded-lg border p-4">
          <Button asChild>
            <Link href="/app/productor/autorizaciones">Revisar autorizaciones</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/app/productor/financiacion">Ver financiacion</Link>
          </Button>
        </div>
      </div>
    </RoleGate>
  )
}
