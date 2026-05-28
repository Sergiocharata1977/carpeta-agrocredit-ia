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
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty"
import type { Organization } from "@/types/auth"

const ORG_TYPE_LABELS: Record<Organization["type"], string> = {
  platform: "Plataforma",
  producer: "Productor",
  accounting_firm: "Estudio Contable",
  bank: "Banco",
  financial_entity: "Entidad Financiera",
  agro_company: "Empresa Agropecuaria",
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

function OrganizacionesContent() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (orgs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Sin organizaciones</EmptyTitle>
          <EmptyDescription>
            Aun no hay organizaciones registradas. Podés crearlas desde Firebase Console.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
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
        {orgs.map((org) => (
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
