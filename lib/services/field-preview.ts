// Servicio para generar vista previa de campos extraídos
// Prepara representación clara para que el usuario revise antes de confirmar

import type { ExtractedDocumentData } from "@/types/import-pending"

/**
 * Información de un campo para mostrar en tabla de vista previa.
 */
export interface PreviewField {
  fieldName: string // "activoCorriente"
  fieldLabel: string // "Activo Corriente"
  detectedValue: unknown
  mappedValue?: unknown // si el usuario corrigió
  confidence: number // 0-1
  source: "table" | "text" | "detected"
  status: "confirmed" | "detected" | "uncertain" | "missing"
  observation?: string // "Hallado en página 3"
  pageNumber?: number | null
}

/**
 * Mapeo de fieldCode a fieldLabel legible (en español).
 * Expandible según nuevos campos detectados.
 */
const FIELD_LABELS: Record<string, string> = {
  // Balance
  activoCorriente: "Activo Corriente",
  activoNoCorriente: "Activo No Corriente",
  activoTotal: "Activo Total",
  pasivoCorriente: "Pasivo Corriente",
  pasivoNoCorriente: "Pasivo No Corriente",
  pasivoTotal: "Pasivo Total",
  liquidoTotal: "Líquido Total",
  patrimonioNeto: "Patrimonio Neto",
  // Income
  ventasNetas: "Ventas Netas",
  costoVentas: "Costo de Ventas",
  gananciaOperativa: "Ganancia Operativa",
  gastosOperativos: "Gastos Operativos",
  gananciaEjercicio: "Ganancia del Ejercicio",
  // Fechas y períodos
  periodStart: "Período Inicio",
  periodEnd: "Período Fin",
  issueDate: "Fecha de Emisión",
  // Identificación
  cuit: "CUIT",
  companyName: "Razón Social",
}

/**
 * Genera array de PreviewField a partir de ExtractedDocumentData.
 * Ordena por status: confirmed, detected, uncertain, missing.
 */
export async function generateFieldPreview(
  extractedData: ExtractedDocumentData,
  mappedFields?: Record<string, unknown>,
): Promise<PreviewField[]> {
  const previewFields: PreviewField[] = []

  // Iterar sobre campos extraídos
  if (extractedData.fields && Array.isArray(extractedData.fields)) {
    for (const field of extractedData.fields) {
      const label = FIELD_LABELS[field.fieldCode] || field.fieldLabel || field.fieldCode

      // Determinar status
      let status: "confirmed" | "detected" | "uncertain" | "missing" = "detected"
      if (field.reviewStatus === "CONFIRMED" || field.reviewStatus === "CORRECTED") {
        status = "confirmed"
      } else if (field.confidence < 0.5) {
        status = "uncertain"
      } else if (!field.normalizedValue && !field.rawValue) {
        status = "missing"
      }

      // Detectar source
      let source: "table" | "text" | "detected" = "detected"
      if (field.extractionMethod === "TABLE_EXTRACTION") {
        source = "table"
      } else if (field.extractionMethod === "NATIVE_TEXT") {
        source = "text"
      }

      const mappedValue = mappedFields?.[field.fieldCode]

      const preview: PreviewField = {
        fieldName: field.fieldCode,
        fieldLabel: label,
        detectedValue: field.normalizedValue || field.rawValue,
        mappedValue,
        confidence: field.confidence || 0,
        source,
        status,
        pageNumber: field.pageNumber,
        observation: field.observation,
      }

      previewFields.push(preview)
    }
  }

  // Si no hay campos, agregarporfavor periodo y empresa detectada
  if (previewFields.length === 0) {
    if (extractedData.period?.start) {
      previewFields.push({
        fieldName: "periodStart",
        fieldLabel: "Período Inicio",
        detectedValue: extractedData.period.start,
        confidence: 0.9,
        source: "detected",
        status: "detected",
      })
    }

    if (extractedData.period?.end) {
      previewFields.push({
        fieldName: "periodEnd",
        fieldLabel: "Período Fin",
        detectedValue: extractedData.period.end,
        confidence: 0.9,
        source: "detected",
        status: "detected",
      })
    }

    if (extractedData.company?.name) {
      previewFields.push({
        fieldName: "companyName",
        fieldLabel: "Razón Social",
        detectedValue: extractedData.company.name,
        confidence: extractedData.confidence || 0.8,
        source: "detected",
        status: "detected",
      })
    }

    if (extractedData.company?.cuit) {
      previewFields.push({
        fieldName: "cuit",
        fieldLabel: "CUIT",
        detectedValue: extractedData.company.cuit,
        confidence: extractedData.confidence || 0.8,
        source: "detected",
        status: "detected",
      })
    }
  }

  // Ordenar: confirmed primero, luego detected, uncertain, missing
  const order: Record<string, number> = {
    confirmed: 0,
    detected: 1,
    uncertain: 2,
    missing: 3,
  }

  previewFields.sort(
    (a, b) => order[a.status] - order[b.status] || b.confidence - a.confidence,
  )

  return previewFields
}

/**
 * Filtra PreviewField[] para mostrar solo los más importantes.
 * Útil para displays con espacio limitado.
 */
export function getKeyFieldsPreview(
  allFields: PreviewField[],
  limit = 10,
): PreviewField[] {
  // Priorizar confirmed, luego detected con confidence > 0.7
  const important = allFields.filter(
    (f) => f.status === "confirmed" || (f.status === "detected" && f.confidence > 0.7),
  )

  return important.slice(0, limit)
}
