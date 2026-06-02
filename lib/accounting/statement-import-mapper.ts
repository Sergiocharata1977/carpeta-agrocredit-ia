import {
  DEFAULT_BALANCE_SHEET_DETAILS,
  DEFAULT_INCOME_STATEMENT_DETAILS,
} from "@/lib/accounting/statement-fields"
import { BALANCE_FIELD_ALIASES, INCOME_FIELD_ALIASES } from "./statement-field-aliases"
import type { BalanceSheetDetails, IncomeStatementDetails } from "./statement-fields"
import type { FieldConfidence } from "@/types/statement-imports"
import type { ExcelStatementRow } from "./statement-excel-reader"

export function normalizeStatementLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // quitar tildes
    .replace(/[^a-z0-9\s]/g, " ")     // quitar puntuación
    .replace(/\s+/g, " ")
    .trim()
}

export function parseArgentineAmount(value: unknown): number {
  if (typeof value === "number") return value
  if (value == null || value === "") return 0
  const str = String(value).trim()
  if (!str) return 0

  // Negativo entre paréntesis: (123,45) → -123.45
  const isNegative = str.startsWith("(") && str.endsWith(")")
  const clean = str.replace(/[()]/g, "").trim()

  // Detectar formato argentino: 1.234.567,89 → 1234567.89
  const argFormat = /^[\d.]+,\d{2}$/.test(clean)
  let normalized: string
  if (argFormat) {
    normalized = clean.replace(/\./g, "").replace(",", ".")
  } else {
    normalized = clean.replace(/,/g, "")
  }

  const num = parseFloat(normalized)
  if (isNaN(num)) return 0
  return isNegative ? -Math.abs(num) : num
}

interface MappedBalance {
  details: BalanceSheetDetails
  equityTotal: number
  previousDetails?: BalanceSheetDetails
  previousEquityTotal?: number
  warnings: string[]
  fieldConfidence: Record<string, FieldConfidence>
}

interface MappedIncome {
  details: IncomeStatementDetails
  previousDetails?: IncomeStatementDetails
  warnings: string[]
  fieldConfidence: Record<string, FieldConfidence>
}

export function mapBalanceRowsToDetails(rows: ExcelStatementRow[]): MappedBalance {
  const details: BalanceSheetDetails = JSON.parse(JSON.stringify(DEFAULT_BALANCE_SHEET_DETAILS))
  const previousDetails: BalanceSheetDetails = JSON.parse(JSON.stringify(DEFAULT_BALANCE_SHEET_DETAILS))
  let equityTotal = 0
  let previousEquityTotal = 0
  const warnings: string[] = []
  const fieldConfidence: Record<string, FieldConfidence> = {}
  let hasPrevious = false

  for (const row of rows) {
    const normalized = normalizeStatementLabel(row.label)
    const canonicalKey = BALANCE_FIELD_ALIASES[normalized]

    if (!canonicalKey) {
      if (normalized.length > 2) {
        warnings.push(`Fila no reconocida: "${row.label}"`)
      }
      continue
    }

    const currentVal = parseArgentineAmount(row.currentAmount)
    fieldConfidence[canonicalKey] = { confidence: 0.75, source: "excel" }

    if (canonicalKey === "equityTotal") {
      equityTotal = currentVal
      if (row.previousAmount != null) {
        previousEquityTotal = parseArgentineAmount(row.previousAmount)
        hasPrevious = true
      }
      continue
    }

    // Descomponer "group.field"
    const [group, field] = canonicalKey.split(".")
    if (group && field) {
      const groupObj = details[group as keyof BalanceSheetDetails] as Record<string, number>
      if (groupObj && field in groupObj) {
        groupObj[field] = currentVal
        if (row.previousAmount != null) {
          const prevGroupObj = previousDetails[group as keyof BalanceSheetDetails] as Record<string, number>
          prevGroupObj[field] = parseArgentineAmount(row.previousAmount)
          hasPrevious = true
        }
      }
    }
  }

  return {
    details,
    equityTotal,
    previousDetails: hasPrevious ? previousDetails : undefined,
    previousEquityTotal: hasPrevious ? previousEquityTotal : undefined,
    warnings,
    fieldConfidence,
  }
}

export function mapIncomeRowsToDetails(rows: ExcelStatementRow[]): MappedIncome {
  const details: IncomeStatementDetails = JSON.parse(JSON.stringify(DEFAULT_INCOME_STATEMENT_DETAILS))
  const previousDetails: IncomeStatementDetails = JSON.parse(JSON.stringify(DEFAULT_INCOME_STATEMENT_DETAILS))
  const warnings: string[] = []
  const fieldConfidence: Record<string, FieldConfidence> = {}
  let hasPrevious = false

  for (const row of rows) {
    const normalized = normalizeStatementLabel(row.label)
    const canonicalKey = INCOME_FIELD_ALIASES[normalized]

    if (!canonicalKey) continue

    const currentVal = parseArgentineAmount(row.currentAmount)
    details[canonicalKey as keyof IncomeStatementDetails] = currentVal
    fieldConfidence[canonicalKey] = { confidence: 0.75, source: "excel" }

    if (row.previousAmount != null) {
      previousDetails[canonicalKey as keyof IncomeStatementDetails] = parseArgentineAmount(row.previousAmount)
      hasPrevious = true
    }
  }

  return {
    details,
    previousDetails: hasPrevious ? previousDetails : undefined,
    warnings,
    fieldConfidence,
  }
}
