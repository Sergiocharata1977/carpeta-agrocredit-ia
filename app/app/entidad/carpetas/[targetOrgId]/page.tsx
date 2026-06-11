"use client"

import { useParams } from "next/navigation"
import { RoleGate } from "@/components/auth/RoleGate"
import { ReadonlyFolderView } from "@/components/folders/ReadonlyFolderView"

export default function EntidadCarpetaPage() {
  const { targetOrgId } = useParams<{ targetOrgId: string }>()

  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <ReadonlyFolderView targetOrgId={targetOrgId} />
    </RoleGate>
  )
}
