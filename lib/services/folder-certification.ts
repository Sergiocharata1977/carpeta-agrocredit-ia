/**
 * Servicio Admin SDK de certificación profesional de la carpeta (Ola 5).
 *
 * El contador "valida y certifica" la carpeta de un cliente/empresa: queda un
 * sello "Certificado por [Contador], [fecha]" que ve el financista.
 *
 * Invalidación PEREZOSA: en la lectura (getCurrentCertification) se recalcula la
 * huella actual de los datos y, si difiere de la guardada al certificar
 * (sourceVersion), la certificación pasa a "outdated" (se persiste) y se audita
 * folder.certification_invalidated.
 *
 * Partition key = folderOwnerOrganizationId.
 */

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { computeFolderFingerprint } from "@/lib/credito-hub/folder-fingerprint"
import type {
  CertificationScope,
  FolderCertification,
} from "@/types/folder-certification"

// Normaliza el doc de Firestore a FolderCertification (campos faltantes -> defaults).
function toCertification(id: string, data: Record<string, unknown>): FolderCertification {
  return {
    id,
    folderOwnerOrganizationId: String(data.folderOwnerOrganizationId ?? ""),
    accountingFirmId: (data.accountingFirmId as string | null) ?? null,
    certificationScope: (data.certificationScope as CertificationScope) ?? "full_folder",
    status: (data.status as FolderCertification["status"]) ?? "draft",
    certifiedByUid: String(data.certifiedByUid ?? ""),
    certifiedByName: String(data.certifiedByName ?? ""),
    certifiedAt: (data.certifiedAt as string | null) ?? null,
    sourceVersion: String(data.sourceVersion ?? ""),
    invalidatedAt: (data.invalidatedAt as string | null) ?? null,
    invalidatedReason: (data.invalidatedReason as string | null) ?? null,
    createdAt: (data.createdAt as string) ?? "",
    updatedAt: (data.updatedAt as string) ?? "",
  }
}

// Lee la última certificación del legajo (por updatedAt desc, con fallback en memoria).
async function fetchLatest(
  folderOwnerOrganizationId: string,
): Promise<{ id: string; data: Record<string, unknown> } | null> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.FOLDER_CERTIFICATIONS)
    .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
    .get()

  if (snap.empty) return null

  const docs = snap.docs
    .map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }))
    .sort((a, b) => {
      const ua = String(a.data.updatedAt ?? "")
      const ub = String(b.data.updatedAt ?? "")
      return ub.localeCompare(ua)
    })

  return docs[0]
}

/**
 * Devuelve la certificación vigente del legajo con invalidación PEREZOSA aplicada.
 * Si está "certified" pero la huella actual difiere de sourceVersion, la marca
 * "outdated" (persiste) y audita folder.certification_invalidated.
 */
export async function getCurrentCertification(
  folderOwnerOrganizationId: string,
): Promise<FolderCertification | null> {
  const latest = await fetchLatest(folderOwnerOrganizationId)
  if (!latest) return null

  const cert = toCertification(latest.id, latest.data)

  if (cert.status !== "certified") {
    return cert
  }

  const currentFingerprint = await computeFolderFingerprint(folderOwnerOrganizationId)
  if (currentFingerprint === cert.sourceVersion) {
    return cert
  }

  // Los datos cambiaron desde la certificación -> invalidar perezosamente.
  const nowIso = new Date().toISOString()
  const invalidatedReason = "Los datos de la carpeta cambiaron después de la certificación"

  await getAdminDb()
    .collection(COLLECTIONS.FOLDER_CERTIFICATIONS)
    .doc(cert.id)
    .update({
      status: "outdated",
      invalidatedAt: nowIso,
      invalidatedReason,
      updatedAt: nowIso,
    })

  await writeAuditLog({
    actorUid: cert.certifiedByUid,
    actorOrganizationId: cert.accountingFirmId,
    action: "folder.certification_invalidated",
    targetType: "folder_certification",
    targetId: cert.id,
    metadata: {
      folderOwnerOrganizationId,
      previousSourceVersion: cert.sourceVersion,
      currentFingerprint,
      reason: invalidatedReason,
    },
  })

  return {
    ...cert,
    status: "outdated",
    invalidatedAt: nowIso,
    invalidatedReason,
    updatedAt: nowIso,
  }
}

export interface CertifyFolderParams {
  folderOwnerOrganizationId: string
  accountingFirmId: string | null
  certifiedByUid: string
  certifiedByName: string
  scope: CertificationScope
}

/**
 * Crea (o actualiza la existente) la certificación del legajo a estado
 * "certified", fijando sourceVersion = huella actual y certifiedAt = ahora.
 * Audita folder.certified.
 */
export async function certifyFolder(
  params: CertifyFolderParams,
): Promise<FolderCertification> {
  const {
    folderOwnerOrganizationId,
    accountingFirmId,
    certifiedByUid,
    certifiedByName,
    scope,
  } = params

  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.FOLDER_CERTIFICATIONS)

  const sourceVersion = await computeFolderFingerprint(folderOwnerOrganizationId)
  const nowIso = new Date().toISOString()

  const existing = await fetchLatest(folderOwnerOrganizationId)

  if (existing) {
    const createdAt = (existing.data.createdAt as string) ?? nowIso
    await col.doc(existing.id).update({
      accountingFirmId,
      certificationScope: scope,
      status: "certified",
      certifiedByUid,
      certifiedByName,
      certifiedAt: nowIso,
      sourceVersion,
      invalidatedAt: null,
      invalidatedReason: null,
      updatedAt: nowIso,
    })

    const cert: FolderCertification = {
      id: existing.id,
      folderOwnerOrganizationId,
      accountingFirmId,
      certificationScope: scope,
      status: "certified",
      certifiedByUid,
      certifiedByName,
      certifiedAt: nowIso,
      sourceVersion,
      invalidatedAt: null,
      invalidatedReason: null,
      createdAt,
      updatedAt: nowIso,
    }

    await writeAuditLog({
      actorUid: certifiedByUid,
      actorOrganizationId: accountingFirmId,
      action: "folder.certified",
      targetType: "folder_certification",
      targetId: cert.id,
      metadata: { folderOwnerOrganizationId, scope, sourceVersion },
    })

    return cert
  }

  const ref = col.doc()
  const cert: FolderCertification = {
    id: ref.id,
    folderOwnerOrganizationId,
    accountingFirmId,
    certificationScope: scope,
    status: "certified",
    certifiedByUid,
    certifiedByName,
    certifiedAt: nowIso,
    sourceVersion,
    invalidatedAt: null,
    invalidatedReason: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }

  await ref.set(cert)

  await writeAuditLog({
    actorUid: certifiedByUid,
    actorOrganizationId: accountingFirmId,
    action: "folder.certified",
    targetType: "folder_certification",
    targetId: cert.id,
    metadata: { folderOwnerOrganizationId, scope, sourceVersion },
  })

  return cert
}
