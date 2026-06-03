"use client"

import { useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, ShieldCheck, AlertTriangle, CheckCircle2, LogIn } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { useSession } from "@/lib/auth/session"

type State = "idle" | "loading" | "success" | "error"

export default function AdminSetupPage() {
  const { user, loading: sessionLoading } = useSession()
  const [setupKey, setSetupKey] = useState("")
  const [showKey, setShowKey] = useState(false)
  const [state, setState] = useState<State>("idle")
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!setupKey.trim()) return

    setState("loading")
    setMessage("")

    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Debés iniciar sesión antes de continuar")

      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ setupKey }),
      })

      const json = await res.json()

      if (!res.ok) {
        setState("error")
        setMessage(json.error ?? "Error desconocido")
        return
      }

      setState("success")
      setMessage(json.message)
    } catch (err) {
      setState("error")
      setMessage(err instanceof Error ? err.message : "Error inesperado")
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16"
      style={{
        background:
          "radial-gradient(900px 500px at 80% -5%,rgba(45,106,79,.12),transparent 55%),radial-gradient(700px 400px at -5% 80%,rgba(29,53,87,.08),transparent 55%),#F8F9FA",
        fontFamily: "'Inter',system-ui,sans-serif",
      }}
    >
      <div className="mx-auto w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex size-14 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg,#2D6A4F,#1D3557)" }}
          >
            <ShieldCheck className="size-7" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#8A93A0]">Legajo</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#212529]">
              Configuración inicial
            </h1>
            <p className="mt-1 text-sm text-[#5A6470]">
              Creá la cuenta de administrador de la plataforma
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#E7EAEE] bg-white p-8 shadow-sm space-y-6">

          {/* Advertencia */}
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800 space-y-1">
              <p className="font-semibold">Este proceso solo puede ejecutarse una vez.</p>
              <p>Una vez creado el primer admin, este endpoint se desactiva automáticamente.</p>
            </div>
          </div>

          {state === "success" ? (
            <div className="space-y-5 text-center">
              <div className="flex justify-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2 className="size-8 text-emerald-500" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-[#212529]">¡Listo! Cuenta de admin creada</p>
                <p className="text-sm text-[#5A6470]">{message}</p>
              </div>
              <div className="space-y-2">
                <Button className="w-full" asChild>
                  <Link href="/login">Cerrar sesión e ingresar de nuevo</Link>
                </Button>
                <p className="text-xs text-[#8A93A0]">
                  Necesitás volver a iniciar sesión para que los nuevos permisos se apliquen.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Estado del usuario */}
              {!sessionLoading && (
                <div className="rounded-xl border border-[#E7EAEE] bg-[#F8F9FA] px-4 py-3">
                  {user ? (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex size-7 items-center justify-center rounded-full bg-[#2D6A4F] text-xs font-bold text-white">
                        {user.displayName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="font-medium text-[#212529]">{user.displayName ?? user.email}</p>
                        <p className="text-xs text-[#5A6470]">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-[#5A6470]">
                      <LogIn className="size-4 shrink-0" />
                      <span>
                        Necesitás{" "}
                        <Link href="/login?redirect=/admin-setup" className="underline text-[#2D6A4F]">
                          iniciar sesión
                        </Link>{" "}
                        primero.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="setupKey">Clave de configuración</Label>
                <div className="relative">
                  <Input
                    id="setupKey"
                    type={showKey ? "text" : "password"}
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    placeholder="Ingresá el valor de ADMIN_SETUP_KEY"
                    className="pr-10 font-mono text-sm"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                <p className="text-xs text-[#8A93A0]">
                  Este valor lo configuraste como <code className="bg-[#F8F9FA] px-1 rounded">ADMIN_SETUP_KEY</code> en las variables de entorno de Vercel.
                </p>
              </div>

              {state === "error" && (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  {message}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={state === "loading" || !user || !setupKey.trim()}
              >
                {state === "loading" ? "Configurando..." : "Crear cuenta de administrador"}
              </Button>

            </form>
          )}
        </div>

        {/* Instrucciones */}
        <div className="rounded-xl border border-[#E7EAEE] bg-white p-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A93A0]">Instrucciones</p>
          <ol className="space-y-2 text-sm text-[#5A6470] list-decimal list-inside">
            <li>Configurá <code className="bg-[#F8F9FA] px-1 rounded text-xs">ADMIN_SETUP_KEY=tu-clave-secreta</code> en Vercel → Settings → Environment Variables.</li>
            <li>Creá una cuenta normal en <Link href="/registro" className="underline text-[#2D6A4F]">/registro</Link> (o usá la que ya tenés).</li>
            <li>Iniciá sesión y volvé a esta página.</li>
            <li>Ingresá la clave y hacé clic en "Crear cuenta de administrador".</li>
            <li>Cerrá sesión y volvé a entrar — ya serás admin.</li>
          </ol>
        </div>

      </div>
    </div>
  )
}
