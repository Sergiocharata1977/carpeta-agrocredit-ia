"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/lib/auth/session"
import { getLinksForAccountant } from "@/lib/services/producer-accountant-links"
import { getProducerById } from "@/lib/services/producers"
import { ProducerTable } from "@/components/producers/ProducerTable"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty"
import type { Producer } from "@/types/producer"

export default function ProductoresPage() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [producers, setProducers] = useState<Producer[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (sessionLoading) return
    if (!user) {
      setLoadingData(false)
      return
    }

    async function fetchProducers() {
      const links = await getLinksForAccountant(user!.uid)
      const producerIds = [...new Set(links.map((l) => l.producerId))]
      const results = await Promise.all(producerIds.map((id) => getProducerById(id)))
      setProducers(results.filter(Boolean) as Producer[])
      setLoadingData(false)
    }

    fetchProducers()
  }, [user, sessionLoading])

  function handleSelectProducer(producer: Producer) {
    router.push(`/app/contador/productores/${producer.id}/carpeta`)
  }

  const isLoading = sessionLoading || loadingData

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productores</h1>
          <p className="text-muted-foreground text-sm">
            Carpetas asignadas a tu estudio contable
          </p>
        </div>
        <Button asChild>
          <Link href="/app/contador/productores/new">Nueva carpeta</Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : producers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin productores asignados</EmptyTitle>
            <EmptyContent>
              <EmptyDescription>
                Aun no tenés productores vinculados a tu cuenta. Creá la primera
                carpeta para comenzar.
              </EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
          <Button asChild>
            <Link href="/app/contador/productores/new">Nueva carpeta</Link>
          </Button>
        </Empty>
      ) : (
        <ProducerTable producers={producers} onSelect={handleSelectProducer} />
      )}
    </div>
  )
}
