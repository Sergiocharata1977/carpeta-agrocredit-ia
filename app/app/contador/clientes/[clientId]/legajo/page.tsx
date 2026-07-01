"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { getDoc, doc } from "firebase/firestore"
import { Building2, CheckCircle2, Circle, CircleDashed, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { CarpetaReviewSection } from "@/components/credito-hub/CarpetaReviewSection"
import { CertificationBadge } from "@/components/credito-hub/CertificationBadge"
import { CertifyFolderButton } from "@/components/credito-hub/CertifyFolderButton"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import type { Organization } from "@/types/auth"

interface PageProps {
  params: Promise<{ clientId: string }>
}

interface Carpeta {
  orgId: string
  label: string
  taxId?: string
  isTitular: boolean
}

interface FolderStatus {
  hasData: boolean
  sections: {
    balance: boolean
    income: boolean
    taxDocuments: boolean
    assets: boolean
    liabilities: boolean
    documents: boolean
  }
}

type SectionState = "complete" | "partial" | "empty"

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getFreshIdToken()
  if (!token) throw new Error("No se pudo validar la sesion")
  return { Authorization: `Bearer ${token}` }
}

export default function LegajoUnicoPage({ params }: PageProps) {
  const { clientId } = use(params)
  const { loading: sessionLoading } = useSession()

  const [client, setClient] = useState<Organization | null>(null)
  const [carpetas, setCarpetas] = useState<Carpeta[]>([])
  const [activeOrgId, setActiveOrgId] = useState<string>(clientId)
  const [status, setStatus] = useState<FolderStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [certRefresh, setCertRefresh] = useState(0)

  const loadCarpetas = useCallback(async () => {
    setLoading(true)
    try {
      const db = getFirebaseDb()
      let titular: Organization | null = null
      if (db) {
        const snap = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, clientId))
        if (snap.exists()) titular = { id: snap.id, ...snap.data() } as Organization
      }
      setClient(titular)

      const res = await fetch(`/api/organizations/${encodeURIComponent(clientId)}/entities`, {
        headers: await authHeaders(),
        cache: "no-store",
      })
      const payload = (await res.json().catch(() => null)) as
        | { entities?: { id: string; legalName: string; taxId?: string }[]; error?: string }
        | null
      if (!res.ok) throw new Error(payload?.error ?? "No se pudieron cargar las empresas")

      const list: Carpeta[] = [
        {
          orgId: clientId,
          label: titular?.legalName ?? "Titular",
          taxId: titular?.taxId,
          isTitular: true,
        },
        ...(payload?.entities ?? []).map((e) => ({
          orgId: e.id,
          label: e.legalName,
          taxId: e.taxId,
          isTitular: false,
        })),
      ]
      setCarpetas(list)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar el legajo")
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (sessionLoading) return
    void loadCarpetas()
  }, [loadCarpetas, sessionLoading])

  const loadStatus = useCallback(async (orgId: string) => {
    setStatusLoading(true)
    setStatus(null)
    try {
      const res = await fetch(`/api/folders/${encodeURIComponent(orgId)}/status`, {
        headers: await authHeaders(),
        cache: "no-store",
      })
      const data = await res.json().catch(() => null)
      if (res.ok) setStatus(data as FolderStatus)
    } catch {
      // Informativo: la UI muestra "sin datos".
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activeOrgId) return
    void loadStatus(activeOrgId)
  }, [activeOrgId, loadStatus])

  const activeCarpeta = carpetas.find((c) => c.orgId === activeOrgId) ?? carpetas[0]

  const sections = useMemo(() => {
    const s = status?.sections
    const contable: SectionState = !s
      ? "empty"
      : s.balance && s.income && s.taxDocuments
        ? "complete"
        : s.balance || s.income || s.taxDocuments
          ? "partial"
          : "empty"
    const patrimonio: SectionState = !s
      ? "empty"
      : s.assets && s.liabilities
        ? "complete"
        : s.assets || s.liabilities
          ? "partial"
          : "empty"
    const documentos: SectionState = s?.documents ? "complete" : "empty"

    const base = activeCarpeta?.isTitular
      ? [
          { key: "identidad", label: "Identidad y datos", state: "complete" as SectionState, href: `/app/contador/clientes/${clientId}` },
          { key: "perfil", label: "Perfil (fiscal/productivo/financiero)", state: "partial" as SectionState, href: `/app/contador/productores/${clientId}` },
        ]
      : [
          { key: "identidad", label: "Identidad y datos", state: "complete" as SectionState, href: `/app/contador/empresas/${activeOrgId}` },
        ]

    return [
      ...base,
      { key: "contable", label: "Contable (balance, resultados, impuestos)", state: contable, href: `/app/contador/empresas/${activeOrgId}/carpeta` },
      { key: "patrimonio", label: "Patrimonio (bienes y deudas)", state: patrimonio, href: `/app/contador/empresas/${activeOrgId}/bienes` },
      {
        key: "documentos",
        label: "Documentos",
        state: documentos,
        href: activeCarpeta?.isTitular ? `/app/contador/productores/${clientId}/documentos` : `/app/contador/empresas/${activeOrgId}`,
      },
    ]
  }, [status, activeCarpeta, activeOrgId, clientId])

  const percent = useMemo(() => {
    if (sections.length === 0) return 0
    const score = sections.reduce((acc, s) => acc + (s.state === "complete" ? 1 : s.state === "partial" ? 0.5 : 0), 0)
    return Math.round((score / sections.length) * 100)
  }, [sections])

  if (sessionLoading || loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Legajo · {client?.legalName ?? "Cliente"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {client?.taxId ? `CUIT ${client.taxId} · ` : ""}Carga y certificacion por el contador.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeCarpeta && (
                <CertifyFolderButton
                  targetOrganizationId={activeCarpeta.orgId}
                  onCertified={() => setCertRefresh((n) => n + 1)}
                />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-b">
            {carpetas.map((c) => {
              const active = c.orgId === activeOrgId
              return (
                <button
                  key={c.orgId}
                  type="button"
                  onClick={() => setActiveOrgId(c.orgId)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#0369a1] text-[#0369a1]"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c.isTitular ? <UserRound className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {c.isTitular ? "Titular" : c.label}
                </button>
              )
            })}
            <Link
              href={`/app/contador/clientes/${clientId}`}
              className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              + Empresa
            </Link>
          </div>

          <div className="rounded-xl border bg-card">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{activeCarpeta?.label}</span>
                {activeCarpeta?.taxId && (
                  <span className="text-xs text-muted-foreground">CUIT {activeCarpeta.taxId}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {activeCarpeta && (
                  <CertificationBadge targetOrganizationId={activeCarpeta.orgId} refreshKey={certRefresh} />
                )}
                <span className="text-sm font-medium text-muted-foreground">
                  {statusLoading ? "..." : `${percent}% completo`}
                </span>
              </div>
            </div>

            <div className="divide-y">
              {sections.map((s) => (
                <Link
                  key={s.key}
                  href={s.href}
                  className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center gap-3">
                    <SectionIcon state={s.state} />
                    <span className="text-sm">{s.label}</span>
                  </div>
                  <span className="text-xs font-medium text-[#0369a1]">Abrir -&gt;</span>
                </Link>
              ))}
            </div>
          </div>

          {activeCarpeta && (
            <div className="rounded-xl border bg-card p-5">
              <CarpetaReviewSection targetOrganizationId={activeCarpeta.orgId} />
            </div>
          )}
        </div>
    </div>
  )
}

function SectionIcon({ state }: { state: SectionState }) {
  if (state === "complete") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (state === "partial") return <CircleDashed className="h-4 w-4 text-amber-500" />
  return <Circle className="h-4 w-4 text-muted-foreground/40" />
}
