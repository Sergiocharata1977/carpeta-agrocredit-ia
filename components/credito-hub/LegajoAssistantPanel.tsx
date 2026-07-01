"use client"

import { useRef, useState } from "react"
import {
  AlertTriangle,
  Bot,
  FileUp,
  PanelRightClose,
  Send,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { JobProgressList } from "@/components/credito-hub/JobProgressList"
import { UnassignedDocsTray } from "@/components/credito-hub/UnassignedDocsTray"
import { getFreshIdToken, getIdToken } from "@/lib/firebase/auth-client"

interface LegajoAssistantPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetOrganizationId: string
  rootOrganizationId: string
  clientName?: string
  carpetas: Array<{ orgId: string; label: string }>
  onUploaded?: () => void
  onAssigned?: () => void
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED = [
  "Que reviso aca?",
  "Resumen del legajo",
  "Checklist",
  "Que falta para certificar?",
  "Riesgos y alertas",
]

export function LegajoAssistantPanel({
  open,
  onOpenChange,
  targetOrganizationId,
  rootOrganizationId,
  clientName,
  carpetas,
  onUploaded,
  onAssigned,
}: LegajoAssistantPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mockNotice, setMockNotice] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  async function send(text: string) {
    const message = text.trim()
    if (!message || loading) return

    const history = messages.slice(-8)
    setMessages((prev) => [...prev, { role: "user", content: message }])
    setInput("")
    setLoading(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo validar la sesion")
      const res = await fetch(
        `/api/credito-hub/assistant/${encodeURIComponent(targetOrganizationId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ message, history }),
        },
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "No se pudo consultar al asistente")
      setMockNotice(Boolean(data.isMock))
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || "(sin respuesta)" }])
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Atencion: ${err instanceof Error ? err.message : "Error"}` },
      ])
    } finally {
      setLoading(false)
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    }
  }

  async function uploadFiles() {
    if (files.length === 0 || uploading) return
    setUploading(true)
    try {
      const token = await getIdToken()
      if (!token) throw new Error("Sesion no disponible")
      const data = new FormData()
      data.set("targetOrganizationId", targetOrganizationId)
      files.forEach((file) => data.append("files", file))
      const res = await fetch("/api/credito-hub/intake", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "x-staging-data": "true" },
        body: data,
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error ?? "No se pudo encolar la carga")
      const total = payload.jobIds?.length ?? 0
      const duplicates = payload.duplicateJobIds?.length ?? 0
      toast.success(
        duplicates > 0
          ? `${duplicates} archivo(s) ya estaban cargados. Se reutilizo el procesamiento.`
          : `${total} documento(s) encolados`,
      )
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Recibi los archivos y los deje en procesamiento. Cuando termine, revisa los campos extraidos antes de aplicarlos a la base.",
        },
      ])
      setFiles([])
      onUploaded?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error de carga")
    } finally {
      setUploading(false)
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        className="fixed right-6 top-40 z-40 h-14 w-14 rounded-xl bg-[#2b1d84] p-0 shadow-xl hover:bg-[#24166f]"
        onClick={() => onOpenChange(true)}
        aria-label="Abrir IA"
      >
        <Bot className="h-5 w-5" />
        <span className="sr-only">IA</span>
      </Button>
    )
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-[#263454] bg-[#0f172a] text-white shadow-2xl lg:sticky lg:top-0 lg:h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-2rem)] lg:rounded-2xl lg:border">
      <header className="border-b border-[#263454] px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold">
              <Bot className="h-4 w-4 text-[#a5b4fc]" />
              IA contextual
            </div>
            <p className="mt-1 text-xs text-slate-400">{clientName ?? "Legajo"} · panel operativo</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={() => onOpenChange(false)}
            aria-label="Cerrar IA"
          >
            <PanelRightClose className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <section className="rounded-lg border border-[#334155] bg-[#182235] p-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-[#a5b4fc]" />
            Asistente integrado en la pantalla
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Lee el legajo abierto, detecta faltantes, encola documentos y ayuda a preparar la informacion para revision.
          </p>
          <div className="mt-3 space-y-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="flex w-full items-center justify-between rounded-md border border-[#334155] px-3 py-2 text-left text-xs font-semibold text-white transition hover:bg-[#243149]"
              >
                {q}
                <span className="text-slate-400">›</span>
              </button>
            ))}
          </div>
        </section>

        {mockNotice && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 p-2 text-xs text-amber-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            IA en modo demo: falta configurar proveedor real.
          </div>
        )}

        <div ref={scrollRef} className="max-h-[36vh] space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#334155] px-3 py-6 text-center text-xs text-slate-400">
              Escribi una consulta o subi archivos para empezar.
            </p>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-8 bg-[#4f46e5] text-white"
                    : "mr-8 whitespace-pre-wrap bg-[#1f2937] text-slate-100"
                }`}
              >
                {m.content}
              </div>
            ))
          )}
          {loading && <p className="text-xs text-slate-400">Pensando...</p>}
        </div>

        <section className="rounded-lg border border-[#334155] bg-[#111827] p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Archivos para leer</p>
              <p className="text-xs text-slate-400">PDF, imagen, Excel, Word o ZIP.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-[#475569] bg-transparent text-white hover:bg-white/10"
              onClick={() => fileRef.current?.click()}
            >
              <FileUp className="mr-2 h-4 w-4" />
              Elegir
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
            className="hidden"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          />
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center gap-2 rounded-md bg-[#1f2937] px-2 py-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-white"
                    onClick={() => setFiles((prev) => prev.filter((item) => item !== file))}
                    aria-label="Quitar archivo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button type="button" className="w-full bg-[#4f46e5] hover:bg-[#4338ca]" onClick={uploadFiles} disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Encolando..." : "Encolar y leer con IA"}
              </Button>
            </div>
          )}
        </section>

        <div className="rounded-lg bg-white text-slate-950">
          <JobProgressList targetOrganizationId={targetOrganizationId} />
        </div>

        <div className="rounded-lg bg-white text-slate-950">
          <UnassignedDocsTray
            rootOrganizationId={rootOrganizationId}
            carpetas={carpetas}
            onAssigned={onAssigned}
          />
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        className="flex items-center gap-2 border-t border-[#263454] p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribi tu consulta..."
          className="min-w-0 flex-1 rounded-md border border-[#334155] bg-[#182235] px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#818cf8]"
        />
        <Button type="submit" size="icon" className="bg-[#be123c] hover:bg-[#9f1239]" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </aside>
  )
}
