"use client"

import type React from "react"
import { Bot, PanelRightClose, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAssistantConversation } from "@/hooks/useAssistantConversation"
import { AssistantConversationFlow } from "./AssistantConversationFlow"

interface LegajoAssistantPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetOrganizationId?: string | null
  clientName?: string
  contextSelector?: React.ReactNode
  onUploaded?: () => void
}

export function LegajoAssistantPanel({
  open,
  onOpenChange,
  targetOrganizationId,
  clientName,
  contextSelector,
  onUploaded,
}: LegajoAssistantPanelProps) {
  if (!targetOrganizationId) {
    return null
  }

  const { context, uploadDocument, parseUserMessage, confirmImport, cancelImport } =
    useAssistantConversation(targetOrganizationId)

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
            <p className="mt-1 text-xs text-slate-400">{clientName ?? "Sin cliente seleccionado"} - asistente</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-200 hover:bg-white/10 hover:text-white"
            onClick={() => {
              onOpenChange(false)
              onUploaded?.()
            }}
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
            Asistente conversacional
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-300">
            Subi documentos y confirma antes de guardar. Sin automatismos: todo bajo control.
          </p>
          {contextSelector && <div className="mt-3">{contextSelector}</div>}
        </section>

        <div className="flex-1 rounded-lg border border-[#334155] bg-[#111827] p-4">
          <AssistantConversationFlow
            context={context}
            onUpload={uploadDocument}
            onMessage={parseUserMessage}
            onConfirm={confirmImport}
            onCancel={cancelImport}
          />
        </div>
      </div>
    </aside>
  )
}
