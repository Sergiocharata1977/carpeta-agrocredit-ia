/**
 * Estrategia PDF → texto / imagen (CreditoHub Ola 0, sección 6).
 *
 * 1. Texto-primero: extraer texto nativo con pdfjs-dist (sin canvas, liviano).
 * 2. Rasterización solo si hace falta: PDF escaneado → rasterizar las primeras
 *    N páginas con `pdf-to-img` (usa @napi-rs/canvas, binarios prebuilt).
 * 3. Si la rasterización falla → PdfRasterizationError tipado. El caller lo
 *    mapea a needsReview. NUNCA romper silenciosamente el pipeline.
 *
 * NOTA SOBRE BINARIOS NATIVOS: `pdf-to-img` arrastra `@napi-rs/canvas`, que es
 * un binario nativo prebuilt (compatible con Vercel/serverless). pdfjs-dist se
 * importa por su build "legacy" para correr en Node sin DOM. Si el entorno de
 * deploy no resuelve el binario, la rasterización lanza PdfRasterizationError
 * y el documento debe ir a revisión manual — no debe tumbar el job.
 *
 * Ambas funciones son puras respecto de I/O externo: reciben un Buffer y no
 * leen Firestore/Storage.
 */

/** Error tipado: la rasterización del PDF falló (binarios, memoria, PDF corrupto). */
export class PdfRasterizationError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "PdfRasterizationError"
    this.cause = cause
  }
}

/** Error tipado: la extracción de texto nativo del PDF falló. */
export class PdfTextExtractionError extends Error {
  readonly cause?: unknown
  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = "PdfTextExtractionError"
    this.cause = cause
  }
}

export interface PdfTextResult {
  /** Texto nativo concatenado (todas las páginas). */
  text: string
  /** Cantidad de páginas del documento. */
  pageCount: number
  /** Heurística: hay densidad de texto suficiente para no rasterizar. */
  hasUsableText: boolean
}

/** Mínimo de caracteres "limpios" para considerar el PDF como digital (no escaneado). */
const MIN_USABLE_TEXT_CHARS = 100

/**
 * Extrae el texto nativo de un PDF con pdfjs-dist (getTextContent).
 * No requiere canvas. Si pdfjs no está disponible o el PDF no es parseable,
 * lanza PdfTextExtractionError (el caller puede decidir rasterizar igual).
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfTextResult> {
  let getDocument: typeof import("pdfjs-dist/legacy/build/pdf.mjs").getDocument
  try {
    // Build "legacy" para Node sin DOM. Import dinámico: evita cargar pdfjs
    // (y su worker) salvo que realmente se procese un PDF.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
    getDocument = pdfjs.getDocument
  } catch (err) {
    throw new PdfTextExtractionError(
      "pdfjs-dist no está disponible para extraer texto del PDF",
      err,
    )
  }

  try {
    const data = new Uint8Array(buffer)
    const doc = await getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise

    const pageCount = doc.numPages
    const parts: string[] = []

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
      parts.push(pageText)
      page.cleanup()
    }

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

/**
 * Rasteriza las primeras `maxPages` páginas de un PDF a data URLs PNG base64.
 * Usa `pdf-to-img` (@napi-rs/canvas). Si falla, lanza PdfRasterizationError.
 *
 * @returns array de data URLs `data:image/png;base64,...`, una por página.
 */
export async function pdfToImages(buffer: Buffer, maxPages = 8): Promise<string[]> {
  let pdfToImg: typeof import("pdf-to-img").pdf
  try {
    const mod = await import("pdf-to-img")
    pdfToImg = mod.pdf
  } catch (err) {
    throw new PdfRasterizationError(
      "La dependencia 'pdf-to-img' no está disponible para rasterizar el PDF",
      err,
    )
  }

  try {
    // pdf-to-img acepta Buffer/Uint8Array y devuelve un async-iterable de Buffers PNG.
    const document = await pdfToImg(new Uint8Array(buffer), { scale: 2 })

    const dataUrls: string[] = []
    let count = 0
    for await (const pageImage of document) {
      if (count >= maxPages) break
      const base64 = Buffer.from(pageImage).toString("base64")
      dataUrls.push(`data:image/png;base64,${base64}`)
      count++
    }

    if (dataUrls.length === 0) {
      throw new PdfRasterizationError("La rasterización no produjo ninguna página")
    }

    return dataUrls
  } catch (err) {
    if (err instanceof PdfRasterizationError) throw err
    throw new PdfRasterizationError("Falló la rasterización del PDF", err)
  }
}
