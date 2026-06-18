"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getIdToken } from "@/lib/firebase/auth-client"
import type { BankRequirementTemplate, RequirementMatch } from "@/types/bank-requirements"

interface ComplianceMatrixProps {
  targetOrganizationId: string
}

export function ComplianceMatrix({ targetOrganizationId }: ComplianceMatrixProps) {
  const [requirementTemplateId, setRequirementTemplateId] = useState("")
  const [templates, setTemplates] = useState<BankRequirementTemplate[]>([])
  const [matches, setMatches] = useState<RequirementMatch[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  const loadTemplates = useCallback(async () => {
    const token = await getIdToken()
    if (!token) return
    setLoadingTemplates(true)
    try {
      const res = await fetch("/api/credito-hub/bank-requirements", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error ?? "No se pudieron cargar los templates")
      const published = (payload.templates ?? []).filter(
        (template: BankRequirementTemplate) => template.status === "published",
      )
      setTemplates(published)
      setRequirementTemplateId((current) => current || published[0]?.id || "")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron cargar los templates")
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

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
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={requirementTemplateId} onValueChange={setRequirementTemplateId} disabled={loadingTemplates || templates.length === 0}>
          <SelectTrigger className="min-w-0 flex-1">
            <SelectValue placeholder={loadingTemplates ? "Cargando templates..." : "Seleccionar template publicado"} />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.bankName} - {template.productName ?? "Producto"} v{template.version}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={runMatch} disabled={!requirementTemplateId}>Cruzar</Button>
      </div>
      {!loadingTemplates && templates.length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          No hay templates publicados para tu entidad. Primero publicá uno desde Requisitos.
        </p>
      )}
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
