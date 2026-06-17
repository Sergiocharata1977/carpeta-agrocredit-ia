/**
 * Extractores de los 4 tipos de documento del MVP de CreditoHub (Ola 2 / Agente C).
 *
 * Cada extractor:
 *   1. Arma un schemaPrompt con el listado canónico de campos del tipo.
 *   2. Llama a getAIProvider().extractStructured (agnóstico de proveedor).
 *   3. Mapea cada campo del AIExtractionResult a un ExtractedField con
 *      PROCEDENCIA COMPLETA: documentId, pageNumber, confidence, extractionMethod.
 *
 * Reglas:
 *   - extractionMethod = "VISION_MODEL" (vienen del modelo IA sobre imagen/PDF).
 *   - reviewStatus = "PENDING" (nada se aplica automáticamente; lo decide el contador).
 *   - NO persiste: devuelve ExtractedField[]. El id/createdAt se generan acá de
 *     forma consistente para que el servicio pueda batchear sin reprocesar.
 *   - Partition key = folderOwnerOrganizationId (NUNCA producerId/clientId).
 */

import { randomUUID } from "node:crypto"
import { resolveAIProvider } from "@/lib/ai/provider-config"
import type { AIExtractedField, AIExtractionResult } from "@/lib/ai/AIProvider"
import type { ExtractedField } from "@/types/credito-hub"

export type CreditoHubDocumentType =
  | "balance_sheet"
  | "income_statement"
  | "iva"
  | "f931"

/** Parámetros comunes de todo extractor. */
export interface ExtractorParams {
  buffer: Buffer
  mimeType: string
  folderOwnerOrganizationId: string
  documentId: string
  documentVersionId?: string | null
  fileName?: string
  /** Moneda por defecto si el modelo no la informa por campo. */
  defaultCurrency?: string | null
}

// ─── Listados canónicos de campos por tipo ────────────────────────────────────
// Para balance/resultados reusamos el modelo de campos contables AR del
// SYSTEM_PROMPT de lib/ocr/ClaudeFinancialStatementProvider.ts.

const BALANCE_FIELDS = `Campos del Balance General (Estado de Situación Patrimonial), notación grupo.campo:
- currentAssets: cashAndBanks, temporaryInvestments, tradeReceivables, otherReceivables, inventories, otherAssets
- nonCurrentAssets: tradeReceivables, otherReceivables, inventories, investments, propertyPlantEquipment, investmentProperties, intangibleAssets, biologicalAssets, otherAssets
- currentLiabilities: commercialDebts, loans, salariesAndSocialCharges, taxLiabilities, customerAdvances, dividendsPayable, otherDebts, provisions
- nonCurrentLiabilities: (mismos campos que currentLiabilities)
- equityTotal: total de patrimonio neto`

const INCOME_FIELDS = `Campos del Estado de Resultados:
- netSales, costOfGoodsSold, inventoryValuationResult, sellingExpenses, administrativeExpenses, otherExpenses, relatedInvestmentResults, otherInvestmentResults, financialResultsGeneratedByAssets, financialResultsGeneratedByLiabilities, otherIncomeAndExpenses, incomeTax, discontinuedOperationsResult, discontinuedDisposalResult, extraordinaryResults, netResult`

const IVA_FIELDS = `Campos de la Declaración Jurada de IVA (formulario AFIP F2002 o equivalente):
- debitoFiscal: débito fiscal del período (IVA ventas)
- creditoFiscal: crédito fiscal del período (IVA compras)
- saldoTecnico: saldo técnico a favor (positivo) o a pagar
- saldoAPagar: saldo a pagar del período
- saldoAFavor: saldo a favor del contribuyente
- periodo: período fiscal en formato AAAA-MM`

const F931_FIELDS = `Campos del Formulario 931 (DDJJ de aportes y contribuciones de la seguridad social, AFIP):
- empleados: cantidad de empleados declarados
- remuneraciones: total de remuneraciones imponibles
- contribuciones: total de contribuciones patronales
- aportes: total de aportes del trabajador
- totalAPagar: total a pagar del período
- periodo: período devengado en formato AAAA-MM`

function buildSchemaPrompt(docTypeLabel: string, fieldList: string): string {
  return `Sos un asistente especializado en documentación financiera y fiscal argentina.
Extraé los datos del documento: ${docTypeLabel}.

${fieldList}

Devolvé SOLO un objeto JSON con la forma:
{
  "fields": {
    "<fieldCode>": { "value": <number|string>, "confidence": <0.0-1.0>, "page": <número de página o null>, "rawText": "<texto fuente literal o null>" }
  },
  "warnings": ["string", ...],
  "overallConfidence": <0.0-1.0>
}

Para campos contables/monetarios usá number. Para período usá string "AAAA-MM" o "AAAA".
Si no podés extraer un campo con certeza, omitilo y agregalo a warnings. Los gastos (costos, sellingExpenses, etc.) deben ser negativos.`
}

const SCHEMA_PROMPTS: Record<CreditoHubDocumentType, { label: string; prompt: string; periodFields: Set<string> }> = {
  balance_sheet: {
    label: "Balance General / Estado de Situación Patrimonial",
    prompt: buildSchemaPrompt("Balance General / Estado de Situación Patrimonial", BALANCE_FIELDS),
    periodFields: new Set(),
  },
  income_statement: {
    label: "Estado de Resultados",
    prompt: buildSchemaPrompt("Estado de Resultados", INCOME_FIELDS),
    periodFields: new Set(),
  },
  iva: {
    label: "Declaración Jurada de IVA",
    prompt: buildSchemaPrompt("Declaración Jurada de IVA", IVA_FIELDS),
    periodFields: new Set(["periodo"]),
  },
  f931: {
    label: "Formulario 931 (Seguridad Social)",
    prompt: buildSchemaPrompt("Formulario 931 (Seguridad Social)", F931_FIELDS),
    periodFields: new Set(["periodo"]),
  },
}

// ─── Mapeo AIExtractedField → ExtractedField (con procedencia) ─────────────────

function clampConfidence(n: number): number {
  if (!Number.isFinite(n)) return 0
  if (n < 0) return 0
  if (n > 1) return 1
  return n
}

function toNormalizedValue(value: unknown): { normalized: unknown; raw: string | null } {
  if (value === null || value === undefined) {
    return { normalized: null, raw: null }
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return { normalized: value, raw: String(value) }
  }
  if (typeof value === "string") {
    return { normalized: value, raw: value }
  }
  // objetos/arrays: se preservan como normalizedValue y rawValue serializado
  return { normalized: value, raw: JSON.stringify(value) }
}

function mapField(
  fieldCode: string,
  aiField: AIExtractedField,
  params: ExtractorParams,
  isPeriodField: boolean,
  now: string,
): ExtractedField {
  const { normalized, raw } = toNormalizedValue(aiField.value)
  const periodValue = isPeriodField && typeof aiField.value === "string" ? aiField.value : null

  return {
    id: randomUUID(),
    folderOwnerOrganizationId: params.folderOwnerOrganizationId,
    documentId: params.documentId,
    documentVersionId: params.documentVersionId ?? null,
    pageNumber: aiField.page ?? null,
    fieldCode,
    rawLabel: null,
    rawValue: aiField.rawText ?? raw,
    normalizedValue: normalized,
    currency: typeof normalized === "number" ? params.defaultCurrency ?? null : null,
    unit: null,
    periodStart: periodValue,
    periodEnd: periodValue,
    boundingBox: null,
    confidence: clampConfidence(aiField.confidence),
    extractionMethod: "VISION_MODEL",
    reviewStatus: "PENDING",
    reviewedBy: null,
    reviewedAt: null,
    correctionReason: null,
    createdAt: now,
  }
}

function mapResult(
  result: AIExtractionResult,
  docType: CreditoHubDocumentType,
  params: ExtractorParams,
): ExtractedField[] {
  const now = new Date().toISOString()
  const periodFields = SCHEMA_PROMPTS[docType].periodFields
  return Object.entries(result.fields).map(([fieldCode, aiField]) =>
    mapField(fieldCode, aiField, params, periodFields.has(fieldCode), now),
  )
}

async function runExtraction(
  docType: CreditoHubDocumentType,
  params: ExtractorParams,
): Promise<ExtractedField[]> {
  const { prompt } = SCHEMA_PROMPTS[docType]
  const provider = await resolveAIProvider()
  const result = await provider.extractStructured(params.buffer, params.mimeType, prompt, {
    fileName: params.fileName,
    documentType: docType,
  })
  return mapResult(result, docType, params)
}

// ─── Extractores públicos (4 tipos del MVP) ───────────────────────────────────

export function extractBalance(params: ExtractorParams): Promise<ExtractedField[]> {
  return runExtraction("balance_sheet", params)
}

export function extractIncome(params: ExtractorParams): Promise<ExtractedField[]> {
  return runExtraction("income_statement", params)
}

export function extractIvaReturn(params: ExtractorParams): Promise<ExtractedField[]> {
  return runExtraction("iva", params)
}

export function extractForm931(params: ExtractorParams): Promise<ExtractedField[]> {
  return runExtraction("f931", params)
}

/** Despacha al extractor correspondiente según el tipo de documento. */
export function extractByType(
  docType: CreditoHubDocumentType,
  params: ExtractorParams,
): Promise<ExtractedField[]> {
  return runExtraction(docType, params)
}
