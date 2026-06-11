"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { RoleGate } from "@/components/auth/RoleGate"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import { FileText, FolderOpen, ShieldCheck } from "lucide-react"

interface GrantSummary {
  id: string
  targetOrganizationId: string
  targetOrgName?: string
  allowedScopes: string[]
  expiresAt: string
  status: string
}

export default function EntidadDashboard() {
  const { user, loading: sessionLoading } = useSession()
  const [grants, setGrants] = useState<GrantSummary[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadGrants = useCallback(async () => {
    if (!user?.defaultOrganizationId) {
      setLoadingData(false)
      return
    }
    setLoadingData(true)
    try {
      const token = await getFreshIdToken()
      if (!token) return
      const res = await fetch("/api/access-grants/direct", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (res.ok) {
        const json = await res.json()
        setGrants(json.grants ?? [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar los accesos")
    } finally {
      setLoadingData(false)
    }
  }, [user?.defaultOrganizationId])

  useEffect(() => {
    if (!sessionLoading) void loadGrants()
  }, [sessionLoading, loadGrants])

  const now = new Date()
  const activeGrants = grants.filter(
    (g) => g.status === "approved" && new Date(g.expiresAt) > now,
  )

  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--brand-ink)]">
            Panel de entidad
          </h1>
          <p className="mt-2 text-base text-[var(--brand-muted)]">
            Carpetas autorizadas y pedidos de información activos.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-3">
          <article className="ag-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#dceee7] text-[var(--brand-green)]">
                <FolderOpen className="size-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--brand-muted)]">Carpetas autorizadas</p>
                <p className="mt-1 text-3xl font-bold text-[var(--brand-ink)]">
                  {loadingData ? "..." : activeGrants.length}
                </p>
              </div>
            </div>
          </article>

          <article className="ag-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#e5edf4] text-[#2f5d74]">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--brand-muted)]">Pedidos de información</p>
                <Link
                  href="/app/entidad/financiacion"
                  className="mt-1 block text-sm font-semibold text-[var(--brand-green)] hover:underline"
                >
                  Ver pedidos →
                </Link>
              </div>
            </div>
          </article>

          <article className="ag-card p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#f5f0e8] text-[#b56f2b]">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <p className="text-sm text-[var(--brand-muted)]">Accesos activos</p>
                <p className="mt-1 text-3xl font-bold text-[var(--brand-ink)]">
                  {loadingData ? "..." : activeGrants.length}
                </p>
              </div>
            </div>
          </article>
        </div>

        {/* Carpetas autorizadas */}
        <section className="ag-panel overflow-hidden">
          <div className="border-b border-[var(--brand-line)] px-6 py-5">
            <h2 className="text-xl font-bold tracking-tight text-[var(--brand-ink)]">
              Carpetas autorizadas
            </h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">
              Carpetas a las que tenés acceso activo. Hacé clic para ver la información.
            </p>
          </div>

          {loadingData ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-[var(--brand-surface-strong)]" />
              ))}
            </div>
          ) : activeGrants.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <FolderOpen className="h-10 w-10 text-[var(--brand-muted)]" />
              <p className="text-base font-semibold text-[var(--brand-ink)]">Sin carpetas autorizadas</p>
              <p className="max-w-sm text-sm text-[var(--brand-muted)]">
                Cuando un titular autorice tu acceso a su carpeta, aparecerá aquí.
              </p>
              <Link
                href="/app/entidad/accesos"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--brand-green)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-green)]/90"
              >
                Solicitar acceso
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[var(--brand-line)]">
              {activeGrants.map((grant) => {
                const expiresAt = new Date(grant.expiresAt)
                const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={grant.id} className="flex items-center justify-between px-6 py-4">
                    <div>
                      <p className="font-medium text-[var(--brand-ink)]">
                        {grant.targetOrgName ?? grant.targetOrganizationId}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--brand-muted)]">
                        {grant.allowedScopes.length} alcance{grant.allowedScopes.length !== 1 ? "s" : ""} •{" "}
                        {daysLeft <= 7 ? (
                          <span className="text-amber-600 font-medium">vence en {daysLeft} día{daysLeft !== 1 ? "s" : ""}</span>
                        ) : (
                          <span>vence el {expiresAt.toLocaleDateString("es-AR")}</span>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/app/entidad/carpetas/${grant.targetOrganizationId}`}
                      className="flex items-center gap-1.5 rounded-xl border border-[var(--brand-line)] bg-white px-4 py-2 text-sm font-medium text-[var(--brand-ink)] hover:bg-[var(--brand-surface-strong)]"
                    >
                      <FolderOpen className="size-3.5" />
                      Ver carpeta
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </RoleGate>
  )
}
