"use client"

import { Clock, Mail, ShieldCheck } from "lucide-react"

export function PendingApprovalScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mx-auto max-w-md space-y-6">
        <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-amber-50">
          <Clock className="size-10 text-amber-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Tu estudio está en revisión</h1>
          <p className="text-muted-foreground">
            La plataforma verifica los estudios contables antes de habilitarlos. Esto garantiza que solo contadores
            verificados puedan cargar información de clientes.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-left">
          <p className="mb-3 text-sm font-semibold text-amber-900">¿Qué pasa ahora?</p>
          <ul className="space-y-2.5 text-sm text-amber-800">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              El equipo de Legajo revisa los datos del estudio registrado.
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="mt-0.5 size-4 shrink-0" />
              Recibirás un email cuando tu cuenta sea habilitada o si se necesita información adicional.
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="mt-0.5 size-4 shrink-0" />
              El proceso suele tomar entre 24 y 48 horas hábiles.
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          ¿Tenés una consulta? Escribinos a{" "}
          <a href="mailto:soporte@legajo.app" className="underline">
            soporte@legajo.app
          </a>
        </p>
      </div>
    </div>
  )
}
