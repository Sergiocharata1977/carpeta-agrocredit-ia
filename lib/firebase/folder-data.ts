import type { Firestore } from "firebase-admin/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"

export interface FolderDataStatus {
  hasData: boolean
  sections: {
    balance: boolean
    income: boolean
    taxDocuments: boolean
    assets: boolean
    liabilities: boolean
    documents: boolean
  }
}

// Verifica si la carpeta de una organizacion tiene informacion cargada.
// Queries con limit(1) y sin orderBy para no depender de indices compuestos.
export async function getFolderDataStatus(db: Firestore, organizationId: string): Promise<FolderDataStatus> {
  const checks = [
    { key: "balance" as const, collection: COLLECTIONS.BALANCE_SHEETS },
    { key: "income" as const, collection: COLLECTIONS.INCOME_STATEMENTS },
    { key: "taxDocuments" as const, collection: COLLECTIONS.TAX_DOCUMENTS },
    { key: "assets" as const, collection: COLLECTIONS.ASSETS },
    { key: "liabilities" as const, collection: COLLECTIONS.LIABILITIES },
    { key: "documents" as const, collection: COLLECTIONS.DOCUMENTS },
  ]

  const snaps = await Promise.all(
    checks.map((check) =>
      db.collection(check.collection).where("producerId", "==", organizationId).limit(1).get(),
    ),
  )

  const sections = {
    balance: !snaps[0].empty,
    income: !snaps[1].empty,
    taxDocuments: !snaps[2].empty,
    assets: !snaps[3].empty,
    liabilities: !snaps[4].empty,
    documents: !snaps[5].empty,
  }

  return {
    hasData: Object.values(sections).some(Boolean),
    sections,
  }
}
