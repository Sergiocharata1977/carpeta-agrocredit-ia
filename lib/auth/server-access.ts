import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import {
  AuthError,
  isAccountantRole,
  isAdminPlatform,
  isProducerRole,
  type ServerSession,
} from "@/lib/auth/server-session"
import type { Organization } from "@/types/auth"
import type { AccessGrant } from "@/types/access"

// Obtiene la organización objetivo (system_user o system_user_entity) server-side
export async function getTargetOrganizationForServer(targetOrganizationId: string): Promise<Organization> {
  const snap = await getAdminDb().collection(COLLECTIONS.ORGANIZATIONS).doc(targetOrganizationId).get()

  if (!snap.exists) {
    throw new AuthError("Organización no encontrada", 404)
  }

  const org = { id: snap.id, ...snap.data() } as Organization
  if (org.type !== "system_user" && org.type !== "system_user_entity") {
    throw new AuthError("La organización no es un usuario del sistema", 400)
  }

  return org
}

// Verifica que la sesión puede decidir accesos sobre una organización target
// - Admin: siempre puede
// - system_user: solo si es member activo de la org target
// - Contador con canAuthorize=true: si tiene vínculo activo con el system_user raíz
export async function assertCanDecideAccess(
  session: ServerSession,
  targetOrganizationId: string,
): Promise<Organization> {
  const targetOrg = await getTargetOrganizationForServer(targetOrganizationId)

  if (isAdminPlatform(session)) return targetOrg

  // system_user que es member de la org target
  if (isProducerRole(session)) {
    const memberId = `${targetOrganizationId}_${session.uid}`
    const memberSnap = await getAdminDb()
      .collection(COLLECTIONS.ORGANIZATION_MEMBERS)
      .doc(memberId)
      .get()

    if (memberSnap.exists && memberSnap.data()?.status === "active") {
      return targetOrg
    }

    // Si la org es system_user_entity, verificar membresía en la org raíz
    if (targetOrg.parentOrganizationId) {
      const rootMemberId = `${targetOrg.parentOrganizationId}_${session.uid}`
      const rootMemberSnap = await getAdminDb()
        .collection(COLLECTIONS.ORGANIZATION_MEMBERS)
        .doc(rootMemberId)
        .get()

      if (rootMemberSnap.exists && rootMemberSnap.data()?.status === "active") {
        return targetOrg
      }
    }
  }

  // Contador con delegación canAuthorize=true
  if (isAccountantRole(session)) {
    const systemUserOrgId = targetOrg.parentOrganizationId ?? targetOrganizationId
    const delegated = await getAdminDb()
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("systemUserOrganizationId", "==", systemUserOrgId)
      .where("accountantUid", "==", session.uid)
      .where("status", "==", "active")
      .where("canAuthorize", "==", true)
      .limit(1)
      .get()

    if (!delegated.empty) return targetOrg
  }

  throw new AuthError("No tenés permisos para decidir accesos sobre esta organización", 403)
}

export function assertGrantIsActive(grant: AccessGrant): void {
  if (grant.status !== "approved") {
    throw new AuthError("El grant no está aprobado", 403)
  }

  if (new Date(grant.expiresAt) <= new Date()) {
    throw new AuthError("El grant está vencido", 403)
  }
}

export async function notifyOrganizationUsers(params: {
  organizationId: string | null
  type: string
  payload: Record<string, unknown>
}): Promise<void> {
  if (!params.organizationId) return

  const db = getAdminDb()
  const users = await db
    .collection(COLLECTIONS.USERS)
    .where("defaultOrganizationId", "==", params.organizationId)
    .limit(25)
    .get()

  if (users.empty) return

  const batch = db.batch()
  users.docs.forEach((userDoc) => {
    const ref = db.collection(COLLECTIONS.NOTIFICATIONS).doc()
    batch.set(ref, {
      recipientUid: userDoc.id,
      organizationId: params.organizationId,
      type: params.type,
      status: "unread",
      payload: params.payload,
      createdAt: new Date().toISOString(),
    })
  })

  await batch.commit()
}
