"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
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

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 4000)
    return () => window.clearInterval(interval)
  }, [load])

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Procesamiento</h2>
        <Button type="button" variant="ghost" size="icon" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavia no hay jobs para este legajo.</p>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="truncate font-mono text-xs">{job.documentId}</span>
              <Badge variant={job.status === "failed" ? "destructive" : "secondary"}>{job.status}</Badge>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
