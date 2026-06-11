"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ArrowRight, LockKeyhole, Sprout } from "lucide-react"
import { loginAdmin } from "@/lib/firebase/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

const loginSchema = z.object({
  email: z.string().email("Ingresa un email valido"),
  password: z.string().min(1, "Ingresa tu contrasena"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const { isSubmitting } = form.formState

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    try {
      await loginAdmin(values.email, values.password)
      router.replace("/app")
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      if (
        code === "auth/invalid-credential" ||
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-email"
      ) {
        setServerError("Email o contrasena incorrectos.")
      } else {
        setServerError("Ocurrio un error al ingresar. Intenta de nuevo.")
      }
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--brand-surface)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(111,132,246,0.18),transparent_24rem),radial-gradient(circle_at_bottom_right,rgba(6,60,49,0.16),transparent_28rem)]" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
        <section className="hidden rounded-[2rem] bg-[linear-gradient(180deg,rgba(6,60,49,0.9),rgba(6,60,49,0.72))] p-10 text-white shadow-[0_26px_60px_rgba(6,60,49,0.3)] lg:block">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <p className="text-3xl font-black tracking-tight">AgroCredit Hub</p>
              <p className="text-sm text-white/75">Plataforma privada de operacion agrofinanciera</p>
            </div>
          </div>
          <div className="mt-16 max-w-xl">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
              Acceso seguro para productores, entidades y administradores.
            </h1>
            <p className="mt-6 text-lg leading-8 text-white/82">
              Entra a un entorno unico para gestionar solicitudes, revisar cartera, administrar
              permisos y seguir toda la trazabilidad del sistema.
            </p>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {[
              "Carga de solicitudes de financiamiento",
              "Evaluacion y seguimiento por entidad",
              "Notificaciones y alertas operativas",
              "Auditoria y control de accesos",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/12 bg-white/8 px-5 py-4 backdrop-blur">
                <p className="text-sm font-semibold text-white/92">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <Link href="/" className="text-3xl font-black tracking-tight text-[var(--brand-green)]">
              AgroCredit Hub
            </Link>
          </div>
          <Card className="rounded-[2rem] border-[var(--brand-line)] bg-white/95 shadow-[0_24px_60px_rgba(17,33,50,0.12)] backdrop-blur">
            <CardHeader className="space-y-3 pb-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand-surface-strong)] text-[var(--brand-green)]">
                <LockKeyhole className="h-6 w-6" />
              </div>
              <CardTitle className="text-3xl font-bold tracking-tight text-[var(--brand-ink)]">
                Iniciar sesion
              </CardTitle>
              <CardDescription className="text-base leading-7 text-[var(--brand-muted)]">
                Usa las credenciales asignadas para acceder a tu panel operativo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[var(--brand-ink)]">Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="nombre@empresa.com"
                            autoComplete="email"
                            disabled={isSubmitting}
                            className="h-12 rounded-xl border-[var(--brand-line)] bg-[var(--brand-surface)]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[var(--brand-ink)]">Contrasena</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="••••••••"
                            autoComplete="current-password"
                            disabled={isSubmitting}
                            className="h-12 rounded-xl border-[var(--brand-line)] bg-[var(--brand-surface)]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {serverError ? (
                    <p className="rounded-xl border border-[#ffd2ce] bg-[#fff1ef] px-4 py-3 text-sm text-[#a32b2b]" role="alert">
                      {serverError}
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className="h-12 w-full rounded-xl bg-[var(--brand-green)] text-base font-semibold text-white hover:bg-[var(--brand-green)]/95"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Ingresando..." : "Ingresar"}
                  </Button>
                </form>
              </Form>

              <div className="mt-6 flex items-center justify-between text-sm text-[var(--brand-muted)]">
                <Link href="/" className="font-medium text-[var(--brand-green)] transition hover:opacity-80">
                  Volver al inicio
                </Link>
                <span className="inline-flex items-center gap-1 font-medium text-[var(--brand-blue)]">
                  Acceso seguro <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
