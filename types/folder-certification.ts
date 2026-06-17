// Certificación profesional de la carpeta crediticia (Ola 5)
// El contador valida y certifica la carpeta de un cliente/empresa.
// Si los datos cambian después de certificar, la certificación pasa a "outdated"
// vía invalidación PEREZOSA en la lectura (comparando la huella de los datos).

export type CertificationStatus = "draft" | "certified" | "outdated" | "revoked"

export type CertificationScope =
  | "identity"
  | "accounting"
  | "fiscal"
  | "patrimonial"
  | "full_folder"

export interface FolderCertification {
  id: string
  folderOwnerOrganizationId: string
  accountingFirmId: string | null
  certificationScope: CertificationScope
  status: CertificationStatus
  certifiedByUid: string
  certifiedByName: string
  certifiedAt: string | null
  // Huella estable de los datos al momento de certificar.
  // Si la huella actual difiere, la cert pasa a "outdated".
  sourceVersion: string
  invalidatedAt: string | null
  invalidatedReason: string | null
  createdAt: string
  updatedAt: string
}
