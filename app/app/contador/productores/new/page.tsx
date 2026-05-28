"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { useSession } from "@/lib/auth/session"
import { createProducer } from "@/lib/services/producers"
import { ProducerForm } from "@/components/producers/ProducerForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { CreateProducerInput } from "@/lib/schemas/producer"

export default function NuevoProductorPage() {
  const { user } = useSession()
  const router = useRouter()
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
        {
          ...data,
          organizationId,
          folderStatus: "incomplete",
          createdBy: user.uid,
        },
        user.uid,
      )
      toast.success("Productor creado exitosamente")
      router.push("/app/contador/productores")
    } catch (error) {
      console.error(error)
      toast.error("Error al crear el productor. Intentá de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/app/contador/productores">Volver</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nueva carpeta</h1>
          <p className="text-muted-foreground text-sm">
            Registrá los datos del productor agropecuario
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos del productor</CardTitle>
        </CardHeader>
        <CardContent>
          <ProducerForm onSubmit={handleSubmit} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
