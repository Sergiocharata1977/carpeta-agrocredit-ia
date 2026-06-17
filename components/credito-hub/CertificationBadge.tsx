"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react"
import { getFreshIdToken } from "@/lib/firebase/auth-client"

type CertificationStatus = "draft" | "certified" | "outdated" | "revoked"

interface Certification {
  id: string
  folderOwnerOrganizationId: string
  status: CertificationStatus
  certificationScope: string
  certifiedByName: string | null
  certifiedByUid: string | null
  certifiedAt: string | null
  sourceVersion: string
  invalidatedAt: string | null
  invalidatedReason: string | null
}

interface CertificationBadgeProps {
  targetOrganizationId: string
  refreshKey?: number
}

/** Formatea una fecha ISO al formato corto es-AR. Devuelve "" si no es válida. */
export function formatCertDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function CertificationBadge({ targetOrganizationId, refreshKey }: CertificationBadgeProps) {
  const [certification, setCertification] = useState<Certification | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const token = await getFreshIdToken()
        if (!token) throw new Error("No se pudo validar la sesión")
        const res = await fetch(
          `/api/credito-hub/certification/${encodeURIComponent(targetOrganizationId)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        )
        const data = (await res.json().catch(() => null)) as { certification?: Certification | null } | null
        if (!res.ok) throw new Error("No se pudo cargar la certificación")
        if (!cancelled) setCertification(data?.certification ?? null)
      } catch {
        if (!cancelled) setCertification(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [targetOrganizationId, refreshKey])

  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e8e3] bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
        <span className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground/40" />
        Verificando…
      </span>
    )
  }

  const status = certification?.status

  if (status === "certified") {
    const fecha = formatCertDate(certification?.certifiedAt ?? null)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        Certificado
        {certification?.certifiedByName ? ` por ${certification.certifiedByName}` : ""}
        {fecha ? ` · ${fecha}` : ""}
      </span>
    )
  }

  if (status === "outdated") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
        <ShieldAlert className="h-3.5 w-3.5" />
        Certificación desactualizada (los datos cambiaron)
      </span>
    )
  }

  // sin certificación, draft, revoked u otros estados → sin certificar
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e8e3] bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
      <ShieldQuestion className="h-3.5 w-3.5" />
      Sin certificar
    </span>
  )
}
