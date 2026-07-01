// POST /api/credito-hub/assistant/confirm-import
// Marca una operación preparada como confirmada
// Body: { operationId }
// Response: { success, operationId }

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { markImportOperationConfirmed } from "@/lib/services/assistant-pending-imports"
import { getPendingImportOperation } from "@/lib/services/import-operations"
import { confirmImportRequestSchema } from "@/lib/schemas/assistant"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const db = getAdminDb()
    const body = await request.json()

    // Validar body
    const validated = confirmImportRequestSchema.parse(body)
    const operationId = validated.operationId

    // Obtener operación
    const pendingOp = await getPendingImportOperation(db, operationId)
    if (!pendingOp) {
      return Response.json({ error: "Operación no encontrada" }, { status: 404 })
    }

    // Validar que el usuario tiene acceso al legajo
    const access = await assertCanManageAccountingFolder(session, pendingOp.folderOwnerOrganizationId)
    if (!access) {
      return Response.json({ error: "No tienes acceso a esta operación" }, { status: 403 })
    }

    // Marcar como confirmada
    await markImportOperationConfirmed(db, operationId, session.uid)

    return Response.json({
      success: true,
      operationId,
    })
  } catch (error) {
    console.error("[confirm-import]", error)
    if (error instanceof Error && error.name === "AuthError") {
      return getAuthErrorResponse(error)
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Error al confirmar" },
      { status: 500 },
    )
  }
}
