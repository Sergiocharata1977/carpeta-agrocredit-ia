// POST /api/credito-hub/assistant/parse-intent
// Parsea intención del usuario en lenguaje natural y resuelve entidades
// Body: { message, extractedData?, organizationId }
// Response: { intent, resolvedEntities, message, nextStep }

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { writeAuditLog } from "@/lib/firebase/audit"
import { parseUserIntent } from "@/lib/ai/assistant/intent-parser"
import { resolveIntentToOperations } from "@/lib/services/intent-resolution"
import { resolveAIProvider } from "@/lib/ai/provider-config"
import { AssistantConversationState } from "@/types/assistant-states"
import type { AssistantContext, ExtractedDocumentData } from "@/types/assistant-states"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const body = await request.json()
    const userMessage = String(body.message ?? "").trim()
    const organizationId = String(body.organizationId ?? "")

    if (!userMessage) {
      return Response.json({ error: "message requerido" }, { status: 400 })
    }
    if (!organizationId) {
      return Response.json({ error: "organizationId requerido" }, { status: 400 })
    }

    // Validar permiso sobre la carpeta
    const access = await assertCanManageAccountingFolder(session, organizationId)
    if (!access) {
      return Response.json({ error: "No tienes permiso sobre esta carpeta" }, { status: 403 })
    }

    const db = getAdminDb()
    const ai = await resolveAIProvider()

    // Construir contexto mínimo para el parser
    const extractedData: ExtractedDocumentData | undefined = body.extractedData ?? undefined
    const assistantContext: AssistantContext = {
      state: AssistantConversationState.awaiting_user_intent,
      messages: [],
      extractedData,
      detectedType: extractedData?.documentType as any,
      detectedCompany: extractedData?.company ? {
        name: extractedData.company.name ?? "",
        cuit: extractedData.company.cuit,
      } : undefined,
    }

    // Parsear intención
    const intent = await parseUserIntent(userMessage, assistantContext, ai)

    // Resolver entidades
    const resolution = await resolveIntentToOperations(
      intent,
      extractedData ?? { documentId: "", documentType: "other", confidence: 0, fields: [] },
      organizationId,
      session.defaultOrganizationId ?? "",
      db,
    )

    // Auditar
    await writeAuditLog({
      action: "assistant.intent_parsed",
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId ?? organizationId,
      targetType: "assistant",
      targetId: organizationId,
      metadata: {
        intent: intent.intent,
        nextStep: resolution.nextStep,
      },
    })

    return Response.json({
      intent,
      resolvedEntities: {
        relatedCompany: resolution.resolvedCompany,
        accountingFirm: resolution.resolvedAccount,
      },
      message: resolution.message,
      nextStep: resolution.nextStep,
    })
  } catch (error) {
    console.error("[parse-intent]", error)
    if (error instanceof Error && error.name === "AuthError") {
      return getAuthErrorResponse(error)
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Error al interpretar solicitud" },
      { status: 500 },
    )
  }
}
