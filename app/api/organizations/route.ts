import { NextRequest } from "next/server"
import { z } from "zod"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getAuthErrorResponse, verifyRequestSession } from "@/lib/auth/server-session"

const organizationSearchSchema = z.object({
  type: z.enum(["accounting_firm", "requesting_entity", "system_user"]).optional(),
  search: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export async function GET(request: NextRequest) {
  try {
    await verifyRequestSession(request)

    const params = organizationSearchSchema.parse({
      type: request.nextUrl.searchParams.get("type") ?? undefined,
      search: request.nextUrl.searchParams.get("search") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    })

    const db = getAdminDb()
    let query = db
      .collection(COLLECTIONS.ORGANIZATIONS)
      .where("status", "==", "active")

    if (params.type) {
      query = query.where("type", "==", params.type)
    }

    query = query.limit(params.limit * 3)

    const snapshot = await query.get()
    const normalizedSearch = params.search?.toLowerCase()

    const organizations = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          type: data.type ?? null,
          subtype: data.subtype ?? null,
          legalName: data.legalName ?? "",
          taxId: data.taxId ?? "",
          contactName: data.contactName ?? null,
          contactEmail: data.contactEmail ?? null,
          province: data.province ?? null,
          city: data.city ?? null,
        }
      })
      .filter((organization) => {
        if (!normalizedSearch) return true

        return (
          organization.legalName.toLowerCase().includes(normalizedSearch) ||
          organization.taxId.toLowerCase().includes(normalizedSearch)
        )
      })
      .slice(0, params.limit)

    return Response.json({ organizations })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Parametros invalidos", issues: error.issues }, { status: 400 })
    }

    return getAuthErrorResponse(error)
  }
}
