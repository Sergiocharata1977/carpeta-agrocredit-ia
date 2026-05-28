import type { UserRole } from "./auth"

// Estado de la carpeta del productor
export type FolderStatus =
  | "incomplete"
  | "in_progress"
  | "complete"
  | "under_review"
  | "archived"

// Tipo de persona jurídica
export type PersonType = "physical" | "legal"

// Actividad agropecuaria principal
export type AgroActivity =
  | "agriculture"
  | "livestock"
  | "mixed"
  | "horticulture"
  | "forestry"
  | "other"

// Productor agropecuario (colección: producers)
export interface Producer {
  id: string
  organizationId: string
  taxId: string // CUIT
  legalName: string
  personType: PersonType
  activity: AgroActivity
  province: string
  city: string
  address?: string
  phone?: string
  email?: string
  folderStatus: FolderStatus
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Estudio contable (colección: accounting_firms)
export interface AccountingFirm {
  id: string
  organizationId: string
  legalName: string
  taxId: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  status: "active" | "suspended"
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Vínculo productor-contador (colección: producer_accountant_links)
export interface ProducerAccountantLink {
  id: string
  producerId: string
  accountingFirmId: string
  accountantUid: string
  status: "active" | "inactive" | "pending"
  isMain: boolean // contador principal
  canUpload: boolean // puede cargar documentos
  canAuthorize: boolean // puede autorizar accesos (delegación explícita, requiere audit)
  createdAt: string
  updatedAt: string
  createdBy: string
}

// Suppress unused import warning — UserRole is available for consumers of this module
export type { UserRole }
