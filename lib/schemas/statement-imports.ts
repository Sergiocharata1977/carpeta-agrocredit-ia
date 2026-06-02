import { z } from "zod"

export const STATEMENT_IMPORT_KINDS = ["balance_sheet", "income_statement", "combined"] as const
export const STATEMENT_IMPORT_CURRENCIES = ["ARS", "USD"] as const

// Schema para iniciar una extracción (multipart — se validan campos no-file)
export const extractStatementSchema = z.object({
  producerId: z.string().min(1, "producerId requerido"),
  periodId: z.string().min(1, "periodId requerido"),
  kind: z.enum(STATEMENT_IMPORT_KINDS),
  currency: z.enum(STATEMENT_IMPORT_CURRENCIES).optional().default("ARS"),
})

export type ExtractStatementInput = z.infer<typeof extractStatementSchema>

// Schema para revisar/editar un import draft (PATCH parcial)
export const reviewStatementImportSchema = z.object({
  extractedBalance: z
    .object({
      details: z.record(z.unknown()).optional(),
      equityTotal: z.number().optional(),
      currency: z.enum(STATEMENT_IMPORT_CURRENCIES).optional(),
    })
    .optional(),
  extractedIncomeStatement: z
    .object({
      details: z.record(z.unknown()).optional(),
      currency: z.enum(STATEMENT_IMPORT_CURRENCIES).optional(),
    })
    .optional(),
})

export type ReviewStatementImportInput = z.infer<typeof reviewStatementImportSchema>

// Schema para aplicar un import a balance/resultados reales
export const applyStatementImportSchema = z.object({
  applyBalance: z.boolean().optional().default(false),
  applyIncomeStatement: z.boolean().optional().default(false),
})

export type ApplyStatementImportInput = z.infer<typeof applyStatementImportSchema>
