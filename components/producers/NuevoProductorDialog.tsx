"use client"

import { useState } from "react"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/session"
import { createProducer } from "@/lib/services/producers"
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
    const organizationId = user.defaultOrganizationId
    if (!organizationId) {
      toast.error("No se encontró la organización del usuario")
      return
    }

    setIsLoading(true)
    try {
      await createProducer(
        { ...data, organizationId, folderStatus: "incomplete", createdBy: user.uid },
        user.uid,
      )
      toast.success("Productor creado exitosamente")
      onSuccess?.()
    } catch (err) {
      console.error(err)
      toast.error("Error al crear el productor. Intentá de nuevo.")
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
