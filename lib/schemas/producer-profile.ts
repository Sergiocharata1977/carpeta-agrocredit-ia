import { z } from "zod"
import { TAX_CONDITIONS } from "@/types/producer-profile"

const profileCurrencySchema = z.enum(["ARS", "USD"])
const optionalTrimmedString = z.string().trim().max(1000).optional()
const optionalTags = z.array(z.string().trim().min(1).max(160)).max(40).optional()
const optionalAmount = z.number().finite().min(0).optional()

export const producerProfilePayloadSchema = z
  .object({
    taxCondition: z.enum(TAX_CONDITIONS).optional(),
    taxCategory: z.string().trim().max(20).optional(),
    activitiesAfip: optionalTags,
    registrationYear: z.number().int().min(1900).max(2100).optional(),
    hasEmployees: z.boolean().optional(),
    employeesCount: z.number().int().min(0).optional(),

    ownHectares: optionalAmount,
    rentedHectares: optionalAmount,
    mainCrops: optionalTags,
    estimatedProduction: optionalTrimmedString,
    currentCampaign: z.string().trim().max(30).optional(),
    mainMachinery: optionalTrimmedString,

    estimatedAnnualSales: optionalAmount,
    estimatedAnnualSalesCurrency: profileCurrencySchema.optional(),
    bankDebts: optionalAmount,
    bankDebtsCurrency: profileCurrencySchema.optional(),
    issuedChecks: optionalAmount,
    rejectedChecks: optionalAmount,
    activeLoans: optionalTrimmedString,
    ruralCards: optionalTrimmedString,
    commercialQuotas: optionalTrimmedString,

    summaryOwnFields: optionalTrimmedString,
    summaryMachinery: optionalTrimmedString,
    summaryVehicles: optionalTrimmedString,
    summarySiloBolsa: optionalTrimmedString,
    summaryLivestock: optionalTrimmedString,
  })
  .strict()

export const producerProfileSchema = producerProfilePayloadSchema.extend({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  updatedBy: z.string().min(1),
  updatedAt: z.string().min(1),
  createdAt: z.string().min(1),
})

export const upsertProducerProfileSchema = producerProfilePayloadSchema

export type ProducerProfilePayload = z.infer<typeof producerProfilePayloadSchema>
export type UpsertProducerProfileInput = z.infer<typeof upsertProducerProfileSchema>
