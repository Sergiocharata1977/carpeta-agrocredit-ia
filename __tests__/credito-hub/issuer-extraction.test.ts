import { describe, expect, it } from "vitest"
import { extractIssuerFromText } from "@/lib/ai/classification/issuer-extraction"

describe("extractIssuerFromText", () => {
  it("detecta razon social y CUIT en un balance argentino", () => {
    const text = [
      "LOS SE\u00d1ORES DEL AGRO S.A.",
      "Estados contables ficticios al 31 de diciembre de 2025",
      "CUIT ficticio 30-99999999-7",
      "Estado de situacion patrimonial",
      "LOS SE\u00d1ORES DEL AGRO S.A.",
    ].join("\n")

    const out = extractIssuerFromText(text)

    expect(out.issuer).toBe("Los Se\u00f1ores del Agro S.A.")
    expect(out.cuit).toBe("30-99999999-7")
  })

  it("prioriza la razon social repetida frente a ruido de secciones", () => {
    const text = [
      "ESTADO DE SITUACION PATRIMONIAL",
      "ACTIVO CORRIENTE",
      "La Nueva Cosecha S.R.L.",
      "CUIT: 30 12345678 9",
      "La Nueva Cosecha S.R.L.",
      "Notas a los estados contables",
    ].join("\n")

    const out = extractIssuerFromText(text)

    expect(out.issuer).toBe("La Nueva Cosecha S.R.L.")
    expect(out.cuit).toBe("30-12345678-9")
  })
})
