// Resolución de carpeta (organización) por CUIT dentro de un grupo de cliente.
//
// El grupo = titular raíz (organizations/{rootOrganizationId}) + sus empresas
// hijas (where parentOrganizationId == rootOrganizationId). Compara el CUIT
// detectado (normalizado a solo dígitos) contra el taxId de cada organización
// y devuelve el orgId que coincide (o null). Solo lee Firestore vía Admin SDK.

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"

export interface FolderCandidate {
  orgId: string
  taxId: string
  legalName: string
}

export interface ResolveFolderResult {
  orgId: string | null
  candidates: FolderCandidate[]
}

/** Normaliza un CUIT/taxId a solo dígitos (quita guiones, espacios, puntos). */
export function normalizeCuit(value: string | null | undefined): string {
  if (!value) return ""
  return value.replace(/\D/g, "")
}

/**
 * Resuelve la carpeta del grupo cuyo taxId coincide con el CUIT detectado.
 * Devuelve siempre la lista de candidatas (titular + hijas) para que el caller
 * pueda registrar contexto o presentar opciones de asignación manual.
 */
export async function resolveFolderByCuit(
  rootOrganizationId: string,
  detectedCuit: string | null,
): Promise<ResolveFolderResult> {
  const db = getAdminDb()
  const candidates: FolderCandidate[] = []

  // Titular raíz.
  const rootSnap = await db
    .collection(COLLECTIONS.ORGANIZATIONS)
    .doc(rootOrganizationId)
    .get()
  if (rootSnap.exists) {
    const data = rootSnap.data() ?? {}
    candidates.push({
      orgId: rootSnap.id,
      taxId: (data.taxId as string) ?? "",
      legalName: (data.legalName as string) ?? "",
    })
  }

  // Empresas hijas.
  const childrenSnap = await db
    .collection(COLLECTIONS.ORGANIZATIONS)
    .where("parentOrganizationId", "==", rootOrganizationId)
    .get()
  for (const child of childrenSnap.docs) {
    const data = child.data() ?? {}
    candidates.push({
      orgId: child.id,
      taxId: (data.taxId as string) ?? "",
      legalName: (data.legalName as string) ?? "",
    })
  }

  const normalizedDetected = normalizeCuit(detectedCuit)
  if (!normalizedDetected) {
    return { orgId: null, candidates }
  }

  const match = candidates.find(
    (c) => normalizeCuit(c.taxId) === normalizedDetected,
  )

  return { orgId: match?.orgId ?? null, candidates }
}
