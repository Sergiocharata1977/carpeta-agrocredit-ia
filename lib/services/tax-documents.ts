import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { TaxDocument } from "@/types/accounting"
import type { CreateTaxDocumentInput } from "@/lib/schemas/accounting"
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

// Tipo parcial para actualización de documentos fiscales
type UpdateTaxDocumentInput = Partial<
  Omit<TaxDocument, "id" | "createdAt" | "updatedAt" | "createdBy">
>

export async function getTaxDocumentsForPeriod(
  producerId: string,
  periodId: string
): Promise<TaxDocument[]> {
  const response = await authFetch(
    `/api/accounting/tax-documents?targetOrganizationId=${encodeURIComponent(producerId)}&periodId=${encodeURIComponent(periodId)}`,
  )
  const payload = await parseApiResponse<{ taxDocuments: TaxDocument[] }>(response)
  return payload.taxDocuments
}

export async function createTaxDocument(
  data: CreateTaxDocumentInput,
  createdBy: string
): Promise<string> {
  void createdBy
  const response = await authFetch("/api/accounting/tax-documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return (await parseApiResponse<{ id: string }>(response)).id
}

export async function updateTaxDocument(
  id: string,
  data: UpdateTaxDocumentInput
): Promise<void> {
  const response = await authFetch(`/api/accounting/tax-documents/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  await parseApiResponse<{ ok: boolean }>(response)
}
