import { NextRequest } from "next/server"
import { z } from "zod"
import {
  getAuthErrorResponse,
  isAdminPlatform,
  requireDefaultOrganization,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import { writeAuditLog } from "@/lib/firebase/audit"
import { createApiKey, listApiKeys, toPublicApiKey } from "@/lib/services/api-keys"
import { createApiKeySchema } from "@/lib/schemas/api-keys"

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    const orgId = isAdminPlatform(session) ? undefined : requireDefaultOrganization(session)
    const keys = await listApiKeys(orgId)
    return Response.json({ keys: keys.map(toPublicApiKey) })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    const orgId = requireDefaultOrganization(session)
    const data = createApiKeySchema.parse(await request.json())

    const { apiKey, plaintext } = await createApiKey({
      organizationId: orgId,
      name: data.name,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
      createdBy: session.uid,
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: orgId,
      action: "api_key.created",
      targetType: "api_key",
      targetId: apiKey.id,
      metadata: { name: data.name, scopes: data.scopes },
    })

    return Response.json({ apiKey: toPublicApiKey(apiKey), plaintext }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }
    return getAuthErrorResponse(error)
  }
}
