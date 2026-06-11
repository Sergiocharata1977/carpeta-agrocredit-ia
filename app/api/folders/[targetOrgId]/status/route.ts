import { NextRequest } from "next/server"
import {
  getAuthErrorResponse,
  isAccountantRole,
  isAdminPlatform,
  isProducerRole,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { getFolderDataStatus } from "@/lib/firebase/folder-data"

// Estado liviano de la carpeta: si tiene informacion cargada y en que secciones.
// Acceso: titular de la carpeta, contador o admin de plataforma.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetOrgId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    const { targetOrgId } = await params

    const isOwner = isProducerRole(session) && session.defaultOrganizationId === targetOrgId
    if (!isOwner && !isAccountantRole(session) && !isAdminPlatform(session)) {
      return Response.json({ error: "Sin acceso al estado de esta carpeta" }, { status: 403 })
    }

    const status = await getFolderDataStatus(getAdminDb(), targetOrgId)
    return Response.json(status)
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
