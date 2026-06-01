"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/auth/session"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { ProducerTable } from "@/components/producers/ProducerTable"
import { ProducerCard } from "@/components/producers/ProducerCard"
import { NuevoProductorDialog } from "@/components/producers/NuevoProductorDialog"
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
import { AlertCircle, LayoutGrid, LayoutList, Plus } from "lucide-react"
import type { Producer } from "@/types/producer"

type ViewMode = "list" | "grid"

export default function ProductoresPage() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [producers, setProducers] = useState<Producer[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [showDialog, setShowDialog] = useState(false)
  const [search, setSearch] = useState("")

  const fetchProducers = useCallback(async () => {
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
        throw new Error(payload?.error ?? "No se pudieron cargar los usuarios")
      }

      const payload = (await response.json()) as { producers: Producer[] }
      setProducers(payload.producers)
    } catch (error) {
      console.error("[contador/productores] Error:", error)
      setProducers([])
      setLoadError(error instanceof Error ? error.message : "No se pudieron cargar los usuarios")
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setLoadingData(false)
      return
    }
    fetchProducers()
  }, [user, sessionLoading, fetchProducers])

  function handleSelectProducer(producer: Producer) {
    router.push(`/app/contador/productores/${producer.id}`)
  }

  const filtered = producers.filter(
    (p) =>
      p.legalName.toLowerCase().includes(search.toLowerCase()) ||
      p.taxId.includes(search),
  )

  const isLoading = sessionLoading || loadingData

  return (
    <div className="p-6 space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground text-sm">
            Carpetas asignadas a tu estudio contable
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* search + view toggle */}
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

      {/* content */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin Usuarios asignados</EmptyTitle>
            <EmptyContent>
              <EmptyDescription>
                Aun no tenes Usuarios vinculados a tu cuenta. Crea la primera
                carpeta para comenzar.
              </EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
          <Button onClick={() => setShowDialog(true)}>Nuevo Usuario</Button>
        </Empty>
      ) : viewMode === "list" ? (
        <ProducerTable producers={filtered} onSelect={handleSelectProducer} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((producer) => (
            <ProducerCard
              key={producer.id}
              producer={producer}
              onSelect={handleSelectProducer}
            />
          ))}
        </div>
      )}

      <NuevoProductorDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onSuccess={fetchProducers}
      />
    </div>
  )
}
