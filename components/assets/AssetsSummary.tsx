"use client"

import type { Asset, Liability } from "@/types/assets"
import { getTotalAssetValue } from "@/lib/services/assets"
import { getTotalLiabilityValue } from "@/lib/services/liabilities"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value)
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

interface Props {
  assets: Asset[]
  liabilities: Liability[]
}

export function AssetsSummary({ assets, liabilities }: Props) {
  const totalAssets = getTotalAssetValue(assets)
  const totalLiabilities = getTotalLiabilityValue(liabilities)

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total activos en ARS</CardTitle>
            <CardDescription>Bienes valuados en pesos argentinos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatARS(totalAssets.ARS)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {assets.filter((a) => a.currency === "ARS").length} bien(es)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total activos en USD</CardTitle>
            <CardDescription>Bienes valuados en dólares</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatUSD(totalAssets.USD)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {assets.filter((a) => a.currency === "USD").length} bien(es)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total deudas en ARS</CardTitle>
            <CardDescription>Pasivos en pesos argentinos</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">
              {formatARS(totalLiabilities.ARS)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {liabilities.filter((l) => l.currency === "ARS").length} deuda(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Total deudas en USD</CardTitle>
            <CardDescription>Pasivos en dólares</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">
              {formatUSD(totalLiabilities.USD)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {liabilities.filter((l) => l.currency === "USD").length} deuda(s)
            </p>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Los valores son estimativos — no representan valuación oficial.
      </p>
    </div>
  )
}
