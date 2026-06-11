import { headers } from "next/headers"
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
  metadata?: Record<string, unknown>
}

// IP y user-agent se capturan automaticamente del request en curso.
// Fuera de un request (ej. cron sin headers) quedan en null sin romper el flujo.
async function getRequestContext(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers()
    const forwarded = h.get("x-forwarded-for")
    const ip = forwarded ? forwarded.split(",")[0].trim() : h.get("x-real-ip")
    return { ip: ip || null, userAgent: h.get("user-agent") || null }
  } catch {
    return { ip: null, userAgent: null }
  }
}

export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    const { ip, userAgent } = await getRequestContext()
    const db = getAdminDb()
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      actorUid: params.actorUid,
      actorOrganizationId: params.actorOrganizationId ?? null,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ?? {},
      ip,
      userAgent,
      createdAt: FieldValue.serverTimestamp(),
    })
  } catch (error) {
    // Log de auditoría nunca debe interrumpir el flujo principal
    console.error("[audit] Error writing audit log:", error)
  }
}
