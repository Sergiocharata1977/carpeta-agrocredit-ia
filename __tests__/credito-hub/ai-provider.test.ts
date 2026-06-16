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

// Evitar que pdf-to-images cargue binarios nativos en estos tests unitarios.
vi.mock("@/lib/ai/pdf-to-images", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    extractPdfText: vi.fn(),
    pdfToImages: vi.fn(),
  }
})

import { getAIProvider, parseFirstJsonBlock } from "@/lib/ai"
import { MockAIProvider } from "@/lib/ai/MockAIProvider"

const ORIGINAL_ENV = { ...process.env }

function clearAiEnv() {
  delete process.env.AI_PROVIDER
  delete process.env.XAI_API_KEY
  delete process.env.XAI_MODEL
  delete process.env.XAI_BASE_URL
  delete process.env.ANTHROPIC_API_KEY
}

beforeEach(async () => {
  vi.clearAllMocks()
  clearAiEnv()
  const { __resetXaiModelCache } = await import("@/lib/ai/XaiProvider")
  __resetXaiModelCache()
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe("parseFirstJsonBlock", () => {
  it("extrae el primer bloque JSON balanceado ignorando texto alrededor", () => {
    const text = 'Acá está el resultado:\n```json\n{"documentType":"balance_sheet","confidence":0.9}\n```\nFin.'
    const parsed = parseFirstJsonBlock<{ documentType: string; confidence: number }>(text)
    expect(parsed.documentType).toBe("balance_sheet")
    expect(parsed.confidence).toBe(0.9)
  })

  it("maneja llaves anidadas correctamente (no corta en el primer cierre)", () => {
    const text = 'prefijo {"fields":{"a":{"value":1},"b":{"value":2}},"overallConfidence":0.5} sufijo'
    const parsed = parseFirstJsonBlock<{ fields: Record<string, unknown>; overallConfidence: number }>(text)
    expect(Object.keys(parsed.fields)).toEqual(["a", "b"])
    expect(parsed.overallConfidence).toBe(0.5)
  })

  it("ignora llaves dentro de strings", () => {
    const text = '{"note":"esto tiene { llaves } adentro","ok":true}'
    const parsed = parseFirstJsonBlock<{ note: string; ok: boolean }>(text)
    expect(parsed.ok).toBe(true)
    expect(parsed.note).toContain("{ llaves }")
  })

  it("lanza si no hay JSON", () => {
    expect(() => parseFirstJsonBlock("sin json aquí")).toThrow()
  })
})

describe("getAIProvider", () => {
  it("sin env → MockAIProvider", () => {
    const provider = getAIProvider()
    expect(provider).toBeInstanceOf(MockAIProvider)
    expect(provider.name).toBe("mock")
  })

  it("AI_PROVIDER=xai sin XAI_API_KEY → MockAIProvider", () => {
    process.env.AI_PROVIDER = "xai"
    const provider = getAIProvider()
    expect(provider.name).toBe("mock")
  })

  it("AI_PROVIDER=xai con XAI_API_KEY → XaiProvider", () => {
    process.env.AI_PROVIDER = "xai"
    process.env.XAI_API_KEY = "test-key"
    const provider = getAIProvider()
    expect(provider.name).toBe("xai")
  })

  it("AI_PROVIDER=anthropic sin key → MockAIProvider", () => {
    process.env.AI_PROVIDER = "anthropic"
    const provider = getAIProvider()
    expect(provider.name).toBe("mock")
  })

  it("AI_PROVIDER=anthropic con key → AnthropicProvider", () => {
    process.env.AI_PROVIDER = "anthropic"
    process.env.ANTHROPIC_API_KEY = "test-key"
    const provider = getAIProvider()
    expect(provider.name).toBe("anthropic")
  })

  it("AI_PROVIDER desconocido → MockAIProvider", () => {
    process.env.AI_PROVIDER = "cohere"
    const provider = getAIProvider()
    expect(provider.name).toBe("mock")
  })
})

describe("MockAIProvider", () => {
  it("clasifica con confidence ~0.6 y warning de mock", async () => {
    const provider = new MockAIProvider()
    const result = await provider.classifyDocument(Buffer.from("x"), "image/png", {
      fileName: "iva-2024.pdf",
    })
    expect(result.documentType).toBe("iva")
    expect(result.confidence).toBe(0.6)
    expect(result.warnings.some((w) => w.includes("Mock"))).toBe(true)
  })

  it("extrae campos deterministas con overallConfidence 0.6", async () => {
    const provider = new MockAIProvider()
    const result = await provider.extractStructured(Buffer.from("x"), "application/pdf", "schema")
    expect(result.overallConfidence).toBe(0.6)
    expect(result.fields.equityTotal.value).toBe(16_650_000)
  })
})

describe("XaiProvider", () => {
  it("resuelve modelo vía /v1/models y clasifica parseando el JSON de la respuesta", async () => {
    process.env.AI_PROVIDER = "xai"
    process.env.XAI_API_KEY = "test-key"

    const { extractPdfText } = await import("@/lib/ai/pdf-to-images")
    vi.mocked(extractPdfText).mockResolvedValue({
      text: "Balance General ".repeat(50),
      pageCount: 1,
      hasUsableText: true,
    })

    mockModelsList.mockResolvedValue({ data: [{ id: "grok-2-vision-1212" }, { id: "grok-text" }] })
    mockChatCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: 'Resultado: {"documentType":"balance_sheet","confidence":0.91,"warnings":[]}',
          },
        },
      ],
    })

    const provider = getAIProvider()
    const result = await provider.classifyDocument(Buffer.from("%PDF-1.4"), "application/pdf")

    expect(result.documentType).toBe("balance_sheet")
    expect(result.confidence).toBeCloseTo(0.91)
    // Verificó que eligió el modelo con visión.
    expect(mockChatCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "grok-2-vision-1212" }),
    )
  })

  it("usa XAI_MODEL explícito sin llamar a /v1/models", async () => {
    process.env.AI_PROVIDER = "xai"
    process.env.XAI_API_KEY = "test-key"
    process.env.XAI_MODEL = "grok-custom"

    mockChatCreate.mockResolvedValue({
      choices: [{ message: { content: '{"documentType":"iva","confidence":0.7,"warnings":[]}' } }],
    })

    const provider = getAIProvider()
    const result = await provider.classifyDocument(Buffer.from("x"), "image/png")

    expect(result.documentType).toBe("iva")
    expect(mockModelsList).not.toHaveBeenCalled()
    expect(mockChatCreate).toHaveBeenCalledWith(expect.objectContaining({ model: "grok-custom" }))
  })

  it("reintenta sin response_format si el modelo lo rechaza", async () => {
    process.env.AI_PROVIDER = "xai"
    process.env.XAI_API_KEY = "test-key"
    process.env.XAI_MODEL = "grok-custom"

    mockChatCreate
      .mockRejectedValueOnce(new Error("response_format not supported"))
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{"documentType":"f931","confidence":0.6,"warnings":[]}' } }],
      })

    const provider = getAIProvider()
    const result = await provider.classifyDocument(Buffer.from("x"), "image/png")

    expect(result.documentType).toBe("f931")
    expect(mockChatCreate).toHaveBeenCalledTimes(2)
  })
})
