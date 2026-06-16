"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getIdToken } from "@/lib/firebase/auth-client"
import type { BankRequirementTemplate } from "@/types/bank-requirements"

export function RequirementBuilder() {
  const [file, setFile] = useState<File | null>(null)
  const [bankName, setBankName] = useState("")
  const [productName, setProductName] = useState("")
  const [template, setTemplate] = useState<BankRequirementTemplate | null>(null)

  async function parse() {
    if (!file) return
    const token = await getIdToken()
    if (!token) return
    const data = new FormData()
    data.set("file", file)
    data.set("bankName", bankName || "Banco piloto")
    data.set("productName", productName)
    const res = await fetch("/api/credito-hub/bank-requirements", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    })
    const payload = await res.json()
    if (!res.ok) {
      toast.error(payload.error ?? "No se pudo parsear")
      return
    }
    setTemplate(payload.template)
    toast.success("Propuesta creada")
  }

  async function publish() {
    if (!template) return
    const token = await getIdToken()
    if (!token) return
    const data = new FormData()
    data.set("action", "publish")
    data.set("templateId", template.id)
    const res = await fetch("/api/credito-hub/bank-requirements", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    })
    const payload = await res.json()
    if (res.ok) {
      setTemplate(payload.template)
      toast.success("Template publicado")
    }
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h1 className="text-lg font-semibold">Requisitos bancarios</h1>
        <p className="text-sm text-muted-foreground">Subi un PDF para generar una plantilla editable.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Banco" value={bankName} onChange={(event) => setBankName(event.target.value)} />
        <Input placeholder="Producto" value={productName} onChange={(event) => setProductName(event.target.value)} />
      </div>
      <Input type="file" accept=".pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <Button onClick={parse} disabled={!file}>
        <FileUp className="mr-2 h-4 w-4" />
        Parsear PDF
      </Button>
      {template && (
        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-center justify-between">
            <p className="font-medium">{template.bankName} - {template.productName ?? "Producto"}</p>
            <Button size="sm" onClick={publish} disabled={template.status === "published"}>Publicar</Button>
          </div>
          {template.requirements.map((req) => (
            <div key={req.requirementCode} className="rounded border p-2 text-sm">
              <p className="font-medium">{req.name}</p>
              <p className="text-muted-foreground">{req.description}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
