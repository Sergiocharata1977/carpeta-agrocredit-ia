import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetOrganizationId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { targetOrganizationId } = await params
    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(session, targetOrganizationId)
    const snap = await getAdminDb()
      .collection(COLLECTIONS.CANONICAL_CREDIT_PROFILES)
      .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
      .limit(1)
      .get()
    if (snap.empty) return Response.json({ profile: null })
    const doc = snap.docs[0]
    return Response.json({ profile: { id: doc.id, ...doc.data() } })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
