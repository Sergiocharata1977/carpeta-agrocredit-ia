import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { registrationSchema } from "@/lib/schemas/onboarding"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registrationSchema.parse(body)

    const auth = getAdminAuth()
    const db = getAdminDb()

    const userRecord = await auth.createUser({
      email: data.email,
      password: data.password,
      displayName: data.displayName,
    })

    await db.collection(COLLECTIONS.USERS).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: data.email,
      displayName: data.displayName,
      defaultOrganizationId: null,
      roles: [],
      status: "pending_onboarding",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: userRecord.uid,
      actorOrganizationId: null,
      action: "user.registered",
      targetType: "user",
      targetId: userRecord.uid,
      metadata: { intendedRole: data.role },
    })

    return Response.json({ uid: userRecord.uid, email: data.email }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Datos inválidos", issues: error.issues }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : ""
    if (msg.includes("email-already-exists")) {
      return Response.json({ error: "El email ya está registrado" }, { status: 409 })
    }
    console.error("[register] Error:", error)
    return Response.json({ error: "Error interno al registrar usuario" }, { status: 500 })
  }
}
