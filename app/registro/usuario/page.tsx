"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Sprout, Eye, EyeOff } from "lucide-react"
import { loginAdmin, getFreshIdToken } from "@/lib/firebase/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RegistroUsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setConfirmError(null)

    const form = e.currentTarget
    const displayName = (form.elements.namedItem("displayName") as HTMLInputElement).value
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
    const password = (form.elements.namedItem("password") as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    if (password !== confirmPassword) {
      setConfirmError("Las contraseñas no coinciden — verificá que sean iguales")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password, role: "system_user" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al registrar")
      await loginAdmin(email, password)
      await getFreshIdToken()
      router.replace("/app")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al registrar"
      if (msg.includes("email") && msg.includes("registrado")) {
        setError("Ese email ya tiene una cuenta. ¿Querés iniciar sesión?")
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <Link
          href="/registro"
          className="inline-flex items-center gap-2 text-sm text-[#59675f] hover:text-[#10221c]"
        >
          <ArrowLeft className="size-4" /> Volver
        </Link>

        <div className="rounded-2xl border border-[#dde4dc] bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#dcefe5] text-[#063c31]">
              <Sprout className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#063c31]">Productor / Cliente</p>
              <h1 className="text-xl font-bold text-[#10221c]">Crear cuenta</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Nombre completo</Label>
              <Input id="displayName" name="displayName" placeholder="Juan García" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="juan@ejemplo.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59675f] hover:text-[#10221c]"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repetí la misma contraseña"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#59675f] hover:text-[#10221c]"
                  aria-label={showConfirm ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {confirmError && (
                <p className="text-sm text-red-600">{confirmError}</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                {error}
                {error.includes("iniciar sesión") && (
                  <Link href="/login" className="ml-1 underline font-semibold">Ir al login</Link>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#063c31] text-white hover:bg-[#0a4a3d]"
            >
              {loading ? "Creando cuenta..." : "Registrarme"}
            </Button>
          </form>

          <p className="text-center text-xs text-[#59675f]">
            Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-[#063c31] hover:underline">
              Iniciar sesion
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-[#59675f]">
          Una vez dentro, completás los datos de tu empresa y seleccionás tu contador.
        </p>
      </div>
    </main>
  )
}
