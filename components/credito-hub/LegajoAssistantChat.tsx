"use client"

import { useRef, useState } from "react"
import { Bot, Send, Sparkles, AlertTriangle } from "lucide-react"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface LegajoAssistantChatProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetOrganizationId: string
  clientName?: string
}

interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED = [
  "Estado financiero",
  "¿Qué falta para certificar?",
  "Riesgos / alertas",
  "Resumen del legajo",
  "Capacidad de pago estimada",
]

export function LegajoAssistantChat({
  open,
  onOpenChange,
  targetOrganizationId,
  clientName,
}: LegajoAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [mockNotice, setMockNotice] = useState(false)
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
      if (!token) throw new Error("No se pudo validar la sesión")
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
        { role: "assistant", content: `⚠️ ${err instanceof Error ? err.message : "Error"}` },
      ])
    } finally {
      setLoading(false)
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] max-w-xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#0369a1]" />
            Asistente IA{clientName ? ` · ${clientName}` : ""}
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Asesora sobre este legajo (solo lectura). Responde según los datos cargados; no recomienda
          aprobar/rechazar crédito.
        </p>

        {mockNotice && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            IA en modo demo (sin API key): respuestas de ejemplo.
          </div>
        )}

        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Preguntas útiles:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="flex items-center gap-1 rounded-full border border-[#e4e8e3] px-3 py-1 text-xs font-medium text-[#0369a1] transition-colors hover:bg-[#f0f9ff]"
                >
                  <Sparkles className="h-3 w-3" />
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto py-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-[#0369a1] text-white"
                  : "mr-auto whitespace-pre-wrap bg-muted text-foreground"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && <p className="text-xs text-muted-foreground">Pensando…</p>}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t pt-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribí tu pregunta…"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
