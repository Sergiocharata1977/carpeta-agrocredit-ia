import { NextRequest } from "next/server"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { getAuthErrorResponse, requireActiveOrg, verifyRequestSession } from "@/lib/auth/server-session"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { docId } = await params
    const targetOrganizationId = request.nextUrl.searchParams.get("targetOrganizationId") ?? ""
    if (!targetOrganizationId) {
      return Response.json({ error: "targetOrganizationId requerido" }, { status: 400 })
    }

    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(session, targetOrganizationId)
    const docSnap = await getAdminDb().collection(COLLECTIONS.DOCUMENTS).doc(docId).get()
    if (!docSnap.exists) {
      return Response.json({ error: "Documento no encontrado" }, { status: 404 })
    }

    const docData = docSnap.data()!
    if (docData.folderOwnerOrganizationId !== folderOwnerOrganizationId) {
      return Response.json({ error: "El documento no pertenece a esta carpeta" }, { status: 403 })
    }
    if (!docData.storagePath) {
      return Response.json({ error: "El documento no tiene archivo adjunto" }, { status: 404 })
    }

    const bucket = getAdminStorage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
    const file = bucket.file(String(docData.storagePath))
    const [exists] = await file.exists()
    if (!exists) {
      return Response.json({ error: "Archivo no encontrado en storage" }, { status: 404 })
    }

    const now = new Date()
    const expiresInMs = 5 * 60 * 1000
    const [url] = await file.getSignedUrl({
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
        folderOwnerOrganizationId,
        targetOrganizationId,
        fileName: docData.fileName ?? docData.name,
        source: "credito_hub_review_preview",
      },
    })

    return Response.json({
      url,
      expiresAt: new Date(now.getTime() + expiresInMs).toISOString(),
      fileName: docData.fileName ?? docData.name,
      mimeType: docData.mimeType,
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
