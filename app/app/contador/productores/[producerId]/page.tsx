"use client"

import { use, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getProducerById } from "@/lib/services/producers"
import { getProducerProfile } from "@/lib/services/producer-profile"
import { useSession } from "@/lib/auth/session"
import type { Producer } from "@/types/producer"
import type { OrganizationProfile } from "@/types/producer-profile"

interface ProducerProfilePageProps {
  params: Promise<{ producerId: string }>
}

function formatAmount(value?: number, currency = "ARS") {
  if (typeof value !== "number") return "-"
  return `${currency} ${value.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
}

function joinList(values?: string[]) {
  return values?.length ? values.join(", ") : "-"
}

function ProfileRow({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value === undefined || value === null || value === "" ? "-" : String(value)}</p>
    </div>
  )
}

export default function ProducerProfilePage({ params }: ProducerProfilePageProps) {
  const { producerId } = use(params)
  const { user, loading: sessionLoading } = useSession()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [profile, setProfile] = useState<OrganizationProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
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
        getProducerProfile(producerId),
      ])
      setProducer(nextProducer)
      setProfile(nextProfile)
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
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full md:col-span-2" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos fiscales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ProfileRow label="Razon social" value={producer?.legalName} />
            <ProfileRow label="CUIT" value={producer?.taxId} />
            <ProfileRow label="Condicion fiscal" value={profile?.taxCondition?.replace(/_/g, " ")} />
            <ProfileRow label="Categoria" value={profile?.taxCategory} />
            <ProfileRow label="Inicio de actividad" value={profile?.registrationYear} />
            <ProfileRow label="Actividades AFIP" value={joinList(profile?.activitiesAfip)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datos productivos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <ProfileRow label="Hectareas propias" value={profile?.ownHectares} />
            <ProfileRow label="Hectareas alquiladas" value={profile?.rentedHectares} />
            <ProfileRow label="Cultivos principales" value={joinList(profile?.mainCrops)} />
            <ProfileRow label="Campania actual" value={profile?.currentCampaign} />
            <ProfileRow label="Produccion estimada" value={profile?.estimatedProduction} />
            <ProfileRow label="Maquinaria principal" value={profile?.mainMachinery} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ficha crediticia rapida</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ProfileRow
            label="Ventas estimadas"
            value={formatAmount(profile?.estimatedAnnualSales, profile?.estimatedAnnualSalesCurrency)}
          />
          <ProfileRow
            label="Deudas bancarias"
            value={formatAmount(profile?.bankDebts, profile?.bankDebtsCurrency)}
          />
          <ProfileRow label="Cheques emitidos" value={formatAmount(profile?.issuedChecks)} />
          <ProfileRow label="Cheques rechazados" value={formatAmount(profile?.rejectedChecks)} />
          <ProfileRow label="Prestamos vigentes" value={profile?.activeLoans} />
          <ProfileRow label="Tarjetas rurales" value={profile?.ruralCards} />
          <ProfileRow label="Cupos comerciales" value={profile?.commercialQuotas} />
          <ProfileRow
            label="Empleados"
            value={profile?.hasEmployees ? profile.employeesCount ?? "Si" : "No informado"}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumen patrimonial</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileRow label="Campos propios" value={profile?.summaryOwnFields} />
          <ProfileRow label="Maquinaria" value={profile?.summaryMachinery} />
          <ProfileRow label="Vehiculos" value={profile?.summaryVehicles} />
          <ProfileRow label="Silo bolsa / stock" value={profile?.summarySiloBolsa} />
          <ProfileRow label="Ganado" value={profile?.summaryLivestock} />
        </CardContent>
      </Card>
    </div>
  )
}
