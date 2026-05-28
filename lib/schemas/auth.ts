import { z } from "zod"

const USER_ROLES = [
  "admin_platform",
  "producer",
  "accountant",
  "accounting_firm_admin",
  "bank_user",
  "agro_company_user",
] as const

const ORGANIZATION_TYPES = [
  "platform",
  "producer",
  "accounting_firm",
  "bank",
  "financial_entity",
  "agro_company",
] as const

const ORGANIZATION_PLANS = ["free", "basic", "pro", "enterprise"] as const

// Schema para crear una organización
export const createOrganizationSchema = z.object({
  type: z.enum(ORGANIZATION_TYPES),
  legalName: z.string().min(2, "El nombre legal debe tener al menos 2 caracteres").max(200),
  taxId: z.string().min(1, "El CUIT/CUIL es requerido").max(50),
  plan: z.enum(ORGANIZATION_PLANS).default("free"),
})

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

// Schema para invitar un miembro a una organización
export const inviteMemberSchema = z.object({
  email: z.string().email("Ingrese un email válido"),
  role: z.enum(USER_ROLES),
  organizationId: z.string().min(1, "El ID de organización es requerido"),
})

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

// Schema para actualizar el perfil de usuario
export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100)
    .optional(),
  defaultOrganizationId: z.string().nullable().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
