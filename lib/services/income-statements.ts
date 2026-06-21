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
import type { IncomeStatement } from "@/types/accounting"
import type { CreateIncomeStatementInput } from "@/lib/schemas/accounting"
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

// Tipo parcial para actualización de estado de resultados
type UpdateIncomeStatementInput = Partial<
  Omit<IncomeStatement, "id" | "createdAt" | "updatedAt" | "createdBy">
>

export async function getIncomeStatementsForPeriod(
  producerId: string,
  periodId: string
): Promise<IncomeStatement[]> {
  const response = await authFetch(
    `/api/accounting/income-statements?targetOrganizationId=${encodeURIComponent(producerId)}&periodId=${encodeURIComponent(periodId)}`,
  )
  const payload = await parseApiResponse<{ incomeStatements: IncomeStatement[] }>(response)
  return payload.incomeStatements
}

export async function getIncomeStatementById(
  id: string
): Promise<IncomeStatement | null> {
  const response = await authFetch(`/api/accounting/income-statements/${id}`)
  const payload = await parseApiResponse<{ incomeStatement: IncomeStatement }>(response)
  return payload.incomeStatement
}

export async function createIncomeStatement(
  data: CreateIncomeStatementInput,
  createdBy: string
): Promise<string> {
  void createdBy
  const response = await authFetch("/api/accounting/income-statements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  return (await parseApiResponse<{ id: string }>(response)).id
}

export async function updateIncomeStatement(
  id: string,
  data: UpdateIncomeStatementInput
): Promise<void> {
  const response = await authFetch(`/api/accounting/income-statements/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  await parseApiResponse<{ ok: boolean }>(response)
}
