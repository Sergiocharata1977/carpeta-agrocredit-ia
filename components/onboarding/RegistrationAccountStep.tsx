"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registrationSchema } from "@/lib/schemas/onboarding"

const accountStepSchema = registrationSchema
  .omit({ role: true })
  .extend({ confirmPassword: z.string().min(1, "Repetí la contraseña") })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })

export type AccountStepValues = Omit<z.infer<typeof accountStepSchema>, "confirmPassword">

interface RegistrationAccountStepProps {
  title: string
  description: string
  submitLabel?: string
  defaultValues?: Partial<AccountStepValues>
  loading?: boolean
  onSubmit: (values: AccountStepValues) => Promise<void> | void
}

export function RegistrationAccountStep({
  title,
  description,
  submitLabel = "Continuar",
  defaultValues,
  loading,
  onSubmit,
}: RegistrationAccountStepProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm<z.infer<typeof accountStepSchema>>({
    resolver: zodResolver(accountStepSchema),
    defaultValues: {
      displayName: defaultValues?.displayName ?? "",
      email: defaultValues?.email ?? "",
      password: defaultValues?.password ?? "",
      confirmPassword: "",
    },
  })

  function handleSubmit({ confirmPassword: _, ...values }: z.infer<typeof accountStepSchema>) {
    return onSubmit(values)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>

          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre completo</Label>
            <Input
              id="displayName"
              autoComplete="name"
              placeholder="María López"
              {...form.register("displayName")}
            />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@ejemplo.com"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repetí la misma contraseña"
                className="pr-10"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
                aria-label={showConfirm ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {submitLabel}
          </Button>

        </form>
      </CardContent>
    </Card>
  )
}
