"use client"

import { useEffect, useState } from "react"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, getDocs, orderBy, query } from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { RoleGate } from "@/components/auth/RoleGate"
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
  system_user: "Usuario del Sistema",
  system_user_entity: "Empresa (entidad hijo)",
  accounting_firm: "Estudio Contable",
  requesting_entity: "Entidad Solicitante",
}

const ORG_STATUS_LABELS: Record<Organization["status"], string> = {
  active: "Activa",
  suspended: "Suspendida",
  pending: "Pendiente",
}

const ORG_STATUS_CLASSES: Record<Organization["status"], string> = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-800",
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

function OrgCard({ org }: { org: Organization }) {
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
        <span className="capitalize text-[#59675f]">{org.plan}</span>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ORG_STATUS_CLASSES[org.status]}`}
        >
          {ORG_STATUS_LABELS[org.status]}
        </span>
      </div>
      <p className="text-xs text-[#59675f]">
        {typeof org.createdAt === "string"
          ? new Date(org.createdAt).toLocaleDateString("es-AR")
          : "—"}
      </p>
    </div>
  )
}

function OrganizacionesContent() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>("list")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function fetchOrgs() {
      const db = getFirebaseDb()
      if (!db) {
        setLoading(false)
        return
      }
      const q = query(
        collection(db, COLLECTIONS.ORGANIZATIONS),
        orderBy("createdAt", "desc"),
      )
      const snap = await getDocs(q)
      setOrgs(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Organization)))
      setLoading(false)
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

  return (
    <div className="space-y-4">
      {/* search + view toggle */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Buscar organización..."
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
            <EmptyDescription>
              Aun no hay organizaciones registradas. Podés crearlas desde Firebase Console.
            </EmptyDescription>
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
            {filtered.map((org) => (
              <TableRow key={org.id}>
                <TableCell className="font-medium">{org.legalName}</TableCell>
                <TableCell>{ORG_TYPE_LABELS[org.type]}</TableCell>
                <TableCell className="capitalize">{org.plan}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ORG_STATUS_CLASSES[org.status]}`}
                  >
                    {ORG_STATUS_LABELS[org.status]}
                  </span>
                </TableCell>
                <TableCell>
                  {typeof org.createdAt === "string"
                    ? new Date(org.createdAt).toLocaleDateString("es-AR")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
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
            No tenés permisos para acceder a esta sección.
          </p>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organizaciones</h1>
          <p className="text-muted-foreground text-sm">
            Listado de todas las organizaciones registradas en la plataforma
          </p>
        </div>
        <OrganizacionesContent />
      </div>
    </RoleGate>
  )
}
