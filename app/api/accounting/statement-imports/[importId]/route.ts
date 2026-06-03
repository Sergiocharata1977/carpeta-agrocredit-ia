import { NextRequest } from "next/server"
import { z } from "zod"
import { writeAuditLog } from "@/lib/firebase/audit"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import {
  getAuthErrorResponse,
  requireActiveOrg,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import {
  getStatementImport,
  updateStatementImport,
} from "@/lib/services/statement-imports-admin"
import { reviewStatementImportSchema } from "@/lib/schemas/statement-imports"
import type { FinancialStatementImport, FieldConfidence } from "@/types/statement-imports"
import {
  DEFAULT_BALANCE_SHEET_DETAILS,
  DEFAULT_INCOME_STATEMENT_DETAILS,
  type BalanceSheetDetails,
  type IncomeStatementDetails,
} from "@/lib/accounting/statement-fields"

function mergeBalanceDetails(
  base: BalanceSheetDetails | undefined,
  patch: Record<string, unknown> | undefined,
): BalanceSheetDetails | undefined {
  if (!patch) return base
  return { ...(base ?? {}), ...patch } as BalanceSheetDetails
}

function mergeIncomeDetails(
  base: IncomeStatementDetails | undefined,
  patch: Record<string, unknown> | undefined,
): IncomeStatementDetails | undefined {
  if (!patch) return base
  return { ...(base ?? {}), ...patch } as IncomeStatementDetails
}

function markBalanceManual(
  current: Record<string, FieldConfidence>,
  details?: Record<string, unknown>,
  equityTotalEdited?: boolean,
) {
  const next = { ...current }
  if (details) {
    for (const [group, fields] of Object.entries(details)) {
      if (!fields || typeof fields !== "object") continue
      for (const field of Object.keys(fields as Record<string, unknown>)) {
        next[`${group}.${field}`] = { source: "manual", confidence: 1 }
      }
    }
  }
  if (equityTotalEdited) {
    next.equityTotal = { source: "manual", confidence: 1 }
  }
  return next
}

function markIncomeManual(
  current: Record<string, FieldConfidence>,
  details?: Record<string, unknown>,
) {
  const next = { ...current }
  if (details) {
    for (const field of Object.keys(details)) {
      next[field] = { source: "manual", confidence: 1 }
    }
  }
  return next
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const { importId } = await params
    const statementImport = await getStatementImport(importId)
    if (!statementImport) {
      return Response.json({ error: "Importacion no encontrada" }, { status: 404 })
    }

    await assertCanManageAccountingFolder(session, statementImport.producerId)
    return Response.json({ import: statementImport })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ importId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)

    const { importId } = await params
    const statementImport = await getStatementImport(importId)
    if (!statementImport) {
      return Response.json({ error: "Importacion no encontrada" }, { status: 404 })
    }
    if (statementImport.status === "applied" || statementImport.status === "rejected") {
      return Response.json({ error: "La importacion ya esta cerrada" }, { status: 409 })
    }

    const access = await assertCanManageAccountingFolder(session, statementImport.producerId)
    const input = reviewStatementImportSchema.parse(await request.json())

    let fieldConfidence = { ...statementImport.fieldConfidence }
    const patch: Partial<FinancialStatementImport> = { status: "reviewed" }

    if (input.extractedBalance) {
      const current = statementImport.extractedBalance
      patch.extractedBalance = {
        details: mergeBalanceDetails(current?.details, input.extractedBalance.details) ?? DEFAULT_BALANCE_SHEET_DETAILS,
        equityTotal: input.extractedBalance.equityTotal ?? current?.equityTotal ?? 0,
        currency: input.extractedBalance.currency ?? current?.currency ?? "ARS",
        previousDetails: current?.previousDetails,
        previousEquityTotal: current?.previousEquityTotal,
      }
      fieldConfidence = markBalanceManual(
        fieldConfidence,
        input.extractedBalance.details,
        input.extractedBalance.equityTotal !== undefined,
      )
    }

    if (input.extractedIncomeStatement) {
      const current = statementImport.extractedIncomeStatement
      patch.extractedIncomeStatement = {
        details: mergeIncomeDetails(current?.details, input.extractedIncomeStatement.details) ?? DEFAULT_INCOME_STATEMENT_DETAILS,
        currency: input.extractedIncomeStatement.currency ?? current?.currency ?? "ARS",
        previousDetails: current?.previousDetails,
      }
      fieldConfidence = markIncomeManual(fieldConfidence, input.extractedIncomeStatement.details)
    }

    patch.fieldConfidence = fieldConfidence
    await updateStatementImport(importId, patch)

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: access.accountingFirmId ?? session.defaultOrganizationId,
      action: "statement_import.reviewed",
      targetType: "financial_statement_import",
      targetId: importId,
      metadata: {
        editedBalance: Boolean(input.extractedBalance),
        editedIncomeStatement: Boolean(input.extractedIncomeStatement),
      },
    })

    const updated = await getStatementImport(importId)
    return Response.json({ import: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }
    return getAuthErrorResponse(error)
  }
}
