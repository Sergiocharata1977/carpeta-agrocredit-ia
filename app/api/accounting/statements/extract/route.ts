import { NextRequest } from "next/server"
import { getAdminStorage, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import {
  verifyRequestSession,
  requireActiveOrg,
  getAuthErrorResponse,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { getFinancialStatementOCRProvider } from "@/lib/ocr"
import { createStatementImport } from "@/lib/services/statement-imports-admin"
import { extractStatementSchema } from "@/lib/schemas/statement-imports"
import { FieldValue } from "firebase-admin/firestore"
import { randomUUID } from "crypto"
import { z } from "zod"

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

const MAX_SIZE_PDF_IMAGE = 10 * 1024 * 1024  // 10 MB
const MAX_SIZE_EXCEL    = 5  * 1024 * 1024  //  5 MB

function isExcel(mime: string) {
  return mime.includes("excel") || mime.includes("spreadsheetml")
}

export async function POST(request: NextRequest) {
  let storagePath: string | null = null

  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const producerId = formData.get("producerId") as string | null
    const periodId   = formData.get("periodId")   as string | null
    const kind       = formData.get("kind")        as string | null
    const currency   = (formData.get("currency")   as string | null) ?? "ARS"

    if (!file) return Response.json({ error: "Archivo requerido" }, { status: 400 })

    const fields = extractStatementSchema.parse({ producerId, periodId, kind, currency })

    const mimeType = file.type
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return Response.json({ error: `Tipo de archivo no permitido: ${mimeType}` }, { status: 400 })
    }

    const maxSize = isExcel(mimeType) ? MAX_SIZE_EXCEL : MAX_SIZE_PDF_IMAGE
    if (file.size > maxSize) {
      return Response.json({
        error: `Archivo muy grande. Límite: ${Math.round(maxSize / 1024 / 1024)} MB`,
      }, { status: 400 })
    }

    // Verificar acceso a la carpeta
    const { folderOwnerOrganizationId, accountingFirmId } =
      await assertCanManageAccountingFolder(session, fields.producerId)

    const buffer = Buffer.from(await file.arrayBuffer())
    const uuid = randomUUID()
    const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    storagePath = `orgs/${folderOwnerOrganizationId}/producers/${fields.producerId}/periods/${fields.periodId}/statement-imports/${uuid}-${safeFilename}`

    // Subir a Storage
    const storage = getAdminStorage()
    const bucket = storage.bucket()
    const fileRef = bucket.file(storagePath)
    await fileRef.save(buffer, { contentType: mimeType, resumable: false })

    // Registrar documento fuente
    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()
    const docRef = db.collection(COLLECTIONS.DOCUMENTS).doc()
    await docRef.set({
      producerId: fields.producerId,
      folderOwnerOrganizationId,
      periodId: fields.periodId,
      documentType: "financial_statement_source",
      storagePath,
      fileName: file.name,
      mimeType,
      visibility: "private",
      uploadedBy: session.uid,
      createdAt: now,
      updatedAt: now,
    })

    // Extraer con OCR/IA
    let extractionResult
    let importStatus: "extracted" | "failed" = "extracted"

    try {
      if (isExcel(mimeType)) {
        const { readFinancialStatementWorkbook } = await import("@/lib/accounting/statement-excel-reader")
        const { mapBalanceRowsToDetails, mapIncomeRowsToDetails } = await import("@/lib/accounting/statement-import-mapper")
        const workbookResult = readFinancialStatementWorkbook(buffer)
        const balanceMapped = mapBalanceRowsToDetails(workbookResult.rows)
        const incomeMapped  = mapIncomeRowsToDetails(workbookResult.rows)
        extractionResult = {
          provider: "excel",
          durationMs: 0,
          overallConfidence: 0.7,
          balanceResult: { details: balanceMapped.details, equityTotal: balanceMapped.equityTotal, currency: fields.currency as "ARS" | "USD", previousDetails: balanceMapped.previousDetails, previousEquityTotal: balanceMapped.previousEquityTotal },
          incomeResult: { details: incomeMapped.details, currency: fields.currency as "ARS" | "USD", previousDetails: incomeMapped.previousDetails },
          fieldConfidence: { ...balanceMapped.fieldConfidence, ...incomeMapped.fieldConfidence },
          warnings: [...workbookResult.warnings, ...balanceMapped.warnings, ...incomeMapped.warnings],
        }
      } else {
        const provider = getFinancialStatementOCRProvider()
        extractionResult = await provider.extract(buffer, mimeType, {
          kind: fields.kind,
          fileName: file.name,
        })
      }
    } catch (extractErr) {
      importStatus = "failed"
      extractionResult = {
        provider: "unknown",
        durationMs: 0,
        overallConfidence: 0,
        fieldConfidence: {},
        warnings: [`Fallo en extracción: ${extractErr instanceof Error ? extractErr.message : "desconocido"}`],
      }
    }

    // Crear import draft
    const importId = await createStatementImport({
      producerId: fields.producerId,
      folderOwnerOrganizationId,
      accountingFirmId,
      periodId: fields.periodId,
      kind: fields.kind,
      status: importStatus,
      sourceDocumentId: docRef.id,
      sourceStoragePath: storagePath,
      sourceFileName: file.name,
      sourceMimeType: mimeType,
      provider: extractionResult.provider,
      overallConfidence: extractionResult.overallConfidence,
      extractedBalance: extractionResult.balanceResult,
      extractedIncomeStatement: extractionResult.incomeResult,
      fieldConfidence: extractionResult.fieldConfidence,
      warnings: extractionResult.warnings,
      rawText: extractionResult.rawText,
      createdBy: session.uid,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: accountingFirmId ?? session.defaultOrganizationId,
      action: "statement_import.extracted",
      targetType: "financial_statement_import",
      targetId: importId,
      metadata: {
        kind: fields.kind,
        status: importStatus,
        overallConfidence: extractionResult.overallConfidence,
        provider: extractionResult.provider,
      },
    })

    return Response.json(
      {
        importId,
        status: importStatus,
        overallConfidence: extractionResult.overallConfidence,
        extractedBalance: extractionResult.balanceResult,
        extractedIncomeStatement: extractionResult.incomeResult,
        fieldConfidence: extractionResult.fieldConfidence,
        warnings: extractionResult.warnings,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 })
    }
    return getAuthErrorResponse(error)
  }
}
