import { NextRequest } from "next/server"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import {
  getAuthErrorResponse,
  requireAnyRole,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import type { AccessGrant } from "@/types/access"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetOrgId: string; docId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["bank_user", "agro_company_user", "admin_platform"])

    const { targetOrgId, docId } = await params
    const db = getAdminDb()
    const now = new Date()

    // Verify active grant with documents scope
    let hasAccess = false
    if (session.roles.includes("admin_platform")) {
      hasAccess = true
    } else if (session.defaultOrganizationId) {
      const snap = await db
        .collection(COLLECTIONS.ACCESS_GRANTS)
        .where("targetOrganizationId", "==", targetOrgId)
        .where("grantedToOrganizationId", "==", session.defaultOrganizationId)
        .where("status", "==", "approved")
        .limit(5)
        .get()

      const grant = snap.docs
        .map((d) => d.data() as AccessGrant)
        .find((g) => {
          const expiresAt = (g.expiresAt as unknown as FirebaseFirestore.Timestamp)?.toDate?.() ?? new Date(g.expiresAt)
          if (expiresAt <= now) return false
          return (
            g.allowedScopes.includes("full_credit_folder") ||
            g.allowedScopes.includes("documents")
          )
        })
      hasAccess = !!grant
    }

    if (!hasAccess) {
      return Response.json({ error: "Sin acceso para descargar documentos" }, { status: 403 })
    }

    const docSnap = await db.collection(COLLECTIONS.DOCUMENTS).doc(docId).get()
    if (!docSnap.exists) {
      return Response.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    const docData = docSnap.data()!
    if (docData.producerId !== targetOrgId) {
      return Response.json({ error: "El documento no pertenece a esta carpeta" }, { status: 403 })
    }

    const storagePath: string = docData.storagePath
    if (!storagePath) {
      return Response.json({ error: "El documento no tiene archivo adjunto" }, { status: 404 })
    }

    const bucket = getAdminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
    const file = bucket.file(storagePath)
    const [exists] = await file.exists()
    if (!exists) {
      return Response.json({ error: "Archivo no encontrado en storage" }, { status: 404 })
    }

    const expiresInMs = 5 * 60 * 1000 // 5 minutes TTL
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: new Date(now.getTime() + expiresInMs),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "document.downloaded_by_entity",
      targetType: "document",
      targetId: docId,
      metadata: {
        targetOrganizationId: targetOrgId,
        fileName: docData.fileName ?? docData.name,
      },
    })

    return Response.json({ url: signedUrl, expiresAt: new Date(now.getTime() + expiresInMs).toISOString() })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
