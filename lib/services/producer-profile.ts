import { getFreshIdToken } from "@/lib/firebase/auth-client"
import type {
  OrganizationProfile,
  ProducerProfileUpsertInput,
} from "@/types/producer-profile"

interface ProducerProfileResponse {
  profile: OrganizationProfile | null
}

async function getAuthHeaders() {
  const token = await getFreshIdToken()
  if (!token) throw new Error("No se pudo validar la sesion")

  return {
    Authorization: `Bearer ${token}`,
  }
}

export async function getProducerProfile(
  orgId: string,
): Promise<OrganizationProfile | null> {
  const response = await fetch(`/api/producer-profile/${encodeURIComponent(orgId)}`, {
    headers: await getAuthHeaders(),
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as
    | (ProducerProfileResponse & { error?: string })
    | null

  if (!response.ok) {
    throw new Error(payload?.error ?? "No se pudo cargar el perfil")
  }

  return payload?.profile ?? null
}

export async function upsertProducerProfile(
  orgId: string,
  data: ProducerProfileUpsertInput,
): Promise<OrganizationProfile> {
  const response = await fetch(`/api/producer-profile/${encodeURIComponent(orgId)}`, {
    method: "PATCH",
    headers: {
      ...(await getAuthHeaders()),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const payload = (await response.json().catch(() => null)) as
    | (ProducerProfileResponse & { error?: string })
    | null

  if (!response.ok || !payload?.profile) {
    throw new Error(payload?.error ?? "No se pudo guardar el perfil")
  }

  return payload.profile
}
