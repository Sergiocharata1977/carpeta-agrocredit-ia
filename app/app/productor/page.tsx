"use client"

import { useSession } from "@/lib/auth/session"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { RoleGate } from "@/components/auth/RoleGate"
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

        {/* Summary cards */}
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
            description="Ninguna entidad autorizada"
            icon={ShieldCheck}
          />
          <SummaryCard
            title="Solicitudes pendientes"
            value="0"
            description="Sin solicitudes de acceso"
            icon={AlertCircle}
          />
          <SummaryCard
            title="Próximo vencimiento"
            value="—"
            description="Sin vencimientos próximos"
            icon={Clock}
          />
        </div>

        {/* Placeholder para Ola 4 */}
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Las autorizaciones y solicitudes de acceso se implementan en la próxima fase.
        </div>
      </div>
    </RoleGate>
  )
}
