import { resolveAIProvider } from "@/lib/ai/provider-config"
import type { BankRequirement } from "@/types/bank-requirements"

const REQUIREMENTS_SCHEMA_PROMPT = `Converti un documento de requisitos bancarios argentinos a JSON.
Devolve SOLO:
{
  "fields": {
    "requirements": {
      "value": [
        {
          "requirementCode": "BALANCE_ULTIMOS_3",
          "name": "Ultimos 3 balances",
          "description": "Estados contables certificados de los ultimos 3 ejercicios",
          "category": "FINANCIAL_STATEMENTS",
          "required": true,
          "periodCount": 3,
          "maxAgeMonths": 18,
          "acceptedFormats": ["pdf"],
          "requiresAccountantSignature": true,
          "requiresCouncilCertification": true,
          "responsibleRole": "ACCOUNTANT",
          "validationRules": ["periodCount>=3"],
          "sourcePage": 1,
          "substitutableBy": []
        }
      ],
      "confidence": 0.8,
      "page": 1,
      "rawText": null
    }
  },
  "warnings": [],
  "overallConfidence": 0.8
}
Usa responsibleRole solo CLIENT, ACCOUNTANT o BANK. Si hay duda, marca required=true y agrega una validationRule descriptiva.`

function normalizeRequirement(input: unknown, index: number): BankRequirement | null {
  if (!input || typeof input !== "object") return null
  const data = input as Record<string, unknown>
  const code =
    typeof data.requirementCode === "string" && data.requirementCode.trim()
      ? data.requirementCode.trim()
      : `REQ_${index + 1}`
  const responsibleRole = ["CLIENT", "ACCOUNTANT", "BANK"].includes(String(data.responsibleRole))
    ? (data.responsibleRole as BankRequirement["responsibleRole"])
    : "ACCOUNTANT"

  return {
    requirementCode: code,
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : code,
    description: typeof data.description === "string" ? data.description : "",
    category: typeof data.category === "string" && data.category.trim() ? data.category.trim() : "GENERAL",
    required: typeof data.required === "boolean" ? data.required : true,
    periodCount: typeof data.periodCount === "number" ? Math.max(0, Math.trunc(data.periodCount)) : undefined,
    maxAgeMonths: typeof data.maxAgeMonths === "number" ? Math.max(0, Math.trunc(data.maxAgeMonths)) : undefined,
    acceptedFormats: Array.isArray(data.acceptedFormats) ? data.acceptedFormats.map(String) : ["pdf"],
    requiresAccountantSignature: Boolean(data.requiresAccountantSignature),
    requiresCouncilCertification: Boolean(data.requiresCouncilCertification),
    responsibleRole,
    validationRules: Array.isArray(data.validationRules) ? data.validationRules.map(String) : [],
    sourcePage: typeof data.sourcePage === "number" ? Math.trunc(data.sourcePage) : null,
    substitutableBy: Array.isArray(data.substitutableBy) ? data.substitutableBy.map(String) : [],
  }
}

export async function parseRequirementsFromDocument(
  buffer: Buffer,
  mimeType: string,
  hints?: { fileName?: string },
): Promise<{ requirements: BankRequirement[]; warnings: string[]; overallConfidence: number }> {
  const provider = await resolveAIProvider()
  const result = await provider.extractStructured(buffer, mimeType, REQUIREMENTS_SCHEMA_PROMPT, {
    fileName: hints?.fileName,
    documentType: "bank_requirements",
  })
  const raw = result.fields.requirements?.value
  const list = Array.isArray(raw) ? raw : []
  const requirements = list
    .map((item, index) => normalizeRequirement(item, index))
    .filter((item): item is BankRequirement => item !== null)

  return {
    requirements,
    warnings: result.warnings,
    overallConfidence: result.overallConfidence,
  }
}
