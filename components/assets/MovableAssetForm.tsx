"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import { createAssetSchema } from "@/lib/schemas/assets"
import { createAsset, updateAsset } from "@/lib/services/assets"
import type { Asset, AssetType } from "@/types/assets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const MOVABLE_TYPES: { value: AssetType; label: string }[] = [
  { value: "vehicle", label: "Vehículo" },
  { value: "machinery", label: "Maquinaria" },
  { value: "livestock", label: "Hacienda" },
  { value: "other_movable", label: "Otro bien mueble" },
]

const movableAssetSchema = createAssetSchema
  .omit({
    province: true,
    city: true,
    address: true,
    hectares: true,
    cadastralRef: true,
    fiscalValuation: true,
  })
  .extend({
    assetType: z.enum(["vehicle", "machinery", "livestock", "other_movable"] as const),
    category: z.string().default("Bien mueble"),
  })

type MovableAssetFormValues = z.infer<typeof movableAssetSchema>

interface Props {
  producerId: string
  organizationId: string
  createdBy: string
  defaultValues?: Partial<Asset>
  onSuccess: () => void
}

export function MovableAssetForm({
  producerId,
  organizationId,
  createdBy,
  defaultValues,
  onSuccess,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!defaultValues?.id

  const defaultAssetType = (defaultValues?.assetType &&
    ["vehicle", "machinery", "livestock", "other_movable"].includes(
      defaultValues.assetType
    )
    ? defaultValues.assetType
    : "vehicle") as "vehicle" | "machinery" | "livestock" | "other_movable"

  const form = useForm<MovableAssetFormValues>({
    resolver: zodResolver(movableAssetSchema),
    defaultValues: {
      assetType: defaultAssetType,
      category: "Bien mueble",
      producerId,
      organizationId,
      description: defaultValues?.description ?? "",
      brand: defaultValues?.brand ?? "",
      model: defaultValues?.model ?? "",
      year: defaultValues?.year,
      identifier: defaultValues?.identifier ?? "",
      estimatedValue: defaultValues?.estimatedValue ?? 0,
      currency: defaultValues?.currency ?? "ARS",
      lienStatus: defaultValues?.lienStatus ?? "free",
      ownershipType: defaultValues?.ownershipType ?? "own",
      observations: defaultValues?.observations ?? "",
      documentIds: defaultValues?.documentIds ?? [],
    },
  })

  async function onSubmit(values: MovableAssetFormValues) {
    setIsSubmitting(true)
    try {
      if (isEditing && defaultValues?.id) {
        await updateAsset(defaultValues.id, values)
        toast.success("Bien mueble actualizado correctamente")
      } else {
        await createAsset(
          {
            ...values,
            producerId,
            organizationId,
            createdBy,
          },
          createdBy
        )
        toast.success("Bien mueble registrado correctamente")
      }
      onSuccess()
    } catch {
      toast.error("Ocurrió un error al guardar el bien mueble")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="assetType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de bien</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {MOVABLE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Tractor John Deere 6110J" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Marca (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: John Deere" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 6110J" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Año (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ej: 2020"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Identificador (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Dominio, chasis o N° serie" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="estimatedValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor estimado</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Moneda</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar moneda" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="ARS">ARS — Peso argentino</SelectItem>
                    <SelectItem value="USD">USD — Dólar estadounidense</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="lienStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado de gravamen</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="free">Libre</SelectItem>
                    <SelectItem value="mortgaged">Hipotecado</SelectItem>
                    <SelectItem value="pledged">Prendado</SelectItem>
                    <SelectItem value="seized">Embargado</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ownershipType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Titularidad</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar titularidad" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="own">Propio</SelectItem>
                    <SelectItem value="shared">Compartido</SelectItem>
                    <SelectItem value="leased">Arrendado</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre el bien..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "Guardando..."
              : isEditing
              ? "Guardar cambios"
              : "Agregar bien mueble"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
