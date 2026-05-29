"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, ArrowRight, Building2, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
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
import { systemUserEntitySchema } from "@/lib/schemas/onboarding"
import { ACTIVITY_OPTIONS } from "@/components/onboarding/shared"

export type SystemUserEntityValues = z.infer<typeof systemUserEntitySchema>

interface SystemUserEntitiesStepProps {
  defaultEntities?: SystemUserEntityValues[]
  onBack: () => void
  onSubmit: (entities: SystemUserEntityValues[]) => void
}

export function SystemUserEntitiesStep({
  defaultEntities = [],
  onBack,
  onSubmit,
}: SystemUserEntitiesStepProps) {
  const [entities, setEntities] = useState<SystemUserEntityValues[]>(defaultEntities)
  const form = useForm<SystemUserEntityValues>({
    resolver: zodResolver(systemUserEntitySchema),
    defaultValues: {
      legalName: "",
      taxId: "",
      activity: "agriculture",
      province: "",
      city: "",
    },
  })

  const addEntity = form.handleSubmit((values) => {
    setEntities((current) => [...current, values])
    form.reset({
      legalName: "",
      taxId: "",
      activity: "agriculture",
      province: "",
      city: "",
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Empresas vinculadas</CardTitle>
        <p className="text-sm text-muted-foreground">
          Agrega sociedades, campos o unidades operativas que pertenecen al mismo Usuario. Este paso se puede saltear.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {entities.length > 0 && (
          <div className="grid gap-3">
            {entities.map((entity, index) => (
              <div key={`${entity.taxId}-${index}`} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]">
                    <Building2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entity.legalName}</p>
                    <p className="text-xs text-muted-foreground">
                      CUIT {entity.taxId} - {entity.city}, {entity.province}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar empresa"
                  onClick={() => setEntities((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <form className="grid gap-4 md:grid-cols-2" onSubmit={addEntity}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="entityLegalName">Nombre de la empresa hija</Label>
            <Input id="entityLegalName" {...form.register("legalName")} />
            {form.formState.errors.legalName && (
              <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entityTaxId">CUIT</Label>
            <Input id="entityTaxId" inputMode="numeric" maxLength={11} {...form.register("taxId")} />
            {form.formState.errors.taxId && (
              <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Actividad</Label>
            <Select
              value={form.watch("activity")}
              onValueChange={(value) =>
                form.setValue("activity", value as SystemUserEntityValues["activity"], {
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
            <Label htmlFor="entityProvince">Provincia</Label>
            <Input id="entityProvince" {...form.register("province")} />
            {form.formState.errors.province && (
              <p className="text-sm text-destructive">{form.formState.errors.province.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="entityCity">Localidad</Label>
            <Input id="entityCity" {...form.register("city")} />
            {form.formState.errors.city && (
              <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
            )}
          </div>

          <div className="md:col-span-2">
            <Button type="submit" variant="outline">
              <Plus className="mr-2 size-4" />
              Agregar empresa
            </Button>
          </div>
        </form>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Button>
          <Button type="button" onClick={() => onSubmit(entities)}>
            Continuar
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
