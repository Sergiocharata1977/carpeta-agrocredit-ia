import { NextRequest } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import {
  getAuthErrorResponse,
  requireActiveOrg,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import {
  getStatementImport,
} from "@/lib/services/statement-imports-admin"
import {
  applyStatementImportSchema,
} from "@/lib/schemas/statement-imports"
import {
  balanceSheetDetailsSchema,
  incomeStatementDetailsSchema,
} from "@/lib/schemas/accounting"
import {
  calculateBalanceTotals,
  calculateIncomeTotals,
} from "@/lib/accounting/statement-fields"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const { importId } = await params
    const input = applyStatementImportSchema.parse(await request.json())
    if (!input.applyBalance && !input.applyIncomeStatement) {
      return Response.json({ error: "Selecciona al menos un estado a aplicar" }, { status: 400 })
    }

    const statementImport = await getStatementImport(importId)
    if (!statementImport) {
      return Response.json({ error: "Importacion no encontrada" }, { status: 404 })
    }

    if (["failed", "rejected", "applied"].includes(statementImport.status)) {
      return Response.json({ error: "La importacion no puede aplicarse en su estado actual" }, { status: 409 })
    }

    const access = await assertCanManageAccountingFolder(session, statementImport.producerId)
    const db = getAdminDb()
    const now = FieldValue.serverTimestamp()
    const batch = db.batch()
    let appliedBalanceSheetId: string | undefined
    let appliedIncomeStatementId: string | undefined

    if (input.applyBalance) {
      if (!statementImport.extractedBalance) {
        return Response.json({ error: "La importacion no contiene balance" }, { status: 422 })
      }

      const details = balanceSheetDetailsSchema.parse(statementImport.extractedBalance.details)
      const totals = calculateBalanceTotals(details, statementImport.extractedBalance.equityTotal)
      const diff = totals.assetsTotal - totals.liabilitiesAndEquityTotal
      if (Math.abs(diff) > 0.01) {
        return Response.json(
          {
            error: "El balance no cuadra",
            detail: {
              assetsTotal: totals.assetsTotal,
              liabilitiesAndEquityTotal: totals.liabilitiesAndEquityTotal,
              difference: diff,
            },
          },
          { status: 422 },
        )
      }

      const balanceRef = db.collection(COLLECTIONS.BALANCE_SHEETS).doc()
      appliedBalanceSheetId = balanceRef.id
      batch.set(balanceRef, {
        producerId: statementImport.producerId,
        organizationId: statementImport.producerId,
        folderOwnerOrganizationId: statementImport.folderOwnerOrganizationId,
        periodId: statementImport.periodId,
        details,
        assetsTotal: totals.assetsTotal,
        liabilitiesTotal: totals.liabilitiesTotal,
        equityTotal: totals.equityTotal,
        currency: statementImport.extractedBalance.currency,
        validationStatus: "draft",
        observations: `Creado desde importacion ${importId}`,
        documentIds: [statementImport.sourceDocumentId],
        createdBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
    }

    if (input.applyIncomeStatement) {
      if (!statementImport.extractedIncomeStatement) {
        return Response.json({ error: "La importacion no contiene estado de resultados" }, { status: 422 })
      }

      const details = incomeStatementDetailsSchema.parse(statementImport.extractedIncomeStatement.details)
      const totals = calculateIncomeTotals(details)
      const incomeRef = db.collection(COLLECTIONS.INCOME_STATEMENTS).doc()
      appliedIncomeStatementId = incomeRef.id
      batch.set(incomeRef, {
        producerId: statementImport.producerId,
        organizationId: statementImport.producerId,
        folderOwnerOrganizationId: statementImport.folderOwnerOrganizationId,
        periodId: statementImport.periodId,
        details,
        sales: details.netSales,
        grossResult: totals.grossResult,
        netResult: totals.netResult,
        currency: statementImport.extractedIncomeStatement.currency,
        validationStatus: "draft",
        observations: `Creado desde importacion ${importId}`,
        documentIds: [statementImport.sourceDocumentId],
        createdBy: session.uid,
        createdAt: now,
        updatedAt: now,
      })
    }

    const importRef = db.collection(COLLECTIONS.FINANCIAL_STATEMENT_IMPORTS).doc(importId)
    batch.update(importRef, {
      status: "applied",
      appliedBalanceSheetId: appliedBalanceSheetId ?? statementImport.appliedBalanceSheetId ?? null,
      appliedIncomeStatementId: appliedIncomeStatementId ?? statementImport.appliedIncomeStatementId ?? null,
      updatedAt: now,
    })

    await batch.commit()

    if (appliedBalanceSheetId) {
      await writeAuditLog({
        actorUid: session.uid,
        actorOrganizationId: access.accountingFirmId ?? session.defaultOrganizationId,
        action: "balance_sheet.created",
        targetType: "balance_sheet",
        targetId: appliedBalanceSheetId,
        metadata: { sourceImportId: importId, producerId: statementImport.producerId },
      })
    }

    if (appliedIncomeStatementId) {
      await writeAuditLog({
        actorUid: session.uid,
        actorOrganizationId: access.accountingFirmId ?? session.defaultOrganizationId,
        action: "income_statement.created",
        targetType: "income_statement",
        targetId: appliedIncomeStatementId,
        metadata: { sourceImportId: importId, producerId: statementImport.producerId },
      })
    }

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: access.accountingFirmId ?? session.defaultOrganizationId,
      action: "statement_import.applied",
      targetType: "financial_statement_import",
      targetId: importId,
      metadata: {
        appliedBalanceSheetId: appliedBalanceSheetId ?? null,
        appliedIncomeStatementId: appliedIncomeStatementId ?? null,
      },
    })

    return Response.json({
      ok: true,
      appliedBalanceSheetId,
      appliedIncomeStatementId,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }
    return getAuthErrorResponse(error)
  }
}
