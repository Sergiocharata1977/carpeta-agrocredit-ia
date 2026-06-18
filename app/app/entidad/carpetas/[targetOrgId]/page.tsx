"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { BarChart3 } from "lucide-react"
import { RoleGate } from "@/components/auth/RoleGate"
import { ReadonlyFolderView } from "@/components/folders/ReadonlyFolderView"
import { Button } from "@/components/ui/button"

export default function EntidadCarpetaPage() {
  const { targetOrgId } = useParams<{ targetOrgId: string }>()

  return (
    <RoleGate allowedRoles={["bank_user", "agro_company_user", "admin_platform"]}>
      <div className="flex justify-end px-6 pt-6">
        <Button asChild>
          <Link href={`/app/entidad/carpetas/${targetOrgId}/cumplimiento`}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Ver cumplimiento
          </Link>
        </Button>
      </div>
      <ReadonlyFolderView targetOrgId={targetOrgId} />
    </RoleGate>
  )
}
