import { NextRequest } from "next/server"
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, getAuthErrorResponse } from "@/lib/auth/server-session"
import { FieldValue } from "firebase-admin/firestore"

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar que la variable de entorno está configurada
    const setupKey = process.env.ADMIN_SETUP_KEY
    if (!setupKey) {
      return Response.json(
        { error: "ADMIN_SETUP_KEY no está configurada en el servidor. Definila en las variables de entorno de Vercel." },
        { status: 503 },
      )
    }

    // 2. Verificar la clave enviada
    const body = await request.json().catch(() => ({}))
    const providedKey = typeof body.setupKey === "string" ? body.setupKey : ""
    if (!providedKey || providedKey !== setupKey) {
      return Response.json({ error: "Clave de configuración inválida" }, { status: 403 })
    }

    // 3. Verificar sesión del usuario
    const session = await verifyRequestSession(request)

    const db = getAdminDb()
    const auth = getAdminAuth()

    // 4. Verificar que no existe ninguna organización tipo "platform" aún (one-time only)
    const existingPlatformSnap = await db
      .collection(COLLECTIONS.ORGANIZATIONS)
      .where("type", "==", "platform")
      .limit(1)
      .get()

    if (!existingPlatformSnap.empty) {
      return Response.json(
        {
          error: "Ya existe un administrador de plataforma. Este endpoint solo puede usarse una vez.",
          alreadyBootstrapped: true,
        },
        { status: 409 },
      )
    }

    const now = FieldValue.serverTimestamp()

    // 5. Crear organización de plataforma
    const orgRef = db.collection(COLLECTIONS.ORGANIZATIONS).doc()
    await orgRef.set({
      type: "platform",
      legalName: "Legajo — Administración de Plataforma",
      status: "active",
      createdBy: session.uid,
      createdAt: now,
      updatedAt: now,
    })

    // 6. Crear membresía
    await db
      .collection(COLLECTIONS.ORGANIZATION_MEMBERS)
      .doc(`${orgRef.id}_${session.uid}`)
      .set({
        organizationId: orgRef.id,
        uid: session.uid,
        role: "admin_platform",
        status: "active",
        invitedBy: null,
        createdAt: now,
        updatedAt: now,
      })

    // 7. Setear custom claims (rol admin_platform)
    await auth.setCustomUserClaims(session.uid, {
      roles: ["admin_platform"],
      defaultOrganizationId: orgRef.id,
      orgStatus: "active",
    })

    // 8. Actualizar documento del usuario
    await db
      .collection(COLLECTIONS.USERS)
      .doc(session.uid)
      .set(
        {
          roles: ["admin_platform"],
          defaultOrganizationId: orgRef.id,
          status: "active",
          updatedAt: now,
        },
        { merge: true },
      )

    await writeAuditLog({
      actorUid: session.uid,
      actorOrganizationId: orgRef.id,
      action: "organization.created",
      targetType: "organization",
      targetId: orgRef.id,
      metadata: { type: "platform", bootstrapped: true },
    })

    return Response.json({
      ok: true,
      organizationId: orgRef.id,
      message:
        "Tu cuenta fue promovida a admin_platform. Cerrá sesión y volvé a ingresar para aplicar los nuevos permisos.",
    })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
