"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import type { EmpresaItem } from "@/app/api/contador/empresas/route"

export default function EmpresasPage() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [search, setSearch] = useState("")

  const fetchEmpresas = useCallback(async () => {
    if (!user) {
      setEmpresas([])
      setLoadingData(false)
      return
    }
    setLoadingData(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sin sesion")
      const res = await fetch("/api/contador/empresas", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "No se pudieron cargar las empresas")
      }
      const payload = (await res.json()) as { empresas: EmpresaItem[] }
      setEmpresas(payload.empresas)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar las empresas")
      setEmpresas([])
    } finally {
      setLoadingData(false)
    }
  }, [user])

  useEffect(() => {
    if (sessionLoading) return
    fetchEmpresas()
  }, [user, sessionLoading, fetchEmpresas])

  const filtered = empresas.filter(
    (e) =>
      e.legalName.toLowerCase().includes(search.toLowerCase()) ||
      e.taxId.includes(search) ||
      e.parentLegalName.toLowerCase().includes(search.toLowerCase()),
  )

  const isLoading = sessionLoading || loadingData

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Empresas</h1>
        <p className="text-muted-foreground text-sm">
          Entidades fiscales de tus clientes
        </p>
      </div>

      <Input
        placeholder="Buscar por razón social, CUIT o cliente..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </EmptyHeader>
          <EmptyContent>
            <EmptyTitle>Sin empresas</EmptyTitle>
            <EmptyDescription>
              {search
                ? "No se encontraron empresas con ese criterio."
                : "Aún no hay empresas registradas. Creá la primera desde el perfil de un cliente."}
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Razon social</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">CUIT</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell">Actividad</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cliente</th>
                <th className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell">Localidad</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((empresa) => (
                <tr
                  key={empresa.id}
                  className="cursor-pointer hover:bg-muted/20 transition-colors"
                  onClick={() => router.push(`/app/contador/empresas/${empresa.id}`)}
                >
                  <td className="px-4 py-3 font-medium">{empresa.legalName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{empresa.taxId || "-"}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell capitalize">
                    {empresa.activity || "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{empresa.parentLegalName}</td>
                  <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                    {[empresa.city, empresa.province].filter(Boolean).join(", ") || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
