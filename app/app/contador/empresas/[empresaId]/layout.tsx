"use client"

import { use, useCallback, useEffect, useState, type ReactNode } from "react"
import { getDoc, doc } from "firebase/firestore"
import { toast } from "sonner"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { useSession } from "@/lib/auth/session"
import { EmpresaHeader } from "@/components/empresas/EmpresaHeader"
import { EmpresaSubNav } from "@/components/empresas/EmpresaSubNav"
import type { AgroActivity, Organization, OrganizationType } from "@/types/auth"

interface EmpresaLayoutProps {
  children: ReactNode
  params: Promise<{ empresaId: string }>
}

export default function EmpresaLayout({ children, params }: EmpresaLayoutProps) {
  const { empresaId } = use(params)
  const { loading: sessionLoading } = useSession()

  const [empresa, setEmpresa] = useState<Organization | null>(null)
  const [parentName, setParentName] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)

  const loadEmpresa = useCallback(async () => {
    setLoading(true)
    try {
      const db = getFirebaseDb()
      if (!db) return

      const snap = await getDoc(doc(db, COLLECTIONS.ORGANIZATIONS, empresaId))
      if (!snap.exists()) return

      const org = { id: snap.id, ...snap.data() } as Organization
      setEmpresa(org)

      if (org.parentOrganizationId) {
        const parentSnap = await getDoc(
          doc(db, COLLECTIONS.ORGANIZATIONS, org.parentOrganizationId),
        )
        if (parentSnap.exists()) {
          const parentData = parentSnap.data()
          setParentName(typeof parentData.legalName === "string" ? parentData.legalName : undefined)
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al cargar la empresa")
    } finally {
      setLoading(false)
    }
  }, [empresaId])

  useEffect(() => {
    if (sessionLoading) return
    void loadEmpresa()
  }, [loadEmpresa, sessionLoading])

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <EmpresaHeader
        legalName={empresa?.legalName}
        taxId={empresa?.taxId}
        activity={empresa?.activity as AgroActivity | undefined}
        province={empresa?.province}
        city={empresa?.city}
        orgType={empresa?.type as OrganizationType | undefined}
        parentLegalName={empresa?.type === "system_user_entity" ? parentName : undefined}
        parentClientId={empresa?.parentOrganizationId}
        loading={sessionLoading || loading}
      />
      <EmpresaSubNav empresaId={empresaId} />
      {children}
    </div>
  )
}
