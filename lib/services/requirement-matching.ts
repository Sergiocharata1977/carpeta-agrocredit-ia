import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { getCreditApplication } from "@/lib/services/credit-applications"
import { getRequirementTemplate } from "@/lib/services/bank-requirements"
import { getFieldsByOwner } from "@/lib/services/extracted-fields"
import type { BankRequirement, MatchStatus, RequirementMatch } from "@/types/bank-requirements"

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function inferKeywords(requirement: BankRequirement): string[] {
  const text = normalize(`${requirement.requirementCode} ${requirement.name} ${requirement.description} ${requirement.category}`)
  if (text.includes("iva")) return ["debito", "credito", "saldo", "iva", "periodo"]
  if (text.includes("931") || text.includes("sueldo") || text.includes("empleado")) return ["empleados", "remuneraciones", "contribuciones", "aportes"]
  if (text.includes("resultado")) return ["netsales", "netresult", "income", "sales"]
  if (text.includes("balance") || text.includes("estado contable")) return ["assets", "liabilities", "equity", "cashandbanks", "loans"]
  return normalize(requirement.requirementCode).split(/[_\s-]+/).filter(Boolean)
}

function decideStatus(requirement: BankRequirement, matchedCount: number): MatchStatus {
  if (matchedCount === 0) return requirement.required ? "missing" : "not_applicable"
  if (requirement.requiresCouncilCertification) return "pending_certification"
  if (requirement.requiresAccountantSignature) return "pending_signature"
  if (requirement.periodCount && matchedCount < requirement.periodCount) return "partial"
  return "fulfilled"
}

export async function matchRequirements(input: {
  creditApplicationId: string
  actorUid: string
  actorOrganizationId: string | null
}): Promise<RequirementMatch[]> {
  const application = await getCreditApplication(input.creditApplicationId)
  if (!application) throw new Error("Solicitud de credito no encontrada")
  const template = await getRequirementTemplate(application.requirementTemplateId)
  if (!template) throw new Error("Template de requisitos no encontrado")

  const fields = await getFieldsByOwner(application.folderOwnerOrganizationId)
  const db = getAdminDb()
  const existing = await db
    .collection(COLLECTIONS.REQUIREMENT_MATCHES)
    .where("creditApplicationId", "==", input.creditApplicationId)
    .get()
  const batch = db.batch()
  existing.docs.forEach((doc) => batch.delete(doc.ref))

  const matches: RequirementMatch[] = []
  for (const requirement of template.requirements) {
    const keywords = inferKeywords(requirement)
    const matchedFields = fields.filter((field) => {
      const code = normalize(field.fieldCode)
      return keywords.some((keyword) => code.includes(normalize(keyword)) || normalize(keyword).includes(code))
    })
    const matchedDocumentIds = Array.from(new Set(matchedFields.map((field) => field.documentId)))
    const status = decideStatus(requirement, matchedDocumentIds.length || matchedFields.length)
    const ref = db.collection(COLLECTIONS.REQUIREMENT_MATCHES).doc()
    const match: RequirementMatch = {
      id: ref.id,
      creditApplicationId: input.creditApplicationId,
      requirementCode: requirement.requirementCode,
      status,
      matchedDocumentIds,
      explanation:
        status === "missing"
          ? "No se encontraron campos o documentos relacionados en el legajo."
          : `Se encontraron ${matchedDocumentIds.length || matchedFields.length} evidencia(s) relacionada(s).`,
      responsibleRole: requirement.responsibleRole,
      createdAt: new Date().toISOString(),
    }
    matches.push(match)
    batch.set(ref, { ...match, createdAt: FieldValue.serverTimestamp() })
  }
  await batch.commit()
  await writeAuditLog({
    actorUid: input.actorUid,
    actorOrganizationId: input.actorOrganizationId,
    action: "requirement.matched",
    targetType: "credit_application",
    targetId: input.creditApplicationId,
    metadata: {
      folderOwnerOrganizationId: application.folderOwnerOrganizationId,
      matchCount: matches.length,
    },
  })
  return matches
}
