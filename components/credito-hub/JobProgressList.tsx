"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getIdToken } from "@/lib/firebase/auth-client"
import type { DocumentJob } from "@/types/credito-hub"

interface JobProgressListProps {
  targetOrganizationId: string
}

export function JobProgressList({ targetOrganizationId }: JobProgressListProps) {
  const [jobs, setJobs] = useState<DocumentJob[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)

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
      toast.success(done > 0 ? `${done} documento(s) procesados por la IA` : "No habia documentos pendientes")
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
          jobs.map((job) => (
            <div key={job.id} className="space-y-1 rounded-md border px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs">{job.documentId}</span>
                <div className="flex items-center gap-2">
                  {job.status === "failed" ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => void retryJob(job.id)}>
                      Reintentar
                    </Button>
                  ) : null}
                  <Badge variant={job.status === "failed" ? "destructive" : "secondary"}>{job.status}</Badge>
                </div>
              </div>
              {job.status === "failed" && job.error ? (
                <p className="line-clamp-2 text-xs text-destructive">{job.error}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
