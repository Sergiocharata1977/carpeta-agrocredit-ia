import { NextRequest } from "next/server"
import {
  getAuthErrorResponse,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"

// Devuelve datos basicos de la organizacion por defecto de la sesion,
// para cualquier rol (productor, contador, entidad, admin). Solo lectura
// de la org propia: el orgId sale del token, nunca del cliente.
export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    const orgId = session.defaultOrganizationId

    if (!orgId) {
      return Response.json({ organization: null })
    }

    const snap = await getAdminDb().collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get()
    if (!snap.exists) {
      return Response.json({ organization: null })
    }

    const data = snap.data()!
    return Response.json({
      organization: {
        id: snap.id,
        legalName: data.legalName ?? null,
        taxId: data.taxId ?? null,
        type: data.type ?? null,
        subtype: data.subtype ?? null,
        status: data.status ?? null,
      },
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
