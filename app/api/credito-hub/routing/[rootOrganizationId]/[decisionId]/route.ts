import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { FieldValue } from "firebase-admin/firestore"
import {
  verifyRequestSession,
  requireActiveOrg,
  getAuthErrorResponse,
  AuthError,
} from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { writeAuditLog } from "@/lib/firebase/audit"
import { getDecision, assignDecision } from "@/lib/services/document-routing"

// PATCH /api/credito-hub/routing/{rootOrganizationId}/{decisionId}
// Body: { assignedFolderOwnerOrganizationId }
// Reasigna manualmente una decisión de ruteo a una carpeta (org) del grupo.
// Auth: assertCanManageAccountingFolder(session, rootOrganizationId).
// Valida que la carpeta destino pertenezca al grupo (titular o hija) y que la
// decisión pertenezca a ese grupo. Reasigna el job y los campos extraídos del
// documento a la carpeta destino. Audita document.routing_reassigned.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ rootOrganizationId: string; decisionId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const { rootOrganizationId, decisionId } = await params
    const { folderOwnerOrganizationId } = await assertCanManageAccountingFolder(
      session,
      rootOrganizationId,
    )

    const body = (await request.json().catch(() => ({}))) as {
      assignedFolderOwnerOrganizationId?: unknown
    }
    const assignedFolderOwnerOrganizationId =
      typeof body.assignedFolderOwnerOrganizationId === "string"
        ? body.assignedFolderOwnerOrganizationId
        : null
    if (!assignedFolderOwnerOrganizationId) {
      throw new AuthError("assignedFolderOwnerOrganizationId es requerido", 400)
    }

    const db = getAdminDb()

    // La decisión debe existir y pertenecer al grupo raíz.
    const decision = await getDecision(decisionId)
    if (!decision || decision.rootOrganizationId !== rootOrganizationId) {
      throw new AuthError("Decisión de ruteo no encontrada en este grupo", 404)
    }

    // Validar que la carpeta destino pertenezca al grupo: titular raíz o hija.
    const isRoot = assignedFolderOwnerOrganizationId === rootOrganizationId
    if (!isRoot) {
      const targetSnap = await db
        .collection(COLLECTIONS.ORGANIZATIONS)
        .doc(assignedFolderOwnerOrganizationId)
        .get()
      if (
        !targetSnap.exists ||
        targetSnap.data()?.parentOrganizationId !== rootOrganizationId
      ) {
        throw new AuthError(
          "La carpeta destino no pertenece a este grupo",
          400,
        )
      }
    }

    const previousFolder =
      decision.assignedFolderOwnerOrganizationId ??
      decision.suggestedFolderOwnerOrganizationId ??
      rootOrganizationId

    // Reasignar la decisión.
    const updated = await assignDecision(
      decisionId,
      assignedFolderOwnerOrganizationId,
      session.uid,
    )

    // Reasignar el job del documento (si existe) a la carpeta destino.
    const jobsSnap = await db
      .collection(COLLECTIONS.DOCUMENT_JOBS)
      .where("documentId", "==", decision.documentId)
      .get()
    for (const jobDoc of jobsSnap.docs) {
      await jobDoc.ref.update({
        folderOwnerOrganizationId: assignedFolderOwnerOrganizationId,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    // Reasignar los campos extraídos del documento a la carpeta destino.
    const fieldsSnap = await db
      .collection(COLLECTIONS.EXTRACTED_FIELDS)
      .where("documentId", "==", decision.documentId)
      .get()
    for (const fieldDoc of fieldsSnap.docs) {
      await fieldDoc.ref.update({
        folderOwnerOrganizationId: assignedFolderOwnerOrganizationId,
      })
    }

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: folderOwnerOrganizationId,
      action: "document.routing_reassigned",
      targetType: "document",
      targetId: decision.documentId,
      metadata: {
        decisionId,
        rootOrganizationId,
        from: previousFolder,
        to: assignedFolderOwnerOrganizationId,
        jobsReassigned: jobsSnap.size,
        fieldsReassigned: fieldsSnap.size,
      },
    })

    return Response.json({ decision: updated })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
