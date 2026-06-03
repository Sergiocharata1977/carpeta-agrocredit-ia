"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Building2, FileText, Landmark, Receipt, Scale, TrendingUp } from "lucide-react"
import { RoleGate } from "@/components/auth/RoleGate"
import { GrantExpiredBlocker } from "@/components/access/GrantExpiredBlocker"
import { GrantStatusBanner } from "@/components/access/GrantStatusBanner"
import { ScopeGuard } from "@/components/access/ScopeGuard"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import type { AccessGrant } from "@/types/access"

interface OrgInfo {
  id: string
  legalName?: string
  taxId?: string
  type?: string
}

interface BalanceSummary {
  id: string
  assetsTotal: number
  liabilitiesTotal: number
  equityTotal: number
  currency?: string
  year?: number
}

interface IncomeSummary {
  id: string
  sales?: number
  netSales?: number
  grossResult?: number
  netResult?: number
  currency?: string
  year?: number
}

interface TaxDocSummary {
  id: string
  taxType: string
  fiscalPeriod?: string
  amount?: number
  currency?: string
}

const TABS = [
  { id: "resumen", label: "Resumen", scope: "accounting_summary" as const, icon: Building2 },
  { id: "balance", label: "Balance", scope: "balance_sheets" as const, icon: Scale },
  { id: "resultados", label: "Resultados", scope: "income_statements" as const, icon: TrendingUp },
  { id: "impuestos", label: "Impuestos", scope: "tax_documents" as const, icon: Receipt },
  { id: "patrimonio", label: "Patrimonio", scope: "assets" as const, icon: Landmark },
  { id: "documentos", label: "Documentos", scope: "documents" as const, icon: FileText },
]

export default function EntidadCarpetaPage() {
  const { targetOrgId } = useParams<{ targetOrgId: string }>()
  const [grant, setGrant] = useState<AccessGrant | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [income, setIncome] = useState<IncomeSummary | null>(null)
  const [taxDocs, setTaxDocs] = useState<TaxDocSummary[]>([])
  const [activeTab, setActiveTab] = useState("resumen")
  const [loading, setLoading] = useState(true)

  const loadFolder = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getFreshIdToken()
      const res = await fetch(`/api/folders/${targetOrgId}/readonly`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo cargar la carpeta")
      setGrant(json.grant ?? null)
      setOrg(json.org ?? null)
      setBalance(json.balance ?? null)
      setIncome(json.income ?? null)
      setTaxDocs(json.taxDocs ?? [])
    } catch {
      setGrant(null)
      setOrg(null)
      setBalance(null)
      setIncome(null)
      setTaxDocs([])
    } finally {
      setLoading(false)
    }
  }, [targetOrgId])

  useEffect(() => {
    void loadFolder()
  }, [loadFolder])

  const fmt = (n: number, currency = "ARS") =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n)

  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="space-y-6 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Carpeta crediticia
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {org?.legalName ?? (loading ? "Cargando..." : "Sin acceso")}
          </h1>
          {org?.taxId && <p className="text-sm text-muted-foreground">CUIT {org.taxId}</p>}
        </div>

        {loading ? (
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        ) : (
          <GrantStatusBanner grant={grant} />
        )}

        {!loading && !grant ? (
          <GrantExpiredBlocker />
        ) : (
          <>
            <div className="flex flex-wrap gap-1 border-b border-[var(--brand-line)]">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
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

            <div className="pt-2">
              {activeTab === "resumen" && (
                <ScopeGuard grant={grant} requiredScope="accounting_summary" sectionLabel="El resumen contable">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {balance && (
                      <>
                        <StatCard label="Activo total" value={fmt(balance.assetsTotal, balance.currency)} />
                        <StatCard label="Pasivo total" value={fmt(balance.liabilitiesTotal, balance.currency)} />
                        <StatCard label="Patrimonio neto" value={fmt(balance.equityTotal, balance.currency)} highlight />
                      </>
                    )}
                    {income && (
                      <>
                        <StatCard label="Ventas netas" value={fmt(income.netSales ?? income.sales ?? 0, income.currency)} />
                        <StatCard label="Resultado bruto" value={fmt(income.grossResult ?? 0, income.currency)} />
                        <StatCard label="Resultado neto" value={fmt(income.netResult ?? 0, income.currency)} highlight />
                      </>
                    )}
                    {!balance && !income && (
                      <p className="col-span-3 text-sm text-muted-foreground">Sin datos contables cargados aun.</p>
                    )}
                  </div>
                </ScopeGuard>
              )}

              {activeTab === "balance" && (
                <ScopeGuard grant={grant} requiredScope="balance_sheets" sectionLabel="El balance general">
                  {balance ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard label="Activo total" value={fmt(balance.assetsTotal, balance.currency)} />
                        <StatCard label="Pasivo total" value={fmt(balance.liabilitiesTotal, balance.currency)} />
                        <StatCard label="Patrimonio neto" value={fmt(balance.equityTotal, balance.currency)} highlight />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ultimo periodo disponible{balance.year ? ` - Año ${balance.year}` : ""}. Datos cargados por el contador.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin balance cargado para esta carpeta.</p>
                  )}
                </ScopeGuard>
              )}

              {activeTab === "resultados" && (
                <ScopeGuard grant={grant} requiredScope="income_statements" sectionLabel="Los estados de resultados">
                  {income ? (
                    <div className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-3">
                        <StatCard label="Ventas netas" value={fmt(income.netSales ?? income.sales ?? 0, income.currency)} />
                        <StatCard label="Resultado bruto" value={fmt(income.grossResult ?? 0, income.currency)} />
                        <StatCard label="Resultado neto" value={fmt(income.netResult ?? 0, income.currency)} highlight />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Ultimo periodo disponible{income.year ? ` - Año ${income.year}` : ""}. Datos cargados por el contador.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin estado de resultados cargado para esta carpeta.</p>
                  )}
                </ScopeGuard>
              )}

              {activeTab === "impuestos" && (
                <ScopeGuard grant={grant} requiredScope="tax_documents" sectionLabel="La informacion impositiva">
                  <TaxDocsList docs={taxDocs} />
                </ScopeGuard>
              )}

              {activeTab === "patrimonio" && (
                <ScopeGuard grant={grant} requiredScope="assets" sectionLabel="El patrimonio">
                  <p className="text-sm text-muted-foreground">Resumen de bienes y deudas disponible proximamente.</p>
                </ScopeGuard>
              )}

              {activeTab === "documentos" && (
                <ScopeGuard grant={grant} requiredScope="documents" sectionLabel="Los documentos">
                  <p className="text-sm text-muted-foreground">Listado de documentos disponible proximamente.</p>
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
    <div className={`rounded-md border p-5 ${highlight ? "border-[var(--brand-green)]/30 bg-[var(--brand-surface)]" : "border-[var(--brand-line)] bg-white"}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight ${highlight ? "text-[var(--brand-green)]" : "text-[var(--brand-ink)]"}`}>
        {value}
      </p>
    </div>
  )
}

function TaxDocsList({ docs }: { docs: TaxDocSummary[] }) {
  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin documentos impositivos cargados.</p>
  }

  return (
    <div className="divide-y rounded-md border border-[var(--brand-line)]">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{doc.taxType}</p>
            {doc.fiscalPeriod && <p className="text-xs text-muted-foreground">Periodo: {doc.fiscalPeriod}</p>}
          </div>
          {doc.amount != null && (
            <p className="text-sm font-semibold">
              {new Intl.NumberFormat("es-AR", { style: "currency", currency: doc.currency ?? "ARS" }).format(doc.amount)}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
