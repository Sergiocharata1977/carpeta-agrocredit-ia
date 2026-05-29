"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface WizardSuccessEntidadProps {
  organizationId: string
}

export function WizardSuccessEntidad({ organizationId }: WizardSuccessEntidadProps) {
  return (
    <Card>
      <CardContent className="space-y-5 pt-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Entidad activa</h2>
          <p className="text-sm text-muted-foreground">
            Ya podes solicitar accesos y operar creditos desde el panel privado.
          </p>
          <p className="text-xs text-muted-foreground">Organizacion: {organizationId}</p>
        </div>
        <Button asChild>
          <Link href="/app/entidad">Entrar al panel</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
