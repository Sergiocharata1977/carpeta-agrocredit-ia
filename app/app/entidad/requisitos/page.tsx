"use client"

import { RoleGate } from "@/components/auth/RoleGate"
import { RequirementBuilder } from "@/components/credito-hub/RequirementBuilder"

export default function EntidadRequisitosPage() {
  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="container mx-auto max-w-5xl p-6">
        <RequirementBuilder />
      </div>
    </RoleGate>
  )
}
