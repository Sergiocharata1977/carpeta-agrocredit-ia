import { getFirebaseDb } from "@/lib/firebase/config"
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { Asset } from "@/types/assets"
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

export async function getAssetsForProducer(producerId: string): Promise<Asset[]> {
  const response = await authFetch(`/api/folders/assets?targetOrganizationId=${encodeURIComponent(producerId)}`)
  const payload = await parseApiResponse<{ assets: Asset[] }>(response)
  return payload.assets
}

export async function getAssetsByType(
  producerId: string,
  assetType: Asset["assetType"]
): Promise<Asset[]> {
  const response = await authFetch(
    `/api/folders/assets?targetOrganizationId=${encodeURIComponent(producerId)}&assetType=${encodeURIComponent(assetType)}`,
  )
  const payload = await parseApiResponse<{ assets: Asset[] }>(response)
  return payload.assets
}

export async function createAsset(
  data: Omit<Asset, "id" | "createdAt" | "updatedAt">,
  createdBy: string
): Promise<string> {
  void createdBy
  const response = await authFetch("/api/folders/assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, documentIds: data.documentIds ?? [] }),
  })
  return (await parseApiResponse<{ id: string }>(response)).id
}

export async function updateAsset(
  assetId: string,
  data: Partial<Asset>
): Promise<void> {
  const response = await authFetch(`/api/folders/assets/${assetId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  await parseApiResponse<{ ok: boolean }>(response)
}

export async function deleteAsset(assetId: string): Promise<void> {
  const response = await authFetch(`/api/folders/assets/${assetId}`, {
    method: "DELETE",
  })
  await parseApiResponse<{ ok: boolean }>(response)
}

export async function getAssetsForOrganization(organizationId: string): Promise<Asset[]> {
  return getAssetsForProducer(organizationId)
}

export async function getAssetsByTypeForOrganization(
  organizationId: string,
  assetType: Asset["assetType"]
): Promise<Asset[]> {
  return getAssetsByType(organizationId, assetType)
}

export function getTotalAssetValue(assets: Asset[]): { ARS: number; USD: number } {
  return assets.reduce(
    (acc, asset) => {
      acc[asset.currency] += asset.estimatedValue
      return acc
    },
    { ARS: 0, USD: 0 }
  )
}
