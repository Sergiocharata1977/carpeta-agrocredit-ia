"use client"

import { useEffect, useState, useCallback } from "react"
import { use } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { getProducerById } from "@/lib/services/producers"
import { getAssetsForProducer, deleteAsset } from "@/lib/services/assets"
import { getLiabilitiesForProducer, deleteLiability } from "@/lib/services/liabilities"
import { useSession } from "@/lib/auth/session"
import type { Asset, Liability } from "@/types/assets"
import type { Producer } from "@/types/producer"
import { AssetsTable } from "@/components/assets/AssetsTable"
import { AssetsSummary } from "@/components/assets/AssetsSummary"
import { RealEstateAssetForm } from "@/components/assets/RealEstateAssetForm"
import { MovableAssetForm } from "@/components/assets/MovableAssetForm"
import { LiabilitiesTable } from "@/components/liabilities/LiabilitiesTable"
import { LiabilityForm } from "@/components/liabilities/LiabilityForm"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type DialogMode =
  | { type: "real_estate"; asset?: Asset }
  | { type: "movable"; asset?: Asset }
  | { type: "liability"; liability?: Liability }
  | null

interface PageProps {
  params: Promise<{ producerId: string }>
}

export default function BienesPage({ params }: PageProps) {
  const { producerId } = use(params)
  const { user } = useSession()

  const [producer, setProducer] = useState<Producer | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)

  const organizationId = producerId
  const createdBy = user?.uid ?? ""

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [prod, fetchedAssets, fetchedLiabilities] = await Promise.all([
        getProducerById(producerId),
        getAssetsForProducer(producerId),
        getLiabilitiesForProducer(producerId),
      ])
      setProducer(prod)
      setAssets(fetchedAssets)
      setLiabilities(fetchedLiabilities)
    } catch {
      toast.error("Error al cargar los datos del productor")
    } finally {
      setLoading(false)
    }
  }, [producerId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleDeleteAsset = async (assetId: string) => {
    try {
      await deleteAsset(assetId)
      toast.success("Bien eliminado correctamente")
      void fetchData()
    } catch {
      toast.error("Error al eliminar el bien")
    }
  }

  const handleDeleteLiability = async (liabilityId: string) => {
    try {
      await deleteLiability(liabilityId)
      toast.success("Deuda eliminada correctamente")
      void fetchData()
    } catch {
      toast.error("Error al eliminar la deuda")
    }
  }

  const handleFormSuccess = () => {
    setDialogMode(null)
    void fetchData()
  }

  const realEstateAssets = assets.filter((a) => a.assetType === "real_estate")
  const movableAssets = assets.filter((a) => a.assetType !== "real_estate")

  const getDialogTitle = () => {
    if (!dialogMode) return ""
    if (dialogMode.type === "real_estate") {
      return dialogMode.asset ? "Editar inmueble" : "Agregar inmueble"
    }
    if (dialogMode.type === "movable") {
      return dialogMode.asset ? "Editar bien mueble" : "Agregar bien mueble"
    }
    return dialogMode.liability ? "Editar deuda" : "Agregar deuda"
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <Tabs defaultValue="inmuebles">
          <TabsList>
            <TabsTrigger value="inmuebles">
              Inmuebles ({realEstateAssets.length})
            </TabsTrigger>
            <TabsTrigger value="muebles">
              Bienes muebles ({movableAssets.length})
            </TabsTrigger>
            <TabsTrigger value="deudas">
              Deudas ({liabilities.length})
            </TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
          </TabsList>

          {/* Tab Inmuebles */}
          <TabsContent value="inmuebles" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setDialogMode({ type: "real_estate" })}
                size="sm"
              >
                <Plus className="size-4 mr-1" />
                Agregar inmueble
              </Button>
            </div>
            <AssetsTable
              assets={realEstateAssets}
              onEdit={(asset) =>
                setDialogMode({ type: "real_estate", asset })
              }
              onDelete={handleDeleteAsset}
            />
          </TabsContent>

          {/* Tab Bienes muebles */}
          <TabsContent value="muebles" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setDialogMode({ type: "movable" })}
                size="sm"
              >
                <Plus className="size-4 mr-1" />
                Agregar bien mueble
              </Button>
            </div>
            <AssetsTable
              assets={movableAssets}
              onEdit={(asset) => setDialogMode({ type: "movable", asset })}
              onDelete={handleDeleteAsset}
            />
          </TabsContent>

          {/* Tab Deudas */}
          <TabsContent value="deudas" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => setDialogMode({ type: "liability" })}
                size="sm"
              >
                <Plus className="size-4 mr-1" />
                Agregar deuda
              </Button>
            </div>
            <LiabilitiesTable
              liabilities={liabilities}
              onEdit={(liability) =>
                setDialogMode({ type: "liability", liability })
              }
              onDelete={handleDeleteLiability}
            />
          </TabsContent>

          {/* Tab Resumen */}
          <TabsContent value="resumen">
            <AssetsSummary assets={assets} liabilities={liabilities} />
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog formularios */}
      <Dialog open={dialogMode !== null} onOpenChange={(open) => !open && setDialogMode(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
          </DialogHeader>

          {dialogMode?.type === "real_estate" && (
            <RealEstateAssetForm
              producerId={producerId}
              organizationId={organizationId}
              createdBy={createdBy}
              defaultValues={dialogMode.asset}
              onSuccess={handleFormSuccess}
            />
          )}

          {dialogMode?.type === "movable" && (
            <MovableAssetForm
              producerId={producerId}
              organizationId={organizationId}
              createdBy={createdBy}
              defaultValues={dialogMode.asset}
              onSuccess={handleFormSuccess}
            />
          )}

          {dialogMode?.type === "liability" && (
            <LiabilityForm
              producerId={producerId}
              organizationId={organizationId}
              createdBy={createdBy}
              defaultValues={dialogMode.liability}
              onSuccess={handleFormSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
