import { NextRequest } from "next/server"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { verifyRequestSession, requireAnyRole, getAuthErrorResponse } from "@/lib/auth/server-session"
import type { Organization, OrganizationType, RequestingEntitySubtype } from "@/types/auth"

type OrganizationRecord = Omit<Organization, "createdAt" | "updatedAt"> & {
  createdAt: string | null
  updatedAt: string | null
}

function timestampToIso(value: unknown): string | null {
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString()
  }

  if (typeof value === "string") return value

  return null
}

function toMillis(value: string | null): number {
  if (!value) return 0
  const date = new Date(value).getTime()
  return Number.isFinite(date) ? date : 0
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireAnyRole(session, ["admin_platform"])

    const { searchParams } = new URL(request.url)
    const typeFilter = searchParams.get("type") as OrganizationType | null
    const statusFilter = searchParams.get("status")
    const subtypeFilter = searchParams.get("subtype") as RequestingEntitySubtype | null

    const snap = await getAdminDb().collection(COLLECTIONS.ORGANIZATIONS).get()

    const organizations = snap.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          createdAt: timestampToIso(data.createdAt),
          updatedAt: timestampToIso(data.updatedAt),
        } as OrganizationRecord
      })
      .filter((org) => !typeFilter || org.type === typeFilter)
      .filter((org) => !statusFilter || org.status === statusFilter)
      .filter((org) => !subtypeFilter || org.subtype === subtypeFilter)
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt))

    return Response.json({ organizations })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
