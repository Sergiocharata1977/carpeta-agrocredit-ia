"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Banknote } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const SUBTYPES = [
  { value: "bank", label: "Banco" },
  { value: "financial_entity", label: "Financiera" },
  { value: "agro_company", label: "Empresa agropecuaria" },
  { value: "maquinaria_agricola", label: "Maquinaria agrícola" },
  { value: "insumos_agricolas", label: "Insumos agrícolas" },
]

export default function RegistroEntidadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [subtype, setSubtype] = useState("bank")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setConfirmError(null)

    const form = e.currentTarget
    const displayName = (form.elements.namedItem("displayName") as HTMLInputElement).value
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
    const password = (form.elements.namedItem("password") as HTMLInputElement).value
    const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value

    if (password !== confirmPassword) {
      setConfirmError("Las contraseñas no coinciden")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password, role: "requesting_entity", subtype }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al registrar")
      router.push("/login?registered=1")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar")
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
            <div className="flex size-10 items-center justify-center rounded-full bg-[#e5edf4] text-[#2f5d74]">
              <Banknote className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#2f5d74]">Financista / Empresa Agro</p>
              <h1 className="text-xl font-bold text-[#10221c]">Crear cuenta</h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de entidad</Label>
              <div className="grid grid-cols-2 gap-2">
                {SUBTYPES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setSubtype(s.value)}
                    className={`rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${
                      subtype === s.value
                        ? "border-[#2f5d74] bg-[#e5edf4] text-[#2f5d74]"
                        : "border-[#dde4dc] bg-white text-[#59675f] hover:border-[#2f5d74]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="displayName">Nombre / Razón social</Label>
              <Input id="displayName" name="displayName" placeholder="Banco Agro S.A." required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="contacto@entidad.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" minLength={8} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repetí la misma contraseña"
                minLength={8}
                required
              />
              {confirmError && (
                <p className="text-sm text-red-600">{confirmError}</p>
              )}
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#2f5d74] text-white hover:bg-[#274f63]"
            >
              {loading ? "Creando cuenta..." : "Registrar entidad"}
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
          Una vez dentro, completás los datos de la entidad y solicitás acceso a carpetas.
        </p>
      </div>
    </main>
  )
}
