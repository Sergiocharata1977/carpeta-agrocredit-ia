"use client"

import { useCallback, useEffect, useState } from "react"
import { Inbox, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getFreshIdToken } from "@/lib/firebase/auth-client"

interface RoutingDecision {
  id: string
  documentId: string
  detectedCuit: string | null
  detectedDocumentType: string | null
  routingStatus: string
}

interface CarpetaOption {
  orgId: string
  label: string
}

interface UnassignedDocsTrayProps {
  rootOrganizationId: string
  carpetas: CarpetaOption[]
  onAssigned?: () => void
}

export function UnassignedDocsTray({ rootOrganizationId, carpetas, onAssigned }: UnassignedDocsTrayProps) {
  const [decisions, setDecisions] = useState<RoutingDecision[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [assigning, setAssigning] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo validar la sesión")
      const res = await fetch(`/api/credito-hub/routing/${encodeURIComponent(rootOrganizationId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error ?? "No se pudieron cargar los documentos sin asignar")
      setDecisions(Array.isArray(payload.decisions) ? payload.decisions : [])
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [rootOrganizationId])

  useEffect(() => {
    void load()
  }, [load])

  async function assign(decision: RoutingDecision) {
    const assignedFolderOwnerOrganizationId = selected[decision.id]
    if (!assignedFolderOwnerOrganizationId) {
      toast.error("Elegí una carpeta antes de asignar")
      return
    }
    setAssigning(decision.id)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo validar la sesión")
      const res = await fetch(
        `/api/credito-hub/routing/${encodeURIComponent(rootOrganizationId)}/${encodeURIComponent(decision.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ assignedFolderOwnerOrganizationId }),
        },
      )
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error ?? "No se pudo asignar el documento")
      toast.success("Documento asignado")
      setDecisions((prev) => prev.filter((d) => d.id !== decision.id))
      setSelected((prev) => {
        const next = { ...prev }
        delete next[decision.id]
        return next
      })
      onAssigned?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al asignar")
    } finally {
      setAssigning(null)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-[#0369a1]" />
          <h2 className="text-base font-semibold">Sin asignar</h2>
          {decisions.length > 0 && <Badge variant="secondary">{decisions.length}</Badge>}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4${loading ? " animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : loading && decisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cargando documentos…</p>
      ) : decisions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay documentos sin asignar</p>
      ) : (
        <div className="space-y-2">
          {decisions.map((decision) => (
            <div
              key={decision.id}
              className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium">{decision.detectedDocumentType ?? "Tipo desconocido"}</p>
                <p className="text-xs text-muted-foreground">
                  CUIT: {decision.detectedCuit ?? "—"}
                  <span className="ml-2 font-mono">· {decision.routingStatus}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={selected[decision.id] ?? ""}
                  onChange={(event) =>
                    setSelected((prev) => ({ ...prev, [decision.id]: event.target.value }))
                  }
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="">Elegir carpeta…</option>
                  {carpetas.map((carpeta) => (
                    <option key={carpeta.orgId} value={carpeta.orgId}>
                      {carpeta.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void assign(decision)}
                  disabled={assigning === decision.id || !selected[decision.id]}
                >
                  {assigning === decision.id ? "Asignando…" : "Asignar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
