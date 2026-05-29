"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface WizardSuccessUsuarioProps {
  organizationId: string
  entityCount: number
}

export function WizardSuccessUsuario({ organizationId, entityCount }: WizardSuccessUsuarioProps) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Registro completo</h2>
          <p className="text-sm text-muted-foreground">
            Tu Usuario del sistema quedo activo con {entityCount} empresa{entityCount === 1 ? "" : "s"} vinculada
            {entityCount === 1 ? "" : "s"}.
          </p>
          <p className="text-xs text-muted-foreground">Organizacion: {organizationId}</p>
        </div>
        <Button asChild>
          <Link href="/app/usuario">Entrar al panel</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
