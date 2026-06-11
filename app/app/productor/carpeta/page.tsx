"use client"

import { RoleGate } from "@/components/auth/RoleGate"
import { ReadonlyFolderView } from "@/components/folders/ReadonlyFolderView"
import { Skeleton } from "@/components/ui/skeleton"
import { useSession } from "@/lib/auth/session"

// El titular ve su propia carpeta tal como la cargo su contador,
// con los mismos tabs que ven las cuentas habilitadas.
export default function ProducerCarpetaPage() {
  const { user, loading } = useSession()
  const organizationId = user?.defaultOrganizationId ?? null

  return (
    <RoleGate allowedRoles={["producer", "admin_platform"]}>
      {loading ? (
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : !organizationId ? (
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Tu cuenta no tiene una organizacion asociada todavia.
          </p>
        </div>
      ) : (
        <ReadonlyFolderView targetOrgId={organizationId} ownerView />
      )}
    </RoleGate>
  )
}
