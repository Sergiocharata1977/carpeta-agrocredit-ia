import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { getFirebaseDb } from "@/lib/firebase/config"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { BalanceSheet } from "@/types/accounting"
import type {
  CreateBalanceSheetInput,
  UpdateBalanceSheetInput,
} from "@/lib/schemas/accounting"
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

export async function getBalanceSheetsForPeriod(
  producerId: string,
  periodId: string
): Promise<BalanceSheet[]> {
  const response = await authFetch(
    `/api/accounting/balance-sheets?targetOrganizationId=${encodeURIComponent(producerId)}&periodId=${encodeURIComponent(periodId)}`,
  )
  const payload = await parseApiResponse<{ balanceSheets: BalanceSheet[] }>(response)
  return payload.balanceSheets
}

export async function getBalanceSheetById(
  id: string
): Promise<BalanceSheet | null> {
  const response = await authFetch(`/api/accounting/balance-sheets/${id}`)
  const payload = await parseApiResponse<{ balanceSheet: BalanceSheet }>(response)
  return payload.balanceSheet
}

export async function createBalanceSheet(
  data: CreateBalanceSheetInput,
  createdBy: string
): Promise<string> {
  void createdBy
  const response = await authFetch("/api/accounting/balance-sheets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return (await parseApiResponse<{ id: string }>(response)).id
}

export async function updateBalanceSheet(
  id: string,
  data: UpdateBalanceSheetInput
): Promise<void> {
  const response = await authFetch(`/api/accounting/balance-sheets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  await parseApiResponse<{ ok: boolean }>(response)
}
