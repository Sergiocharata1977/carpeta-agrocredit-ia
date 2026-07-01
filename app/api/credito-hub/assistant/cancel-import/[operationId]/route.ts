// DELETE /api/credito-hub/assistant/cancel-import/[operationId]
// Cancela una operación pendiente
// Response: { success }

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { cancelImportOperation, getPendingImportOperation } from "@/lib/services/import-operations"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ operationId: string }> }) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const db = getAdminDb()
    const resolvedParams = await params
    const operationId = resolvedParams.operationId

    if (!operationId) {
      return Response.json({ error: "operationId requerido" }, { status: 400 })
    }

    // Obtener operación
    const pendingOp = await getPendingImportOperation(db, operationId)
    if (!pendingOp) {
      return Response.json({ error: "Operación no encontrada" }, { status: 404 })
    }

    // Validar que el usuario tiene acceso
    const access = await assertCanManageAccountingFolder(session, pendingOp.folderOwnerOrganizationId)
    if (!access) {
      return Response.json({ error: "No tienes acceso a esta operación" }, { status: 403 })
    }

    // Cancelar
    const reason = new URL(request.url).searchParams.get("reason") || "Cancelación por usuario"
    await cancelImportOperation(db, operationId, reason, session.uid)

    return Response.json({
      success: true,
    })
  } catch (error) {
    console.error("[cancel-import]", error)
    if (error instanceof Error && error.name === "AuthError") {
      return getAuthErrorResponse(error)
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Error al cancelar" },
      { status: 500 },
    )
  }
}
