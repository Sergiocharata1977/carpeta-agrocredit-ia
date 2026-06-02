import * as XLSX from "xlsx"

export interface ExcelStatementRow {
  label: string
  currentAmount: unknown
  previousAmount?: unknown
  sheetName: string
  rowIndex: number
}

export interface StatementWorkbookReadResult {
  rows: ExcelStatementRow[]
  warnings: string[]
}

const ACCOUNTING_KEYWORDS = [
  "activo", "pasivo", "patrimonio", "ventas", "costo", "resultado",
  "caja", "banco", "deuda", "credito", "bien", "ganancia", "perdida",
  "impuesto", "provision", "capital", "reserva", "remuneracion",
]

function looksLikeAccountingSheet(rows: string[][]): boolean {
  const joined = rows.slice(0, 20).flat().join(" ").toLowerCase()
  return ACCOUNTING_KEYWORDS.filter((kw) => joined.includes(kw)).length >= 3
}

function findAmountColumns(headers: unknown[]): { current: number; previous: number | null } {
  const strs = headers.map((h) => String(h ?? "").toLowerCase())

  // Buscar columnas por nombre
  const currentIdx = strs.findIndex((s) =>
    s.includes("actual") || s.includes("corriente") || s.includes("ejercicio") || s.includes("año"),
  )
  const previousIdx = strs.findIndex((s) =>
    s.includes("anterior") || s.includes("comparativo") || s.includes("period"),
  )

  // Fallback: segunda y tercera columna numéricas
  if (currentIdx === -1) {
    const numericCols = strs
      .map((_, i) => i)
      .filter((i) => i > 0) // primera es la etiqueta
    return {
      current: numericCols[0] ?? 1,
      previous: numericCols[1] ?? null,
    }
  }

  return { current: currentIdx, previous: previousIdx === -1 ? null : previousIdx }
}

export function readFinancialStatementWorkbook(buffer: Buffer): StatementWorkbookReadResult {
  const warnings: string[] = []
  const rows: ExcelStatementRow[] = []

  try {
    const workbook = XLSX.read(buffer, { type: "buffer" })

    // Encontrar la hoja con más contenido contable
    let bestSheet: string | null = null
    let bestScore = 0

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]
      const strRows = rawRows.map((row) => row.map(String))
      const score = ACCOUNTING_KEYWORDS.filter((kw) =>
        strRows.slice(0, 30).flat().join(" ").toLowerCase().includes(kw),
      ).length
      if (score > bestScore) {
        bestScore = score
        bestSheet = sheetName
      }
    }

    if (!bestSheet) {
      warnings.push("No se encontró hoja con contenido contable reconocible")
      return { rows, warnings }
    }

    const sheet = workbook.Sheets[bestSheet]
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]

    if (rawRows.length === 0) {
      warnings.push(`Hoja "${bestSheet}" está vacía`)
      return { rows, warnings }
    }

    // Detectar fila de encabezados
    const headerRowIdx = rawRows.findIndex((row) => {
      const str = row.map(String).join(" ").toLowerCase()
      return str.includes("actual") || str.includes("anterior") || str.includes("ejercicio")
    })

    const headerRow = headerRowIdx !== -1 ? rawRows[headerRowIdx] : rawRows[0]
    const { current, previous } = findAmountColumns(headerRow)
    const dataStartIdx = headerRowIdx !== -1 ? headerRowIdx + 1 : 1

    for (let i = dataStartIdx; i < rawRows.length; i++) {
      const row = rawRows[i]
      const label = String(row[0] ?? "").trim()
      if (!label || label.length < 2) continue

      const currentAmount = row[current]
      const previousAmount = previous !== null ? row[previous] : undefined

      rows.push({ label, currentAmount, previousAmount, sheetName: bestSheet, rowIndex: i })
    }

    if (rows.length === 0) {
      warnings.push("No se pudieron extraer filas de datos del Excel")
    }
  } catch (err) {
    warnings.push(`Error al leer Excel: ${err instanceof Error ? err.message : "desconocido"}`)
  }

  return { rows, warnings }
}
