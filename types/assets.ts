// Tipo de bien
export type AssetType = "real_estate" | "vehicle" | "machinery" | "livestock" | "other_movable"

// Estado de gravamen
export type LienStatus = "free" | "mortgaged" | "pledged" | "seized" | "other"

// Titularidad
export type OwnershipType = "own" | "shared" | "leased" | "other"

// Bien (colección: assets)
export interface Asset {
  id: string
  producerId: string
  organizationId: string
  assetType: AssetType
  category: string
  // Campos comunes
  description: string
  estimatedValue: number
  currency: "ARS" | "USD"
  lienStatus: LienStatus
  ownershipType: OwnershipType
  ownershipPercentage?: number
  documentIds: string[]
  observations?: string
  // Solo inmuebles
  province?: string
  city?: string
  address?: string
  hectares?: number
  cadastralRef?: string
  fiscalValuation?: number
  // Solo muebles/vehículos
  brand?: string
  model?: string
  year?: number
  identifier?: string // dominio, chasis, número de serie
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Tipo de pasivo
export type LiabilityType =
  | "bank_loan"
  | "commercial_credit"
  | "leasing"
  | "mortgage"
  | "pledge"
  | "tax_debt"
  | "other"

// Pasivo/deuda (colección: liabilities)
export interface Liability {
  id: string
  producerId: string
  organizationId: string
  creditor: string
  liabilityType: LiabilityType
  amount: number
  currency: "ARS" | "USD"
  dueDate: string
  guaranteeType?: string
  observations?: string
  documentIds: string[]
  createdAt: string
  updatedAt: string
  createdBy: string
}
