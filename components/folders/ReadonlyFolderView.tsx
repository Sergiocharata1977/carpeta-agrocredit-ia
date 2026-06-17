"use client"

import { useCallback, useEffect, useState } from "react"
import { Building2, Download, Eye, FileText, Landmark, Loader2, Receipt, Scale, ShieldAlert, ShieldCheck, ShieldQuestion, TrendingUp } from "lucide-react"
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

interface AssetItem {
  id: string
  description?: string
  category?: string
  value?: number
  currency?: string
}

interface LiabilityItem {
  id: string
  description?: string
  category?: string
  amount?: number
  currency?: string
  creditor?: string
}

interface DocumentItem {
  id: string
  fileName?: string
  name?: string
  documentType?: string
  fileSize?: number
  createdAt?: string
}

interface FolderCertification {
  id: string
  status: "draft" | "certified" | "outdated" | "revoked"
  certifiedByName?: string | null
  certifiedAt?: string | null
  invalidatedReason?: string | null
}

const TABS = [
  { id: "resumen", label: "Resumen", scope: "accounting_summary" as const, icon: Building2 },
  { id: "balance", label: "Balance", scope: "balance_sheets" as const, icon: Scale },
  { id: "resultados", label: "Resultados", scope: "income_statements" as const, icon: TrendingUp },
  { id: "impuestos", label: "Impuestos", scope: "tax_documents" as const, icon: Receipt },
  { id: "patrimonio", label: "Patrimonio", scope: "assets" as const, icon: Landmark },
  { id: "documentos", label: "Documentos", scope: "documents" as const, icon: FileText },
]

interface ReadonlyFolderViewProps {
  targetOrgId: string
  // ownerView: el titular mira su propia carpeta (sin banner de grant)
  ownerView?: boolean
}

export function ReadonlyFolderView({ targetOrgId, ownerView = false }: ReadonlyFolderViewProps) {
  const [grant, setGrant] = useState<AccessGrant | null>(null)
  const [org, setOrg] = useState<OrgInfo | null>(null)
  const [balance, setBalance] = useState<BalanceSummary | null>(null)
  const [income, setIncome] = useState<IncomeSummary | null>(null)
  const [taxDocs, setTaxDocs] = useState<TaxDocSummary[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [liabilities, setLiabilities] = useState<LiabilityItem[]>([])
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [certification, setCertification] = useState<FolderCertification | null>(null)
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
      setAssets(json.assets ?? [])
      setLiabilities(json.liabilities ?? [])
      setDocuments(json.documents ?? [])
      setCertification(json.certification ?? null)
    } catch {
      setGrant(null)
      setOrg(null)
      setCertification(null)
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

  const hasData =
    balance !== null ||
    income !== null ||
    taxDocs.length > 0 ||
    assets.length > 0 ||
    liabilities.length > 0 ||
    documents.length > 0

  return (
    <div className="space-y-6 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {ownerView ? "Mi carpeta" : "Carpeta de información"}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {org?.legalName ?? (loading ? "Cargando..." : "Sin acceso")}
        </h1>
        {org?.taxId && <p className="text-sm text-muted-foreground">CUIT {org.taxId}</p>}
        {!loading && grant && (
          <div className="mt-3">
            <ReadonlyCertificationBadge certification={certification} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-10 animate-pulse rounded-md bg-muted" />
      ) : ownerView ? (
        <div className="flex items-center gap-2 rounded-md border border-[var(--brand-line)] bg-[var(--brand-surface)] px-4 py-3 text-sm text-[var(--brand-ink)]">
          <Eye className="size-4 shrink-0 text-[var(--brand-green)]" />
          <span>
            Esta es la información de tu legajo cargada por tu contador. Así la ven las cuentas que habilitas.
          </span>
        </div>
      ) : (
        <GrantStatusBanner grant={grant} />
      )}

      {!loading && ownerView && !hasData && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-semibold text-[var(--brand-ink)]">Tu carpeta todavía no tiene información cargada</p>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Pedile a tu contador que cargue balances, impuestos y documentos. Hasta entonces no vas a poder habilitar el legajo a terceros.
          </p>
        </div>
      )}

      {!loading && !grant ? (
        ownerView ? (
          <p className="text-sm text-muted-foreground">No se pudo cargar tu carpeta. Probá de nuevo más tarde.</p>
        ) : (
          <GrantExpiredBlocker />
        )
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
                <PatrimonioTab assets={assets} liabilities={liabilities} fmt={fmt} />
              </ScopeGuard>
            )}

            {activeTab === "documentos" && (
              <ScopeGuard grant={grant} requiredScope="documents" sectionLabel="Los documentos">
                <DocumentosTab docs={documents} targetOrgId={targetOrgId} />
              </ScopeGuard>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function formatCertificationDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString("es-AR")
}

function ReadonlyCertificationBadge({ certification }: { certification: FolderCertification | null }) {
  if (certification?.status === "certified") {
    const date = formatCertificationDate(certification.certifiedAt)
    return (
      <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <ShieldCheck className="size-4 shrink-0" />
        <span className="min-w-0">
          Certificado por {certification.certifiedByName ?? "contador"}
          {date ? ` · ${date}` : ""}
        </span>
      </div>
    )
  }

  if (certification?.status === "outdated") {
    return (
      <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        <ShieldAlert className="size-4 shrink-0" />
        <span className="min-w-0">Certificacion desactualizada por cambios en el legajo</span>
      </div>
    )
  }

  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-md border border-[var(--brand-line)] bg-white px-3 py-2 text-sm text-muted-foreground">
      <ShieldQuestion className="size-4 shrink-0" />
      <span className="min-w-0">Sin certificacion profesional vigente</span>
    </div>
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

function PatrimonioTab({
  assets,
  liabilities,
  fmt,
}: {
  assets: AssetItem[]
  liabilities: LiabilityItem[]
  fmt: (n: number, currency?: string) => string
}) {
  const totalActivos = assets.reduce((sum, a) => sum + (a.value ?? 0), 0)
  const totalPasivos = liabilities.reduce((sum, l) => sum + (l.amount ?? 0), 0)
  const patrimonioNeto = totalActivos - totalPasivos

  if (assets.length === 0 && liabilities.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin bienes ni deudas cargados para esta carpeta.</p>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total activos" value={fmt(totalActivos)} />
        <StatCard label="Total pasivos" value={fmt(totalPasivos)} />
        <StatCard label="Patrimonio neto" value={fmt(patrimonioNeto)} highlight />
      </div>

      {assets.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Bienes</h3>
          <div className="divide-y rounded-md border border-[var(--brand-line)]">
            {assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{a.description ?? "Bien sin descripción"}</p>
                  {a.category && <p className="text-xs text-muted-foreground">{a.category}</p>}
                </div>
                {a.value != null && (
                  <p className="text-sm font-semibold">{fmt(a.value, a.currency)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {liabilities.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Deudas</h3>
          <div className="divide-y rounded-md border border-[var(--brand-line)]">
            {liabilities.map((l) => (
              <div key={l.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{l.description ?? "Deuda sin descripción"}</p>
                  {l.creditor && <p className="text-xs text-muted-foreground">Acreedor: {l.creditor}</p>}
                </div>
                {l.amount != null && (
                  <p className="text-sm font-semibold">{fmt(l.amount, l.currency)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function DocumentosTab({
  docs,
  targetOrgId,
}: {
  docs: DocumentItem[]
  targetOrgId: string
}) {
  const [downloading, setDownloading] = useState<string | null>(null)

  async function handleDownload(docId: string, fileName?: string) {
    setDownloading(docId)
    try {
      const token = await getFreshIdToken()
      const res = await fetch(`/api/folders/${targetOrgId}/documents/${docId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo obtener el link")
      const a = document.createElement("a")
      a.href = json.url
      a.download = fileName ?? "documento"
      a.target = "_blank"
      a.click()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al descargar")
    } finally {
      setDownloading(null)
    }
  }

  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin documentos cargados para esta carpeta.</p>
  }

  return (
    <div className="divide-y rounded-md border border-[var(--brand-line)]">
      {docs.map((doc) => {
        const name = doc.fileName ?? doc.name ?? "Documento"
        return (
          <div key={doc.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{name}</p>
              <div className="flex items-center gap-3 mt-0.5">
                {doc.documentType && (
                  <p className="text-xs text-muted-foreground">{doc.documentType}</p>
                )}
                {doc.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString("es-AR")}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDownload(doc.id, name)}
              disabled={downloading === doc.id}
              className="flex items-center gap-1.5 rounded-md border border-[var(--brand-line)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--brand-ink)] hover:bg-[var(--brand-surface-strong)] disabled:opacity-50"
            >
              {downloading === doc.id ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Download className="size-3.5" />
              )}
              Descargar
            </button>
          </div>
        )
      })}
    </div>
  )
}
