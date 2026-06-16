"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getIdToken } from "@/lib/firebase/auth-client"
import type { RequirementMatch } from "@/types/bank-requirements"

interface ComplianceMatrixProps {
  targetOrganizationId: string
}

export function ComplianceMatrix({ targetOrganizationId }: ComplianceMatrixProps) {
  const [requirementTemplateId, setRequirementTemplateId] = useState("")
  const [matches, setMatches] = useState<RequirementMatch[]>([])

  async function runMatch() {
    const token = await getIdToken()
    if (!token || !requirementTemplateId) return
    const appRes = await fetch("/api/credito-hub/credit-applications", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ targetOrganizationId, requirementTemplateId }),
    })
    const appPayload = await appRes.json()
    if (!appRes.ok) {
      toast.error(appPayload.error ?? "No se pudo crear solicitud")
      return
    }
    const matchRes = await fetch(`/api/credito-hub/bank-requirements/${requirementTemplateId}/match`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ creditApplicationId: appPayload.application.id }),
    })
    const matchPayload = await matchRes.json()
    if (!matchRes.ok) {
      toast.error(matchPayload.error ?? "No se pudo cruzar requisitos")
      return
    }
    setMatches(matchPayload.matches ?? [])
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h1 className="text-lg font-semibold">Matriz de cumplimiento</h1>
        <p className="text-sm text-muted-foreground">Cruza el template bancario contra el legajo autorizado.</p>
      </div>
      <div className="flex gap-2">
        <Input placeholder="ID del template publicado" value={requirementTemplateId} onChange={(event) => setRequirementTemplateId(event.target.value)} />
        <Button onClick={runMatch}>Cruzar</Button>
      </div>
      <div className="space-y-2">
        {matches.map((match) => (
          <div key={match.id} className="grid gap-2 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto_2fr]">
            <span className="font-medium">{match.requirementCode}</span>
            <Badge>{match.status}</Badge>
            <span className="text-muted-foreground">{match.explanation}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
