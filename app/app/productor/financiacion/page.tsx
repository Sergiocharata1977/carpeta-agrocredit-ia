"use client"

import { ProducerLegajoHabilitationsPanel } from "@/components/access/ProducerLegajoHabilitationsPanel"
import { RoleGate } from "@/components/auth/RoleGate"
import { useSession } from "@/lib/auth/session"

export default function ProducerHabilitationsPage() {
  const { user } = useSession()

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      <div className="p-6">
        <ProducerLegajoHabilitationsPanel organizationId={user?.defaultOrganizationId ?? null} />
      </div>
    </RoleGate>
  )
}
