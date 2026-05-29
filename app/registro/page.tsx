"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Banknote, Calculator, Sprout, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

// ─── tipos ────────────────────────────────────────────────────────────────────

type ModalType = "usuario" | "contador" | "entidad" | null

const SUBTYPES = [
  { value: "bank", label: "Banco" },
  { value: "financial_entity", label: "Financiera" },
  { value: "agro_company", label: "Empresa agropecuaria" },
  { value: "maquinaria_agricola", label: "Maquinaria agrícola" },
  { value: "insumos_agricolas", label: "Insumos agrícolas" },
]

const OPTIONS = [
  {
    type: "usuario" as ModalType,
    title: "Soy Productor / Cliente",
    description: "Solicitá financiamiento, autorizá accesos y seguí el estado de cada pedido.",
    icon: Sprout,
    accent: "#063c31",
    bg: "#dcefe5",
    image: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80",
  },
  {
    type: "contador" as ModalType,
    title: "Soy Contador",
    description: "Administrá carpetas de tus clientes y enviá información validada a financistas.",
    icon: Calculator,
    accent: "#b56f2b",
    bg: "#fff4e5",
    image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80",
  },
  {
    type: "entidad" as ModalType,
    title: "Soy Financista o empresa Agro",
    description: "Pedí acceso a carpetas, evaluá indicadores y gestioná crédito con permisos.",
    icon: Banknote,
    accent: "#2f5d74",
    bg: "#e5edf4",
    image: "https://images.unsplash.com/photo-1518186233392-c232efbf2373?auto=format&fit=crop&w=800&q=80",
  },
]

// ─── formulario reutilizable ──────────────────────────────────────────────────

function RegisterForm({
  role,
  accent,
  onClose,
}: {
  role: "usuario" | "contador" | "entidad"
  accent: string
  onClose: () => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subtype, setSubtype] = useState("bank")

  const apiRole =
    role === "usuario" ? "system_user" : role === "contador" ? "accounting_firm" : "requesting_entity"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const form = e.currentTarget
    const displayName = (form.elements.namedItem("displayName") as HTMLInputElement).value
    const email = (form.elements.namedItem("email") as HTMLInputElement).value
    const password = (form.elements.namedItem("password") as HTMLInputElement).value

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          password,
          role: apiRole,
          ...(role === "entidad" ? { subtype } : {}),
        }),
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
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {role === "entidad" && (
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
                    : "border-[#dde4dc] text-[#59675f] hover:border-[#2f5d74]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="reg-name">Nombre completo</Label>
        <Input id="reg-name" name="displayName" placeholder="Tu nombre" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" name="email" type="email" placeholder="tu@email.com" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Contraseña</Label>
        <Input
          id="reg-password"
          name="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          minLength={8}
          required
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full rounded-full text-white"
        style={{ backgroundColor: accent }}
      >
        {loading ? "Creando cuenta..." : "Crear cuenta"}
      </Button>

      <p className="text-center text-xs text-[#59675f]">
        Ya tenés cuenta?{" "}
        <Link href="/login" className="font-semibold underline" onClick={onClose}>
          Iniciar sesion
        </Link>
      </p>
    </form>
  )
}

// ─── modal ────────────────────────────────────────────────────────────────────

function Modal({
  open,
  option,
  onClose,
}: {
  open: boolean
  option: (typeof OPTIONS)[number] | null
  onClose: () => void
}) {
  if (!open || !option) return null
  const Icon = option.icon

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header con imagen */}
        <div className="relative h-32">
          <img src={option.image} alt={option.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute bottom-4 left-5 right-10 text-white">
            <div className="flex items-center gap-2">
              <div
                className="flex size-7 items-center justify-center rounded-full"
                style={{ backgroundColor: option.bg, color: option.accent }}
              >
                <Icon className="size-4" />
              </div>
              <p className="text-lg font-bold leading-tight">{option.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* formulario */}
        <div className="p-6">
          <RegisterForm
            role={option.type as "usuario" | "contador" | "entidad"}
            accent={option.accent}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function RegistroPage() {
  const [active, setActive] = useState<ModalType>(null)
  const activeOption = OPTIONS.find((o) => o.type === active) ?? null

  return (
    <>
      <main className="min-h-screen bg-[#f7f8f4] px-4 py-10">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[#59675f] hover:text-[#10221c]">
              ← Volver al inicio
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              ¿Con qué perfil querés entrar?
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Elegí tu rol para crear la cuenta. Los datos de tu organización los completás una vez adentro.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {OPTIONS.map((option) => {
              const Icon = option.icon
              return (
                <article
                  key={option.type}
                  className="overflow-hidden rounded-xl border border-[#dde4dc] bg-white shadow-sm transition hover:shadow-md cursor-pointer"
                  onClick={() => setActive(option.type)}
                >
                  <div className="relative h-44">
                    <img src={option.image} alt={option.title} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 text-white">
                      <p className="text-xl font-bold leading-tight">{option.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 p-5">
                    <p className="text-sm leading-6 text-[#59675f]">{option.description}</p>
                    <button
                      className="inline-flex h-10 items-center justify-center rounded-full text-sm font-bold text-white transition"
                      style={{ backgroundColor: option.accent }}
                    >
                      <Icon className="mr-2 size-4" />
                      Registrarme
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          <p className="text-center text-sm text-[#59675f]">
            Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-[#063c31] hover:underline">
              Iniciar sesion
            </Link>
          </p>
        </div>
      </main>

      <Modal open={active !== null} option={activeOption} onClose={() => setActive(null)} />
    </>
  )
}
