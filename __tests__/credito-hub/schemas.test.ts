import { describe, it, expect } from "vitest"

import {
  createDocumentJobSchema,
  createDocumentClassificationSchema,
  createExtractedFieldSchema,
  createCanonicalCreditProfileSchema,
  createCreditApplicationSchema,
} from "@/lib/schemas/credito-hub"
import {
  bankRequirementSchema,
  createBankRequirementTemplateSchema,
  createRequirementMatchSchema,
} from "@/lib/schemas/bank-requirements"

const VALID_CUIT = "20304050607" // 11 dígitos

describe("createDocumentJobSchema", () => {
  it("acepta un job válido y aplica defaults", () => {
    const parsed = createDocumentJobSchema.parse({
      documentId: "doc1",
      provider: "mock",
      fileHash: "abc123",
    })
    expect(parsed.encryptionStatus).toBe("plaintext")
    expect(parsed.maxAttempts).toBe(3)
  })

  it("rechaza encryptionStatus fuera del enum", () => {
    expect(() =>
      createDocumentJobSchema.parse({
        documentId: "doc1",
        provider: "mock",
        fileHash: "abc",
        encryptionStatus: "wrapped",
      }),
    ).toThrow()
  })

  it("rechaza job sin documentId", () => {
    expect(() =>
      createDocumentJobSchema.parse({ provider: "mock", fileHash: "abc" }),
    ).toThrow()
  })
})

describe("createDocumentClassificationSchema", () => {
  it("acepta clasificación con CUIT de 11 dígitos", () => {
    const parsed = createDocumentClassificationSchema.parse({
      documentId: "doc1",
      documentType: "balance_sheet",
      cuit: VALID_CUIT,
      confidence: 0.9,
    })
    expect(parsed.cuit).toBe(VALID_CUIT)
    expect(parsed.needsReview).toBe(false)
  })

  it("rechaza CUIT que no tiene 11 dígitos", () => {
    expect(() =>
      createDocumentClassificationSchema.parse({
        documentId: "doc1",
        documentType: "balance_sheet",
        cuit: "12345",
        confidence: 0.5,
      }),
    ).toThrow()
  })

  it("rechaza confidence fuera de rango (>1)", () => {
    expect(() =>
      createDocumentClassificationSchema.parse({
        documentId: "doc1",
        documentType: "balance_sheet",
        confidence: 1.5,
      }),
    ).toThrow()
  })

  it("rechaza confidence negativo", () => {
    expect(() =>
      createDocumentClassificationSchema.parse({
        documentId: "doc1",
        documentType: "balance_sheet",
        confidence: -0.1,
      }),
    ).toThrow()
  })
})

describe("createExtractedFieldSchema", () => {
  it("acepta un campo extraído con procedencia completa", () => {
    const parsed = createExtractedFieldSchema.parse({
      documentId: "doc1",
      pageNumber: 2,
      fieldCode: "currentAssets.cashAndBanks",
      rawLabel: "Caja y Bancos",
      rawValue: "1.000.000",
      normalizedValue: 1000000,
      currency: "ARS",
      unit: null,
      periodStart: null,
      periodEnd: null,
      boundingBox: { x: 0, y: 0, width: 10, height: 5 },
      confidence: 0.87,
      extractionMethod: "TABLE_EXTRACTION",
    })
    expect(parsed.documentVersionId).toBeNull()
    expect(parsed.extractionMethod).toBe("TABLE_EXTRACTION")
  })

  it("rechaza extractionMethod fuera del enum", () => {
    expect(() =>
      createExtractedFieldSchema.parse({
        documentId: "doc1",
        pageNumber: null,
        fieldCode: "netSales",
        rawLabel: null,
        rawValue: null,
        normalizedValue: null,
        currency: null,
        unit: null,
        periodStart: null,
        periodEnd: null,
        boundingBox: null,
        confidence: 0.5,
        extractionMethod: "LLM_GUESS",
      }),
    ).toThrow()
  })

  it("rechaza confidence fuera de rango", () => {
    expect(() =>
      createExtractedFieldSchema.parse({
        documentId: "doc1",
        pageNumber: null,
        fieldCode: "netSales",
        rawLabel: null,
        rawValue: null,
        normalizedValue: null,
        currency: null,
        unit: null,
        periodStart: null,
        periodEnd: null,
        boundingBox: null,
        confidence: 2,
        extractionMethod: "OCR",
      }),
    ).toThrow()
  })
})

describe("createCanonicalCreditProfileSchema", () => {
  it("acepta perfil con identity válida y bloques por defecto", () => {
    const parsed = createCanonicalCreditProfileSchema.parse({
      identity: { cuit: VALID_CUIT, legalName: "Productor SA" },
    })
    expect(parsed.economic.fieldIds).toEqual([])
    expect(parsed.validationState).toBe("incomplete")
  })

  it("rechaza identity con CUIT inválido", () => {
    expect(() =>
      createCanonicalCreditProfileSchema.parse({
        identity: { cuit: "no-numerico", legalName: "X" },
      }),
    ).toThrow()
  })

  it("rechaza validationState fuera del enum", () => {
    expect(() =>
      createCanonicalCreditProfileSchema.parse({
        identity: { cuit: VALID_CUIT, legalName: "X" },
        validationState: "approved",
      }),
    ).toThrow()
  })
})

describe("createCreditApplicationSchema", () => {
  it("acepta solicitud válida con default draft", () => {
    const parsed = createCreditApplicationSchema.parse({
      requestingEntityOrganizationId: "bank1",
      requirementTemplateId: "tpl1",
    })
    expect(parsed.status).toBe("draft")
  })

  it("rechaza requestedAmount negativo", () => {
    expect(() =>
      createCreditApplicationSchema.parse({
        requestingEntityOrganizationId: "bank1",
        requirementTemplateId: "tpl1",
        requestedAmount: -5,
      }),
    ).toThrow()
  })

  it("rechaza status fuera del enum", () => {
    expect(() =>
      createCreditApplicationSchema.parse({
        requestingEntityOrganizationId: "bank1",
        requirementTemplateId: "tpl1",
        status: "paid",
      }),
    ).toThrow()
  })
})

describe("bankRequirementSchema / createBankRequirementTemplateSchema", () => {
  const validRequirement = {
    requirementCode: "BAL_3Y",
    name: "Balances últimos 3 ejercicios",
    description: "Balances certificados",
    category: "contable",
    required: true,
    acceptedFormats: ["pdf"],
    responsibleRole: "ACCOUNTANT" as const,
    validationRules: ["max_age_12m"],
  }

  it("acepta un requirement con responsibleRole válido", () => {
    const parsed = bankRequirementSchema.parse(validRequirement)
    expect(parsed.responsibleRole).toBe("ACCOUNTANT")
  })

  it("rechaza responsibleRole fuera del enum", () => {
    expect(() =>
      bankRequirementSchema.parse({ ...validRequirement, responsibleRole: "MANAGER" }),
    ).toThrow()
  })

  it("acepta template con requirements y default status draft", () => {
    const parsed = createBankRequirementTemplateSchema.parse({
      bankName: "Banco Demo",
      requirements: [validRequirement],
    })
    expect(parsed.status).toBe("draft")
    expect(parsed.version).toBe(1)
    expect(parsed.requirements).toHaveLength(1)
  })

  it("rechaza template status fuera del enum", () => {
    expect(() =>
      createBankRequirementTemplateSchema.parse({
        bankName: "Banco Demo",
        status: "live",
      }),
    ).toThrow()
  })
})

describe("createRequirementMatchSchema", () => {
  it("acepta un match válido", () => {
    const parsed = createRequirementMatchSchema.parse({
      creditApplicationId: "app1",
      requirementCode: "BAL_3Y",
      status: "fulfilled",
      explanation: "Se encontraron los 3 balances",
      responsibleRole: "ACCOUNTANT",
    })
    expect(parsed.matchedDocumentIds).toEqual([])
  })

  it("rechaza MatchStatus fuera del enum", () => {
    expect(() =>
      createRequirementMatchSchema.parse({
        creditApplicationId: "app1",
        requirementCode: "BAL_3Y",
        status: "done",
        explanation: "x",
        responsibleRole: "ACCOUNTANT",
      }),
    ).toThrow()
  })

  it("rechaza match sin creditApplicationId", () => {
    expect(() =>
      createRequirementMatchSchema.parse({
        requirementCode: "BAL_3Y",
        status: "missing",
        explanation: "x",
        responsibleRole: "BANK",
      }),
    ).toThrow()
  })
})
