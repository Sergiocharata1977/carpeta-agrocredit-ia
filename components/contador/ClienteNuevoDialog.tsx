"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
import { ReactNode, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getFirebaseAuth, getFreshIdToken } from "@/lib/firebase/auth-client"
import { systemUserOrgSchema } from "@/lib/schemas/onboarding"
import { ACTIVITY_OPTIONS, PERSON_TYPE_OPTIONS, postJson } from "@/components/onboarding/shared"

type ClienteNuevoValues = z.infer<typeof systemUserOrgSchema>

interface ClienteNuevoDialogProps {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onCreated?: (organizationId: string) => void
}

export function ClienteNuevoDialog({
  trigger,
  open,
  onOpenChange,
  onCreated,
}: ClienteNuevoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isOpen = open ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const form = useForm<ClienteNuevoValues>({
    resolver: zodResolver(systemUserOrgSchema),
    defaultValues: {
      legalName: "",
      taxId: "",
      personType: "legal",
      activity: "agriculture",
      province: "",
      city: "",
      phone: "",
      email: "",
    },
  })

  async function createClient(values: ClienteNuevoValues) {
    setLoading(true)
    setError(null)
    try {
      const auth = getFirebaseAuth()
      const user = auth?.currentUser
      if (!user) throw new Error("No se encontro una sesion activa")

      const idTokenResult = await user.getIdTokenResult()
      const accountingFirmId =
        typeof idTokenResult.claims.defaultOrganizationId === "string"
          ? idTokenResult.claims.defaultOrganizationId
          : null

      if (!accountingFirmId) {
        throw new Error("Tu sesion no tiene estudio contable por defecto")
      }

      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo validar la sesion")

      const response = await postJson<{ organizationId: string }>(
        "/api/onboarding/system-user?createdByAccountant=true",
        {
          organization: values,
          entities: [],
          accountant: {
            accountingFirmId,
            accountantUid: user.uid,
          },
        },
        token,
      )

      form.reset()
      setOpen(false)
      onCreated?.(response.organizationId)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "No se pudo crear el cliente")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button">
            <Plus className="mr-2 size-4" />
            Nuevo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar Usuario cliente</DialogTitle>
          <DialogDescription>
            Crea un system_user y deja el vinculo con tu estudio en estado activo.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 md:grid-cols-2" id="cliente-nuevo-form" onSubmit={form.handleSubmit(createClient)}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="clientLegalName">Razon social o nombre</Label>
            <Input id="clientLegalName" {...form.register("legalName")} />
            {form.formState.errors.legalName && (
              <p className="text-sm text-destructive">{form.formState.errors.legalName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientTaxId">CUIT</Label>
            <Input id="clientTaxId" inputMode="numeric" maxLength={11} {...form.register("taxId")} />
            {form.formState.errors.taxId && (
              <p className="text-sm text-destructive">{form.formState.errors.taxId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de persona</Label>
            <Select
              value={form.watch("personType")}
              onValueChange={(value) =>
                form.setValue("personType", value as ClienteNuevoValues["personType"], {
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
                form.setValue("activity", value as ClienteNuevoValues["activity"], {
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
            <Label htmlFor="clientProvince">Provincia</Label>
            <Input id="clientProvince" {...form.register("province")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientCity">Localidad</Label>
            <Input id="clientCity" {...form.register("city")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientPhone">Telefono</Label>
            <Input id="clientPhone" {...form.register("phone")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Email de contacto</Label>
            <Input id="clientEmail" type="email" {...form.register("email")} />
          </div>

          {error && <p className="text-sm text-destructive md:col-span-2">{error}</p>}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={loading} onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="cliente-nuevo-form" disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Crear cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
