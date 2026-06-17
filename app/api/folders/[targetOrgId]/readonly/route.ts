import { NextRequest } from "next/server"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { getCurrentCertification } from "@/lib/services/folder-certification"
import {
  getAuthErrorResponse,
  isProducerRole,
  requireAnyRole,
  verifyRequestSession,
} from "@/lib/auth/server-session"
import type { AccessGrant } from "@/types/access"

const FULL_SCOPES = [
  "profile_basic",
  "accounting_summary",
  "balance_sheets",
  "income_statements",
  "tax_documents",
  "assets",
  "liabilities",
  "documents",
  "full_credit_folder",
] as const

function serializeDoc<T extends FirebaseFirestore.DocumentData>(doc: FirebaseFirestore.QueryDocumentSnapshot<T>) {
  const data = doc.data()
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt,
  }
}

function hasScope(grant: AccessGrant, scope: string) {
  return grant.allowedScopes.includes("full_credit_folder") || grant.allowedScopes.includes(scope as AccessGrant["allowedScopes"][number])
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ targetOrgId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    const { targetOrgId } = await params

    // El titular puede ver su propia carpeta; el resto requiere rol de entidad o admin
    const isOwner = isProducerRole(session) && session.defaultOrganizationId === targetOrgId
    if (!isOwner) {
      requireAnyRole(session, ["bank_user", "agro_company_user", "admin_platform"])
    }

    const db = getAdminDb()
    const now = new Date()
    let grant: AccessGrant | null = null

    if (isOwner) {
      grant = {
        id: "owner",
        targetOrganizationId: targetOrgId,
        targetScope: "single_organization",
        accessRequestId: "owner",
        grantedToOrganizationId: targetOrgId,
        allowedScopes: [...FULL_SCOPES],
        purpose: "Vista del titular del legajo",
        startsAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        grantedBy: session.uid,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
    } else if (session.roles.includes("admin_platform")) {
      grant = {
        id: "admin",
        targetOrganizationId: targetOrgId,
        targetScope: "single_organization",
        accessRequestId: "admin",
        grantedToOrganizationId: session.defaultOrganizationId ?? "platform",
        allowedScopes: [...FULL_SCOPES],
        purpose: "Vista admin",
        startsAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: "approved",
        grantedBy: session.uid,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }
    } else {
      if (!session.defaultOrganizationId) {
        return Response.json({ error: "Sin organizacion receptora" }, { status: 403 })
      }

      const grantsSnap = await db
        .collection(COLLECTIONS.ACCESS_GRANTS)
        .where("targetOrganizationId", "==", targetOrgId)
        .where("grantedToOrganizationId", "==", session.defaultOrganizationId)
        .where("status", "==", "approved")
        .orderBy("expiresAt", "desc")
        .limit(5)
        .get()

      grant =
        grantsSnap.docs
          .map((doc) => serializeDoc(doc) as AccessGrant)
          .find((candidate) => new Date(candidate.expiresAt) > now) ?? null
    }

    if (!grant) {
      return Response.json({ grant: null, org: null, balance: null, income: null, taxDocs: [], assets: [], liabilities: [], documents: [], certification: null })
    }

    const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(targetOrgId).get()
    const org = orgSnap.exists ? { id: orgSnap.id, ...orgSnap.data() } : null

    const payload: Record<string, unknown> = {
      grant,
      org,
      balance: null,
      income: null,
      taxDocs: [],
      assets: [],
      liabilities: [],
      documents: [],
      certification: await getCurrentCertification(targetOrgId),
    }

    if (hasScope(grant, "balance_sheets") || hasScope(grant, "accounting_summary")) {
      const snap = await db
        .collection(COLLECTIONS.BALANCE_SHEETS)
        .where("producerId", "==", targetOrgId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()
      payload.balance = snap.empty ? null : serializeDoc(snap.docs[0])
    }

    if (hasScope(grant, "income_statements") || hasScope(grant, "accounting_summary")) {
      const snap = await db
        .collection(COLLECTIONS.INCOME_STATEMENTS)
        .where("producerId", "==", targetOrgId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()
      payload.income = snap.empty ? null : serializeDoc(snap.docs[0])
    }

    if (hasScope(grant, "tax_documents")) {
      const snap = await db
        .collection(COLLECTIONS.TAX_DOCUMENTS)
        .where("producerId", "==", targetOrgId)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get()
      payload.taxDocs = snap.docs.map((doc) => serializeDoc(doc))
    }

    if (hasScope(grant, "assets")) {
      const snap = await db
        .collection(COLLECTIONS.ASSETS)
        .where("producerId", "==", targetOrgId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get()
      payload.assets = snap.docs.map((doc) => serializeDoc(doc))
    }

    if (hasScope(grant, "liabilities")) {
      const snap = await db
        .collection(COLLECTIONS.LIABILITIES)
        .where("producerId", "==", targetOrgId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get()
      payload.liabilities = snap.docs.map((doc) => serializeDoc(doc))
    }

    if (hasScope(grant, "documents")) {
      const snap = await db
        .collection(COLLECTIONS.DOCUMENTS)
        .where("producerId", "==", targetOrgId)
        .orderBy("createdAt", "desc")
        .limit(50)
        .get()
      // Return metadata only — no storage URLs; download is via signed endpoint
      payload.documents = snap.docs.map((doc) => {
        const d = serializeDoc(doc)
        // Remove storagePath from client payload; serve via signed URL endpoint
        const { storagePath: _omit, ...rest } = d as Record<string, unknown>
        return rest
      })
    }

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "credit_folder.viewed",
      targetType: "credit_folder_readonly_view",
      targetId: targetOrgId,
      metadata: {
        grantId: grant.id,
        scopes: grant.allowedScopes,
      },
    })

    return Response.json(payload)
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
