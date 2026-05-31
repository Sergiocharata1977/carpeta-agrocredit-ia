"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/session"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva carpeta</DialogTitle>
        </DialogHeader>
        <ProducerForm onSubmit={handleSubmit} isLoading={isLoading} />
      </DialogContent>
    </Dialog>
  )
}
