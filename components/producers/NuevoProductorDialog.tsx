"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"
import { Bot, Sparkles } from "lucide-react"
import { useSession } from "@/lib/auth/session"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { Button } from "@/components/ui/button"
import { ProducerForm } from "./ProducerForm"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CreateProducerInput } from "@/lib/schemas/producer"

interface NuevoProductorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function NuevoProductorDialog({ open, onOpenChange, onSuccess }: NuevoProductorDialogProps) {
  const { user } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [prefill, setPrefill] = useState<Partial<CreateProducerInput> | null>(null)
  const [reading, setReading] = useState(false)
  const afipInputRef = useRef<HTMLInputElement>(null)

  async function readAfip(file: File) {
    setReading(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo obtener el token de sesión")
      const data = new FormData()
      data.set("file", file)
      const res = await fetch("/api/credito-hub/afip-prefill", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "No se pudo leer el documento")

      const fields = payload.fields ?? {}
      const next: Partial<CreateProducerInput> = {
        taxId: fields.taxId,
        legalName: fields.legalName,
        personType: fields.personType,
        activity: fields.activity,
        province: fields.province,
        city: fields.city,
        address: fields.address,
        phone: fields.phone,
        email: fields.email,
      }
      setPrefill(next)
      const pct = Math.round((payload.confidence ?? 0) * 100)
      const warn = (payload.warnings ?? []) as string[]
      toast.success(`Datos leídos (confianza ${pct}%). Revisá y guardá para confirmar.`)
      if (warn.length > 0) toast.warning(warn[0])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al leer el documento")
    } finally {
      setReading(false)
      if (afipInputRef.current) afipInputRef.current.value = ""
    }
  }

  async function handleSubmit(data: CreateProducerInput) {
    if (!user) {
      toast.error("Debes estar autenticado para crear un productor")
      return
    }

    setIsLoading(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo obtener el token de sesión")

      const response = await fetch("/api/onboarding/system-user?createdByAccountant=true", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          organization: {
            legalName: data.legalName,
            taxId: data.taxId,
            personType: data.personType,
            activity: data.activity,
            province: data.province,
            city: data.city,
            address: data.address || undefined,
            phone: data.phone || undefined,
            email: data.email || undefined,
          },
          entities: [],
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error ?? "Error al crear el productor")
      }

      toast.success("Productor creado exitosamente")
      setPrefill(null)
      onOpenChange(false)
      onSuccess?.()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : "Error al crear el productor. Intentá de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setPrefill(null)
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva carpeta</DialogTitle>
        </DialogHeader>

        {/* Opcion A: leer la constancia AFIP con IA. Opcion B: cargar a mano abajo. */}
        <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Bot className="h-4 w-4 text-primary" />
            Completar con constancia de AFIP (IA)
          </div>
          <p className="text-xs text-muted-foreground">
            Subí el PDF o imagen de la constancia y la IA completa el formulario. Después revisás y guardás.
            También podés cargar los datos a mano más abajo.
          </p>
          <input
            ref={afipInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void readAfip(file)
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={reading}
            onClick={() => afipInputRef.current?.click()}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {reading ? "Leyendo documento..." : "Subir constancia AFIP"}
          </Button>
        </div>

        <ProducerForm prefillValues={prefill} onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  )
}
