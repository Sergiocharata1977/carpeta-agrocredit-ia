"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import { createAssetSchema } from "@/lib/schemas/assets"
import { createAsset, updateAsset } from "@/lib/services/assets"
import type { Asset } from "@/types/assets"
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

// Schema derivado para inmuebles: assetType fijo en real_estate
const realEstateSchema = createAssetSchema.extend({
  assetType: z.literal("real_estate"),
  category: z.string().default("Inmueble"),
  province: z.string().min(1, "La provincia es requerida").max(100),
  city: z.string().min(1, "La ciudad es requerida").max(100),
})

type RealEstateFormValues = z.infer<typeof realEstateSchema>

interface Props {
  producerId: string
  organizationId: string
  createdBy: string
  defaultValues?: Partial<Asset>
  onSuccess: () => void
}

export function RealEstateAssetForm({
  producerId,
  organizationId,
  createdBy,
  defaultValues,
  onSuccess,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!defaultValues?.id

  const form = useForm<RealEstateFormValues>({
    resolver: zodResolver(realEstateSchema),
    defaultValues: {
      assetType: "real_estate",
      category: "Inmueble",
      producerId,
      organizationId,
      description: defaultValues?.description ?? "",
      province: defaultValues?.province ?? "",
      city: defaultValues?.city ?? "",
      address: defaultValues?.address ?? "",
      hectares: defaultValues?.hectares,
      cadastralRef: defaultValues?.cadastralRef ?? "",
      fiscalValuation: defaultValues?.fiscalValuation,
      estimatedValue: defaultValues?.estimatedValue ?? 0,
      currency: defaultValues?.currency ?? "ARS",
      lienStatus: defaultValues?.lienStatus ?? "free",
      ownershipType: defaultValues?.ownershipType ?? "own",
      ownershipPercentage: defaultValues?.ownershipPercentage,
      observations: defaultValues?.observations ?? "",
      documentIds: defaultValues?.documentIds ?? [],
    },
  })

  async function onSubmit(values: RealEstateFormValues) {
    setIsSubmitting(true)
    try {
      if (isEditing && defaultValues?.id) {
        await updateAsset(defaultValues.id, values)
        toast.success("Inmueble actualizado correctamente")
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
        toast.success("Inmueble registrado correctamente")
      }
      onSuccess()
    } catch {
      toast.error("Ocurrió un error al guardar el inmueble")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Campo agrícola zona norte" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="province"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provincia</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Córdoba" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ciudad / Localidad</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: Río Cuarto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Ruta 8 km 500" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hectares"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hectáreas (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Ej: 250.5"
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
            name="cadastralRef"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Referencia catastral (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ej: 14-01-00-003-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fiscalValuation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valuación fiscal (opcional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
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
        </div>

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
          name="ownershipPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Porcentaje de titularidad (opcional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  placeholder="Ej: 50"
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
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionales sobre el inmueble..."
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
              : "Agregar inmueble"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
