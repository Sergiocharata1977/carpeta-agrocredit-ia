"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createProducerSchema, type CreateProducerInput } from "@/lib/schemas/producer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

interface ProducerFormProps {
  defaultValues?: Partial<CreateProducerInput>
  /** Valores propuestos por la IA (constancia AFIP). Al cambiar, repueblan el form. */
  prefillValues?: Partial<CreateProducerInput> | null
  onSubmit: (data: CreateProducerInput) => void
  isLoading?: boolean
}

const PERSON_TYPE_OPTIONS = [
  { value: "physical", label: "Persona Física" },
  { value: "legal", label: "Persona Jurídica" },
] as const

const ACTIVITY_OPTIONS = [
  { value: "agriculture", label: "Agricultura" },
  { value: "livestock", label: "Ganadería" },
  { value: "mixed", label: "Mixta" },
  { value: "horticulture", label: "Horticultura" },
  { value: "forestry", label: "Forestación" },
  { value: "other", label: "Otra" },
] as const

export function ProducerForm({
  defaultValues,
  prefillValues,
  onSubmit,
  isLoading = false,
}: ProducerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    getValues,
    formState: { errors },
  } = useForm<CreateProducerInput>({
    resolver: zodResolver(createProducerSchema),
    defaultValues,
  })

  // Cuando la IA propone valores, se repueblan los campos leidos sin pisar lo ya tipeado.
  useEffect(() => {
    if (!prefillValues) return
    const current = getValues()
    const merged = { ...current }
    for (const [key, value] of Object.entries(prefillValues)) {
      if (value !== undefined && value !== null && value !== "") {
        merged[key as keyof CreateProducerInput] = value as never
      }
    }
    reset(merged, { keepDefaultValues: true })
  }, [prefillValues, getValues, reset])

  const personTypeValue = watch("personType")
  const activityValue = watch("activity")

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* CUIT */}
      <div className="space-y-1.5">
        <Label htmlFor="taxId">
          CUIT <span className="text-destructive">*</span>
        </Label>
        <Input
          id="taxId"
          placeholder="Ej: 20123456789"
          {...register("taxId")}
          aria-invalid={!!errors.taxId}
        />
        {errors.taxId && (
          <p className="text-destructive text-xs">{errors.taxId.message}</p>
        )}
      </div>

      {/* Razón Social */}
      <div className="space-y-1.5">
        <Label htmlFor="legalName">
          Razón Social / Nombre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="legalName"
          placeholder="Ej: Juan Pérez / Agropecuaria del Sur S.A."
          {...register("legalName")}
          aria-invalid={!!errors.legalName}
        />
        {errors.legalName && (
          <p className="text-destructive text-xs">{errors.legalName.message}</p>
        )}
      </div>

      {/* Tipo de Persona */}
      <div className="space-y-1.5">
        <Label htmlFor="personType">
          Tipo de Persona <span className="text-destructive">*</span>
        </Label>
        <Select
          value={personTypeValue}
          onValueChange={(val) =>
            setValue("personType", val as CreateProducerInput["personType"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="personType" className="w-full" aria-invalid={!!errors.personType}>
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            {PERSON_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.personType && (
          <p className="text-destructive text-xs">{errors.personType.message}</p>
        )}
      </div>

      {/* Actividad */}
      <div className="space-y-1.5">
        <Label htmlFor="activity">
          Actividad Principal <span className="text-destructive">*</span>
        </Label>
        <Select
          value={activityValue}
          onValueChange={(val) =>
            setValue("activity", val as CreateProducerInput["activity"], {
              shouldValidate: true,
            })
          }
        >
          <SelectTrigger id="activity" className="w-full" aria-invalid={!!errors.activity}>
            <SelectValue placeholder="Seleccionar actividad..." />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.activity && (
          <p className="text-destructive text-xs">{errors.activity.message}</p>
        )}
      </div>

      {/* Provincia */}
      <div className="space-y-1.5">
        <Label htmlFor="province">
          Provincia <span className="text-destructive">*</span>
        </Label>
        <Input
          id="province"
          placeholder="Ej: Buenos Aires"
          {...register("province")}
          aria-invalid={!!errors.province}
        />
        {errors.province && (
          <p className="text-destructive text-xs">{errors.province.message}</p>
        )}
      </div>

      {/* Ciudad */}
      <div className="space-y-1.5">
        <Label htmlFor="city">
          Localidad <span className="text-destructive">*</span>
        </Label>
        <Input
          id="city"
          placeholder="Ej: Tandil"
          {...register("city")}
          aria-invalid={!!errors.city}
        />
        {errors.city && (
          <p className="text-destructive text-xs">{errors.city.message}</p>
        )}
      </div>

      {/* Domicilio */}
      <div className="space-y-1.5">
        <Label htmlFor="address">Domicilio</Label>
        <Input
          id="address"
          placeholder="Ej: Av. Rivadavia 1234"
          {...register("address")}
        />
      </div>

      {/* Teléfono */}
      <div className="space-y-1.5">
        <Label htmlFor="phone">Teléfono</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Ej: +54 9 11 1234-5678"
          {...register("phone")}
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="Ej: productor@ejemplo.com"
          {...register("email")}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-destructive text-xs">{errors.email.message}</p>
        )}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Spinner className="mr-2" />}
        Guardar productor
      </Button>
    </form>
  )
}
