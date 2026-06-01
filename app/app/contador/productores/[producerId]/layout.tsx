"use client"

import { use, useCallback, useEffect, useState } from "react"
import type { ReactNode } from "react"
import { toast } from "sonner"
import { ProducerHeader } from "@/components/producers/ProducerHeader"
import { ProducerSubNav } from "@/components/producers/ProducerSubNav"
import { getProducerById } from "@/lib/services/producers"
import { getProducerProfile } from "@/lib/services/producer-profile"
import { useSession } from "@/lib/auth/session"
import type { Producer } from "@/types/producer"
import type { OrganizationProfile } from "@/types/producer-profile"

interface ProducerLayoutProps {
  children: ReactNode
  params: Promise<{ producerId: string }>
}

export default function ProducerLayout({ children, params }: ProducerLayoutProps) {
  const { producerId } = use(params)
  const { user, loading: sessionLoading } = useSession()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [profile, setProfile] = useState<OrganizationProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadHeaderData = useCallback(async () => {
    if (!user) {
      setProducer(null)
      setProfile(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [nextProducer, nextProfile] = await Promise.all([
        getProducerById(producerId),
        getProducerProfile(producerId).catch(() => null),
      ])
      setProducer(nextProducer)
      setProfile(nextProfile)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el productor")
    } finally {
      setLoading(false)
    }
  }, [producerId, user])

  useEffect(() => {
    if (sessionLoading) return
    void loadHeaderData()
  }, [loadHeaderData, sessionLoading])

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      <ProducerHeader producer={producer} profile={profile} loading={sessionLoading || loading} />
      <ProducerSubNav producerId={producerId} />
      {children}
    </div>
  )
}
