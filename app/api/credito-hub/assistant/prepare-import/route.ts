// POST /api/credito-hub/assistant/prepare-import
// Prepara una operación de importación sin escribir datos finales
// Body: { documentId, userIntent, resolvedEntities? }
// Response: { operationId, pendingActions, preview, message }

import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { writeAuditLog } from "@/lib/firebase/audit"
import { prepareImportFromIntent } from "@/lib/services/import-preparation"
import { savePreparedImportOperation } from "@/lib/services/assistant-pending-imports"
import { generateFieldPreview } from "@/lib/services/field-preview"
import { prepareBalanceImport } from "@/lib/services/import-operations"
import { pendingImportOperationSchema } from "@/lib/schemas/assistant"
import type { ExtractedDocumentData, PendingImportOperation } from "@/types/import-pending"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const db = getAdminDb()
    const body = await request.json()

    // Validar body
    const documentId = String(body.documentId ?? "")
    if (!documentId) {
      return Response.json({ error: "documentId requerido" }, { status: 400 })
    }

    // Obtener documento y su carpeta
    const docSnap = await db.collection(COLLECTIONS.DOCUMENTS).doc(documentId).get()
    if (!docSnap.exists) {
      return Response.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    const doc = docSnap.data() as any
    const folderOwnerOrganizationId = doc.folderOwnerOrganizationId || ""

    // Validar permiso (obtener folderOwnerOrganizationId del documento)
    const access = await assertCanManageAccountingFolder(session, folderOwnerOrganizationId)
    if (!access) {
      return Response.json({ error: "No tienes permiso para esta carpeta" }, { status: 403 })
    }

    // Obtener datos extraídos del documento
    const classSnap = await db
      .collection(COLLECTIONS.DOCUMENT_CLASSIFICATIONS)
      .where("documentId", "==", documentId)
      .limit(1)
      .get()

    const fieldsSnap = await db
      .collection(COLLECTIONS.EXTRACTED_FIELDS)
      .where("documentId", "==", documentId)
      .get()

    const extractedData: ExtractedDocumentData = {
      documentId,
      documentType: classSnap.docs[0]?.data()?.documentType || "unknown",
      fileName: doc.fileName,
      company: {
        name: classSnap.docs[0]?.data()?.issuer,
        cuit: classSnap.docs[0]?.data()?.cuit,
      },
      period: {
        start: classSnap.docs[0]?.data()?.period,
        end: classSnap.docs[0]?.data()?.issueDate,
      },
      confidence: classSnap.docs[0]?.data()?.confidence || 0,
      fields: fieldsSnap.docs.map((d) => {
        const data = d.data() as any
        return {
          fieldCode: data.fieldCode,
          fieldLabel: data.rawLabel,
          rawValue: data.rawValue,
          normalizedValue: data.normalizedValue,
          confidence: data.confidence,
          pageNumber: data.pageNumber,
          extractionMethod: data.extractionMethod,
          reviewStatus: data.reviewStatus,
          observation: data.correctionReason,
        }
      }),
    }

    // Preparar operación
    const userIntent = body.userIntent || { intent: "review_extraction", action: "show" }
    const resolvedEntities = body.resolvedEntities || {}

    const pendingOp = await prepareImportFromIntent(
      userIntent,
      extractedData,
      resolvedEntities,
      documentId,
      folderOwnerOrganizationId,
      db,
    )

    // Setear actor
    ;(pendingOp as any).preparedByUid = session.uid
    ;(pendingOp as any).preparedByOrganizationId = session.defaultOrganizationId

    // Validar schema
    const validated = pendingImportOperationSchema.parse(pendingOp)

    // Guardar en assistant_pending_imports
    await savePreparedImportOperation(db, validated as PendingImportOperation)

    // Generar preview
    const preview = await generateFieldPreview(extractedData)

    // Response
    return Response.json({
      operationId: pendingOp.operationId,
      pendingActions: pendingOp.actions,
      preview,
      message: `Operación preparada con ${pendingOp.actions.length} acciones. Revisa los datos antes de confirmar.`,
    })
  } catch (error) {
    console.error("[prepare-import]", error)
    if (error instanceof Error && error.name === "AuthError") {
      return getAuthErrorResponse(error)
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "Error al preparar" },
      { status: 500 },
    )
  }
}
