import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import type { CreditApplication } from "@/types/credito-hub"

function toIso(value: unknown): string {
  const maybe = value as { toDate?: () => Date } | undefined
  if (maybe?.toDate) return maybe.toDate().toISOString()
  if (typeof value === "string") return value
  return new Date().toISOString()
}

function mapApplication(id: string, data: FirebaseFirestore.DocumentData): CreditApplication {
  return {
    id,
    folderOwnerOrganizationId: data.folderOwnerOrganizationId,
    requestingEntityOrganizationId: data.requestingEntityOrganizationId,
    requirementTemplateId: data.requirementTemplateId,
    status: data.status ?? "draft",
    requestedAmount: data.requestedAmount,
    productName: data.productName,
    createdBy: data.createdBy,
    createdByOrganizationId: data.createdByOrganizationId,
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  }
}

export async function createCreditApplication(input: {
  folderOwnerOrganizationId: string
  requestingEntityOrganizationId: string
  requirementTemplateId: string
  requestedAmount?: number
  productName?: string
  createdBy: string
  createdByOrganizationId: string
}): Promise<CreditApplication> {
  const db = getAdminDb()
  const ref = db.collection(COLLECTIONS.CREDIT_APPLICATIONS).doc()
  const now = FieldValue.serverTimestamp()
  const data = {
    folderOwnerOrganizationId: input.folderOwnerOrganizationId,
    requestingEntityOrganizationId: input.requestingEntityOrganizationId,
    requirementTemplateId: input.requirementTemplateId,
    status: "draft",
    requestedAmount: input.requestedAmount,
    productName: input.productName,
    createdBy: input.createdBy,
    createdByOrganizationId: input.createdByOrganizationId,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(data)
  await writeAuditLog({
    actorUid: input.createdBy,
    actorOrganizationId: input.createdByOrganizationId,
    action: "credit_application.created",
    targetType: "credit_application",
    targetId: ref.id,
    metadata: {
      folderOwnerOrganizationId: input.folderOwnerOrganizationId,
      requestingEntityOrganizationId: input.requestingEntityOrganizationId,
      requirementTemplateId: input.requirementTemplateId,
    },
  })
  const snap = await ref.get()
  return mapApplication(snap.id, snap.data() ?? data)
}

export async function getCreditApplication(applicationId: string): Promise<CreditApplication | null> {
  const snap = await getAdminDb().collection(COLLECTIONS.CREDIT_APPLICATIONS).doc(applicationId).get()
  if (!snap.exists) return null
  return mapApplication(snap.id, snap.data() ?? {})
}

export async function listCreditApplications(filters: {
  folderOwnerOrganizationId?: string
  requestingEntityOrganizationId?: string
}): Promise<CreditApplication[]> {
  let query: FirebaseFirestore.Query = getAdminDb().collection(COLLECTIONS.CREDIT_APPLICATIONS)
  if (filters.folderOwnerOrganizationId) {
    query = query.where("folderOwnerOrganizationId", "==", filters.folderOwnerOrganizationId)
  }
  if (filters.requestingEntityOrganizationId) {
    query = query.where("requestingEntityOrganizationId", "==", filters.requestingEntityOrganizationId)
  }
  const snap = await query.get()
  return snap.docs.map((doc) => mapApplication(doc.id, doc.data()))
}
