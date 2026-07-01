"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
  AssistantContext,
  AssistantMessage,
  ExtractedDocumentData,
  ParsedUserIntent,
  ResolvedEntity,
  PendingImportOperation,
} from "@/types/assistant-states"
import { AssistantConversationState } from "@/types/assistant-states"
import { getIdToken, getFreshIdToken } from "@/lib/firebase/auth-client"

interface UseAssistantConversationReturn {
  context: AssistantContext
  uploadDocument: (file: File) => Promise<void>
  parseUserMessage: (message: string) => Promise<void>
  reviewAndPrepare: () => Promise<void>
  showPreview: () => Promise<void>
  prepareForConfirmation: () => Promise<void>
  confirmImport: () => Promise<void>
  executeImport: () => Promise<void>
  cancelImport: () => Promise<void>
}

export function useAssistantConversation(targetOrganizationId: string): UseAssistantConversationReturn {
  const [context, setContext] = useState<AssistantContext>({
    state: AssistantConversationState.idle,
    messages: [],
  })

  // Transiciones de estado
  const transition = useCallback((newState: AssistantConversationState, update?: Partial<AssistantContext>) => {
    setContext((prev) => ({
      ...prev,
      state: newState,
      ...update,
    }))
  }, [])

  const addMessage = useCallback((role: "user" | "assistant", content: string, actionType?: string) => {
    setContext((prev) => ({
      ...prev,
      messages: [
        ...prev.messages,
        {
          id: `msg-${Date.now()}-${Math.random()}`,
          role,
          content,
          timestamp: new Date().toISOString(),
          actionType: actionType as any,
        },
      ],
    }))
  }, [])

  const uploadDocument = useCallback(
    async (file: File) => {
      if (context.state !== AssistantConversationState.idle) return

      try {
        transition(AssistantConversationState.uploading)
        addMessage("user", `Subiendo documento: ${file.name}`)
        addMessage("assistant", "Archivo recibido. Lo estoy leyendo con IA...")

        const token = await getIdToken()
        if (!token) throw new Error("Sesión no disponible")

        const formData = new FormData()
        formData.append("files", file)
        formData.append("targetOrganizationId", targetOrganizationId)

        // Enviar a intake
        const intakeRes = await fetch("/api/credito-hub/intake", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "x-staging-data": "true",
          },
          body: formData,
        })

        const intakeData = await intakeRes.json().catch(() => ({}))
        if (!intakeRes.ok) throw new Error(intakeData.error ?? "No se pudo subir el archivo")

        const jobIds = intakeData.jobIds ?? []
        const documentIds = intakeData.documentIds ?? []
        if (jobIds.length === 0) throw new Error("No se encoló ningún trabajo")
        if (documentIds.length === 0) throw new Error("No se pudo identificar el documento subido")
        const jobId = jobIds[0]
        const documentId = documentIds[0]

        addMessage("assistant", "Ya subí el archivo. Ahora lo estoy clasificando y extrayendo datos.")
        transition(AssistantConversationState.processing, { documentId })

        // Procesar documento
        const processRes = await fetch("/api/credito-hub/jobs/process-now", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ targetOrganizationId }),
        })

        const processData = await processRes.json().catch(() => ({}))
        if (!processRes.ok) throw new Error(processData.error ?? "No se pudo procesar el documento")

        // Esperar a que el job se complete
        const activeStatuses = new Set(["queued", "preprocessing", "classifying", "extracting", "validating", "processing"])
        let jobStatus = "processing"
        let attempts = 0
        let extractedData: ExtractedDocumentData | null = null

        while (activeStatuses.has(jobStatus) && attempts < 30) {
          await new Promise((resolve) => setTimeout(resolve, 1000))
          attempts++

          const statusRes = await fetch(`/api/credito-hub/jobs?targetOrganizationId=${encodeURIComponent(targetOrganizationId)}`, {
            headers: { Authorization: `Bearer ${token}` },
          })

          const statusData = await statusRes.json().catch(() => ({}))
          const currentJob = (statusData.jobs ?? []).find((j: any) => j.id === jobId)

          if (currentJob) {
            jobStatus = currentJob.status
            if (attempts === 1 || attempts % 5 === 0) {
              addMessage("assistant", `Sigo procesando el documento. Estado actual: ${currentJob.status}.`)
            }

            if (
              currentJob.status === "completed" ||
              currentJob.status === "awaiting_review" ||
              currentJob.status === "partially_completed"
            ) {
              // Cargar campos extraídos via review endpoint
              const fieldsRes = await fetch(
                `/api/credito-hub/review/${encodeURIComponent(targetOrganizationId)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              )
              const fieldsData = await fieldsRes.json().catch(() => ({ fields: [] }))
              // Filtrar solo los campos de este documento
              const docFields = (fieldsData.fields ?? []).filter(
                (f: any) => f.documentId === documentId
              )

              extractedData = {
                documentId,
                documentType: currentJob.detectedType ?? "other",
                fileName: file.name,
                confidence: currentJob.confidence ?? 0.75,
                fields: docFields,
                company: currentJob.company,
                period: currentJob.period,
                issueDate: currentJob.issueDate,
              }

              break
            }
          }
        }

        if (!extractedData) {
          throw new Error("Timeout esperando procesamiento del documento")
        }

        addMessage(
          "assistant",
          `Documento analizado:\n- Tipo: ${extractedData.documentType}\n- Empresa: ${extractedData.company?.name ?? "No detectada"}\n- CUIT: ${extractedData.company?.cuit ?? "N/A"}\n- Confianza: ${Math.round(extractedData.confidence * 100)}%\n\n¿Qué querés hacer con este documento? Podés elegir una opción o escribirme con tus palabras.`
        )

        transition(AssistantConversationState.document_analyzed, {
          documentId,
          fileName: file.name,
          extractedData,
          detectedType: extractedData.documentType as any,
          detectedCompany: extractedData.company?.name
            ? { name: extractedData.company.name, cuit: extractedData.company.cuit }
            : undefined,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido"
        addMessage("assistant", `Error: ${message}`)
        transition(AssistantConversationState.error, { error: message })
      }
    },
    [context.state, transition, addMessage, targetOrganizationId]
  )

  const parseUserMessage = useCallback(
    async (message: string) => {
      if (
        context.state !== AssistantConversationState.awaiting_user_intent &&
        context.state !== AssistantConversationState.document_analyzed
      )
        return

      try {
        addMessage("user", message)
        transition(AssistantConversationState.resolving_entities)
        addMessage("assistant", "Procesando tu solicitud...")

        const token = await getFreshIdToken()
        if (!token) throw new Error("Sesión no disponible")

        // Llamar al endpoint de intent parsing (asumiendo que existe en Ola 2)
        const intentRes = await fetch("/api/credito-hub/assistant/parse-intent", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message,
            extractedData: context.extractedData,
            organizationId: targetOrganizationId,
          }),
        })

        const intentData = await intentRes.json().catch(() => ({}))
        if (!intentRes.ok) throw new Error(intentData.error ?? "No se pudo interpretar tu solicitud")

        const parsedIntent: ParsedUserIntent = intentData.intent
        const resolvedEntities = intentData.resolvedEntities ?? {}

        addMessage("assistant", intentData.message ?? "Entendido tu solicitud.")

        transition(AssistantConversationState.preparing_import, {
          userIntent: parsedIntent,
          resolvedEntity: resolvedEntities.relatedCompany,
        })

        // Auto-avanzar: llamar a prepare-import y pasar a awaiting_confirmation
        addMessage("assistant", "Preparando operación...")

        const prepareRes = await fetch("/api/credito-hub/assistant/prepare-import", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: context.documentId,
            userIntent: parsedIntent,
            resolvedEntities: {
              relatedCompany: resolvedEntities.relatedCompany,
            },
          }),
        })

        const prepareData = await prepareRes.json().catch(() => ({}))
        if (!prepareRes.ok) throw new Error(prepareData.error ?? "No se pudo preparar la carga")

        const pendingImport: PendingImportOperation = {
          operationId: prepareData.operationId,
          folderOwnerOrganizationId: targetOrganizationId,
          documentId: context.documentId!,
          actions: prepareData.pendingActions ?? [],
          preparedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          preparedByUid: "current-user",
          preparedByOrganizationId: targetOrganizationId,
          status: "prepared",
        }

        const actionsSummary = pendingImport.actions.length > 0
          ? pendingImport.actions.map((a) => `- ${a.type}: ${a.targetEntityName}`).join("\n")
          : "- Operación sin acciones detalladas"

        addMessage(
          "assistant",
          `Operación preparada:\n\n${actionsSummary}\n\n¿Confirmas para ejecutar?`,
          "confirm"
        )

        transition(AssistantConversationState.awaiting_confirmation, { pendingImport })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido"
        addMessage("assistant", `Error: ${message}`)
        transition(AssistantConversationState.error, { error: message })
      }
    },
    [context, transition, addMessage, targetOrganizationId]
  )

  const reviewAndPrepare = useCallback(async () => {
    if (context.state !== AssistantConversationState.document_analyzed) return

    try {
      transition(AssistantConversationState.awaiting_user_intent)
      addMessage(
        "assistant",
        "¿Qué querés hacer con este documento?\n\nOpciones:\n1. Ingresar en el legajo actual\n2. Crear empresa vinculada\n3. Solo resumir"
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      addMessage("assistant", `Error: ${message}`)
      transition(AssistantConversationState.error, { error: message })
    }
  }, [context.state, transition, addMessage])

  const showPreview = useCallback(async () => {
    if (context.state !== AssistantConversationState.preparing_import) return

    try {
      transition(AssistantConversationState.awaiting_review)

      if (context.extractedData?.fields) {
        const previewLines = context.extractedData.fields
          .slice(0, 5)
          .map((f) => `- ${f.fieldLabel ?? f.fieldCode}: ${f.normalizedValue ?? f.rawValue}`)
          .join("\n")

        addMessage(
          "assistant",
          `Vista previa de campos extraídos:\n\n${previewLines}\n\n¿Continúo con estos datos o querés hacer cambios?`
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      addMessage("assistant", `Error: ${message}`)
      transition(AssistantConversationState.error, { error: message })
    }
  }, [context.state, transition, addMessage, context.extractedData])

  const prepareForConfirmation = useCallback(async () => {
    if (context.state !== AssistantConversationState.awaiting_review) return

    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesión no disponible")

      transition(AssistantConversationState.awaiting_confirmation)

      // Llamar a endpoint que prepara la operación
      const prepareRes = await fetch("/api/credito-hub/assistant/prepare-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: context.documentId,
          userIntent: context.userIntent,
          resolvedEntities: {
            relatedCompany: context.resolvedEntity,
          },
        }),
      })

      const prepareData = await prepareRes.json().catch(() => ({}))
      if (!prepareRes.ok) throw new Error(prepareData.error ?? "No se pudo preparar la carga")

      const pendingImport: PendingImportOperation = {
        operationId: prepareData.operationId,
        folderOwnerOrganizationId: targetOrganizationId,
        documentId: context.documentId!,
        actions: prepareData.pendingActions ?? [],
        preparedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        preparedByUid: "current-user", // Será llenado por API
        preparedByOrganizationId: targetOrganizationId,
        status: "prepared",
      }

      const actionsSummary = pendingImport.actions.map((a) => `- ${a.type}: ${a.targetEntityName}`).join("\n")

      addMessage(
        "assistant",
        `Operación preparada:\n\n${actionsSummary}\n\n¿Confirmas para ejecutar?`,
        "confirm"
      )

      transition(AssistantConversationState.awaiting_confirmation, { pendingImport })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      addMessage("assistant", `Error: ${message}`)
      transition(AssistantConversationState.error, { error: message })
    }
  }, [context, transition, addMessage, targetOrganizationId])

  const confirmImport = useCallback(async () => {
    if (context.state !== AssistantConversationState.awaiting_confirmation || !context.pendingImport) return

    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesión no disponible")

      const confirmRes = await fetch("/api/credito-hub/assistant/confirm-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationId: context.pendingImport.operationId,
        }),
      })

      const confirmData = await confirmRes.json().catch(() => ({}))
      if (!confirmRes.ok) throw new Error(confirmData.error ?? "No se pudo confirmar la operación")

      addMessage("assistant", "Operación confirmada. Ejecutando...")
      transition(AssistantConversationState.executing_import)

      const executeRes = await fetch("/api/credito-hub/assistant/execute-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationId: context.pendingImport.operationId,
        }),
      })

      const executeData = await executeRes.json().catch(() => ({}))
      if (!executeRes.ok) throw new Error(executeData.error ?? "No se pudo ejecutar la operaciÃ³n")

      addMessage(
        "assistant",
        `Listo. GuardÃ© la carga confirmada.\n- Empresa: ${context.detectedCompany?.name ?? "N/A"}\n- Campos detectados: ${context.extractedData?.fields.length ?? 0}\n\nPodÃ©s subir otro documento o seguir consultando.`
      )

      transition(AssistantConversationState.completed, { pendingImport: undefined })
      toast.success("Documento cargado exitosamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      addMessage("assistant", `Error al confirmar: ${message}`)
      transition(AssistantConversationState.error, { error: message })
    }
  }, [context, transition, addMessage])

  const executeImport = useCallback(async () => {
    if (context.state !== AssistantConversationState.executing_import || !context.pendingImport) return

    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesión no disponible")

      const executeRes = await fetch("/api/credito-hub/assistant/execute-import", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationId: context.pendingImport.operationId,
        }),
      })

      const executeData = await executeRes.json().catch(() => ({}))
      if (!executeRes.ok) throw new Error(executeData.error ?? "No se pudo ejecutar la operación")

      addMessage(
        "assistant",
        `Listo! Se cargó:\n- Empresa: ${context.detectedCompany?.name ?? "N/A"}\n- Campos: ${context.extractedData?.fields.length ?? 0}\n\n¿Querés subir otro o volver?`
      )

      transition(AssistantConversationState.completed, { pendingImport: undefined })
      toast.success("Documento cargado exitosamente")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      addMessage("assistant", `Error al ejecutar: ${message}`)
      transition(AssistantConversationState.error, { error: message })
    }
  }, [context, transition, addMessage])

  const cancelImport = useCallback(async () => {
    if (!context.pendingImport) return

    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("Sesión no disponible")

      const cancelRes = await fetch(
        `/api/credito-hub/assistant/cancel-import/${encodeURIComponent(context.pendingImport.operationId)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!cancelRes.ok) {
        const data = await cancelRes.json().catch(() => ({}))
        throw new Error(data.error ?? "No se pudo cancelar la operación")
      }

      addMessage("assistant", "Operación cancelada. Volvemos al inicio.")
      transition(AssistantConversationState.idle, {
        documentId: undefined,
        fileName: undefined,
        extractedData: undefined,
        detectedType: undefined,
        detectedCompany: undefined,
        userIntent: undefined,
        resolvedEntity: undefined,
        pendingImport: undefined,
        error: undefined,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error desconocido"
      addMessage("assistant", `Error al cancelar: ${message}`)
    }
  }, [context.pendingImport, transition, addMessage])

  return {
    context,
    uploadDocument,
    parseUserMessage,
    reviewAndPrepare,
    showPreview,
    prepareForConfirmation,
    confirmImport,
    executeImport,
    cancelImport,
  }
}
