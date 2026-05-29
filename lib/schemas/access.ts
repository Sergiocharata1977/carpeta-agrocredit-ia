import { z } from "zod"

const ACCESS_SCOPES = [
  "profile_basic",
  "accounting_summary",
  "balance_sheets",
  "income_statements",
  "tax_documents",
  "assets",
  "liabilities",
  "documents",
  "full_credit_folder",
] as const

// Schema para crear una solicitud de acceso
export const createAccessRequestSchema = z.object({
  targetOrganizationId: z.string().min(1, "El ID de la organización objetivo es requerido"),
  targetScope: z.enum(["single_organization", "group"]),
  requesterOrganizationId: z.string().min(1, "El ID de la organización solicitante es requerido"),
  requestedScopes: z.array(z.enum(ACCESS_SCOPES)).min(1, "Seleccioná al menos un scope de acceso"),
  purpose: z.string().min(1, "El propósito es requerido").max(500),
  requestedDays: z
    .number()
    .int("Debe ser un número entero de días")
    .min(1, "El plazo mínimo es 1 día")
    .max(365, "El plazo máximo es 365 días"),
})

export type CreateAccessRequestInput = z.infer<typeof createAccessRequestSchema>

// Schema para aprobar una solicitud de acceso
export const approveAccessRequestSchema = z.object({
  accessRequestId: z.string().min(1, "El ID de la solicitud es requerido"),
  allowedScopes: z.array(z.enum(ACCESS_SCOPES)).min(1, "Aprobá al menos un scope de acceso"),
  approvedDays: z
    .number()
    .int("Debe ser un número entero de días")
    .min(1, "El plazo mínimo es 1 día")
    .max(365, "El plazo máximo es 365 días"),
})

export type ApproveAccessRequestInput = z.infer<typeof approveAccessRequestSchema>

// Schema para revocar un grant de acceso
export const revokeAccessGrantSchema = z.object({
  accessGrantId: z.string().min(1, "El ID del grant es requerido"),
  reason: z.string().max(500).optional(),
})

export type RevokeAccessGrantInput = z.infer<typeof revokeAccessGrantSchema>
