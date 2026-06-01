"use client"

import { use, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DocumentChecklist } from "@/components/producers/DocumentChecklist"
import { getProducerProfile } from "@/lib/services/producer-profile"
import { useSession } from "@/lib/auth/session"
import type { OrganizationProfile } from "@/types/producer-profile"

interface ProducerDocumentsPageProps {
  params: Promise<{ producerId: string }>
}

export default function ProducerDocumentsPage({ params }: ProducerDocumentsPageProps) {
  const { producerId } = use(params)
  const { user, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<OrganizationProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      setProfile(await getProducerProfile(producerId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el perfil")
    } finally {
      setLoading(false)
    }
  }, [producerId, user])

  useEffect(() => {
    if (sessionLoading) return
    void loadProfile()
  }, [loadProfile, sessionLoading])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documentacion</CardTitle>
      </CardHeader>
      <CardContent>
        {sessionLoading || loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <DocumentChecklist
            producerId={producerId}
            organizationId={producerId}
            uploadedBy={user?.uid ?? ""}
            hasEmployees={profile?.hasEmployees}
          />
        )}
      </CardContent>
    </Card>
  )
}
