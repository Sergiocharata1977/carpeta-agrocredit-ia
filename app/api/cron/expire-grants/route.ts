import { NextRequest } from "next/server"
import { Timestamp, FieldValue } from "firebase-admin/firestore"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = getAdminDb()
  const now = Timestamp.now()
  const nowDate = now.toDate()

  const snap = await db
    .collection(COLLECTIONS.ACCESS_GRANTS)
    .where("status", "==", "approved")
    .get()

  const expired = snap.docs.filter((doc) => {
    const expiresAt: FirebaseFirestore.Timestamp | undefined = doc.data().expiresAt
    return expiresAt && expiresAt.toDate() < nowDate
  })

  if (expired.length === 0) {
    return Response.json({ expired: 0 })
  }

  // Firestore batch limit is 500; chunk if needed
  const CHUNK = 200
  for (let i = 0; i < expired.length; i += CHUNK) {
    const chunk = expired.slice(i, i + CHUNK)
    const batch = db.batch()

    for (const doc of chunk) {
      const data = doc.data()

      batch.update(doc.ref, {
        status: "expired",
        updatedAt: FieldValue.serverTimestamp(),
      })

      const notifProducer = db.collection(COLLECTIONS.NOTIFICATIONS).doc()
      batch.set(notifProducer, {
        recipientOrganizationId: data.targetOrganizationId,
        type: "grant_expired",
        grantId: doc.id,
        grantedToOrganizationId: data.grantedToOrganizationId,
        message: "Un acceso autorizado venció. La entidad ya no puede ver tu carpeta.",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      })

      const notifEntity = db.collection(COLLECTIONS.NOTIFICATIONS).doc()
      batch.set(notifEntity, {
        recipientOrganizationId: data.grantedToOrganizationId,
        type: "grant_expired",
        grantId: doc.id,
        targetOrganizationId: data.targetOrganizationId,
        message: "Tu acceso a una carpeta venció. Solicitá renovación al titular.",
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    await batch.commit()
  }

  await writeAuditLog({
    actorUid: "cron",
    actorOrganizationId: null,
    action: "access_grant.bulk_expired",
    targetType: "access_grant",
    targetId: "cron",
    metadata: { count: expired.length },
  })

  return Response.json({ expired: expired.length })
}
