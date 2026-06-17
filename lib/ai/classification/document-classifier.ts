/**
 * Clasificador documental IA (CreditoHub — Ola 2 / Agente B).
 *
 * Identifica el tipo documental argentino de un documento contable/fiscal
 * usando el proveedor IA activo (getAIProvider). NO persiste nada: devuelve un
 * DocumentClassification parcial (sin id/createdAt, que pone el servicio
 * lib/services/document-classification.ts). No lee Firestore ni Storage.
 */

import { resolveAIProvider } from "@/lib/ai/provider-config"
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
  const match = SUPPORTED_DOCUMENT_TYPES.find((t) => t === value)
  return match ?? "desconocido"
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
  const documentType = normalizeDocumentType(result.documentType)

  const output: ClassifierOutput = {
    documentType,
    confidence,
    needsReview: confidence < NEEDS_REVIEW_THRESHOLD,
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
