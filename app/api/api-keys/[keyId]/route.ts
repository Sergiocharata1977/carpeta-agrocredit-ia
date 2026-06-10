import { NextRequest } from "next/server"
import {
  AuthError,
  getAuthErrorResponse,
  isAdminPlatform,
  requireDefaultOrganization,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { revokeApiKey } from "@/lib/services/api-keys"

interface RouteContext {
  params: Promise<{ keyId: string }>
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { keyId } = await params
    const session = await verifyRequestSession(request)
    const orgId = requireDefaultOrganization(session)

    const snap = await getAdminDb().collection(COLLECTIONS.API_KEYS).doc(keyId).get()
    if (!snap.exists) {
      return Response.json({ error: "API key no encontrada" }, { status: 404 })
    }

    const keyData = snap.data()!
    if (!isAdminPlatform(session) && keyData.organizationId !== orgId) {
      throw new AuthError("No tenes permisos para revocar esta API key", 403)
    }

    await revokeApiKey(keyId, session.uid)

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: orgId,
      action: "api_key.revoked",
      targetType: "api_key",
      targetId: keyId,
      metadata: {},
    })

    return Response.json({ ok: true })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
