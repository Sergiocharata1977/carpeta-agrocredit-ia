/**
 * Clasificador documental IA (CreditoHub — Ola 2 / Agente B).
 *
 * Identifica el tipo documental argentino de un documento contable/fiscal
 * usando el proveedor IA activo (getAIProvider). NO persiste nada: devuelve un
 * DocumentClassification parcial (sin id/createdAt, que pone el servicio
 * lib/services/document-classification.ts). No lee Firestore ni Storage.
 */

import { resolveAIProvider } from "@/lib/ai/provider-config"
import { extractPdfText } from "@/lib/ai/pdf-to-images"
import type { AIClassificationHints } from "@/lib/ai/AIProvider"
import type { DocumentClassification } from "@/types/credito-hub"

/** Tipos documentales argentinos soportados por el clasificador. */
export const SUPPORTED_DOCUMENT_TYPES = [
  "estado_situacion_patrimonial",
  "estado_resultados",
  "ddjj_iva",
  "formulario_931",
  "constancia_cuit",
  "extracto_bancario",
  "titulo_propiedad",
  "contrato_social",
  "desconocido",
] as const

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number]

/** Umbral por debajo del cual la clasificación requiere revisión humana. */
export const NEEDS_REVIEW_THRESHOLD = 0.7

/** DocumentClassification sin los campos que asigna la capa de persistencia. */
export type ClassifierOutput = Omit<DocumentClassification, "id" | "documentId" | "folderOwnerOrganizationId" | "createdAt">

const SCHEMA_PROMPT = `Sos un clasificador de documentos contables y fiscales argentinos.
Identificá el tipo documental entre EXACTAMENTE uno de estos valores:
- "estado_situacion_patrimonial": balance / estado de situación patrimonial.
- "estado_resultados": estado de resultados / cuadro de resultados.
- "ddjj_iva": declaración jurada de IVA (F. 2002 / formulario IVA).
- "formulario_931": F. 931 de aportes y contribuciones (seguridad social).
- "constancia_cuit": constancia de inscripción AFIP/ARCA (CUIT).
- "extracto_bancario": resumen / extracto de cuenta bancaria.
- "titulo_propiedad": escritura o título de propiedad de inmueble.
- "contrato_social": contrato o estatuto social de la sociedad.
- "desconocido": si no encaja en ninguno de los anteriores.

Respondé SOLO con un objeto JSON con esta forma:
{
  "documentType": "<uno de los valores listados>",
  "subtype": "<opcional>",
  "cuit": "<opcional, formato XX-XXXXXXXX-X>",
  "period": "<opcional, ej. 2024 o 2024-12>",
  "issueDate": "<opcional, YYYY-MM-DD>",
  "expiryDate": "<opcional, YYYY-MM-DD>",
  "issuer": "<opcional, emisor>",
  "confidence": <número 0.0 a 1.0>,
  "warnings": ["<advertencias>"]
}`

/** Normaliza el tipo devuelto por el modelo a un valor soportado. */
function normalizeDocumentType(raw: string): SupportedDocumentType {
  const value = (raw ?? "").trim().toLowerCase()
  const aliases: Record<string, SupportedDocumentType> = {
    balance: "estado_situacion_patrimonial",
    balance_general: "estado_situacion_patrimonial",
    balance_sheet: "estado_situacion_patrimonial",
    estados_contables: "estado_situacion_patrimonial",
    estado_contable: "estado_situacion_patrimonial",
    financial_statement: "estado_situacion_patrimonial",
    financial_statements: "estado_situacion_patrimonial",
    estados_financieros: "estado_situacion_patrimonial",
    estado_patrimonial: "estado_situacion_patrimonial",
    situacion_patrimonial: "estado_situacion_patrimonial",
    estado_de_situacion_patrimonial: "estado_situacion_patrimonial",
    income_statement: "estado_resultados",
    estado_de_resultados: "estado_resultados",
    cuadro_de_resultados: "estado_resultados",
    results_statement: "estado_resultados",
    iva: "ddjj_iva",
    tax_document: "ddjj_iva",
    declaracion_iva: "ddjj_iva",
    declaracion_jurada_iva: "ddjj_iva",
    f931: "formulario_931",
    form_931: "formulario_931",
    formulario_afip_931: "formulario_931",
    cuit: "constancia_cuit",
    afip_constancia: "constancia_cuit",
    bank_statement: "extracto_bancario",
    escritura: "titulo_propiedad",
    estatuto_social: "contrato_social",
    contrato_societario: "contrato_social",
    otro: "desconocido",
    other: "desconocido",
    unknown: "desconocido",
  }
  if (aliases[value]) return aliases[value]
  const match = SUPPORTED_DOCUMENT_TYPES.find((t) => t === value)
  return match ?? "desconocido"
}

async function inferDocumentTypeFromContent(
  buffer: Buffer,
  mimeType: string,
  hints?: AIClassificationHints,
): Promise<SupportedDocumentType | null> {
  const fileName = normalizeText(hints?.fileName ?? "")
  if (/balance|estado[_\s-]*situacion[_\s-]*patrimonial|estados?[_\s-]*contables?/.test(fileName)) {
    return "estado_situacion_patrimonial"
  }
  if (/resultado|income[_\s-]*statement|cuadro[_\s-]*resultados/.test(fileName)) {
    return "estado_resultados"
  }
  if (/\biva\b|f\.?\s*2002|declaracion[_\s-]*jurada[_\s-]*iva/.test(fileName)) {
    return "ddjj_iva"
  }
  if (/\b931\b|f\.?\s*931/.test(fileName)) {
    return "formulario_931"
  }

  if (mimeType !== "application/pdf") return null

  try {
    const pdf = await extractPdfText(buffer)
    const text = normalizeText(pdf.text.slice(0, 6000))
    if (/estado\s+de\s+situacion\s+patrimonial|activo\s+corriente|pasivo\s+corriente|patrimonio\s+neto/.test(text)) {
      return "estado_situacion_patrimonial"
    }
    if (/estado\s+de\s+resultados|ventas\s+netas|resultado\s+del\s+ejercicio|costo\s+de\s+los\s+bienes\s+vendidos/.test(text)) {
      return "estado_resultados"
    }
    if (/declaracion\s+jurada\s+de\s+iva|debito\s+fiscal|credito\s+fiscal|f\.?\s*2002/.test(text)) {
      return "ddjj_iva"
    }
    if (/formulario\s+931|f\.?\s*931|aportes\s+y\s+contribuciones|seguridad\s+social/.test(text)) {
      return "formulario_931"
    }
  } catch {
    return null
  }

  return null
}

/**
 * Clasifica un documento. Devuelve un DocumentClassification parcial; el
 * servicio agrega id/documentId/folderOwnerOrganizationId/createdAt al persistir.
 * needsReview = confidence < NEEDS_REVIEW_THRESHOLD.
 */
export async function classify(
  buffer: Buffer,
  mimeType: string,
  hints?: AIClassificationHints,
): Promise<ClassifierOutput> {
  // El contrato AIProvider.classifyDocument no recibe schemaPrompt como
  // parámetro (a diferencia de extractStructured); cada provider conoce el
  // dominio de tipos documentales. CLASSIFICATION_SCHEMA_PROMPT queda exportado
  // como referencia canónica de los tipos esperados.
  const provider = await resolveAIProvider()
  const result = await provider.classifyDocument(buffer, mimeType, hints)

  const confidence = clampConfidence(result.confidence)
  let documentType = normalizeDocumentType(result.documentType)
  const inferredDocumentType =
    documentType === "desconocido"
      ? await inferDocumentTypeFromContent(buffer, mimeType, hints)
      : null
  if (inferredDocumentType) documentType = inferredDocumentType

  const output: ClassifierOutput = {
    documentType,
    confidence: inferredDocumentType ? Math.max(confidence, 0.75) : confidence,
    needsReview: inferredDocumentType ? false : confidence < NEEDS_REVIEW_THRESHOLD,
  }

  if (result.subtype) output.subtype = result.subtype
  if (result.cuit) output.cuit = result.cuit
  if (result.period) output.period = result.period
  if (result.issueDate) output.issueDate = result.issueDate
  if (result.expiryDate) output.expiryDate = result.expiryDate
  if (result.issuer) output.issuer = result.issuer

  return output
}

/** El prompt de schema queda exportado para providers/tests que lo necesiten. */
export const CLASSIFICATION_SCHEMA_PROMPT = SCHEMA_PROMPT

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}
