"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Calculator, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getFreshIdToken } from "@/lib/firebase/auth-client"

export default function OnboardingContadorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const form = e.currentTarget
    const legalName = (form.elements.namedItem("legalName") as HTMLInputElement).value.trim()
    const taxId = (form.elements.namedItem("taxId") as HTMLInputElement).value.trim().replace(/[-\s]/g, "")
    const contactName = (form.elements.namedItem("contactName") as HTMLInputElement).value.trim()
    const contactPhone = (form.elements.namedItem("contactPhone") as HTMLInputElement).value.trim()

    if (!/^\d{11}$/.test(taxId)) {
      setError("El CUIT debe tener 11 dígitos sin guiones (ej: 20123456789)")
      return
    }

    setLoading(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No hay sesión activa. Volvé a iniciar sesión.")

      const res = await fetch("/api/onboarding/accounting-firm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firm: {
            legalName,
            taxId,
            contactName,
            contactPhone: contactPhone || undefined,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Error al registrar el estudio")

      // Force token refresh so new claims (roles, orgStatus) are picked up
      await getFreshIdToken()

      router.replace("/app/contador")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="rounded-2xl border border-[#dde4dc] bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#fff4e5] text-[#b56f2b]">
              <Calculator className="size-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#b56f2b]">
                Paso 2 de 2
              </p>
              <h1 className="text-xl font-bold text-[#10221c]">Datos del estudio contable</h1>
            </div>
          </div>

          <p className="text-sm text-[#59675f]">
            Completá los datos de tu estudio o firma contable. Una vez registrado, el equipo
            de la plataforma verificará los datos y habilitará tu cuenta.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="legalName">
                <Building2 className="inline size-3.5 mr-1 opacity-60" />
                Razón social del estudio
              </Label>
              <Input
                id="legalName"
                name="legalName"
                placeholder="Estudio Contable García & Asociados"
                required
                minLength={3}
                maxLength={120}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxId">CUIT (sin guiones)</Label>
              <Input
                id="taxId"
                name="taxId"
                placeholder="20123456789"
                required
                pattern="\d{11}"
                title="11 dígitos sin guiones"
              />
              <p className="text-xs text-[#59675f]">Ingresá los 11 dígitos sin guiones ni espacios</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactName">Nombre del titular / responsable</Label>
              <Input
                id="contactName"
                name="contactName"
                placeholder="Carlos García"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contactPhone">
                Teléfono de contacto{" "}
                <span className="text-xs font-normal text-[#59675f]">(opcional)</span>
              </Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                type="tel"
                placeholder="+54 9 11 1234-5678"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-[#063c31] text-white hover:bg-[#063c31]/90"
            >
              {loading ? "Registrando estudio..." : "Registrar estudio y solicitar acceso"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#59675f]">
          Tu cuenta quedará en revisión hasta que el equipo de la plataforma la habilite.
          Suele tardar entre 24 y 48 horas hábiles.
        </p>
      </div>
    </main>
  )
}
