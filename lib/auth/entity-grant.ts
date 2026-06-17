import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { AuthError } from "@/lib/auth/server-session"

/**
 * Valida que la organizacion de la sesion (entidad financiera) tenga un grant
 * aprobado y vigente sobre el legajo del cliente. Lanza AuthError 403 si no.
 */
export async function assertEntityGrant(
  sessionOrganizationId: string,
  targetOrganizationId: string,
): Promise<void> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.ACCESS_GRANTS)
    .where("targetOrganizationId", "==", targetOrganizationId)
    .where("grantedToOrganizationId", "==", sessionOrganizationId)
    .where("status", "==", "approved")
    .limit(5)
    .get()
  const now = new Date()
  const hasGrant = snap.docs.some((doc) => {
    const data = doc.data()
    const expiresAt = data.expiresAt?.toDate?.() ?? new Date(data.expiresAt)
    return expiresAt > now
  })
  if (!hasGrant) throw new AuthError("La entidad no tiene grant vigente para este legajo", 403)
}
