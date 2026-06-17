import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AIExtractionResult } from "@/lib/ai/AIProvider"

// ─── Mock de resolveAIProvider: nunca llama red ni carga SDKs/Firestore ───────
const mockExtractStructured = vi.fn<
  (...args: unknown[]) => Promise<AIExtractionResult>
>()

vi.mock("@/lib/ai/provider-config", () => ({
  resolveAIProvider: async () => ({
    name: "mock-test",
    classifyDocument: vi.fn(),
    extractStructured: mockExtractStructured,
    complete: vi.fn(),
  }),
}))

import {
  extractBalance,
  extractIncome,
  extractIvaReturn,
  extractForm931,
  type ExtractorParams,
} from "@/lib/ai/extraction/extractors"
import type { ExtractedField } from "@/types/credito-hub"

const BASE_PARAMS: ExtractorParams = {
  buffer: Buffer.from("documento-test"),
  mimeType: "application/pdf",
  folderOwnerOrganizationId: "org-legajo-001",
  documentId: "doc-abc-123",
  fileName: "estado.pdf",
  defaultCurrency: "ARS",
}

function mockResult(fields: AIExtractionResult["fields"]): AIExtractionResult {
  return { fields, warnings: [], overallConfidence: 0.85 }
}

beforeEach(() => {
  vi.clearAllMocks()
})

/** Aserción de procedencia COMPLETA en cada campo extraído. */
function assertProvenance(field: ExtractedField, expected: { documentId: string }) {
  expect(field.id).toBeTruthy()
  expect(field.documentId).toBe(expected.documentId)
  expect(field.folderOwnerOrganizationId).toBe(BASE_PARAMS.folderOwnerOrganizationId)
  expect(field.extractionMethod).toBe("VISION_MODEL")
  expect(field.reviewStatus).toBe("PENDING")
  expect(typeof field.confidence).toBe("number")
  expect(field.confidence).toBeGreaterThanOrEqual(0)
  expect(field.confidence).toBeLessThanOrEqual(1)
  expect(field.createdAt).toBeTruthy()
  // pageNumber: presente (número) o explícitamente null — nunca undefined.
  expect(field.pageNumber === null || typeof field.pageNumber === "number").toBe(true)
}

describe("extractBalance", () => {
  it("produce ExtractedField con procedencia completa y página del provider", async () => {
    mockExtractStructured.mockResolvedValue(
      mockResult({
        cashAndBanks: { value: 1_250_000, confidence: 0.9, page: 1, rawText: "Caja 1.250.000" },
        equityTotal: { value: 16_650_000, confidence: 0.8, page: 2, rawText: "PN 16.650.000" },
      }),
    )

    const fields = await extractBalance(BASE_PARAMS)

    expect(fields).toHaveLength(2)
    for (const f of fields) assertProvenance(f, { documentId: "doc-abc-123" })

    const cash = fields.find((f) => f.fieldCode === "cashAndBanks")!
    expect(cash.pageNumber).toBe(1)
    expect(cash.confidence).toBe(0.9)
    expect(cash.normalizedValue).toBe(1_250_000)
    expect(cash.currency).toBe("ARS")
    expect(cash.rawValue).toBe("Caja 1.250.000")

    const equity = fields.find((f) => f.fieldCode === "equityTotal")!
    expect(equity.pageNumber).toBe(2)
  })
})

describe("extractIncome", () => {
  it("mapea campos del estado de resultados con procedencia", async () => {
    mockExtractStructured.mockResolvedValue(
      mockResult({
        netSales: { value: 42_800_000, confidence: 0.95, page: 1, rawText: "Ventas 42.800.000" },
        costOfGoodsSold: { value: -20_000_000, confidence: 0.7, page: 1, rawText: null },
      }),
    )

    const fields = await extractIncome(BASE_PARAMS)
    expect(fields).toHaveLength(2)
    for (const f of fields) assertProvenance(f, { documentId: "doc-abc-123" })
    expect(fields.find((f) => f.fieldCode === "netSales")!.normalizedValue).toBe(42_800_000)
  })
})

describe("extractIvaReturn", () => {
  it("marca período en periodStart/periodEnd y conserva procedencia", async () => {
    mockExtractStructured.mockResolvedValue(
      mockResult({
        debitoFiscal: { value: 5_000_000, confidence: 0.88, page: 1, rawText: "Débito 5.000.000" },
        creditoFiscal: { value: 3_200_000, confidence: 0.84, page: 1, rawText: "Crédito 3.200.000" },
        periodo: { value: "2024-12", confidence: 0.99, page: 1, rawText: "Período 12/2024" },
      }),
    )

    const fields = await extractIvaReturn(BASE_PARAMS)
    expect(fields).toHaveLength(3)
    for (const f of fields) assertProvenance(f, { documentId: "doc-abc-123" })

    const periodo = fields.find((f) => f.fieldCode === "periodo")!
    expect(periodo.periodStart).toBe("2024-12")
    expect(periodo.periodEnd).toBe("2024-12")
    expect(periodo.normalizedValue).toBe("2024-12")
    // String → sin moneda.
    expect(periodo.currency).toBeNull()

    const debito = fields.find((f) => f.fieldCode === "debitoFiscal")!
    expect(debito.currency).toBe("ARS")
  })
})

describe("extractForm931", () => {
  it("extrae empleados/remuneraciones/contribuciones con procedencia y página null si falta", async () => {
    mockExtractStructured.mockResolvedValue(
      mockResult({
        empleados: { value: 12, confidence: 0.9, rawText: "12 empleados" },
        remuneraciones: { value: 8_400_000, confidence: 0.85, page: 1, rawText: null },
        contribuciones: { value: 1_700_000, confidence: 0.83, page: 1, rawText: null },
        periodo: { value: "2024-11", confidence: 0.97, page: 1, rawText: null },
      }),
    )

    const fields = await extractForm931(BASE_PARAMS)
    expect(fields).toHaveLength(4)
    for (const f of fields) assertProvenance(f, { documentId: "doc-abc-123" })

    // page ausente en el provider → pageNumber null (procedencia explícita).
    const empleados = fields.find((f) => f.fieldCode === "empleados")!
    expect(empleados.pageNumber).toBeNull()

    const periodo = fields.find((f) => f.fieldCode === "periodo")!
    expect(periodo.periodStart).toBe("2024-11")
  })

  it("pasa el documentType como hint al provider", async () => {
    mockExtractStructured.mockResolvedValue(mockResult({}))
    await extractForm931(BASE_PARAMS)
    expect(mockExtractStructured).toHaveBeenCalledWith(
      BASE_PARAMS.buffer,
      BASE_PARAMS.mimeType,
      expect.any(String),
      expect.objectContaining({ documentType: "f931", fileName: "estado.pdf" }),
    )
  })
})

// ─── Servicios Admin SDK con Firestore mockeado ───────────────────────────────

describe("services con Admin SDK mockeado", () => {
  it("saveFields persiste en batch y audita field.extracted por documento", async () => {
    vi.resetModules()

    const batchSet = vi.fn()
    const batchCommit = vi.fn().mockResolvedValue(undefined)
    const docFn = vi.fn((id?: string) => ({ id: id ?? "auto-generated-id" }))
    const collectionFn = vi.fn(() => ({ doc: docFn }))
    const batchFn = vi.fn(() => ({ set: batchSet, commit: batchCommit }))

    vi.doMock("@/lib/firebase/admin-sdk", () => ({
      getAdminDb: () => ({ collection: collectionFn, batch: batchFn }),
    }))
    const writeAuditLog = vi.fn().mockResolvedValue(undefined)
    vi.doMock("@/lib/firebase/audit", () => ({ writeAuditLog }))

    const { saveFields } = await import("@/lib/services/extracted-fields")

    const field: ExtractedField = {
      id: "field-1",
      folderOwnerOrganizationId: "org-legajo-001",
      documentId: "doc-abc-123",
      documentVersionId: null,
      pageNumber: 1,
      fieldCode: "cashAndBanks",
      rawLabel: null,
      rawValue: "Caja 1.250.000",
      normalizedValue: 1_250_000,
      currency: "ARS",
      unit: null,
      periodStart: null,
      periodEnd: null,
      boundingBox: null,
      confidence: 0.9,
      extractionMethod: "VISION_MODEL",
      reviewStatus: "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      correctionReason: null,
      createdAt: new Date().toISOString(),
    }

    const ids = await saveFields([field], {
      actorUid: "uid-contador",
      actorOrganizationId: "org-estudio",
    })

    expect(ids).toEqual(["field-1"])
    expect(batchSet).toHaveBeenCalledTimes(1)
    expect(batchCommit).toHaveBeenCalledTimes(1)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "field.extracted", targetId: "doc-abc-123" }),
    )
  })

  it("upsertProfileFromFields crea perfil v1 y audita canonical_profile.updated", async () => {
    vi.resetModules()

    const setFn = vi.fn().mockResolvedValue(undefined)
    const docFn = vi.fn(() => ({ id: "profile-1", set: setFn }))
    const getFn = vi.fn().mockResolvedValue({ empty: true, docs: [] })
    const limitFn = vi.fn(() => ({ get: getFn }))
    const whereFn = vi.fn(() => ({ limit: limitFn }))
    const collectionFn = vi.fn(() => ({ doc: docFn, where: whereFn }))

    vi.doMock("@/lib/firebase/admin-sdk", () => ({
      getAdminDb: () => ({ collection: collectionFn }),
    }))
    vi.doMock("firebase-admin/firestore", () => ({
      FieldValue: { serverTimestamp: () => "SERVER_TS" },
    }))
    const writeAuditLog = vi.fn().mockResolvedValue(undefined)
    vi.doMock("@/lib/firebase/audit", () => ({ writeAuditLog }))

    const { upsertProfileFromFields } = await import("@/lib/services/canonical-profile")

    const makeField = (fieldCode: string, reviewed: boolean): ExtractedField => ({
      id: `f-${fieldCode}`,
      folderOwnerOrganizationId: "org-legajo-001",
      documentId: "doc-abc-123",
      documentVersionId: null,
      pageNumber: 1,
      fieldCode,
      rawLabel: null,
      rawValue: null,
      normalizedValue: 1,
      currency: "ARS",
      unit: null,
      periodStart: null,
      periodEnd: null,
      boundingBox: null,
      confidence: 0.9,
      extractionMethod: "VISION_MODEL",
      reviewStatus: reviewed ? "CONFIRMED" : "PENDING",
      reviewedBy: null,
      reviewedAt: null,
      correctionReason: null,
      createdAt: new Date().toISOString(),
    })

    const profile = await upsertProfileFromFields(
      "org-legajo-001",
      [
        makeField("netSales", false), // economic
        makeField("loans", false), // financial
        makeField("debitoFiscal", false), // fiscal
        makeField("cashAndBanks", false), // financial
        makeField("equityTotal", false), // patrimonial
      ],
      { actorUid: "uid-contador", actorOrganizationId: "org-estudio" },
    )

    expect(profile.version).toBe(1)
    expect(profile.validationState).toBe("incomplete")
    expect(profile.economic.fieldIds).toContain("f-netSales")
    expect(profile.financial.fieldIds).toEqual(
      expect.arrayContaining(["f-loans", "f-cashAndBanks"]),
    )
    expect(profile.fiscal.fieldIds).toContain("f-debitoFiscal")
    expect(profile.patrimonial.fieldIds).toContain("f-equityTotal")
    expect(setFn).toHaveBeenCalledTimes(1)
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: "canonical_profile.updated" }),
    )
  })
})
