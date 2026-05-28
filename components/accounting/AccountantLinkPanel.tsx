"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getLinksForProducer,
  createLink,
} from "@/lib/services/producer-accountant-links"
import type { ProducerAccountantLink } from "@/types/producer"

interface AccountantLinkPanelProps {
  producerId: string
  accountantUid: string
}

export function AccountantLinkPanel({
  producerId,
  accountantUid,
}: AccountantLinkPanelProps) {
  const [link, setLink] = useState<ProducerAccountantLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    getLinksForProducer(producerId).then((links) => {
      const found = links.find((l) => l.accountantUid === accountantUid) ?? null
      setLink(found)
      setLoading(false)
    })
  }, [producerId, accountantUid])

  async function handleRequestLink() {
    setRequesting(true)
    try {
      await createLink(
        {
          producerId,
          accountantUid,
          accountingFirmId: "",
          status: "pending",
          isMain: false,
          canUpload: true,
          canAuthorize: false,
          createdBy: accountantUid,
        },
        accountantUid,
      )
      setLink({
        id: "pending",
        producerId,
        accountantUid,
        accountingFirmId: "",
        status: "pending",
        isMain: false,
        canUpload: true,
        canAuthorize: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: accountantUid,
      })
    } finally {
      setRequesting(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Vínculo contador-productor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vínculo contador-productor</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {link ? (
          <dl className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Estado:</dt>
              <dd className="font-medium capitalize">{link.status}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Puede cargar documentos:</dt>
              <dd>{link.canUpload ? "Sí" : "No"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Puede autorizar:</dt>
              <dd>{link.canAuthorize ? "Sí" : "No"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">Contador principal:</dt>
              <dd>{link.isMain ? "Sí" : "No"}</dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              No existe un vínculo activo con este productor.
            </p>
            <Button size="sm" onClick={handleRequestLink} disabled={requesting}>
              {requesting ? "Solicitando..." : "Solicitar vínculo"}
            </Button>
          </div>
        )}
        <p className="text-muted-foreground text-xs border-t pt-2 mt-2">
          La gestión completa de permisos estará disponible en una próxima versión.
        </p>
      </CardContent>
    </Card>
  )
}
