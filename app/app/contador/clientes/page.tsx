"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/session"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { ProducerTable } from "@/components/producers/ProducerTable"
import { ProducerCard } from "@/components/producers/ProducerCard"
import { NuevoProductorDialog } from "@/components/producers/NuevoProductorDialog"
import { LegajoAssistantPanel } from "@/components/credito-hub/LegajoAssistantPanel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import { AlertCircle, Bot, LayoutGrid, LayoutList, Plus, Users } from "lucide-react"
import type { Producer } from "@/types/producer"

type ViewMode = "list" | "grid"

export default function ClientesPage() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [producers, setProducers] = useState<Producer[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [showDialog, setShowDialog] = useState(false)
  const [search, setSearch] = useState("")
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantTargetId, setAssistantTargetId] = useState<string | null>(null)

  const fetchClientes = useCallback(async () => {
    if (!user) {
      setProducers([])
      setLoadingData(false)
      return
    }
    setLoadingData(true)
    setLoadError(null)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo validar la sesion")
      const response = await fetch("/api/contador/productores", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "No se pudieron cargar los clientes")
      }
      const payload = (await response.json()) as { producers: Producer[] }
      setProducers(payload.producers)
    } catch (error) {
      setProducers([])
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los clientes")
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    if (sessionLoading) return
    fetchClientes()
  }, [user, sessionLoading, fetchClientes])

  function handleSelectCliente(producer: Producer) {
    router.push(`/app/contador/clientes/${producer.id}`)
  }

  const filtered = producers.filter(
    (p) =>
      p.legalName.toLowerCase().includes(search.toLowerCase()) ||
      p.taxId.includes(search),
  )
  const assistantClient = filtered.find((p) => p.id === assistantTargetId) ?? filtered[0] ?? null

  const isLoading = sessionLoading || loadingData

  return (
    <div className="flex items-start gap-4 p-4 lg:p-6">
      <div className={`min-w-0 flex-1 space-y-6 transition-all duration-300 ${assistantOpen ? "lg:max-w-[calc(100%-436px)]" : ""}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground text-sm">
              Carpetas asignadas a tu estudio contable
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={assistantOpen ? "default" : "outline"} onClick={() => setAssistantOpen((value) => !value)}>
              <Bot className="mr-2 h-4 w-4" />
              IA
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar por nombre o CUIT..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <div className="ml-auto flex items-center gap-1 rounded-lg border p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <Users className="h-10 w-10 text-muted-foreground" />
          </EmptyHeader>
          <EmptyContent>
            <EmptyTitle>Sin clientes</EmptyTitle>
            <EmptyDescription>
              {search
                ? "No se encontraron clientes con ese criterio de búsqueda."
                : "Aún no tenes clientes asignados. Crea el primero con el botón Nuevo Cliente."}
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : viewMode === "list" ? (
        <ProducerTable producers={filtered} onSelect={handleSelectCliente} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProducerCard key={p.id} producer={p} onSelect={handleSelectCliente} />
          ))}
        </div>
      )}

      <NuevoProductorDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={fetchClientes}
      />
      </div>

      <LegajoAssistantPanel
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        targetOrganizationId={assistantClient?.id ?? null}
        rootOrganizationId={assistantClient?.id ?? null}
        clientName={assistantClient?.legalName}
        carpetas={assistantClient ? [{ orgId: assistantClient.id, label: assistantClient.legalName }] : []}
        contextSelector={
          <label className="block text-xs font-semibold text-slate-200">
            Cliente activo
            <select
              value={assistantClient?.id ?? ""}
              onChange={(event) => setAssistantTargetId(event.target.value || null)}
              className="mt-1 w-full rounded-md border border-[#334155] bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#818cf8]"
            >
              {filtered.length === 0 ? (
                <option value="">Sin clientes</option>
              ) : (
                filtered.map((producer) => (
                  <option key={producer.id} value={producer.id}>
                    {producer.legalName}
                  </option>
                ))
              )}
            </select>
          </label>
        }
        onUploaded={fetchClientes}
      />
    </div>
  )
}
