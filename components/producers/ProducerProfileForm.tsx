"use client"

import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Save } from "lucide-react"
import { toast } from "sonner"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  upsertProducerProfileSchema,
  type UpsertProducerProfileInput,
} from "@/lib/schemas/producer-profile"
import { upsertProducerProfile } from "@/lib/services/producer-profile"
import type { OrganizationProfile, ProfileCurrency, TaxCondition } from "@/types/producer-profile"

interface ProducerProfileFormProps {
  organizationId: string
  profile: OrganizationProfile | null
  onSuccess: (profile: OrganizationProfile) => void
}

type ProfileFieldName = keyof UpsertProducerProfileInput & string

type TextFieldName = Extract<
  ProfileFieldName,
  | "taxCategory"
  | "estimatedProduction"
  | "currentCampaign"
  | "mainMachinery"
  | "activeLoans"
  | "ruralCards"
  | "commercialQuotas"
  | "summaryOwnFields"
  | "summaryMachinery"
  | "summaryVehicles"
  | "summarySiloBolsa"
  | "summaryLivestock"
>

type NumberFieldName = Extract<
  ProfileFieldName,
  | "registrationYear"
  | "employeesCount"
  | "ownHectares"
  | "rentedHectares"
  | "estimatedAnnualSales"
  | "bankDebts"
  | "issuedChecks"
  | "rejectedChecks"
>

type TagsFieldName = Extract<ProfileFieldName, "activitiesAfip" | "mainCrops">
type CurrencyFieldName = Extract<
  ProfileFieldName,
  "estimatedAnnualSalesCurrency" | "bankDebtsCurrency"
>

const TAX_LABELS: Record<TaxCondition, string> = {
  responsable_inscripto: "Responsable inscripto",
  monotributista: "Monotributista",
  exento: "Exento",
  consumidor_final: "Consumidor final",
  otro: "Otro",
}

function toNumber(value: string): number | undefined {
  if (value.trim() === "") return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function toDefaults(profile: OrganizationProfile | null): UpsertProducerProfileInput {
  return {
    taxCondition: profile?.taxCondition ?? "responsable_inscripto",
    taxCategory: profile?.taxCategory ?? "",
    activitiesAfip: profile?.activitiesAfip ?? [],
    registrationYear: profile?.registrationYear,
    hasEmployees: profile?.hasEmployees ?? false,
    employeesCount: profile?.employeesCount,
    ownHectares: profile?.ownHectares,
    rentedHectares: profile?.rentedHectares,
    mainCrops: profile?.mainCrops ?? [],
    estimatedProduction: profile?.estimatedProduction ?? "",
    currentCampaign: profile?.currentCampaign ?? "",
    mainMachinery: profile?.mainMachinery ?? "",
    estimatedAnnualSales: profile?.estimatedAnnualSales,
    estimatedAnnualSalesCurrency: profile?.estimatedAnnualSalesCurrency ?? "ARS",
    bankDebts: profile?.bankDebts,
    bankDebtsCurrency: profile?.bankDebtsCurrency ?? "ARS",
    issuedChecks: profile?.issuedChecks,
    rejectedChecks: profile?.rejectedChecks,
    activeLoans: profile?.activeLoans ?? "",
    ruralCards: profile?.ruralCards ?? "",
    commercialQuotas: profile?.commercialQuotas ?? "",
    summaryOwnFields: profile?.summaryOwnFields ?? "",
    summaryMachinery: profile?.summaryMachinery ?? "",
    summaryVehicles: profile?.summaryVehicles ?? "",
    summarySiloBolsa: profile?.summarySiloBolsa ?? "",
    summaryLivestock: profile?.summaryLivestock ?? "",
  }
}

export function ProducerProfileForm({
  organizationId,
  profile,
  onSuccess,
}: ProducerProfileFormProps) {
  const form = useForm<UpsertProducerProfileInput>({
    resolver: zodResolver(upsertProducerProfileSchema),
    defaultValues: toDefaults(profile),
  })

  const { control, formState, handleSubmit, register, reset, watch } = form
  const hasEmployees = watch("hasEmployees")

  useEffect(() => {
    reset(toDefaults(profile))
  }, [profile, reset])

  function getError(name: ProfileFieldName) {
    const error = formState.errors[name]
    return typeof error?.message === "string" ? error.message : null
  }

  function TextField({
    label,
    name,
    multiline = false,
  }: {
    label: string
    name: TextFieldName
    multiline?: boolean
  }) {
    const error = getError(name)
    return (
      <div className="space-y-2">
        <Label htmlFor={name}>{label}</Label>
        {multiline ? (
          <Textarea id={name} rows={3} {...register(name)} />
        ) : (
          <Input id={name} {...register(name)} />
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  function NumberField({ label, name }: { label: string; name: NumberFieldName }) {
    const error = getError(name)
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
              id={name}
              type="number"
              step="any"
              value={typeof field.value === "number" ? field.value : ""}
              onChange={(event) => field.onChange(toNumber(event.target.value))}
              onBlur={field.onBlur}
              ref={field.ref}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      />
    )
  }

  function TagsField({ label, name }: { label: string; name: TagsFieldName }) {
    const error = getError(name)
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Input
              id={name}
              value={Array.isArray(field.value) ? field.value.join(", ") : ""}
              onChange={(event) => field.onChange(splitTags(event.target.value))}
              onBlur={field.onBlur}
              ref={field.ref}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}
      />
    )
  }

  function CurrencyField({ label, name }: { label: string; name: CurrencyFieldName }) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <Select
              value={(field.value as ProfileCurrency | undefined) ?? "ARS"}
              onValueChange={(value) => field.onChange(value as ProfileCurrency)}
            >
              <SelectTrigger id={name} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ARS">ARS</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      />
    )
  }

  async function onSubmit(values: UpsertProducerProfileInput) {
    try {
      const saved = await upsertProducerProfile(organizationId, values)
      toast.success("Perfil guardado correctamente")
      onSuccess(saved)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el perfil")
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos fiscales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Controller
            control={control}
            name="taxCondition"
            render={({ field }) => (
              <div className="space-y-2">
                <Label htmlFor="taxCondition">Condicion fiscal</Label>
                <Select
                  value={(field.value as TaxCondition | undefined) ?? "responsable_inscripto"}
                  onValueChange={(value) => field.onChange(value as TaxCondition)}
                >
                  <SelectTrigger id="taxCondition" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TAX_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          />
          <TextField label="Categoria fiscal" name="taxCategory" />
          <NumberField label="Inicio de actividad" name="registrationYear" />
          <TagsField label="Actividades AFIP" name="activitiesAfip" />
          <div className="flex min-h-20 items-center justify-between rounded-md border px-3 py-2">
            <div>
              <Label htmlFor="hasEmployees">Tiene empleados</Label>
              <p className="text-xs text-muted-foreground">Habilita el control de formulario 931.</p>
            </div>
            <Controller
              control={control}
              name="hasEmployees"
              render={({ field }) => (
                <Switch
                  id="hasEmployees"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          {hasEmployees && <NumberField label="Cantidad de empleados" name="employeesCount" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos productivos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField label="Hectareas propias" name="ownHectares" />
          <NumberField label="Hectareas alquiladas" name="rentedHectares" />
          <TagsField label="Cultivos principales" name="mainCrops" />
          <TextField label="Campania actual" name="currentCampaign" />
          <TextField label="Produccion estimada" name="estimatedProduction" multiline />
          <TextField label="Maquinaria principal" name="mainMachinery" multiline />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos financieros estimados</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label="Ventas estimadas" name="estimatedAnnualSales" />
          <CurrencyField label="Moneda ventas" name="estimatedAnnualSalesCurrency" />
          <NumberField label="Deudas bancarias" name="bankDebts" />
          <CurrencyField label="Moneda deudas" name="bankDebtsCurrency" />
          <NumberField label="Cheques emitidos" name="issuedChecks" />
          <NumberField label="Cheques rechazados" name="rejectedChecks" />
          <TextField label="Prestamos vigentes" name="activeLoans" multiline />
          <TextField label="Tarjetas rurales" name="ruralCards" multiline />
          <TextField label="Cupos comerciales" name="commercialQuotas" multiline />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen patrimonial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextField label="Campos propios" name="summaryOwnFields" multiline />
          <TextField label="Maquinaria" name="summaryMachinery" multiline />
          <TextField label="Vehiculos" name="summaryVehicles" multiline />
          <TextField label="Silo bolsa / stock" name="summarySiloBolsa" multiline />
          <TextField label="Ganado" name="summaryLivestock" multiline />
        </CardContent>
      </Card>

      <Button type="submit" disabled={formState.isSubmitting} className="w-full gap-2">
        <Save className="h-4 w-4" />
        {formState.isSubmitting ? "Guardando..." : "Guardar perfil"}
      </Button>
    </form>
  )
}
