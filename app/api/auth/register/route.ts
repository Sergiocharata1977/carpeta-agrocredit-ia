import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { registrationSchema } from "@/lib/schemas/onboarding"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/middleware/ratelimit"
import { FieldValue } from "firebase-admin/firestore"

// 10 registrations per IP per hour
const REGISTER_LIMIT = { limit: 10, windowMs: 60 * 60 * 1000 }

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const { allowed } = checkRateLimit(`register:${ip}`, REGISTER_LIMIT)
  if (!allowed) return rateLimitResponse(3600)

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

    if (data.role === "system_user") {
      const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()
      const now = FieldValue.serverTimestamp()

      await db.runTransaction(async (transaction) => {
        transaction.set(orgRef, {
          type: "system_user",
          legalName: data.displayName,
          taxId: "",
          personType: null,
          activity: null,
          province: null,
          city: null,
          address: null,
          phone: null,
          email: data.email,
          status: "active",
          folderStatus: "incomplete",
          onboardingStatus: "basic_registered",
          createdBy: userRecord.uid,
          createdAt: now,
          updatedAt: now,
        })

        transaction.set(db.collection(COLLECTIONS.ORGANIZATION_MEMBERS).doc(`${orgRef.id}_${userRecord.uid}`), {
          organizationId: orgRef.id,
          uid: userRecord.uid,
          role: "producer",
          status: "active",
          invitedBy: null,
          createdAt: now,
          updatedAt: now,
        })

        transaction.set(db.collection(COLLECTIONS.USERS).doc(userRecord.uid), {
          uid: userRecord.uid,
          email: data.email,
          displayName: data.displayName,
          defaultOrganizationId: orgRef.id,
          roles: ["producer"],
          status: "active",
          createdAt: now,
          updatedAt: now,
        })
      })

      await auth.setCustomUserClaims(userRecord.uid, {
        roles: ["producer"],
        defaultOrganizationId: orgRef.id,
      })

      await writeAuditLog({
        actorUid: userRecord.uid,
        actorOrganizationId: orgRef.id,
        action: "user.registered",
        targetType: "user",
        targetId: userRecord.uid,
        metadata: { intendedRole: data.role, defaultOrganizationId: orgRef.id },
      })

      return Response.json({ uid: userRecord.uid, email: data.email, defaultOrganizationId: orgRef.id }, { status: 201 })
    }

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

    await auth.setCustomUserClaims(userRecord.uid, { intendedRole: data.role })

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
