import { createHash } from "node:crypto"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getFolderDataStatus } from "@/lib/firebase/folder-data"

// Colecciones cuyo recuento forma parte de la huella de la carpeta.
// Si cambia cualquier sección o el número de elementos, la huella cambia
// y una certificación previa se considera "outdated".
const COUNTED_COLLECTIONS = [
  COLLECTIONS.BALANCE_SHEETS,
  COLLECTIONS.INCOME_STATEMENTS,
  COLLECTIONS.TAX_DOCUMENTS,
  COLLECTIONS.ASSETS,
  COLLECTIONS.LIABILITIES,
  COLLECTIONS.DOCUMENTS,
] as const

// Devuelve una huella estable (string hex corto) derivada del estado de la
// carpeta (secciones presentes) + el conteo de documentos de cada colección.
// Determinista: mismos datos -> misma huella.
export async function computeFolderFingerprint(orgId: string): Promise<string> {
  const db = getAdminDb()

  const status = await getFolderDataStatus(db, orgId)

  const countSnaps = await Promise.all(
    COUNTED_COLLECTIONS.map((collection) =>
      db.collection(collection).where("producerId", "==", orgId).count().get(),
    ),
  )

  const counts: Record<string, number> = {}
  COUNTED_COLLECTIONS.forEach((collection, index) => {
    counts[collection] = countSnaps[index].data().count
  })

  // JSON determinista: claves ordenadas para que la serialización sea estable.
  const payload = {
    orgId,
    sections: Object.keys(status.sections)
      .sort()
      .reduce<Record<string, boolean>>((acc, key) => {
        acc[key] = status.sections[key as keyof typeof status.sections]
        return acc
      }, {}),
    counts: Object.keys(counts)
      .sort()
      .reduce<Record<string, number>>((acc, key) => {
        acc[key] = counts[key]
        return acc
      }, {}),
  }

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 16)
}
