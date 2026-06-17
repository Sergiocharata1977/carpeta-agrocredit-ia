import { z } from "zod"

const CUIT_REGEX = /^\d{11}$/

export const registrationSchema = z.object({
  email: z.string().email("Email inválido"),
  // Piso de 6: Firebase Auth no acepta contraseñas más cortas. Subir a 8 antes de producción firme.
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  displayName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  role: z.enum(["system_user", "accountant", "requesting_entity_user", "accounting_firm", "requesting_entity"]),
})

export const systemUserOrgSchema = z.object({
  legalName: z.string().min(3, "Razón social muy corta").max(120),
  taxId: z.string().regex(CUIT_REGEX, "El CUIT debe tener 11 dígitos sin guiones"),
  personType: z.enum(["physical", "legal"]),
  activity: z.enum(["agriculture", "livestock", "mixed", "horticulture", "forestry", "other"]),
  province: z.string().min(2),
  city: z.string().min(2),
  address: z.string().max(300).optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
})

export const systemUserEntitySchema = z.object({
  legalName: z.string().min(3).max(120),
  taxId: z.string().regex(CUIT_REGEX, "El CUIT debe tener 11 dígitos sin guiones"),
  activity: z.enum(["agriculture", "livestock", "mixed", "horticulture", "forestry", "other"]),
  province: z.string().min(2),
  city: z.string().min(2),
  entityOwnersText: z.string().trim().max(1000).optional().or(z.literal("")),
})

export const accountantSelectionSchema = z.object({
  accountingFirmId: z.string().min(1, "Seleccioná un estudio contable"),
  accountantUid: z.string().optional(),
})

export const systemUserOnboardingSchema = z.object({
  registration: registrationSchema,
  organization: systemUserOrgSchema,
  entities: z.array(systemUserEntitySchema).default([]),
  accountant: accountantSelectionSchema.optional(),
})

export const accountingFirmOnboardingSchema = z.object({
  registration: registrationSchema,
  firm: z.object({
    legalName: z.string().min(3).max(120),
    taxId: z.string().regex(CUIT_REGEX, "El CUIT debe tener 11 dígitos sin guiones"),
    contactName: z.string().min(2).max(100),
    contactPhone: z.string().optional(),
  }),
})

export const requestingEntitySubtypeSchema = z.enum([
  "bank",
  "financial_entity",
  "agro_company",
  "maquinaria_agricola",
  "insumos_agricolas",
])

export const requestingEntityOnboardingSchema = z.object({
  registration: registrationSchema,
  entity: z.object({
    legalName: z.string().min(3).max(120),
    taxId: z.string().regex(CUIT_REGEX, "El CUIT debe tener 11 dígitos sin guiones"),
    subtype: requestingEntitySubtypeSchema,
    contactName: z.string().min(2).max(100),
    contactEmail: z.string().email("Email de contacto inválido"),
    contactPhone: z.string().optional(),
    sector: z.string().optional(),
  }),
})

// Schema para que el admin de plataforma cree una entidad solicitante
// (banco/financiera/agro/etc.) directamente, sin crear usuario ni membership.
export const adminCreateRequestingEntitySchema = z.object({
  legalName: z.string().min(3, "Razón social muy corta").max(120),
  taxId: z.string().regex(CUIT_REGEX, "El CUIT debe tener 11 dígitos sin guiones"),
  subtype: requestingEntitySubtypeSchema,
  contactName: z.string().min(2).max(100).optional(),
  contactEmail: z.string().email("Email de contacto inválido").optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional(),
  sector: z.string().max(80).optional(),
})

// Schema para crear una empresa hija (system_user_entity) desde el dashboard
export const addEntitySchema = z.object({
  legalName: z.string().min(3).max(120),
  taxId: z.string().regex(CUIT_REGEX, "El CUIT debe tener 11 dígitos sin guiones"),
  activity: z.enum(["agriculture", "livestock", "mixed", "horticulture", "forestry", "other"]),
  province: z.string().min(2),
  city: z.string().min(2),
  entityOwnersText: z.string().trim().max(1000).optional().or(z.literal("")),
})

// Schema para la solicitud de acceso con duración en días
export const accessRequestWithDaysSchema = z.object({
  targetOrganizationId: z.string().min(1),
  targetScope: z.enum(["single_organization", "group"]),
  requestedScopes: z.array(z.enum([
    "profile_basic",
    "accounting_summary",
    "balance_sheets",
    "income_statements",
    "tax_documents",
    "assets",
    "liabilities",
    "documents",
    "full_credit_folder",
  ])).min(1, "Seleccioná al menos un scope"),
  purpose: z.string().min(10, "Describí el propósito del acceso").max(500),
  requestedDays: z.number().int().min(1).max(365),
})
