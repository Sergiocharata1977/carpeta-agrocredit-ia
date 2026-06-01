"use client"

import { use, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { ProducerProfileForm } from "@/components/producers/ProducerProfileForm"
import { getProducerProfile } from "@/lib/services/producer-profile"
import { useSession } from "@/lib/auth/session"
import type { OrganizationProfile } from "@/types/producer-profile"

interface ProducerProfilePageProps {
  params: Promise<{ producerId: string }>
}

export default function ProducerProfilePage({ params }: ProducerProfilePageProps) {
  const { producerId } = use(params)
  const { user, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<OrganizationProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
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
    void loadData()
  }, [loadData, sessionLoading])

  if (sessionLoading || loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-56 w-full" />
      </div>
    )
  }

  return (
    <ProducerProfileForm
      organizationId={producerId}
      profile={profile}
      onSuccess={setProfile}
    />
  )
}
