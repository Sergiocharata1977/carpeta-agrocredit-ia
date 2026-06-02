import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { FieldValue } from "firebase-admin/firestore"
import type { FinancialStatementImport } from "@/types/statement-imports"

export async function createStatementImport(
  data: Omit<FinancialStatementImport, "id" | "createdAt" | "updatedAt">,
): Promise<string> {
  const db = getAdminDb()
  const now = FieldValue.serverTimestamp()
  const ref = db.collection(COLLECTIONS.FINANCIAL_STATEMENT_IMPORTS).doc()
  await ref.set({ ...data, createdAt: now, updatedAt: now })
  return ref.id
}

export async function getStatementImport(importId: string): Promise<FinancialStatementImport | null> {
  const db = getAdminDb()
  const snap = await db.collection(COLLECTIONS.FINANCIAL_STATEMENT_IMPORTS).doc(importId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as FinancialStatementImport
}

export async function updateStatementImport(
  importId: string,
  patch: Partial<FinancialStatementImport>,
): Promise<void> {
  const db = getAdminDb()
  await db
    .collection(COLLECTIONS.FINANCIAL_STATEMENT_IMPORTS)
    .doc(importId)
    .update({ ...patch, updatedAt: FieldValue.serverTimestamp() })
}
