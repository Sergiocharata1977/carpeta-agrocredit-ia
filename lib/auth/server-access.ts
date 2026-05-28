import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import {
  AuthError,
  isAccountantRole,
  isAdminPlatform,
  isProducerRole,
  type ServerSession,
} from "@/lib/auth/server-session"
import type { Producer } from "@/types/producer"
import type { AccessGrant } from "@/types/access"

export async function getProducerForServer(producerId: string): Promise<Producer> {
  const snap = await getAdminDb().collection(COLLECTIONS.PRODUCERS).doc(producerId).get()

  if (!snap.exists) {
    throw new AuthError("Productor no encontrado", 404)
  }

  return { id: snap.id, ...snap.data() } as Producer
}

export async function assertCanDecideProducerAccess(
  session: ServerSession,
  producerId: string,
): Promise<Producer> {
  const producer = await getProducerForServer(producerId)

  if (isAdminPlatform(session)) return producer

  if (
    isProducerRole(session) &&
    session.defaultOrganizationId === producer.organizationId
  ) {
    return producer
  }

  if (isAccountantRole(session)) {
    const delegated = await getAdminDb()
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("producerId", "==", producerId)
      .where("accountantUid", "==", session.uid)
      .where("status", "==", "active")
      .where("canAuthorize", "==", true)
      .limit(1)
      .get()

    if (!delegated.empty) return producer
  }

  throw new AuthError("No podes decidir accesos para este productor", 403)
}

export function assertGrantIsActive(grant: AccessGrant): void {
  if (grant.status !== "approved") {
    throw new AuthError("El grant no esta aprobado", 403)
  }

  if (new Date(grant.expiresAt) <= new Date()) {
    throw new AuthError("El grant esta vencido", 403)
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
