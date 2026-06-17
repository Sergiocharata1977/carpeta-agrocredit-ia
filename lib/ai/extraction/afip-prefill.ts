import { resolveAIProvider } from "@/lib/ai/provider-config"

/**
 * Prefill del alta de productor a partir de una constancia de inscripcion AFIP.
 *
 * IMPORTANTE: esto NO persiste nada. Lee el documento con la capa IA y devuelve
 * una PROPUESTA de campos para el formulario. El humano revisa y confirma al
 * guardar el productor (IA propone, humano certifica).
 */

export type ProducerPersonType = "physical" | "legal"
export type ProducerActivity =
  | "agriculture"
  | "livestock"
  | "mixed"
  | "horticulture"
  | "forestry"
  | "other"

export interface AfipPrefillFields {
  taxId?: string
  legalName?: string
  personType?: ProducerPersonType
  activity?: ProducerActivity
  activityDescription?: string
  province?: string
  city?: string
  address?: string
  phone?: string
  email?: string
}

export interface AfipPrefillResult {
  fields: AfipPrefillFields
  confidence: number
  warnings: string[]
}

const SCHEMA_PROMPT = `Sos un asistente que lee una CONSTANCIA DE INSCRIPCION de AFIP (Argentina).
Devolve SOLO un JSON con estos campos (usa null si un dato no aparece):
{
  "cuit": "11 digitos sin guiones",
  "razonSocial": "razon social o apellido y nombre del contribuyente",
  "tipoPersona": "fisica" | "juridica",
  "actividadDescripcion": "descripcion de la actividad principal tal cual figura",
  "provincia": "provincia del domicilio fiscal",
  "localidad": "localidad/ciudad del domicilio fiscal",
  "domicilio": "calle y numero del domicilio fiscal",
  "telefono": "telefono si figura",
  "email": "email si figura"
}
No inventes datos. Si el documento no es una constancia de AFIP, devolve todos los campos en null y agrega una advertencia.`

function cleanCuit(value: unknown): string | undefined {
  if (value == null) return undefined
  const digits = String(value).replace(/\D/g, "")
  return digits.length === 11 ? digits : undefined
}

/** Deriva el tipo de persona desde el prefijo del CUIT (fallback robusto). */
function personTypeFromCuit(cuit?: string): ProducerPersonType | undefined {
  if (!cuit) return undefined
  const prefix = cuit.slice(0, 2)
  if (["20", "23", "24", "27"].includes(prefix)) return "physical"
  if (["30", "33", "34"].includes(prefix)) return "legal"
  return undefined
}

function normalizePersonType(value: unknown, cuit?: string): ProducerPersonType | undefined {
  const text = String(value ?? "").toLowerCase()
  if (text.includes("juridic")) return "legal"
  if (text.includes("fisic") || text.includes("física")) return "physical"
  return personTypeFromCuit(cuit)
}

/** Mapea la descripcion libre de AFIP a la categoria agro del enum del form. */
function mapActivity(description: unknown): ProducerActivity | undefined {
  const text = String(description ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
  if (!text) return undefined
  const hasCrop = /(agricola|agricultura|cereal|oleaginos|soja|maiz|trigo|cultivo|siembra|cosecha)/.test(text)
  const hasLivestock = /(ganader|bovino|vacuno|cria|invernada|hacienda|tambo|leche|porcino|avicola)/.test(text)
  if (hasCrop && hasLivestock) return "mixed"
  if (hasCrop) return "agriculture"
  if (hasLivestock) return "livestock"
  if (/(hortic|verdura|hortaliza)/.test(text)) return "horticulture"
  if (/(forest|silvicultura|madera)/.test(text)) return "forestry"
  return "other"
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

export async function extractAfipPrefill(
  buffer: Buffer,
  mimeType: string,
  hints?: { fileName?: string },
): Promise<AfipPrefillResult> {
  const provider = await resolveAIProvider()
  const result = await provider.extractStructured(buffer, mimeType, SCHEMA_PROMPT, {
    ...hints,
    documentType: "constancia_cuit",
  })

  const get = (key: string): unknown => result.fields?.[key]?.value
  const cuit = cleanCuit(get("cuit"))
  const activityDescription = asString(get("actividadDescripcion"))
  const warnings = [...(result.warnings ?? [])]
  if (provider.name === "mock") {
    warnings.push("IA en modo demo (sin credenciales): los datos son de ejemplo, no del documento.")
  }
  if (!cuit) warnings.push("No se pudo leer un CUIT valido de 11 digitos.")

  const fields: AfipPrefillFields = {
    taxId: cuit,
    legalName: asString(get("razonSocial")),
    personType: normalizePersonType(get("tipoPersona"), cuit),
    activity: mapActivity(activityDescription),
    activityDescription,
    province: asString(get("provincia")),
    city: asString(get("localidad")),
    address: asString(get("domicilio")),
    phone: asString(get("telefono")),
    email: asString(get("email")),
  }

  return { fields, confidence: result.overallConfidence ?? 0, warnings }
}
