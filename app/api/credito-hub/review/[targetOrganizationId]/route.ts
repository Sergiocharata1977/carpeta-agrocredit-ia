import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { getFieldsByDocument, getFieldsByOwner } from "@/lib/services/extracted-fields"
import { getClassificationByDocument } from "@/lib/services/document-classification"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetOrganizationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { targetOrganizationId } = await params
    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(session, targetOrganizationId)
    const documentId = request.nextUrl.searchParams.get("documentId")
    if (documentId) {
      const fields = await getFieldsByDocument(documentId)
      const classification = await getClassificationByDocument(documentId)
      const db = getAdminDb()
      const documentSnap = await db.collection(COLLECTIONS.DOCUMENTS).doc(documentId).get()
      const document = documentSnap.exists ? { id: documentSnap.id, ...documentSnap.data() } : null
      if (document && (document as { folderOwnerOrganizationId?: string }).folderOwnerOrganizationId !== folderOwnerOrganizationId) {
        return Response.json({ error: "Documento fuera del legajo activo" }, { status: 403 })
      }
      return Response.json({ fields, classification, document })
    }
    const fields = (await getFieldsByOwner(folderOwnerOrganizationId)).filter(
      (field) => field.reviewStatus === "PENDING" || field.confidence < 0.7,
    )
    const db = getAdminDb()
    const documentIds = Array.from(new Set(fields.map((field) => field.documentId)))
    const documents: Record<string, unknown> = {}
    for (const documentId of documentIds) {
      const snap = await db.collection(COLLECTIONS.DOCUMENTS).doc(documentId).get()
      if (snap.exists) documents[documentId] = { id: snap.id, ...snap.data() }
    }
    return Response.json({ fields, documents })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
