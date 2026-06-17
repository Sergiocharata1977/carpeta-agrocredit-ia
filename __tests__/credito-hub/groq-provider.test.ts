import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// ─── Mock del SDK openai: NUNCA llamar red real ───────────────────────────────
const mockChatCreate = vi.fn()
const mockModelsList = vi.fn()

vi.mock("openai", () => {
  class MockOpenAI {
    chat = { completions: { create: mockChatCreate } }
    models = { list: mockModelsList }
    constructor(public opts: unknown) {}
  }
  return { default: MockOpenAI }
})

// Evitar binarios nativos de pdf-to-images en unit tests.
vi.mock("@/lib/ai/pdf-to-images", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    extractPdfText: vi.fn(),
    pdfToImages: vi.fn(),
  }
})

import { createProvider, hasProviderKey, getAIProvider } from "@/lib/ai"
import { MockAIProvider } from "@/lib/ai/MockAIProvider"

const ORIGINAL_ENV = { ...process.env }

function clearAiEnv() {
  delete process.env.AI_PROVIDER
  delete process.env.GROQ_API_KEY
  delete process.env.GROQ_MODEL
  delete process.env.GROQ_BASE_URL
  delete process.env.XAI_API_KEY
  delete process.env.ANTHROPIC_API_KEY
}

beforeEach(async () => {
  vi.clearAllMocks()
  clearAiEnv()
  const { __resetGroqModelCache } = await import("@/lib/ai/GroqProvider")
  __resetGroqModelCache()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("createProvider / getAIProvider — groq", () => {
  it("createProvider('groq') sin GROQ_API_KEY → Mock", () => {
    expect(createProvider("groq").name).toBe("mock")
  })

  it("createProvider('groq') con GROQ_API_KEY → GroqProvider", () => {
    process.env.GROQ_API_KEY = "test-key"
    expect(createProvider("groq").name).toBe("groq")
  })

  it("AI_PROVIDER=groq con key → getAIProvider devuelve groq", () => {
    process.env.AI_PROVIDER = "groq"
    process.env.GROQ_API_KEY = "test-key"
    expect(getAIProvider().name).toBe("groq")
  })

  it("hasProviderKey refleja la presencia de la key", () => {
    expect(hasProviderKey("groq")).toBe(false)
    process.env.GROQ_API_KEY = "x"
    expect(hasProviderKey("groq")).toBe(true)
  })

  it("provider desconocido → Mock", () => {
    expect(createProvider("cohere")).toBeInstanceOf(MockAIProvider)
  })
})

describe("GroqProvider", () => {
  it("resuelve modelo con visión vía /models y clasifica parseando el JSON", async () => {
    process.env.GROQ_API_KEY = "test-key"

    const { extractPdfText } = await import("@/lib/ai/pdf-to-images")
    vi.mocked(extractPdfText).mockResolvedValue({
      text: "Estado de Situación Patrimonial ".repeat(40),
      pageCount: 1,
      hasUsableText: true,
    })

    mockModelsList.mockResolvedValue({
      data: [{ id: "llama-3.3-70b-versatile" }, { id: "meta-llama/llama-4-scout-17b-16e-instruct" }],
    })
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: '{"documentType":"balance_sheet","confidence":0.88,"warnings":[]}' } }],
    })

    const provider = createProvider("groq")
    const result = await provider.classifyDocument(Buffer.from("%PDF-1.4"), "application/pdf")

    expect(result.documentType).toBe("balance_sheet")
    expect(result.confidence).toBeCloseTo(0.88)
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "meta-llama/llama-4-scout-17b-16e-instruct" }),
    )
  })

  it("usa GROQ_MODEL explícito sin llamar a /models", async () => {
    process.env.GROQ_API_KEY = "test-key"
    process.env.GROQ_MODEL = "groq-custom-vision"

    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: '{"documentType":"iva","confidence":0.7,"warnings":[]}' } }],
    })

    const provider = createProvider("groq")
    const result = await provider.classifyDocument(Buffer.from("x"), "image/png")

    expect(result.documentType).toBe("iva")
    expect(mockModelsList).not.toHaveBeenCalled()
    expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "groq-custom-vision" }))
  })

  it("cae al default de visión si /models falla", async () => {
    process.env.GROQ_API_KEY = "test-key"
    mockModelsList.mockRejectedValue(new Error("503"))
    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: '{"documentType":"f931","confidence":0.6,"warnings":[]}' } }],
    })

    const provider = createProvider("groq")
    const result = await provider.classifyDocument(Buffer.from("x"), "image/png")

    expect(result.documentType).toBe("f931")
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "meta-llama/llama-4-scout-17b-16e-instruct" }),
    )
  })
})
