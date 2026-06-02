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

export async function getAssetsForProducer(producerId: string): Promise<Asset[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ASSETS),
    where("producerId", "==", producerId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Asset))
}

export async function getAssetsByType(
  producerId: string,
  assetType: Asset["assetType"]
): Promise<Asset[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ASSETS),
    where("producerId", "==", producerId),
    where("assetType", "==", assetType)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Asset))
}

export async function createAsset(
  data: Omit<Asset, "id" | "createdAt" | "updatedAt">,
  createdBy: string
): Promise<string> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  const ref = await addDoc(collection(db, COLLECTIONS.ASSETS), {
    ...data,
    createdBy,
    documentIds: data.documentIds ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateAsset(
  assetId: string,
  data: Partial<Asset>
): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await updateDoc(doc(db, COLLECTIONS.ASSETS, assetId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAsset(assetId: string): Promise<void> {
  const db = getFirebaseDb()
  if (!db) throw new Error("Firebase no configurado")
  await deleteDoc(doc(db, COLLECTIONS.ASSETS, assetId))
}

export async function getAssetsForOrganization(organizationId: string): Promise<Asset[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ASSETS),
    where("organizationId", "==", organizationId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Asset))
}

export async function getAssetsByTypeForOrganization(
  organizationId: string,
  assetType: Asset["assetType"]
): Promise<Asset[]> {
  const db = getFirebaseDb()
  if (!db) return []
  const q = query(
    collection(db, COLLECTIONS.ASSETS),
    where("organizationId", "==", organizationId),
    where("assetType", "==", assetType)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Asset))
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
