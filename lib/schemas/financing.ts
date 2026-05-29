import { z } from "zod"

const FINANCING_TYPES = [
  "working_capital",
  "investment",
  "mortgage",
  "commercial_credit",
  "leasing",
  "other",
] as const

const FINANCING_STATUSES = [
  "draft",
  "requested",
  "pending_authorization",
  "documents_received",
  "in_review",
  "observed",
  "approved",
  "rejected",
  "expired",
] as const

const CURRENCIES = ["ARS", "USD"] as const

// Schema para crear una solicitud de financiación
export const createFinancingRequestSchema = z.object({
  targetOrganizationId: z.string().min(1, "El ID de la organización objetivo es requerido"),
  requesterOrganizationId: z
    .string()
    .min(1, "El ID de la organización solicitante es requerido"),
  grantId: z.string().nullable().default(null),
  financingType: z.enum(FINANCING_TYPES),
  amount: z.number().positive("El importe debe ser mayor a 0"),
  currency: z.enum(CURRENCIES),
  termMonths: z
    .number()
    .int("El plazo debe ser un número entero de meses")
    .min(1, "El plazo mínimo es 1 mes")
    .max(360, "El plazo máximo es 360 meses"),
  purpose: z.string().min(1, "El destino del financiamiento es requerido").max(500),
  observations: z.string().max(1000).optional(),
  requiredDocuments: z.array(z.string()).default([]),
})

export type CreateFinancingRequestInput = z.infer<typeof createFinancingRequestSchema>

// Schema para actualizar el estado de una solicitud de financiación
export const updateFinancingStatusSchema = z.object({
  financingRequestId: z.string().min(1, "El ID de la solicitud es requerido"),
  status: z.enum(FINANCING_STATUSES),
  note: z.string().max(1000).optional(),
  observations: z.string().max(1000).optional(),
  requiredDocuments: z.array(z.string()).optional(),
  receivedDocuments: z.array(z.string()).optional(),
})

export type UpdateFinancingStatusInput = z.infer<typeof updateFinancingStatusSchema>
