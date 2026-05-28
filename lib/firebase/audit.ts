import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { FieldValue } from "firebase-admin/firestore"

// Tipo de acción — debe coincidir con AuditAction de types/audit.ts
// Se define aquí como string para evitar dependencia circular en server code.
// Los valores válidos están documentados en types/audit.ts.
type AuditAction = string

interface WriteAuditLogParams {
  actorUid: string
  actorOrganizationId: string | null
  action: AuditAction
  targetType: string
  targetId: string
  producerId?: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    const db = getAdminDb()
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      actorUid: params.actorUid,
      actorOrganizationId: params.actorOrganizationId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      producerId: params.producerId ?? null,
      metadata: params.metadata ?? {},
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    // Log de auditoría nunca debe interrumpir el flujo principal
    console.error("[audit] Error writing audit log:", error)
  }
}
