"use client"

import { useEffect, useState } from "react"
import { AuditLogTable } from "@/components/audit/AuditLogTable"
import { RoleGate } from "@/components/auth/RoleGate"
import { SummaryCard } from "@/components/dashboard/SummaryCard"
import { Skeleton } from "@/components/ui/skeleton"
import { getRecentAuditLogs } from "@/lib/services/audit-logs"
import { Activity, Database, ShieldCheck } from "lucide-react"
import type { AuditLog } from "@/types/audit"

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRecentAuditLogs()
      .then(setLogs)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo cargar auditoria")
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Auditoria</h1>
          <p className="text-muted-foreground text-sm">
            Eventos sensibles generados por autorizaciones, grants y financiacion.
          </p>
        </div>

        {error && <div className="rounded-md border border-destructive p-3 text-sm">{error}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard title="Eventos" value={logs.length} icon={Activity} />
          <SummaryCard
            title="Productores afectados"
            value={new Set(logs.map((log) => log.producerId).filter(Boolean)).size}
            icon={Database}
          />
          <SummaryCard title="Modo" value="Solo lectura" icon={ShieldCheck} />
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <AuditLogTable logs={logs} />
        )}
      </div>
    </RoleGate>
  )
}
