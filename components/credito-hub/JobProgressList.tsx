"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, FileSearch, RefreshCw, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getIdToken } from "@/lib/firebase/auth-client"
import type { DocumentJob, JobStatus } from "@/types/credito-hub"

interface JobProgressListProps {
  targetOrganizationId: string
}

type StatusMeta = {
  label: string
  description: string
  icon: typeof Clock
  iconClass: string
  badgeVariant: "default" | "secondary" | "destructive" | "outline"
}

export function JobProgressList({ targetOrganizationId }: JobProgressListProps) {
  const [jobs, setJobs] = useState<DocumentJob[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = await getIdToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`/api/credito-hub/jobs?targetOrganizationId=${targetOrganizationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json()
      if (res.ok) setJobs(payload.jobs ?? [])
    } finally {
      setLoading(false)
    }
  }, [targetOrganizationId])

  const pendingCount = jobs.filter((j) => j.status === "queued" || j.status === "stalled").length

  async function processWithAI() {
    const token = await getIdToken()
    if (!token) return
    setProcessing(true)
    try {
      const res = await fetch("/api/credito-hub/jobs/process-now", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ targetOrganizationId }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "No se pudo procesar")
      const done = (payload.processed ?? []).length
      const failed = (payload.processed ?? []).filter((item: { status?: string }) => item.status === "failed").length
      if (failed > 0) {
        toast.error(`${failed} documento(s) fallaron. Revisa el detalle en la lista.`)
      } else {
        toast.success(done > 0 ? `${done} documento(s) procesados por la IA` : "No habia documentos pendientes")
      }
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al procesar")
    } finally {
      setProcessing(false)
    }
  }

  async function retryJob(jobId: string) {
    const token = await getIdToken()
    if (!token) return
    try {
      const res = await fetch(`/api/credito-hub/jobs/${jobId}/retry`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "No se pudo reintentar")
      toast.success("Documento reencolado")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al reintentar")
    }
  }

  async function deleteJob(jobId: string) {
    const token = await getIdToken()
    if (!token) return
    setDeletingJobId(jobId)
    try {
      const res = await fetch(`/api/credito-hub/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "No se pudo eliminar")
      toast.success("Documento eliminado del procesamiento")
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al eliminar")
    } finally {
      setDeletingJobId(null)
    }
  }

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 4000)
    return () => window.clearInterval(interval)
  }, [load])

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Procesamiento</h2>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" onClick={processWithAI} disabled={processing || pendingCount === 0}>
            <Sparkles className="mr-2 h-4 w-4" />
            {processing ? "Procesando..." : `Procesar con IA${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavia no hay jobs para este legajo.</p>
        ) : (
          jobs.map((job) => {
            const meta = getStatusMeta(job.status)
            const Icon = meta.icon
            const isActive = ["preprocessing", "classifying", "extracting", "validating"].includes(job.status)
            return (
              <div key={job.id} className="space-y-3 rounded-md border px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className={`h-4 w-4 shrink-0 ${meta.iconClass}`} />
                      <span className="truncate font-medium">{job.fileName || job.documentId}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{job.statusMessage ?? meta.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {job.status === "failed" || job.status === "awaiting_review" ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => void retryJob(job.id)}>
                        {job.status === "failed" ? "Reintentar" : "Reprocesar"}
                      </Button>
                    ) : null}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isActive || deletingJobId === job.id}
                          aria-label="Eliminar documento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar documento</AlertDialogTitle>
                          <AlertDialogDescription>
                            Se borrara este item de procesamiento, su archivo fuente y los datos extraidos asociados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void deleteJob(job.id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                  </div>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>Intentos: {job.attempts}/{job.maxAttempts}</span>
                  <span>Proveedor: {job.provider}</span>
                  <span className="truncate">Doc: {job.documentId}</span>
                </div>
                {job.status === "failed" && job.error ? (
                  <p className="rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive">{humanizeError(job.error)}</p>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

function getStatusMeta(status: JobStatus): StatusMeta {
  const map = {
    queued: {
      label: "En cola",
      description: "El archivo fue recibido y espera que presiones Procesar con IA.",
      icon: Clock,
      iconClass: "text-sky-600",
      badgeVariant: "secondary",
    },
    preprocessing: {
      label: "Preparando",
      description: "La IA tomo el archivo y esta preparando la lectura.",
      icon: RefreshCw,
      iconClass: "text-sky-600",
      badgeVariant: "secondary",
    },
    classifying: {
      label: "Clasificando",
      description: "La IA esta identificando si es balance, resultados, IVA u otro documento.",
      icon: FileSearch,
      iconClass: "text-sky-600",
      badgeVariant: "secondary",
    },
    extracting: {
      label: "Extrayendo",
      description: "La IA esta buscando importes y datos para completar el legajo.",
      icon: Sparkles,
      iconClass: "text-sky-600",
      badgeVariant: "secondary",
    },
    validating: {
      label: "Validando",
      description: "El sistema esta guardando los campos encontrados y actualizando el perfil.",
      icon: CheckCircle2,
      iconClass: "text-sky-600",
      badgeVariant: "secondary",
    },
    awaiting_review: {
      label: "Revisar",
      description: "El procesamiento termino y necesita revision del contador antes de usar los datos.",
      icon: AlertCircle,
      iconClass: "text-amber-600",
      badgeVariant: "outline",
    },
    completed: {
      label: "Completo",
      description: "El documento fue procesado correctamente.",
      icon: CheckCircle2,
      iconClass: "text-emerald-600",
      badgeVariant: "default",
    },
    partially_completed: {
      label: "Parcial",
      description: "Se extrajo una parte de los datos; falta completar o revisar manualmente.",
      icon: AlertCircle,
      iconClass: "text-amber-600",
      badgeVariant: "outline",
    },
    stalled: {
      label: "Pausado",
      description: "El procesamiento quedo interrumpido. Volve a procesarlo con IA.",
      icon: Clock,
      iconClass: "text-amber-600",
      badgeVariant: "outline",
    },
    failed: {
      label: "Fallido",
      description: "El procesamiento fallo. Podes reintentar o eliminarlo y subirlo otra vez.",
      icon: AlertCircle,
      iconClass: "text-destructive",
      badgeVariant: "destructive",
    },
  } satisfies Record<JobStatus, StatusMeta>
  return map[status]
}

function humanizeError(error: string): string {
  if (error.includes("transicion invalida") || error.includes("transición inválida")) {
    return "El job fallo por una transicion interna vieja. Reintentalo; si vuelve a fallar, eliminalo y subi el archivo otra vez."
  }
  return error
}
