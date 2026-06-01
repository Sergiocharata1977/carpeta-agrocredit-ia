export const TAX_CONDITIONS = [
  "responsable_inscripto",
  "monotributista",
  "exento",
  "consumidor_final",
  "otro",
] as const

export type TaxCondition = (typeof TAX_CONDITIONS)[number]

export type ProfileCurrency = "ARS" | "USD"

export interface OrganizationProfile {
  id: string
  organizationId: string

  taxCondition?: TaxCondition
  taxCategory?: string
  activitiesAfip?: string[]
  registrationYear?: number
  hasEmployees?: boolean
  employeesCount?: number

  ownHectares?: number
  rentedHectares?: number
  mainCrops?: string[]
  estimatedProduction?: string
  currentCampaign?: string
  mainMachinery?: string

  estimatedAnnualSales?: number
  estimatedAnnualSalesCurrency?: ProfileCurrency
  bankDebts?: number
  bankDebtsCurrency?: ProfileCurrency
  issuedChecks?: number
  rejectedChecks?: number
  activeLoans?: string
  ruralCards?: string
  commercialQuotas?: string

  summaryOwnFields?: string
  summaryMachinery?: string
  summaryVehicles?: string
  summarySiloBolsa?: string
  summaryLivestock?: string

  updatedBy: string
  updatedAt: string
  createdAt: string
}

export type ProducerProfileUpsertInput = Partial<
  Omit<OrganizationProfile, "id" | "organizationId" | "updatedBy" | "updatedAt" | "createdAt">
>
