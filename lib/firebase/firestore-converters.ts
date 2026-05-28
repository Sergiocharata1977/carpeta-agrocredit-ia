import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase/firestore"

// Converter genérico: agrega el id del documento al objeto retornado
export function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...rest } = data
      return rest
    },
    fromFirestore(snap: QueryDocumentSnapshot): T {
      return { id: snap.id, ...snap.data() } as T
    },
  }
}
