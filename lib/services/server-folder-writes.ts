import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin-sdk"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { AuthError, type ServerSession } from "@/lib/auth/server-session"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"

export async function assertWritableFolder(
  session: ServerSession,
  organizationId: string,
): Promise<{ folderOwnerOrganizationId: string; actorOrganizationId: string | null }> {
  if (!organizationId) throw new AuthError("organizationId requerido", 400)
  if (
    !session.roles.includes("admin_platform") &&
    !session.roles.includes("accountant") &&
    !session.roles.includes("accounting_firm_admin")
  ) {
    throw new AuthError("Solo contador habilitado o admin puede modificar el legajo", 403)
  }
  const access = await assertCanManageAccountingFolder(session, organizationId)
  return {
    folderOwnerOrganizationId: access.folderOwnerOrganizationId,
    actorOrganizationId: access.accountingFirmId ?? session.defaultOrganizationId,
  }
}

export async function assertReadableFolder(
  session: ServerSession,
  organizationId: string,
): Promise<{ folderOwnerOrganizationId: string; actorOrganizationId: string | null }> {
  if (!organizationId) throw new AuthError("organizationId requerido", 400)
  const access = await assertCanManageAccountingFolder(session, organizationId)
  return {
    folderOwnerOrganizationId: access.folderOwnerOrganizationId,
    actorOrganizationId: access.accountingFirmId ?? session.defaultOrganizationId,
  }
}

export function assertSameFolder(inputOrganizationId: string, resolvedOrganizationId: string): void {
  if (inputOrganizationId !== resolvedOrganizationId) {
    throw new AuthError("La organizacion no coincide con la carpeta autorizada", 403)
  }
}

export async function assertDocBelongsToWritableFolder(
  session: ServerSession,
  collectionName: string,
  docId: string,
): Promise<{ data: FirebaseFirestore.DocumentData; actorOrganizationId: string | null }> {
  const ref = getAdminDb().collection(collectionName).doc(docId)
  const snap = await ref.get()
  if (!snap.exists) throw new AuthError("Documento no encontrado", 404)

  const data = snap.data() ?? {}
  const organizationId = typeof data.organizationId === "string" ? data.organizationId : null
  if (!organizationId) throw new AuthError("Documento sin organizationId canonico", 409)

  const access = await assertWritableFolder(session, organizationId)
  assertSameFolder(organizationId, access.folderOwnerOrganizationId)
  return { data, actorOrganizationId: access.actorOrganizationId }
}

export async function assertDocBelongsToReadableFolder(
  session: ServerSession,
  collectionName: string,
  docId: string,
): Promise<{ data: FirebaseFirestore.DocumentData; actorOrganizationId: string | null }> {
  const ref = getAdminDb().collection(collectionName).doc(docId)
  const snap = await ref.get()
  if (!snap.exists) throw new AuthError("Documento no encontrado", 404)

  const data = snap.data() ?? {}
  const organizationId =
    typeof data.organizationId === "string"
      ? data.organizationId
      : typeof data.folderOwnerOrganizationId === "string"
        ? data.folderOwnerOrganizationId
        : null
  if (!organizationId) throw new AuthError("Documento sin organizacion canonica", 409)

  const access = await assertReadableFolder(session, organizationId)
  assertSameFolder(organizationId, access.folderOwnerOrganizationId)
  return { data, actorOrganizationId: access.actorOrganizationId }
}

export async function listFolderDocs<T>(params: {
  session: ServerSession
  collectionName: string
  targetOrganizationId: string
  filters?: Array<[string, FirebaseFirestore.WhereFilterOp, unknown]>
}): Promise<Array<T & { id: string }>> {
  const access = await assertReadableFolder(params.session, params.targetOrganizationId)
  assertSameFolder(params.targetOrganizationId, access.folderOwnerOrganizationId)

  async function runQuery(field: "organizationId" | "producerId") {
    let query: FirebaseFirestore.Query = getAdminDb()
      .collection(params.collectionName)
      .where(field, "==", params.targetOrganizationId)
    for (const [filterField, op, value] of params.filters ?? []) {
      query = query.where(filterField, op, value)
    }
    return query.get()
  }

  const [byOrganization, byProducer] = await Promise.all([
    runQuery("organizationId"),
    runQuery("producerId"),
  ])

  const docs = new Map<string, T & { id: string }>()
  for (const snap of [...byOrganization.docs, ...byProducer.docs]) {
    docs.set(snap.id, { id: snap.id, ...(snap.data() as T) })
  }
  return [...docs.values()]
}

export async function getFolderDoc<T>(params: {
  session: ServerSession
  collectionName: string
  docId: string
}): Promise<T & { id: string }> {
  const { data } = await assertDocBelongsToReadableFolder(
    params.session,
    params.collectionName,
    params.docId,
  )
  return { id: params.docId, ...(data as T) }
}

export async function addFolderDoc(params: {
  session: ServerSession
  collectionName: string
  data: Record<string, unknown>
  auditAction: string
  targetType: string
}): Promise<string> {
  const organizationId = String(params.data.organizationId ?? "")
  const access = await assertWritableFolder(params.session, organizationId)
  assertSameFolder(organizationId, access.folderOwnerOrganizationId)

  const now = FieldValue.serverTimestamp()
  const ref = await getAdminDb().collection(params.collectionName).add({
    ...params.data,
    folderOwnerOrganizationId: organizationId,
    createdBy: params.session.uid,
    createdAt: now,
    updatedAt: now,
  })

  await writeAuditLog({
    actorUid: params.session.uid,
    actorOrganizationId: access.actorOrganizationId,
    action: params.auditAction,
    targetType: params.targetType,
    targetId: ref.id,
    metadata: { organizationId },
  })

  return ref.id
}

export async function updateFolderDoc(params: {
  session: ServerSession
  collectionName: string
  docId: string
  data: Record<string, unknown>
  auditAction: string
  targetType: string
}): Promise<void> {
  const { actorOrganizationId } = await assertDocBelongsToWritableFolder(
    params.session,
    params.collectionName,
    params.docId,
  )

  await getAdminDb().collection(params.collectionName).doc(params.docId).update({
    ...params.data,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await writeAuditLog({
    actorUid: params.session.uid,
    actorOrganizationId,
    action: params.auditAction,
    targetType: params.targetType,
    targetId: params.docId,
  })
}

export async function deleteFolderDoc(params: {
  session: ServerSession
  collectionName: string
  docId: string
  auditAction: string
  targetType: string
}): Promise<void> {
  const { actorOrganizationId } = await assertDocBelongsToWritableFolder(
    params.session,
    params.collectionName,
    params.docId,
  )

  await getAdminDb().collection(params.collectionName).doc(params.docId).delete()

  await writeAuditLog({
    actorUid: params.session.uid,
    actorOrganizationId,
    action: params.auditAction,
    targetType: params.targetType,
    targetId: params.docId,
  })
}

export async function uploadPrivateFolderFile(params: {
  session: ServerSession
  file: File
  metadata: Record<string, string>
}): Promise<Record<string, unknown>> {
  const organizationId = params.metadata.organizationId
  const producerId = params.metadata.producerId
  const periodId = params.metadata.periodId
  const documentType = params.metadata.documentType
  const fileName = params.metadata.fileName
  const mimeType = params.metadata.mimeType

  if (!organizationId || !producerId || !periodId || !documentType || !fileName || !mimeType) {
    throw new AuthError("Metadata incompleta para subir documento", 400)
  }

  const access = await assertWritableFolder(params.session, organizationId)
  assertSameFolder(organizationId, access.folderOwnerOrganizationId)

  const docId = crypto.randomUUID()
  const safeFileName = fileName.replace(/[^\w.\-() ]+/g, "_")
  const storagePath = `orgs/${organizationId}/producers/${producerId}/periods/${periodId}/${documentType}/${docId}-${safeFileName}`
  const buffer = Buffer.from(await params.file.arrayBuffer())
  const bucket = getAdminStorage().bucket()

  await bucket.file(storagePath).save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata: {
        visibility: "private",
        uploadedBy: params.session.uid,
      },
    },
  })

  const docData = {
    producerId,
    organizationId,
    folderOwnerOrganizationId: organizationId,
    periodId,
    documentType,
    storagePath,
    downloadUrl: null,
    fileName,
    fileSize: params.file.size,
    mimeType,
    visibility: "private",
    uploadedBy: params.session.uid,
    validationStatus: "draft",
    createdAt: FieldValue.serverTimestamp(),
  }

  const ref = await getAdminDb().collection(COLLECTIONS.DOCUMENTS).add(docData)
  await writeAuditLog({
    actorUid: params.session.uid,
    actorOrganizationId: access.actorOrganizationId,
    action: "document.uploaded",
    targetType: "document",
    targetId: ref.id,
    metadata: { organizationId, periodId, documentType, storagePath },
  })

  return { id: ref.id, ...docData, createdAt: new Date().toISOString() }
}
