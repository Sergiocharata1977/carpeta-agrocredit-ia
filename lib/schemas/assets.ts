import { z } from "zod"

const ASSET_TYPES = [
  "real_estate",
  "vehicle",
  "machinery",
  "livestock",
  "other_movable",
] as const

const LIEN_STATUSES = ["free", "mortgaged", "pledged", "seized", "other"] as const

const OWNERSHIP_TYPES = ["own", "shared", "leased", "other"] as const

const CURRENCIES = ["ARS", "USD"] as const

const LIABILITY_TYPES = [
  "bank_loan",
  "commercial_credit",
  "leasing",
  "mortgage",
  "pledge",
  "tax_debt",
  "other",
] as const

// Schema para crear un bien
export const createAssetSchema = z.object({
  producerId: z.string().min(1, "El ID del productor es requerido"),
  organizationId: z.string().min(1, "El ID de organización es requerido"),
  assetType: z.enum(ASSET_TYPES),
  category: z.string().min(1, "La categoría es requerida").max(100),
  description: z.string().min(1, "La descripción es requerida").max(500),
  estimatedValue: z
    .number()
    .positive("El valor estimado debe ser mayor a 0"),
  currency: z.enum(CURRENCIES),
  lienStatus: z.enum(LIEN_STATUSES),
  ownershipType: z.enum(OWNERSHIP_TYPES),
  ownershipPercentage: z
    .number()
    .min(0, "El porcentaje no puede ser negativo")
    .max(100, "El porcentaje no puede superar 100")
    .optional(),
  documentIds: z.array(z.string()).default([]),
  observations: z.string().max(1000).optional(),
  // Solo inmuebles
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  hectares: z.number().positive("Las hectáreas deben ser mayor a 0").optional(),
  cadastralRef: z.string().max(100).optional(),
  fiscalValuation: z.number().min(0).optional(),
  // Solo muebles/vehículos
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z
    .number()
    .int("El año debe ser un entero")
    .min(1900, "Año no válido")
    .max(2100, "Año no válido")
    .optional(),
  identifier: z.string().max(100).optional(),
})

export type CreateAssetInput = z.infer<typeof createAssetSchema>

// Schema para actualizar un bien
export const updateAssetSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  estimatedValue: z.number().positive("El valor estimado debe ser mayor a 0").optional(),
  currency: z.enum(CURRENCIES).optional(),
  lienStatus: z.enum(LIEN_STATUSES).optional(),
  ownershipType: z.enum(OWNERSHIP_TYPES).optional(),
  ownershipPercentage: z.number().min(0).max(100).optional(),
  documentIds: z.array(z.string()).optional(),
  observations: z.string().max(1000).optional(),
  province: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  hectares: z.number().positive().optional(),
  cadastralRef: z.string().max(100).optional(),
  fiscalValuation: z.number().min(0).optional(),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  identifier: z.string().max(100).optional(),
})

export type UpdateAssetInput = z.infer<typeof updateAssetSchema>

// Schema para crear un pasivo/deuda
export const createLiabilitySchema = z.object({
  producerId: z.string().min(1, "El ID del productor es requerido"),
  organizationId: z.string().min(1, "El ID de organización es requerido"),
  creditor: z.string().min(1, "El acreedor es requerido").max(200),
  liabilityType: z.enum(LIABILITY_TYPES),
  amount: z.number().positive("El importe debe ser mayor a 0"),
  currency: z.enum(CURRENCIES),
  dueDate: z.string().min(1, "La fecha de vencimiento es requerida"),
  guaranteeType: z.string().max(200).optional(),
  observations: z.string().max(1000).optional(),
  documentIds: z.array(z.string()).default([]),
})

export type CreateLiabilityInput = z.infer<typeof createLiabilitySchema>
