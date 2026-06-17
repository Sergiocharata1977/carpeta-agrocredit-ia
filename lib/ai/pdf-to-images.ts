/**
 * PDF helpers para CreditoHub.
 *
 * Regla de deploy: este modulo NO debe importar librerias basadas en `canvas`.
 * `pdf-to-img` fue removido porque Turbopack/Vercel lo incluia en el grafo de
 * build y fallaba resolviendo `canvas.node`.
 *
 * Estrategia vigente:
 * - PDF digital: extraer texto nativo con pdfjs-dist (sin canvas).
 * - PDF escaneado: mandar a revision manual o usar un provider con PDF nativo
 *   como Anthropic. La rasterizacion server-side queda deshabilitada.
 */

export class PdfRasterizationError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "PdfRasterizationError"
    this.cause = cause
  }
}

export class PdfTextExtractionError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "PdfTextExtractionError"
    this.cause = cause
  }
}

export interface PdfTextResult {
  text: string
  pageCount: number
  hasUsableText: boolean
}

const MIN_USABLE_TEXT_CHARS = 100

export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  let getDocument: typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument

  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    getDocument = pdfjs.getDocument
  } catch (err) {
    throw new PdfTextExtractionError("pdfjs-dist no esta disponible para extraer texto del PDF", err)
  }

  try {
    const data = new Uint8Array(buffer)
    const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise
    const parts: string[] = []

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
      parts.push(pageText)
      page.cleanup()
    }

    const pageCount = doc.numPages
    await doc.destroy()

    const text = parts.join("\n").replace(/[ \t]+/g, " ").trim()
    const cleanLength = text.replace(/\s/g, "").length

    return {
      text,
      pageCount,
      hasUsableText: cleanLength >= MIN_USABLE_TEXT_CHARS,
    }
  } catch (err) {
    throw new PdfTextExtractionError("No se pudo extraer texto nativo del PDF", err)
  }
}

export async function pdfToImages(_buffer: Buffer, _maxPages = 8): Promise<string[]> {
  throw new PdfRasterizationError(
    "Rasterizacion PDF deshabilitada en Vercel: usar texto nativo o provider con PDF nativo",
  )
}
