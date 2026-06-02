"use client"

import Link from "next/link"
import { ShieldOff } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GrantExpiredBlocker() {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-50">
        <ShieldOff className="size-8 text-red-400" />
      </div>
      <div className="max-w-sm space-y-2">
        <h2 className="text-xl font-semibold">Sin acceso activo</h2>
        <p className="text-sm text-muted-foreground">
          No tenés un grant de acceso vigente para esta carpeta. El acceso puede haber vencido o
          sido revocado por el titular.
        </p>
      </div>
      <Button asChild variant="outline">
        <Link href="/app/entidad/accesos">Solicitar acceso</Link>
      </Button>
    </div>
  )
}
