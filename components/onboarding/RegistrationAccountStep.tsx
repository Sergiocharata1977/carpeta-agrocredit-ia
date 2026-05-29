"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { registrationSchema } from "@/lib/schemas/onboarding"

const accountStepSchema = registrationSchema.omit({ role: true })
export type AccountStepValues = z.infer<typeof accountStepSchema>

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
  const form = useForm<AccountStepValues>({
    resolver: zodResolver(accountStepSchema),
    defaultValues: {
      displayName: defaultValues?.displayName ?? "",
      email: defaultValues?.email ?? "",
      password: defaultValues?.password ?? "",
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre y apellido</Label>
            <Input id="displayName" autoComplete="name" {...form.register("displayName")} />
            {form.formState.errors.displayName && (
              <p className="text-sm text-destructive">{form.formState.errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contrasena</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
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
