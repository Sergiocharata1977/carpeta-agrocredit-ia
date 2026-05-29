"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { systemUserOrgSchema } from "@/lib/schemas/onboarding"
import { ACTIVITY_OPTIONS, PERSON_TYPE_OPTIONS } from "@/components/onboarding/shared"

export type SystemUserOrgValues = z.infer<typeof systemUserOrgSchema>

interface SystemUserOrganizationFormProps {
  defaultValues?: Partial<SystemUserOrgValues>
  onBack: () => void
  onSubmit: (values: SystemUserOrgValues) => void
}

export function SystemUserOrganizationForm({
  defaultValues,
  onBack,
  onSubmit,
}: SystemUserOrganizationFormProps) {
  const form = useForm<SystemUserOrgValues>({
    resolver: zodResolver(systemUserOrgSchema),
    defaultValues: {
      legalName: defaultValues?.legalName ?? "",
      taxId: defaultValues?.taxId ?? "",
      personType: defaultValues?.personType ?? "legal",
      activity: defaultValues?.activity ?? "agriculture",
      province: defaultValues?.province ?? "",
      city: defaultValues?.city ?? "",
      phone: defaultValues?.phone ?? "",
      email: defaultValues?.email ?? "",
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresa principal</CardTitle>
        <p className="text-sm text-muted-foreground">
          Estos datos identifican al Usuario del sistema y su carpeta contable raiz.
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="legalName">Razon social o nombre</Label>
              <Input id="legalName" {...form.register("legalName")} />
              {form.formState.errors.legalName && (
                <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxId">CUIT</Label>
              <Input id="taxId" inputMode="numeric" maxLength={11} {...form.register("taxId")} />
              {form.formState.errors.taxId && (
                <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo de persona</Label>
              <Select
                value={form.watch("personType")}
                onValueChange={(value) =>
                  form.setValue("personType", value as SystemUserOrgValues["personType"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERSON_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Actividad</Label>
              <Select
                value={form.watch("activity")}
                onValueChange={(value) =>
                  form.setValue("activity", value as SystemUserOrgValues["activity"], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input id="province" {...form.register("province")} />
              {form.formState.errors.province && (
                <p className="text-sm text-destructive">{form.formState.errors.province.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">Localidad</Label>
              <Input id="city" {...form.register("city")} />
              {form.formState.errors.city && (
                <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input id="phone" {...form.register("phone")} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organizationEmail">Email de contacto</Label>
              <Input id="organizationEmail" type="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 size-4" />
              Volver
            </Button>
            <Button type="submit">
              Continuar
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
