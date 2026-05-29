import { FieldValue } from "firebase-admin/firestore"
import { z } from "zod"
import { getTargetOrganizationForServer, notifyOrganizationUsers } from "@/lib/auth/server-access"
import { getAuthErrorResponse, isAdminPlatform, isFinancialEntity, verifyRequestSession } from "@/lib/auth/server-session"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { updateFinancingStatusSchema } from "@/lib/schemas/financing"
import type { FinancingRequest, FinancingStatusEvent } from "@/types/financing"

export async function POST(
  request: Request,
  context: { params: Promise<{ requestId: string }> },
) {
  try {
    const session = await verifyRequestSession(request)
    const { requestId } = await context.params
    const input = updateFinancingStatusSchema.parse({
      ...(await request.json()),
      financingRequestId: requestId,
    })
    const db = getAdminDb()
    const requestRef = db.collection(COLLECTIONS.FINANCING_REQUESTS).doc(requestId)
    const requestSnap = await requestRef.get()

    if (!requestSnap.exists) {
      return Response.json({ error: "Solicitud no encontrada" }, { status: 404 })
    }

    const financingRequest = { id: requestSnap.id, ...requestSnap.data() } as FinancingRequest

    if (
      !isAdminPlatform(session) &&
      (!isFinancialEntity(session) ||
        session.defaultOrganizationId !== financingRequest.requesterOrganizationId)
    ) {
      return Response.json({ error: "No tenes permisos sobre esta solicitud" }, { status: 403 })
    }

    const event: FinancingStatusEvent = {
      status: input.status,
      changedBy: session.uid,
      changedAt: new Date().toISOString(),
      ...(input.note ? { note: input.note } : {}),
    }

    const statusHistory = [...(financingRequest.statusHistory ?? []), event]
    await requestRef.update({
      status: input.status,
      statusHistory,
      ...(input.observations !== undefined ? { observations: input.observations } : {}),
      ...(input.requiredDocuments ? { requiredDocuments: input.requiredDocuments } : {}),
      ...(input.receivedDocuments ? { receivedDocuments: input.receivedDocuments } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      action: "financing_request.status_changed",
      targetType: "financing_request",
      targetId: requestId,
      metadata: {
        targetOrganizationId: financingRequest.targetOrganizationId,
        previousStatus: financingRequest.status,
        nextStatus: input.status,
        note: input.note ?? null,
      },
    })

    const targetOrg = await getTargetOrganizationForServer(financingRequest.targetOrganizationId)
    await notifyOrganizationUsers({
      organizationId: targetOrg.parentOrganizationId ?? targetOrg.id,
      type:
        input.status === "observed"
          ? "financing_request_observed"
          : "financing_request_status_changed",
      payload: {
        financingRequestId: requestId,
        targetOrganizationId: financingRequest.targetOrganizationId,
        previousStatus: financingRequest.status,
        nextStatus: input.status,
      },
    })

    return Response.json({ id: requestId, status: input.status })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
