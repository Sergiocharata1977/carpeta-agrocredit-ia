"use client"

import { useParams } from "next/navigation"
import { RoleGate } from "@/components/auth/RoleGate"
import { ComplianceMatrix } from "@/components/credito-hub/ComplianceMatrix"

export default function CumplimientoPage() {
  const { targetOrgId } = useParams<{ targetOrgId: string }>()
  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="container mx-auto max-w-6xl p-6">
        <ComplianceMatrix targetOrganizationId={targetOrgId} />
      </div>
    </RoleGate>
  )
}
