import Link from "next/link"
import { Banknote, Calculator, Sprout } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const registrationOptions = [
  {
    title: "Soy productor/empresa",
    description: "Alta de Usuario del sistema, empresa principal y empresas vinculadas.",
    href: "/registro/usuario",
    icon: Sprout,
  },
  {
    title: "Soy contador",
    description: "Alta de estudio contable para administrar clientes y carpetas.",
    href: "/registro/contador",
    icon: Calculator,
  },
  {
    title: "Soy entidad financiera/comercial",
    description: "Alta de bancos, financieras, agro, maquinaria o insumos.",
    href: "/registro/entidad",
    icon: Banknote,
  },
]

export default function RegistroPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-surface)] px-4 py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="space-y-3">
          <p className="text-sm font-medium text-[var(--brand-primary)]">AgroCredit IA</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Elegir tipo de registro</h1>
          <p className="max-w-2xl text-muted-foreground">
            Cada alta crea la organizacion correspondiente en el modelo unificado de AgroCredit.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {registrationOptions.map((option) => {
            const Icon = option.icon
            return (
              <Card key={option.href} className="flex min-h-64 flex-col">
                <CardHeader className="space-y-4">
                  <div className="flex size-11 items-center justify-center rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                    <Icon className="size-5" />
                  </div>
                  <CardTitle className="text-xl">{option.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-6">
                  <p className="text-sm leading-6 text-muted-foreground">{option.description}</p>
                  <Button asChild className="w-full">
                    <Link href={option.href}>Continuar</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </main>
  )
}
