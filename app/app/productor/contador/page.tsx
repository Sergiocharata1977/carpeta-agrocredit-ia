"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Info,
  Loader2,
  Send,
  UserX,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { RoleGate } from "@/components/auth/RoleGate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"

interface AccountingFirm {
  id: string
  legalName: string
  taxId: string
  contactName?: string | null
  contactEmail?: string | null
  province?: string | null
  city?: string | null
}

interface ProducerLink {
  id: string
  status: "active" | "pending" | "rejected" | "inactive"
  accountingFirmId: string
  firmLegalName: string | null
  firmTaxId: string | null
  firmContactEmail: string | null
  isMain: boolean
  createdAt: string | null
}

const STATUS_LABELS: Record<ProducerLink["status"], string> = {
  active: "Vinculado",
  pending: "Solicitud enviada",
  rejected: "Rechazado",
  inactive: "Inactivo",
}

const STATUS_VARIANTS: Record<ProducerLink["status"], "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  pending: "outline",
  rejected: "destructive",
  inactive: "secondary",
}

const BANNER_KEY = "agro_contador_banner_dismissed"

export default function ProducerContadorPage() {
  const { user } = useSession()
  const [links, setLinks] = useState<ProducerLink[]>([])
  const [firms, setFirms] = useState<AccountingFirm[]>([])
  const [search, setSearch] = useState("")
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [loadingFirms, setLoadingFirms] = useState(false)
  const [requesting, setRequesting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_KEY) === "1"
    if (!dismissed) setBannerVisible(true)
  }, [])

  function dismissBanner() {
    localStorage.setItem(BANNER_KEY, "1")
    setBannerVisible(false)
  }

  const fetchLinks = useCallback(async () => {
    setLoadingLinks(true)
    setError(null)
    try {
      // getFreshIdToken fuerza refresco de claims — necesario para que
      // defaultOrganizationId esté disponible en cuentas recién creadas
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesion no disponible")
      const res = await fetch("/api/producer-accountant-links", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 403) {
        // Sin organización configurada aún — tratar como sin vínculos
        setLinks([])
        return
      }
      if (!res.ok) throw new Error("No se pudieron cargar los vinculos")
      const json = await res.json()
      setLinks(json.links ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar vinculos")
    } finally {
      setLoadingLinks(false)
    }
  }, [])

  const searchFirms = useCallback(async (q: string) => {
    setLoadingFirms(true)
    try {
      const token = await getFreshIdToken()
      if (!token) return
      const params = new URLSearchParams({ type: "accounting_firm", limit: "10" })
      if (q.trim()) params.set("search", q.trim())
      const res = await fetch(`/api/organizations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json()
      setFirms(json.organizations ?? [])
    } finally {
      setLoadingFirms(false)
    }
  }, [])

  useEffect(() => {
    void fetchLinks()
    void searchFirms("")
  }, [fetchLinks, searchFirms])

  useEffect(() => {
    const timer = setTimeout(() => searchFirms(search), 300)
    return () => clearTimeout(timer)
  }, [search, searchFirms])

  async function requestLink(firmId: string) {
    setRequesting(firmId)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesion no disponible")
      const res = await fetch("/api/producer-accountant-links", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountingFirmId: firmId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "No se pudo enviar la solicitud")
      toast.success("Solicitud enviada al estudio contable")
      await fetchLinks()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar la solicitud")
    } finally {
      setRequesting(null)
    }
  }

  const activeLink = links.find((l) => l.status === "active")
  const pendingLinks = links.filter((l) => l.status === "pending")
  const linkedFirmIds = new Set(
    links.filter((l) => l.status === "active" || l.status === "pending").map((l) => l.accountingFirmId),
  )

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="space-y-6">
        {activeLink && (
          <section className="ag-panel p-6">
            <div className="flex items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#dceee7] text-[var(--brand-green)]">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-[var(--brand-ink)]">Contador activo</h2>
                <p className="mt-1 text-sm font-semibold text-[var(--brand-ink)]">
                  {activeLink.firmLegalName ?? "Estudio contable"}
                </p>
                {activeLink.firmTaxId && (
                  <p className="text-xs text-[var(--brand-muted)]">CUIT {activeLink.firmTaxId}</p>
                )}
                {activeLink.firmContactEmail && (
                  <p className="text-xs text-[var(--brand-muted)]">{activeLink.firmContactEmail}</p>
                )}
              </div>
              <Badge variant="default" className="shrink-0 bg-emerald-600">Vinculado</Badge>
            </div>
          </section>
        )}

        {pendingLinks.length > 0 && (
          <section className="ag-panel p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
              Solicitudes pendientes
            </h2>
            <div className="space-y-3">
              {pendingLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-4 rounded-lg border border-[var(--brand-line)] bg-white p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--brand-ink)]">
                      {link.firmLegalName ?? link.accountingFirmId}
                    </p>
                    {link.firmTaxId && (
                      <p className="text-xs text-[var(--brand-muted)]">CUIT {link.firmTaxId}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">Esperando aceptacion</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Banner explicativo — solo si no hay vínculo activo y no fue cerrado */}
        {!activeLink && !loadingLinks && bannerVisible && (
          <section className="relative rounded-xl border border-[#c7d2fe] bg-[#eef2ff] p-5 pr-12">
            {/* Botón cerrar */}
            <button
              onClick={dismissBanner}
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full text-[#6366f1] transition-colors hover:bg-[#e0e7ff] hover:text-[#4338ca]"
              aria-label="Cerrar aviso"
            >
              <X className="size-4" />
            </button>

            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e0e7ff] text-[#4f46e5]">
                <FileText className="size-5" />
              </div>
              <div className="space-y-2">
                <p className="font-semibold text-[#1e1b4b]">¿Para qué necesitás un contador?</p>
                <p className="text-sm leading-relaxed text-[#3730a3]">
                  El contador es quien carga y mantiene tu información financiera: balances,
                  declaraciones impositivas, bienes y documentos. Sin un contador vinculado,
                  la carpeta crediticia no puede completarse y los bancos o financieras no
                  podrán evaluar tu solicitud.
                </p>
                <p className="text-sm leading-relaxed text-[#3730a3]">
                  Buscá tu estudio contable aquí abajo y enviá una solicitud de vínculo.
                  El contador recibirá una notificación y podrá aceptar o rechazar.
                </p>
                {/* Mensaje de privacidad */}
                <div className="flex items-start gap-2 rounded-lg border border-[#a5b4fc] bg-[#e0e7ff] px-3 py-2">
                  <Info className="mt-0.5 size-3.5 shrink-0 text-[#4f46e5]" />
                  <p className="text-xs leading-relaxed text-[#3730a3]">
                    <span className="font-semibold">Tu información está encriptada y es privada.</span>{" "}
                    Solo vos, tu contador y las personas que vos autoricés expresamente pueden
                    verla. Ningún banco ni financiera accede sin tu permiso.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="ag-panel overflow-hidden">
          <div className="flex items-start gap-4 border-b border-[var(--brand-line)] px-6 py-5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]">
              <Building2 className="size-5" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-[var(--brand-ink)]">
                {activeLink ? "Cambiar contador" : "Elegir un contador"}
              </h1>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">
                Busca un estudio contable habilitado y envia una solicitud de vinculo.
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nombre o CUIT..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button variant="ghost" size="icon" onClick={() => setSearch("")}>
                  <X className="size-4" />
                </Button>
              )}
            </div>

            {loadingFirms ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : firms.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
                <UserX className="size-8 text-[var(--brand-muted)]" />
                <p className="text-sm text-[var(--brand-muted)]">
                  {search ? "No se encontraron estudios con ese criterio" : "No hay estudios habilitados disponibles"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {firms.map((firm) => {
                  const alreadyLinked = linkedFirmIds.has(firm.id)
                  const isRequesting = requesting === firm.id
                  return (
                    <div
                      key={firm.id}
                      className="flex items-center justify-between gap-4 rounded-lg border border-[var(--brand-line)] bg-white p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--brand-ink)]">{firm.legalName}</p>
                        <p className="text-xs text-[var(--brand-muted)]">
                          CUIT {firm.taxId || "-"}
                          {firm.city ? ` · ${firm.city}` : ""}
                          {firm.province ? `, ${firm.province}` : ""}
                        </p>
                        {firm.contactEmail && (
                          <p className="text-xs text-[var(--brand-muted)]">{firm.contactEmail}</p>
                        )}
                      </div>
                      {alreadyLinked ? (
                        <Badge variant="secondary">Solicitud enviada</Badge>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isRequesting || loadingLinks}
                          onClick={() => requestLink(firm.id)}
                          className="shrink-0"
                        >
                          {isRequesting ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <Send className="mr-1.5 size-3.5" />
                          )}
                          Solicitar vinculo
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {links.filter((l) => l.status === "rejected" || l.status === "inactive").length > 0 && (
          <section className="ag-panel p-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--brand-muted)]">
              Historial
            </h2>
            <div className="space-y-2">
              {links
                .filter((l) => l.status === "rejected" || l.status === "inactive")
                .map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-[var(--brand-line)] bg-white px-4 py-3 opacity-60"
                  >
                    <p className="text-sm text-[var(--brand-ink)]">
                      {link.firmLegalName ?? link.accountingFirmId}
                    </p>
                    <Badge variant={STATUS_VARIANTS[link.status]}>{STATUS_LABELS[link.status]}</Badge>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </RoleGate>
  )
}
