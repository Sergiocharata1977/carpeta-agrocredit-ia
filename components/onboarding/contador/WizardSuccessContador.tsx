"use client"

import Link from "next/link"
import { CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface WizardSuccessContadorProps {
  organizationId: string
  orgStatus?: string
}

export function WizardSuccessContador({ organizationId, orgStatus = "pending_approval" }: WizardSuccessContadorProps) {
  if (orgStatus === "pending_approval") {
    return (
      <Card>
        <CardContent className="space-y-5 pt-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <Clock className="size-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Solicitud recibida</h2>
            <p className="text-sm text-muted-foreground">
              Tu estudio contable fue registrado y está en revisión. Te avisaremos por email cuando sea habilitado para operar.
            </p>
            <p className="text-xs text-muted-foreground">
              Solo los estudios habilitados por la plataforma pueden cargar información de clientes.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Mientras tanto podés ingresar a tu panel y revisar el estado de tu cuenta.
          </div>
          <Button asChild variant="outline">
            <Link href="/app/contador">Ir a mi panel</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-5 pt-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Estudio contable activo</h2>
          <p className="text-sm text-muted-foreground">
            Ya podés administrar clientes, vínculos y carpetas contables desde el panel privado.
          </p>
          <p className="text-xs text-muted-foreground">Organización: {organizationId}</p>
        </div>
        <Button asChild>
          <Link href="/app/contador">Entrar al panel</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
