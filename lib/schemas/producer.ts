import { z } from "zod"

const PERSON_TYPES = ["physical", "legal"] as const

const AGRO_ACTIVITIES = [
  "agriculture",
  "livestock",
  "mixed",
  "horticulture",
  "forestry",
  "other",
] as const

// Regex básico para CUIT argentino: 11 dígitos numéricos
// Formato esperado: 20-12345678-9 o 20123456789
const CUIT_REGEX = /^\d{11}$/

// Schema para crear un productor — organizationId se inyecta en el servicio, no es campo del form
export const createProducerSchema = z.object({
  taxId: z
    .string()
    .regex(CUIT_REGEX, "El CUIT debe contener exactamente 11 dígitos numéricos"),
  legalName: z
    .string()
    .min(2, "La razón social debe tener al menos 2 caracteres")
    .max(200),
  personType: z.enum(PERSON_TYPES),
  activity: z.enum(AGRO_ACTIVITIES),
  province: z.string().min(1, "La provincia es requerida").max(100),
  city: z.string().min(1, "La localidad es requerida").max(100),
  address: z.string().max(300).optional(),
  phone: z.string().max(50).optional(),
  email: z.union([z.string().email("Ingrese un email válido"), z.literal("")]).optional(),
})

export type CreateProducerInput = z.infer<typeof createProducerSchema>

// Schema para actualizar un productor (todos los campos opcionales excepto id)
export const updateProducerSchema = z.object({
  legalName: z
    .string()
    .min(2, "La razón social debe tener al menos 2 caracteres")
    .max(200)
    .optional(),
  personType: z.enum(PERSON_TYPES).optional(),
  activity: z.enum(AGRO_ACTIVITIES).optional(),
  province: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email("Ingrese un email válido").optional(),
})

export type UpdateProducerInput = z.infer<typeof updateProducerSchema>

// Schema para crear un estudio contable
export const createAccountingFirmSchema = z.object({
  organizationId: z.string().min(1, "El ID de organización es requerido"),
  legalName: z
    .string()
    .min(2, "La razón social debe tener al menos 2 caracteres")
    .max(200),
  taxId: z
    .string()
    .regex(CUIT_REGEX, "El CUIT debe contener exactamente 11 dígitos numéricos"),
  contactName: z.string().min(2, "El nombre de contacto es requerido").max(100),
  contactEmail: z.string().email("Ingrese un email válido"),
  contactPhone: z.string().max(50).optional(),
})

export type CreateAccountingFirmInput = z.infer<typeof createAccountingFirmSchema>

// Schema para crear un vínculo productor-contador
export const createAccountantLinkSchema = z.object({
  producerId: z.string().min(1, "El ID del productor es requerido"),
  accountingFirmId: z.string().min(1, "El ID del estudio contable es requerido"),
  accountantUid: z.string().min(1, "El UID del contador es requerido"),
  isMain: z.boolean().default(false),
  canUpload: z.boolean().default(true),
  canAuthorize: z.boolean().default(false),
})

export type CreateAccountantLinkInput = z.infer<typeof createAccountantLinkSchema>
