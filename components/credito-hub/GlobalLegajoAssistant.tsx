"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { LegajoAssistantPanel } from "@/components/credito-hub/LegajoAssistantPanel"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import type { Producer } from "@/types/producer"

function extractTargetFromPath(pathname: string): string | null {
  const patterns = [
    /^\/app\/contador\/clientes\/([^/]+)/,
    /^\/app\/contador\/productores\/([^/]+)/,
    /^\/app\/contador\/empresas\/([^/]+)/,
    /^\/app\/entidad\/carpetas\/([^/]+)/,
  ]
  for (const pattern of patterns) {
    const match = pathname.match(pattern)
    if (match?.[1]) return decodeURIComponent(match[1])
  }
  return null
}

export function GlobalLegajoAssistant() {
  const pathname = usePathname()
  const { user, loading } = useSession()
  const [open, setOpen] = useState(false)
  const [producers, setProducers] = useState<Producer[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pathTargetId = useMemo(() => extractTargetFromPath(pathname), [pathname])
  const canManageLegajos = Boolean(
    user?.roles?.some((role) => ["accountant", "accounting_firm_admin", "admin_platform"].includes(role)),
  )

  const fetchClientes = useCallback(async () => {
    if (!canManageLegajos || loading) return
    try {
      const token = await getFreshIdToken()
      if (!token) return
      const response = await fetch("/api/contador/productores", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!response.ok) return
      const payload = (await response.json()) as { producers?: Producer[] }
      setProducers(payload.producers ?? [])
    } catch {
      setProducers([])
    }
  }, [canManageLegajos, loading])

  useEffect(() => {
    void fetchClientes()
  }, [fetchClientes])

  useEffect(() => {
    if (pathTargetId) {
      setSelectedId(pathTargetId)
      return
    }
    if (!selectedId && producers[0]?.id) {
      setSelectedId(producers[0].id)
    }
  }, [pathTargetId, producers, selectedId])

  const activeId = pathTargetId ?? selectedId
  const activeProducer = producers.find((producer) => producer.id === activeId)
  const clientName = activeProducer?.legalName ?? (pathTargetId ? "Legajo abierto" : undefined)

  return (
    <LegajoAssistantPanel
      open={open}
      onOpenChange={setOpen}
      targetOrganizationId={activeId}
      rootOrganizationId={activeId}
      clientName={clientName}
      carpetas={activeId ? [{ orgId: activeId, label: clientName ?? "Legajo" }] : []}
      contextSelector={
        canManageLegajos ? (
          <label className="block text-xs font-semibold text-slate-200">
            Cliente activo
            <select
              value={activeId ?? ""}
              onChange={(event) => setSelectedId(event.target.value || null)}
              disabled={Boolean(pathTargetId)}
              className="mt-1 w-full rounded-md border border-[#334155] bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#818cf8] disabled:opacity-70"
            >
              {pathTargetId && !activeProducer ? (
                <option value={pathTargetId}>Legajo abierto</option>
              ) : producers.length === 0 ? (
                <option value="">Sin clientes cargados</option>
              ) : (
                producers.map((producer) => (
                  <option key={producer.id} value={producer.id}>
                    {producer.legalName}
                  </option>
                ))
              )}
            </select>
          </label>
        ) : undefined
      }
      onUploaded={fetchClientes}
      onAssigned={fetchClientes}
    />
  )
}
