"use client"

import { useEffect, useState } from "react"
import { RoleGate } from "@/components/auth/RoleGate"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import { LayoutGrid, LayoutList } from "lucide-react"
import type { Organization } from "@/types/auth"

const ORG_TYPE_LABELS: Record<Organization["type"], string> = {
  platform: "Plataforma",
  system_user: "Usuario / Cliente",
  system_user_entity: "Empresa del cliente",
  accounting_firm: "Estudio Contable",
  requesting_entity: "Entidad / Financista",
}

const ORG_STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  suspended: "Suspendida",
  pending: "Pendiente",
  pending_approval: "Pendiente",
  rejected: "Rechazada",
}

const ORG_STATUS_CLASSES: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  rejected: "bg-red-100 text-red-700",
}

type ViewMode = "list" | "grid"

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
}

function formatDate(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleDateString("es-AR") : "-"
}

function OrgCard({ org }: { org: Organization }) {
  const statusClass = ORG_STATUS_CLASSES[org.status] ?? ORG_STATUS_CLASSES.pending
  const statusLabel = ORG_STATUS_LABELS[org.status] ?? org.status

  return (
    <div className="rounded-xl border border-[#dde4dc] bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcefe5] text-sm font-bold text-[#063c31]">
          {initials(org.legalName)}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#10221c]">{org.legalName}</p>
          <p className="text-xs text-[#59675f]">{ORG_TYPE_LABELS[org.type]}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize text-[#59675f]">{org.plan ?? "-"}</span>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="text-xs text-[#59675f]">{formatDate(org.createdAt)}</p>
    </div>
  )
}

function OrganizacionesContent() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchOrgs() {
      setLoading(true)
      setError(null)

      try {
        const token = await getFreshIdToken()
        const res = await fetch("/api/admin/organizations", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? "No se pudieron cargar las organizaciones")
        setOrgs(json.organizations ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las organizaciones")
        setOrgs([])
      } finally {
        setLoading(false)
      }
    }

    fetchOrgs()
  }, [])

  const filtered = orgs.filter((o) =>
    o.legalName.toLowerCase().includes(search.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar organizacion..."
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

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin organizaciones</EmptyTitle>
            <EmptyDescription>No hay organizaciones que coincidan con la busqueda.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((org) => (
            <OrgCard key={org.id} org={org} />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((org) => {
              const statusClass = ORG_STATUS_CLASSES[org.status] ?? ORG_STATUS_CLASSES.pending
              const statusLabel = ORG_STATUS_LABELS[org.status] ?? org.status
              return (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.legalName}</TableCell>
                  <TableCell>{ORG_TYPE_LABELS[org.type]}</TableCell>
                  <TableCell className="capitalize">{org.plan ?? "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(org.createdAt)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default function OrganizacionesPage() {
  return (
    <RoleGate
      allowedRoles={["admin_platform"]}
      fallback={
        <div className="p-6">
          <p className="text-destructive">
            No tenes permisos para acceder a esta seccion.
          </p>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizaciones</h1>
          <p className="text-muted-foreground text-sm">
            Listado de todas las organizaciones registradas en la plataforma.
          </p>
        </div>
        <OrganizacionesContent />
      </div>
    </RoleGate>
  )
}
