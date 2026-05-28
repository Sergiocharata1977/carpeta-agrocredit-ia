import { getGrantsForEntity, getGrantsForProducer, isGrantActive } from "@/lib/services/access-grants"
import type { AccessGrant } from "@/types/access"

function daysUntil(value: string): number {
  const expires = new Date(value)
  const diff = expires.getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getExpiringGrants(
  grants: AccessGrant[],
  thresholdDays = 15,
): AccessGrant[] {
  return grants.filter((grant) => {
    if (!isGrantActive(grant)) return false
    const days = daysUntil(grant.expiresAt)
    return days >= 0 && days <= thresholdDays
  })
}

export async function getExpiringGrantsForProducer(
  producerId: string,
  thresholdDays = 15,
): Promise<AccessGrant[]> {
  const grants = await getGrantsForProducer(producerId)
  return getExpiringGrants(grants, thresholdDays)
}

export async function getExpiringGrantsForEntity(
  organizationId: string,
  thresholdDays = 15,
): Promise<AccessGrant[]> {
  const grants = await getGrantsForEntity(organizationId)
  return getExpiringGrants(grants, thresholdDays)
}
