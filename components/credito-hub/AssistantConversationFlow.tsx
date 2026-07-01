"use client"

import type React from "react"
import { useRef, useEffect } from "react"
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Download,
  Loader2,
  PlusCircle,
  Upload,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { AssistantContext } from "@/types/assistant-states"
import { AssistantConversationState } from "@/types/assistant-states"

interface AssistantConversationFlowProps {
  context: AssistantContext
  onUpload: (file: File) => Promise<void>
  onMessage: (message: string) => Promise<void>
  onConfirm: () => Promise<void>
  onCancel: () => Promise<void>
}

export function AssistantConversationFlow({
  context,
  onUpload,
  onMessage,
  onConfirm,
  onCancel,
}: AssistantConversationFlowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [context.messages])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void onUpload(file)
    }
    if (fileRef.current) {
      fileRef.current.value = ""
    }
  }

  const handleSendMessage = () => {
    const message = inputRef.current?.value?.trim()
    if (message) {
      void onMessage(message)
      if (inputRef.current) {
        inputRef.current.value = ""
      }
    }
  }

  const MessageThread = ({ maxHeight = "max-h-[240px]" }: { maxHeight?: string }) => {
    if (context.messages.length === 0) return null
    return (
      <div ref={scrollRef} className={`${maxHeight} space-y-3 overflow-y-auto pr-2`}>
        {context.messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg px-3 py-2 text-sm ${
              msg.role === "user"
                ? "ml-8 bg-[#4f46e5] text-white"
                : "mr-8 whitespace-pre-wrap bg-[#1f2937] text-slate-100"
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>
    )
  }

  // idle: esperando archivo
  if (context.state === AssistantConversationState.idle) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white">Subi un documento</h3>
          <p className="mt-2 text-sm text-slate-400">
            PDF, imagen, Excel o Word para que lo lea la IA
          </p>
        </div>
        <Button
          onClick={() => fileRef.current?.click()}
          className="bg-[#4f46e5] hover:bg-[#4338ca]"
        >
          <Upload className="mr-2 h-4 w-4" />
          Seleccionar archivo
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    )
  }

  // uploading: progreso de carga
  if (context.state === AssistantConversationState.uploading) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#4f46e5]" />
          <p className="text-sm text-slate-400">Subiendo archivo...</p>
        </div>
      </div>
    )
  }

  // processing: leyendo documento
  if (context.state === AssistantConversationState.processing) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#4f46e5]" />
          <p className="text-center text-sm text-slate-400">
            Estoy leyendo el documento con IA...
          </p>
        </div>
      </div>
    )
  }

  // document_analyzed: mostrar resumen y opciones
  if (context.state === AssistantConversationState.document_analyzed) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="rounded-lg border border-[#334155] bg-[#182235] p-4">
          <h4 className="font-semibold text-white">Documento analizado</h4>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">Tipo:</dt>
              <dd className="text-white">{context.detectedType ?? "Desconocido"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Empresa:</dt>
              <dd className="text-white">{context.detectedCompany?.name ?? "No detectada"}</dd>
            </div>
            {context.detectedCompany?.cuit && (
              <div className="flex justify-between">
                <dt className="text-slate-400">CUIT:</dt>
                <dd className="text-white">{context.detectedCompany.cuit}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-slate-400">Confianza:</dt>
              <dd className="text-white">
                {Math.round((context.extractedData?.confidence ?? 0) * 100)}%
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => void onMessage("Ingresar en este legajo")}
            className="w-full justify-start bg-[#334155] text-white hover:bg-[#425569]"
          >
            <ChevronRight className="mr-2 h-4 w-4" />
            Ingresar en este legajo
          </Button>
          <Button
            onClick={() => void onMessage("Crear empresa vinculada")}
            className="w-full justify-start bg-[#334155] text-white hover:bg-[#425569]"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Crear empresa vinculada
          </Button>
          <Button
            onClick={() => void onMessage("Solo resumir")}
            className="w-full justify-start bg-[#334155] text-white hover:bg-[#425569]"
          >
            <Download className="mr-2 h-4 w-4" />
            Solo resumir
          </Button>
        </div>
      </div>
    )
  }

  // awaiting_user_intent: chat esperando entrada
  if (context.state === AssistantConversationState.awaiting_user_intent) {
    return (
      <div className="flex h-full flex-col gap-4">
        <div
          ref={scrollRef}
          className="flex-1 space-y-3 overflow-y-auto pr-2"
        >
          {context.messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "ml-8 bg-[#4f46e5] text-white"
                  : "mr-8 whitespace-pre-wrap bg-[#1f2937] text-slate-100"
              }`}
            >
              {msg.content}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribí tu solicitud..."
            className="min-w-0 flex-1 rounded-md border border-[#334155] bg-[#182235] px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#818cf8]"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSendMessage()
              }
            }}
          />
          <Button
            onClick={handleSendMessage}
            size="icon"
            className="bg-[#4f46e5] hover:bg-[#4338ca]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  // resolving_entities: buscando entidades
  if (context.state === AssistantConversationState.resolving_entities) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-[#4f46e5]" />
          <p className="text-center text-sm text-slate-400">
            Buscando entidades...
          </p>
        </div>
      </div>
    )
  }

  // preparing_import: preparando carga (estado transitorio, muestra spinner)
  if (context.state === AssistantConversationState.preparing_import) {
    return (
      <div className="space-y-4">
        {context.messages.length > 0 && (
          <div className="max-h-[200px] space-y-3 overflow-y-auto pr-2">
            {context.messages.map((msg) => (
              <div
                key={msg.id}
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "ml-8 bg-[#4f46e5] text-white"
                    : "mr-8 whitespace-pre-wrap bg-[#1f2937] text-slate-100"
                }`}
              >
                {msg.content}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 rounded-lg border border-[#334155] bg-[#182235] p-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#4f46e5]" />
          <h4 className="font-semibold text-white">Preparando operación...</h4>
        </div>
      </div>
    )
  }

  // awaiting_review: mostrar tabla de campos
  if (context.state === AssistantConversationState.awaiting_review) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-[#334155] bg-[#182235] p-4">
          <h4 className="mb-3 font-semibold text-white">Vista previa de campos</h4>
          <div className="max-h-[40vh] space-y-2 overflow-y-auto pr-2">
            {context.extractedData?.fields?.slice(0, 10).map((field) => (
              <div
                key={field.fieldCode}
                className="flex items-center justify-between rounded border border-[#334155] bg-[#0f172a] px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-medium text-white">
                    {field.fieldLabel ?? field.fieldCode}
                  </p>
                  <p className="text-slate-400">
                    {String(field.normalizedValue ?? field.rawValue ?? "N/A")}
                  </p>
                </div>
                <span className="text-slate-500">
                  {Math.round(field.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => void onMessage("Revisar datos")}
            variant="outline"
            className="flex-1 border-[#334155] text-white hover:bg-white/10"
          >
            Revisar
          </Button>
          <Button
            onClick={() => void onMessage("Continuar")}
            className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca]"
          >
            Continuar
          </Button>
        </div>
      </div>
    )
  }

  // awaiting_confirmation: mostrar resumen y botones
  if (context.state === AssistantConversationState.awaiting_confirmation) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="rounded-lg border border-[#334155] bg-[#182235] p-4">
          <h4 className="mb-3 font-semibold text-white">Resumen de operación</h4>
          {context.pendingImport?.actions && (
            <ul className="space-y-2 text-sm">
              {context.pendingImport.actions.map((action) => (
                <li key={action.actionId} className="flex items-start gap-2 text-slate-400">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#4f46e5]" />
                  <span>
                    {action.type}: {action.targetEntityName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => void onConfirm()}
            className="bg-green-600 hover:bg-green-700"
          >
            Confirmar
          </Button>
          <Button
            onClick={() => void onCancel()}
            variant="outline"
            className="border-[#334155] text-white hover:bg-white/10"
          >
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>
    )
  }

  // executing_import: guardando
  if (context.state === AssistantConversationState.executing_import) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="text-center text-sm text-slate-400">
            Guardando datos...
          </p>
        </div>
      </div>
    )
  }

  // completed: éxito
  if (context.state === AssistantConversationState.completed) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="rounded-lg border border-green-600/30 bg-green-600/10 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-1 h-5 w-5 text-green-600 shrink-0" />
            <div>
              <h4 className="font-semibold text-green-300">Carga completada</h4>
              <dl className="mt-2 space-y-1 text-sm text-green-200/80">
                {context.executionSummary?.map((line) => (
                  <div key={line} className="flex gap-2">
                    <dt className="sr-only">Accion</dt>
                    <dd>{line}</dd>
                  </div>
                ))}
                <div className="flex justify-between">
                  <dt>Empresa:</dt>
                  <dd>{context.detectedCompany?.name ?? "N/A"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Campos:</dt>
                  <dd>{context.extractedData?.fields?.length ?? 0}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => void onCancel()}
            className="flex-1 bg-[#4f46e5] hover:bg-[#4338ca]"
          >
            Subir otro
          </Button>
          <Button
            onClick={() => void onCancel()}
            variant="outline"
            className="flex-1 border-[#334155] text-white hover:bg-white/10"
          >
            Volver
          </Button>
        </div>
      </div>
    )
  }

  // error: mostrar error
  if (context.state === AssistantConversationState.error) {
    return (
      <div className="space-y-4">
        <MessageThread />
        <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-1 h-5 w-5 text-red-600 shrink-0" />
            <div>
              <h4 className="font-semibold text-red-300">Error</h4>
              <p className="mt-1 text-sm text-red-200/80">{context.error ?? "Error desconocido"}</p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => void onCancel()}
          className="w-full bg-[#4f46e5] hover:bg-[#4338ca]"
        >
          Volver al inicio
        </Button>
      </div>
    )
  }

  return null
}
