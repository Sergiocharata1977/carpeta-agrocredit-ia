"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { RoleGate } from "@/components/auth/RoleGate"
import { GrantStatusBanner } from "@/components/access/GrantStatusBanner"
import { GrantExpiredBlocker } from "@/components/access/GrantExpiredBlocker"
import { ScopeGuard } from "@/components/access/ScopeGuard"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { getFirebaseDb } from "@/lib/firebase/config"
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { Building2, FileText, Scale, TrendingUp, Receipt, Landmark } from "lucide-react"
import type { AccessGrant } from "@/types/access"

interface OrgInfo {
  id: string
  legalName: string
  taxId?: string
  type: string
}

interface BalanceSummary {
  assetsTotal: number
  liabilitiesTotal: number
  equityTotal: number
  year?: number
}

interface IncomeSummary {
  netSales?: number
  grossResult?: number
  netResult?: number
  year?: number
}

const TABS = [
  { id: "resumen",    label: "Resumen",     scope: "accounting_summary"  as const, icon: Building2 },
  { id: "balance",    label: "Balance",     scope: "balance_sheets"      as const, icon: Scale },
  { id: "resultados", label: "Resultados",  scope: "income_statements"   as const, icon: TrendingUp },
  { id: "impuestos",  label: "Impuestos",   scope: "tax_documents"       as const, icon: Receipt },
  { id: "patrimonio", label: "Patrimonio",  scope: "assets"              as const, icon: Landmark },
  { id: "documentos", label: "Documentos",  scope: "documents"           as const, icon: FileText },
]

export default function EntidadCarpetaPage() {
  const { targetOrgId } = useParams<{ targetOrgId: string }>()
  const [grant, setGrant] = useState<AccessGrant | null | undefined>(undefined)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [activeTab, setActiveTab] = useState("resumen")
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [income, setIncome] = useState<IncomeSummary | null>(null)
  const [loadingGrant, setLoadingGrant] = useState(true)

  const loadGrant = useCallback(async () => {
    setLoadingGrant(true)
    try {
      const token = await getFreshIdToken()
      const res = await fetch(
        `/api/access-grants/active?targetOrganizationId=${targetOrgId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      const json = await res.json()
      setGrant(json.grant ?? null)
    } catch {
      setGrant(null)
    } finally {
      setLoadingGrant(false)
    }
  }, [targetOrgId])

  const loadOrgInfo = useCallback(async () => {
    const db = getFirebaseDb()
    if (!db || !targetOrgId) return
    try {
      const { getDoc, doc } = await import("firebase/firestore")
      const snap = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, targetOrgId))
      if (snap.exists()) {
        setOrg({ id: snap.id, ...(snap.data() as Omit<OrgInfo, "id">) })
      }
    } catch { /* no-op */ }
  }, [targetOrgId])

  const loadBalanceData = useCallback(async () => {
    const db = getFirebaseDb()
    if (!db || !targetOrgId) return
    try {
      const q = query(
        collection(db, COLLECTIONS.BALANCE_SHEETS),
        where("folderOwnerOrganizationId", "==", targetOrgId),
        orderBy("createdAt", "desc"),
        limit(1),
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0].data()
        setBalance({
          assetsTotal: d.assetsTotal ?? 0,
          liabilitiesTotal: d.liabilitiesTotal ?? 0,
          equityTotal: d.equityTotal ?? 0,
          year: d.year,
        })
      }
    } catch { /* no-op */ }
  }, [targetOrgId])

  const loadIncomeData = useCallback(async () => {
    const db = getFirebaseDb()
    if (!db || !targetOrgId) return
    try {
      const q = query(
        collection(db, COLLECTIONS.INCOME_STATEMENTS),
        where("folderOwnerOrganizationId", "==", targetOrgId),
        orderBy("createdAt", "desc"),
        limit(1),
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        const d = snap.docs[0].data()
        setIncome({
          netSales: d.netSales ?? d.sales,
          grossResult: d.grossResult,
          netResult: d.netResult,
          year: d.year,
        })
      }
    } catch { /* no-op */ }
  }, [targetOrgId])

  useEffect(() => {
    loadGrant()
    loadOrgInfo()
  }, [loadGrant, loadOrgInfo])

  useEffect(() => {
    if (!grant) return
    if (
      grant.allowedScopes.includes("balance_sheets") ||
      grant.allowedScopes.includes("full_credit_folder")
    ) {
      loadBalanceData()
    }
    if (
      grant.allowedScopes.includes("income_statements") ||
      grant.allowedScopes.includes("full_credit_folder")
    ) {
      loadIncomeData()
    }
  }, [grant, loadBalanceData, loadIncomeData])

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n)

  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Carpeta crediticia
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {org?.legalName ?? "Cargando..."}
          </h1>
          {org?.taxId && (
            <p className="text-sm text-muted-foreground">CUIT {org.taxId}</p>
          )}
        </div>

        {loadingGrant ? (
          <div className="h-10 animate-pulse rounded-xl bg-muted" />
        ) : (
          <GrantStatusBanner grant={grant ?? null} />
        )}

        {!loadingGrant && !grant ? (
          <GrantExpiredBlocker />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 flex-wrap border-b border-[var(--brand-line)]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? "border-[var(--brand-green)] text-[var(--brand-green)]"
                      : "border-transparent text-muted-foreground hover:text-[var(--brand-ink)]"
                  }`}
                >
                  <tab.icon className="size-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="pt-2">
              {activeTab === "resumen" && (
                <ScopeGuard grant={grant ?? null} requiredScope="accounting_summary" sectionLabel="El resumen contable">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {balance && (
                      <>
                        <StatCard label="Activo total" value={fmt(balance.assetsTotal)} />
                        <StatCard label="Pasivo total" value={fmt(balance.liabilitiesTotal)} />
                        <StatCard label="Patrimonio neto" value={fmt(balance.equityTotal)} highlight />
                      </>
                    )}
                    {income && (
                      <>
                        <StatCard label="Ventas netas" value={fmt(income.netSales ?? 0)} />
                        <StatCard label="Resultado bruto" value={fmt(income.grossResult ?? 0)} />
                        <StatCard label="Resultado neto" value={fmt(income.netResult ?? 0)} highlight />
                      </>
                    )}
                    {!balance && !income && (
                      <p className="col-span-3 text-sm text-muted-foreground">Sin datos contables cargados aún.</p>
                    )}
                  </div>
                </ScopeGuard>
              )}

              {activeTab === "balance" && (
                <ScopeGuard grant={grant ?? null} requiredScope="balance_sheets" sectionLabel="El balance general">
                  {balance ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard label="Activo total" value={fmt(balance.assetsTotal)} />
                        <StatCard label="Pasivo total" value={fmt(balance.liabilitiesTotal)} />
                        <StatCard label="Patrimonio neto" value={fmt(balance.equityTotal)} highlight />
                      </div>
                      <p className="text-xs text-muted-foreground">Último período disponible{balance.year ? ` — Año ${balance.year}` : ""}. Datos cargados por el contador.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin balance cargado para esta carpeta.</p>
                  )}
                </ScopeGuard>
              )}

              {activeTab === "resultados" && (
                <ScopeGuard grant={grant ?? null} requiredScope="income_statements" sectionLabel="Los estados de resultados">
                  {income ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard label="Ventas netas" value={fmt(income.netSales ?? 0)} />
                        <StatCard label="Resultado bruto" value={fmt(income.grossResult ?? 0)} />
                        <StatCard label="Resultado neto" value={fmt(income.netResult ?? 0)} highlight />
                      </div>
                      <p className="text-xs text-muted-foreground">Último período disponible{income.year ? ` — Año ${income.year}` : ""}. Datos cargados por el contador.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin estado de resultados cargado para esta carpeta.</p>
                  )}
                </ScopeGuard>
              )}

              {activeTab === "impuestos" && (
                <ScopeGuard grant={grant ?? null} requiredScope="tax_documents" sectionLabel="La información impositiva">
                  <TaxDocsList targetOrgId={targetOrgId} />
                </ScopeGuard>
              )}

              {activeTab === "patrimonio" && (
                <ScopeGuard grant={grant ?? null} requiredScope="assets" sectionLabel="El patrimonio">
                  <p className="text-sm text-muted-foreground">Resumen de bienes y deudas disponible próximamente.</p>
                </ScopeGuard>
              )}

              {activeTab === "documentos" && (
                <ScopeGuard grant={grant ?? null} requiredScope="documents" sectionLabel="Los documentos">
                  <p className="text-sm text-muted-foreground">Listado de documentos disponible próximamente.</p>
                </ScopeGuard>
              )}
            </div>
          </>
        )}
      </div>
    </RoleGate>
  )
}

function StatCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${highlight ? "border-[var(--brand-green)]/30 bg-[var(--brand-surface)]" : "border-[var(--brand-line)] bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${highlight ? "text-[var(--brand-green)]" : "text-[var(--brand-ink)]"}`}>{value}</p>
    </div>
  )
}

function TaxDocsList({ targetOrgId }: { targetOrgId: string }) {
  const [docs, setDocs] = useState<{ id: string; taxType: string; fiscalPeriod?: string; amount?: number }[]>([])

  useEffect(() => {
    async function load() {
      const db = getFirebaseDb()
      if (!db) return
      try {
        const q = query(
          collection(db, COLLECTIONS.TAX_DOCUMENTS),
          where("folderOwnerOrganizationId", "==", targetOrgId),
          orderBy("createdAt", "desc"),
          limit(20),
        )
        const snap = await getDocs(q)
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() as object } as { id: string; taxType: string; fiscalPeriod?: string; amount?: number })))
      } catch { /* no-op */ }
    }
    load()
  }, [targetOrgId])

  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin documentos impositivos cargados.</p>
  }

  return (
    <div className="divide-y rounded-xl border border-[var(--brand-line)]">
      {docs.map((d) => (
        <div key={d.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{d.taxType}</p>
            {d.fiscalPeriod && <p className="text-xs text-muted-foreground">Período: {d.fiscalPeriod}</p>}
          </div>
          {d.amount != null && (
            <p className="text-sm font-semibold">{new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(d.amount)}</p>
          )}
        </div>
      ))}
    </div>
  )
}
