import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AIClassificationResult, AIProvider } from "@/lib/ai/AIProvider"

// ─── Mock del factory getAIProvider para inyectar un provider controlado ──────
const mockClassifyDocument = vi.fn()

vi.mock("@/lib/ai", () => ({
  getAIProvider: (): AIProvider => ({
    name: "mock-test",
    classifyDocument: mockClassifyDocument,
    extractStructured: vi.fn(),
    complete: vi.fn(),
  }),
}))

// ─── Mock del Admin SDK + audit para el servicio (sin tocar Firestore real) ───
const mockAdd = vi.fn()
const mockWhere = vi.fn()
const mockGet = vi.fn()
const mockCollection = vi.fn()
const mockWriteAuditLog = vi.fn()

vi.mock("@/lib/firebase/admin-sdk", () => ({
  getAdminDb: () => ({ collection: mockCollection }),
}))

vi.mock("@/lib/firebase/audit", () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}))

// firebase-admin/firestore: FieldValue.serverTimestamp + Timestamp clase.
vi.mock("firebase-admin/firestore", () => {
  class Timestamp {
    constructor(public ms: number) {}
    toMillis() {
      return this.ms
    }
    toDate() {
      return new Date(this.ms)
    }
  }
  return {
    FieldValue: { serverTimestamp: () => "__server_ts__" },
    Timestamp,
  }
})

import { classify, NEEDS_REVIEW_THRESHOLD } from "@/lib/ai/classification/document-classifier"
import {
  saveClassification,
  getClassificationByDocument,
} from "@/lib/services/document-classification"

function aiResult(overrides: Partial<AIClassificationResult> = {}): AIClassificationResult {
  return {
    documentType: "estado_situacion_patrimonial",
    confidence: 0.9,
    warnings: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Cadena por defecto del Admin SDK: collection().add() y collection().where().get()
  mockGet.mockResolvedValue({ empty: true, docs: [] })
  mockWhere.mockReturnValue({ get: mockGet })
  mockAdd.mockResolvedValue({ id: "class-id-1" })
  mockCollection.mockReturnValue({ add: mockAdd, where: mockWhere })
})

describe("classify (document-classifier)", () => {
  it("clasifica sin romper y NO marca review con confidence alta", async () => {
    mockClassifyDocument.mockResolvedValue(aiResult({ confidence: 0.92 }))

    const out = await classify(Buffer.from("x"), "application/pdf", { fileName: "balance.pdf" })

    expect(out.documentType).toBe("estado_situacion_patrimonial")
    expect(out.confidence).toBe(0.92)
    expect(out.needsReview).toBe(false)
    expect(mockClassifyDocument).toHaveBeenCalledOnce()
  })

  it("marca needsReview cuando confidence < umbral", async () => {
    mockClassifyDocument.mockResolvedValue(aiResult({ confidence: NEEDS_REVIEW_THRESHOLD - 0.01 }))

    const out = await classify(Buffer.from("x"), "image/png")

    expect(out.needsReview).toBe(true)
  })

  it("NO marca needsReview justo en el umbral (>=)", async () => {
    mockClassifyDocument.mockResolvedValue(aiResult({ confidence: NEEDS_REVIEW_THRESHOLD }))

    const out = await classify(Buffer.from("x"), "image/png")

    expect(out.needsReview).toBe(false)
  })

  it("normaliza tipos no soportados a 'desconocido'", async () => {
    mockClassifyDocument.mockResolvedValue(aiResult({ documentType: "factura_c", confidence: 0.8 }))

    const out = await classify(Buffer.from("x"), "image/png")

    expect(out.documentType).toBe("desconocido")
  })

  it("clampea confidence fuera de rango", async () => {
    mockClassifyDocument.mockResolvedValue(aiResult({ confidence: 1.5 }))
    const high = await classify(Buffer.from("x"), "image/png")
    expect(high.confidence).toBe(1)

    mockClassifyDocument.mockResolvedValue(aiResult({ confidence: -0.2 }))
    const low = await classify(Buffer.from("x"), "image/png")
    expect(low.confidence).toBe(0)
    expect(low.needsReview).toBe(true)
  })

  it("propaga campos opcionales presentes y omite los ausentes", async () => {
    mockClassifyDocument.mockResolvedValue(
      aiResult({ cuit: "30-12345678-9", period: "2024", confidence: 0.95 }),
    )

    const out = await classify(Buffer.from("x"), "image/png")

    expect(out.cuit).toBe("30-12345678-9")
    expect(out.period).toBe("2024")
    expect(out.issuer).toBeUndefined()
  })
})

describe("saveClassification (service)", () => {
  it("persiste, audita document.classified y devuelve el doc con id", async () => {
    const result = await saveClassification({
      documentId: "doc-1",
      folderOwnerOrganizationId: "org-1",
      classification: {
        documentType: "ddjj_iva",
        confidence: 0.85,
        needsReview: false,
        cuit: "30-12345678-9",
      },
      actorUid: "user-1",
      actorOrganizationId: "org-actor",
    })

    expect(mockCollection).toHaveBeenCalledWith("document_classifications")
    expect(mockAdd).toHaveBeenCalledOnce()

    const written = mockAdd.mock.calls[0][0]
    expect(written.documentId).toBe("doc-1")
    expect(written.folderOwnerOrganizationId).toBe("org-1")
    expect(written.documentType).toBe("ddjj_iva")
    expect(written.cuit).toBe("30-12345678-9")
    expect(written.createdAt).toBe("__server_ts__")

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "document.classified",
        targetType: "document",
        targetId: "doc-1",
        metadata: { documentType: "ddjj_iva", confidence: 0.85 },
      }),
    )

    expect(result.id).toBe("class-id-1")
    expect(typeof result.createdAt).toBe("string")
  })
})

describe("getClassificationByDocument (service)", () => {
  it("devuelve null si no hay clasificaciones", async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] })

    const result = await getClassificationByDocument("doc-x")

    expect(mockWhere).toHaveBeenCalledWith("documentId", "==", "doc-x")
    expect(result).toBeNull()
  })

  it("devuelve la clasificación más reciente por createdAt", async () => {
    const { Timestamp } = await import("firebase-admin/firestore")
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "old",
          data: () => ({
            documentId: "doc-1",
            folderOwnerOrganizationId: "org-1",
            documentType: "estado_resultados",
            confidence: 0.6,
            needsReview: true,
            createdAt: new (Timestamp as any)(1000),
          }),
        },
        {
          id: "new",
          data: () => ({
            documentId: "doc-1",
            folderOwnerOrganizationId: "org-1",
            documentType: "estado_situacion_patrimonial",
            confidence: 0.9,
            needsReview: false,
            createdAt: new (Timestamp as any)(2000),
          }),
        },
      ],
    })

    const result = await getClassificationByDocument("doc-1")

    expect(result).not.toBeNull()
    expect(result?.id).toBe("new")
    expect(result?.documentType).toBe("estado_situacion_patrimonial")
    expect(result?.createdAt).toBe(new Date(2000).toISOString())
  })
})
