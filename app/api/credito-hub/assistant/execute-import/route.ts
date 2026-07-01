// POST /api/credito-hub/assistant/execute-import
// Ejecuta una operación confirmada
// Body: { operationId }
// Response: { success, createdEntityIds? }

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { executeConfirmedImport, getPendingImportOperation } from "@/lib/services/import-operations"
import { executeImportRequestSchema } from "@/lib/schemas/assistant"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const db = getAdminDb()
    const body = await request.json()

    // Validar body
    const validated = executeImportRequestSchema.parse(body)
    const operationId = validated.operationId

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

    // Validar que está confirmada
    if (pendingOp.status !== "confirmed") {
      return Response.json(
        {
          error: `Operación no puede ejecutarse en estado: ${pendingOp.status}. Debe estar confirmada.`,
        },
        { status: 400 },
      )
    }

    // Ejecutar
    const result = await executeConfirmedImport(
      db,
      operationId,
      pendingOp,
      session.uid,
      session.defaultOrganizationId || "",
    )

    if (!result.success) {
      return Response.json(
        { error: result.errors?.join(", ") || "Error al ejecutar" },
        { status: 500 },
      )
    }

    return Response.json({
      success: true,
      createdEntityIds: result.createdEntityIds,
    })
  } catch (error) {
    console.error("[execute-import]", error)
    if (error instanceof Error && error.name === "AuthError") {
      return getAuthErrorResponse(error)
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Error al ejecutar" },
      { status: 500 },
    )
  }
}
