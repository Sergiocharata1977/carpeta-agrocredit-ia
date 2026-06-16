import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import type { BankRequirement, BankRequirementTemplate } from "@/types/bank-requirements"

function toIso(value: unknown): string {
  const maybe = value as { toDate?: () => Date } | undefined
  if (maybe?.toDate) return maybe.toDate().toISOString()
  if (typeof value === "string") return value
  return new Date().toISOString()
}

function mapTemplate(id: string, data: FirebaseFirestore.DocumentData): BankRequirementTemplate {
  return {
    id,
    requestingEntityOrganizationId: data.requestingEntityOrganizationId,
    bankName: data.bankName,
    productName: data.productName,
    version: data.version ?? 1,
    status: data.status ?? "draft",
    effectiveFrom: data.effectiveFrom,
    requirements: data.requirements ?? [],
    sourceDocumentId: data.sourceDocumentId,
    createdBy: data.createdBy,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}

export async function createRequirementTemplate(input: {
  requestingEntityOrganizationId: string
  bankName: string
  productName?: string
  requirements: BankRequirement[]
  sourceDocumentId?: string
  createdBy: string
  actorOrganizationId: string | null
  status?: BankRequirementTemplate["status"]
}): Promise<BankRequirementTemplate> {
  const db = getAdminDb()
  const ref = db.collection(COLLECTIONS.BANK_REQUIREMENT_TEMPLATES).doc()
  const now = FieldValue.serverTimestamp()
  const data = {
    requestingEntityOrganizationId: input.requestingEntityOrganizationId,
    bankName: input.bankName,
    productName: input.productName,
    version: 1,
    status: input.status ?? "draft",
    requirements: input.requirements,
    sourceDocumentId: input.sourceDocumentId,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(data)
  await writeAuditLog({
    actorUid: input.createdBy,
    actorOrganizationId: input.actorOrganizationId,
    action: "bank_requirement.created",
    targetType: "bank_requirement_template",
    targetId: ref.id,
    metadata: {
      requestingEntityOrganizationId: input.requestingEntityOrganizationId,
      requirementCount: input.requirements.length,
    },
  })
  const snap = await ref.get()
  return mapTemplate(snap.id, snap.data() ?? data)
}

export async function listRequirementTemplates(
  requestingEntityOrganizationId: string,
): Promise<BankRequirementTemplate[]> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.BANK_REQUIREMENT_TEMPLATES)
    .where("requestingEntityOrganizationId", "==", requestingEntityOrganizationId)
    .get()
  return snap.docs.map((doc) => mapTemplate(doc.id, doc.data()))
}

export async function getRequirementTemplate(templateId: string): Promise<BankRequirementTemplate | null> {
  const snap = await getAdminDb().collection(COLLECTIONS.BANK_REQUIREMENT_TEMPLATES).doc(templateId).get()
  if (!snap.exists) return null
  return mapTemplate(snap.id, snap.data() ?? {})
}

export async function publishRequirementTemplate(input: {
  templateId: string
  actorUid: string
  actorOrganizationId: string | null
}): Promise<BankRequirementTemplate> {
  const db = getAdminDb()
  const ref = db.collection(COLLECTIONS.BANK_REQUIREMENT_TEMPLATES).doc(input.templateId)
  await ref.update({ status: "published", updatedAt: FieldValue.serverTimestamp() })
  await writeAuditLog({
    actorUid: input.actorUid,
    actorOrganizationId: input.actorOrganizationId,
    action: "bank_requirement.created",
    targetType: "bank_requirement_template",
    targetId: input.templateId,
    metadata: { status: "published" },
  })
  const snap = await ref.get()
  return mapTemplate(snap.id, snap.data() ?? {})
}
