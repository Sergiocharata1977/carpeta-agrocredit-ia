"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ShieldCheck, Clock, AlertCircle, LogIn, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"
import type { AccessScope } from "@/types/access"

const SCOPE_LABELS: Record<AccessScope, string> = {
  profile_basic: "Perfil básico",
  accounting_summary: "Resumen contable",
  balance_sheets: "Balance general",
  income_statements: "Estado de resultados",
  tax_documents: "Documentos impositivos",
  assets: "Bienes y activos",
  liabilities: "Deudas y pasivos",
  documents: "Documentos adjuntos",
  full_credit_folder: "Carpeta completa",
}

interface InvitationInfo {
  invitationId: string
  ownerName: string
  senderRole: string
  recipientEmail: string
  requestedScopes: AccessScope[]
  approvedDays: number
  purpose: string
  tokenExpiresAt: string
}

interface AcceptAccessInvitationProps {
  token: string
}

export function AcceptAccessInvitation({ token }: AcceptAccessInvitationProps) {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const [info, setInfo] = useState<InvitationInfo | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/access-invitations/accept/${token}`)
        const json = await res.json()
        if (!res.ok) {
          setLoadError(json.error ?? "Invitación no disponible")
          return
        }
        setInfo(json)
      } catch {
        setLoadError("No se pudo cargar la invitación")
      }
    }
    fetchInvitation()
  }, [token])

  async function handleAccept() {
    setAccepting(true)
    setAcceptError(null)
    try {
      const idToken = await getFreshIdToken()
      if (!idToken) throw new Error("Debés iniciar sesión primero")

      const res = await fetch(`/api/access-invitations/accept/${token}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Error al aceptar")

      router.push(json.redirectUrl ?? "/app/entidad")
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : "Error inesperado")
      setAccepting(false)
    }
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
        <div className="mx-auto max-w-md w-full text-center space-y-4">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="size-8 text-red-400" />
          </div>
          <h1 className="text-xl font-semibold">Link no disponible</h1>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </div>
      </div>
    )
  }

  if (!info) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-green)] border-t-transparent" />
      </div>
    )
  }

  const expiresAt = new Date(info.tokenExpiresAt)
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-16" style={{ background: "#F8F9FA" }}>
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
            <ShieldCheck className="size-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Acceso a carpeta crediticia</h1>
          <p className="text-muted-foreground text-sm">
            <strong>{info.ownerName}</strong> compartió su información con vos.
          </p>
        </div>

        {/* Invitation card */}
        <div className="rounded-2xl border border-[#E7EAEE] bg-white p-6 space-y-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Propósito</p>
            <p className="text-sm">{info.purpose}</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Información disponible</p>
            <div className="flex flex-wrap gap-1.5">
              {info.requestedScopes.map((scope) => (
                <span key={scope} className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                  {SCOPE_LABELS[scope] ?? scope}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Clock className="size-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Acceso por <strong>{info.approvedDays} días</strong> · este link vence en{" "}
              <strong>{daysLeft} día{daysLeft !== 1 ? "s" : ""}</strong>
            </p>
          </div>

          <div className="rounded-lg border border-[#E7EAEE] bg-[#F8F9FA] px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Este link fue enviado para <strong>{info.recipientEmail}</strong>. Debés ingresar con esa cuenta.
            </p>
          </div>
        </div>

        {/* Actions */}
        {acceptError && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{acceptError}</AlertDescription>
          </Alert>
        )}

        {sessionLoading ? (
          <div className="h-12 animate-pulse rounded-xl bg-muted" />
        ) : user ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">
              Ingresado como <strong>{user.email}</strong>
            </p>
            <Button className="w-full" onClick={handleAccept} disabled={accepting}>
              {accepting ? "Aceptando acceso..." : "Aceptar y ver carpeta"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button className="w-full gap-2" asChild>
              <a href={`/login?redirect=/invitar/acceso/${token}`}>
                <LogIn className="size-4" />
                Ya tengo cuenta — Ingresar
              </a>
            </Button>
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href={`/registro?redirect=/invitar/acceso/${token}`}>
                <UserPlus className="size-4" />
                Crear mi cuenta gratuita
              </a>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
