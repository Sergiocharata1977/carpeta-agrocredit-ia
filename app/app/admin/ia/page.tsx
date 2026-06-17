"use client"

import { useEffect, useState } from "react"
import { getAuth } from "firebase/auth"
import { RoleGate } from "@/components/auth/RoleGate"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Bot, Check, Zap, KeyRound, AlertTriangle, Play } from "lucide-react"

interface ProviderInfo {
  name: "groq" | "anthropic" | "xai"
  label: string
  hasKey: boolean
}

interface AiConfigState {
  selectedProvider: string | null
  activeProvider: string | null
  envDefault: string | null
  updatedAt: string | null
  updatedByUid: string | null
  providers: ProviderInfo[]
}

interface TestResult {
  provider: string
  hasKey: boolean
  ok: boolean
  latencyMs: number | null
  output: string | null
  error: string | null
}

async function getToken(): Promise<string> {
  const user = getAuth().currentUser
  if (!user) throw new Error("No autenticado")
  return user.getIdToken()
}

export default function AdminIaPage() {
  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <IaConfigPanel />
    </RoleGate>
  )
}

function IaConfigPanel() {
  const [state, setState] = useState<AiConfigState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<TestResult[] | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch("/api/admin/ai-config", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "No se pudo cargar la configuración")
        return
      }
      setState(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function selectProvider(provider: string | null) {
    setSaving(provider ?? "__default__")
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch("/api/admin/ai-config", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar")
        return
      }
      setState(data)
    } finally {
      setSaving(null)
    }
  }

  async function runCompare() {
    setTesting(true)
    setResults(null)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch("/api/admin/ai-config/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "No se pudo correr la comparación")
        return
      }
      setResults(data.results ?? [])
    } finally {
      setTesting(false)
    }
  }

  const active = state?.activeProvider ?? null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#e0f2fe]">
          <Bot className="h-5 w-5 text-[#0369a1]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--brand-ink)]">Proveedor de IA</h1>
          <p className="text-sm text-[#59675f]">
            Elegí qué motor de IA usa el legajo (clasificación, extracción, AFIP) y compará.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading || !state ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {state.providers.map((p) => {
              const isActive = active === p.name
              const isSaving = saving === p.name
              return (
                <button
                  key={p.name}
                  type="button"
                  disabled={!p.hasKey || isSaving}
                  onClick={() => selectProvider(p.name)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    isActive
                      ? "border-[#0369a1] bg-[#f0f9ff] ring-1 ring-[#0369a1]"
                      : p.hasKey
                        ? "border-[#e4e8e3] bg-white hover:border-[#7dd3fc]"
                        : "border-dashed border-[#e4e8e3] bg-[#fafafa] opacity-70"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--brand-ink)]">{p.label}</span>
                    {isActive && <Check className="h-4 w-4 text-[#0369a1]" />}
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <KeyRound className="h-3.5 w-3.5" />
                    {p.hasKey ? (
                      <span className="text-green-700">API key configurada</span>
                    ) : (
                      <span className="text-[#9ca3af]">Sin key — falta env</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-[#59675f]">
                    {isActive
                      ? "Activo"
                      : isSaving
                        ? "Guardando…"
                        : p.hasKey
                          ? "Click para activar"
                          : "No disponible"}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-[#59675f]">
            <span>
              Default por entorno (<code>AI_PROVIDER</code>):{" "}
              <strong>{state.envDefault ?? "—"}</strong>
            </span>
            {state.selectedProvider && (
              <Button
                variant="outline"
                size="sm"
                disabled={saving !== null}
                onClick={() => selectProvider(null)}
              >
                Volver al default del entorno
              </Button>
            )}
          </div>

          {!active && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No hay proveedor activo: la IA correrá en <strong>modo mock</strong> (datos de ejemplo).
            </p>
          )}

          <div className="ag-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[var(--brand-ink)]">Comparar proveedores</h2>
                <p className="text-sm text-[#59675f]">
                  Corre un prompt corto en cada proveedor con key y mide la latencia.
                </p>
              </div>
              <Button
                onClick={runCompare}
                disabled={testing}
                className="flex items-center gap-2 bg-[#0369a1] text-white hover:bg-[#075985]"
              >
                {testing ? <Zap className="h-4 w-4 animate-pulse" /> : <Play className="h-4 w-4" />}
                {testing ? "Probando…" : "Probar y comparar"}
              </Button>
            </div>

            {results && (
              <div className="space-y-3">
                {results.map((r) => (
                  <div
                    key={r.provider}
                    className={`rounded-lg border p-3 ${
                      r.ok ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize text-[var(--brand-ink)]">
                        {r.provider}
                      </span>
                      <span className="text-xs text-[#59675f]">
                        {r.ok ? `${r.latencyMs} ms` : r.hasKey ? "Falló" : "Sin key"}
                      </span>
                    </div>
                    {r.ok ? (
                      <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded bg-white/70 p-2 text-xs text-[#374151]">
                        {r.output}
                      </pre>
                    ) : (
                      <p className="mt-1 text-xs text-red-700">{r.error}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
