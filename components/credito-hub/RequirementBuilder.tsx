"use client"

import { useState } from "react"
import { toast } from "sonner"
import { FileUp, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getIdToken } from "@/lib/firebase/auth-client"
import type { BankRequirement, BankRequirementTemplate, RequirementResponsibleRole } from "@/types/bank-requirements"

const RESPONSIBLE_ROLES: RequirementResponsibleRole[] = ["CLIENT", "ACCOUNTANT", "BANK"]

function emptyRequirement(): BankRequirement {
  return {
    requirementCode: `REQ_${Date.now()}`,
    name: "",
    description: "",
    category: "GENERAL",
    required: true,
    acceptedFormats: ["PDF"],
    responsibleRole: "ACCOUNTANT",
    validationRules: [],
  }
}

export function RequirementBuilder() {
  const [file, setFile] = useState<File | null>(null)
  const [bankName, setBankName] = useState("")
  const [productName, setProductName] = useState("")
  const [template, setTemplate] = useState<BankRequirementTemplate | null>(null)
  const [saving, setSaving] = useState(false)

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
    setBankName(payload.template.bankName ?? bankName)
    setProductName(payload.template.productName ?? productName)
    toast.success("Propuesta creada")
  }

  function updateRequirement(index: number, patch: Partial<BankRequirement>) {
    if (!template || template.status === "published") return
    setTemplate({
      ...template,
      requirements: template.requirements.map((req, reqIndex) =>
        reqIndex === index ? { ...req, ...patch } : req,
      ),
    })
  }

  function updateListField(index: number, key: "acceptedFormats" | "validationRules", value: string) {
    updateRequirement(index, {
      [key]: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    } as Pick<BankRequirement, "acceptedFormats" | "validationRules">)
  }

  function addRequirement() {
    if (!template || template.status === "published") return
    setTemplate({ ...template, requirements: [...template.requirements, emptyRequirement()] })
  }

  function removeRequirement(index: number) {
    if (!template || template.status === "published") return
    setTemplate({ ...template, requirements: template.requirements.filter((_, reqIndex) => reqIndex !== index) })
  }

  async function saveDraft(): Promise<BankRequirementTemplate | null> {
    if (!template) return null
    const token = await getIdToken()
    if (!token) return null
    const data = new FormData()
    data.set("action", "update")
    data.set("templateId", template.id)
    data.set("bankName", bankName || template.bankName)
    data.set("productName", productName || (template.productName ?? ""))
    data.set("requirements", JSON.stringify(template.requirements))
    const res = await fetch("/api/credito-hub/bank-requirements", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    })
    const payload = await res.json()
    if (res.ok) {
      setTemplate(payload.template)
      toast.success("Borrador guardado")
      return payload.template
    }
    toast.error(payload.error ?? "No se pudo guardar el borrador")
    return null
  }

  async function publish() {
    if (!template) return
    setSaving(true)
    try {
      const current = template.status === "published" ? template : await saveDraft()
      if (!current) return
      const token = await getIdToken()
      if (!token) return
      const data = new FormData()
      data.set("action", "publish")
      data.set("templateId", current.id)
      const res = await fetch("/api/credito-hub/bank-requirements", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: data,
      })
      const payload = await res.json()
      if (res.ok) {
        setTemplate(payload.template)
        toast.success("Template publicado")
      } else {
        toast.error(payload.error ?? "No se pudo publicar")
      }
    } finally {
      setSaving(false)
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium">{template.bankName} - {template.productName ?? "Producto"}</p>
              <p className="text-xs text-muted-foreground">
                Estado: {template.status === "published" ? "publicado" : "borrador editable"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={addRequirement} disabled={template.status === "published"}>
                <Plus className="mr-1 h-4 w-4" />
                Requisito
              </Button>
              <Button size="sm" variant="outline" onClick={() => void saveDraft()} disabled={template.status === "published" || saving}>
                Guardar borrador
              </Button>
              <Button size="sm" onClick={publish} disabled={template.status === "published" || saving}>
                Publicar
              </Button>
            </div>
          </div>
          {template.requirements.map((req, index) => (
            <div key={`${req.requirementCode}-${index}`} className="space-y-3 rounded border p-3 text-sm">
              <div className="grid gap-2 md:grid-cols-[140px_1fr_160px_auto]">
                <Input
                  value={req.requirementCode}
                  onChange={(event) => updateRequirement(index, { requirementCode: event.target.value })}
                  disabled={template.status === "published"}
                  placeholder="Codigo"
                />
                <Input
                  value={req.name}
                  onChange={(event) => updateRequirement(index, { name: event.target.value })}
                  disabled={template.status === "published"}
                  placeholder="Nombre del requisito"
                />
                <Input
                  value={req.category}
                  onChange={(event) => updateRequirement(index, { category: event.target.value })}
                  disabled={template.status === "published"}
                  placeholder="Categoria"
                />
                <Button size="icon" variant="ghost" onClick={() => removeRequirement(index)} disabled={template.status === "published"} aria-label="Eliminar requisito">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={req.description}
                onChange={(event) => updateRequirement(index, { description: event.target.value })}
                disabled={template.status === "published"}
                placeholder="Descripcion"
              />
              <div className="grid gap-2 md:grid-cols-4">
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={req.required}
                    onChange={(event) => updateRequirement(index, { required: event.target.checked })}
                    disabled={template.status === "published"}
                  />
                  Obligatorio
                </label>
                <Input
                  type="number"
                  min={0}
                  value={req.periodCount ?? ""}
                  onChange={(event) => updateRequirement(index, { periodCount: event.target.value ? Number(event.target.value) : undefined })}
                  disabled={template.status === "published"}
                  placeholder="Periodos"
                />
                <Input
                  type="number"
                  min={0}
                  value={req.maxAgeMonths ?? ""}
                  onChange={(event) => updateRequirement(index, { maxAgeMonths: event.target.value ? Number(event.target.value) : undefined })}
                  disabled={template.status === "published"}
                  placeholder="Vigencia meses"
                />
                <select
                  className="h-9 rounded-md border bg-background px-3 text-sm"
                  value={req.responsibleRole}
                  onChange={(event) => updateRequirement(index, { responsibleRole: event.target.value as RequirementResponsibleRole })}
                  disabled={template.status === "published"}
                >
                  {RESPONSIBLE_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  value={req.acceptedFormats.join(", ")}
                  onChange={(event) => updateListField(index, "acceptedFormats", event.target.value)}
                  disabled={template.status === "published"}
                  placeholder="Formatos aceptados: PDF, XLSX"
                />
                <Input
                  value={req.validationRules.join(", ")}
                  onChange={(event) => updateListField(index, "validationRules", event.target.value)}
                  disabled={template.status === "published"}
                  placeholder="Reglas de validacion separadas por coma"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
