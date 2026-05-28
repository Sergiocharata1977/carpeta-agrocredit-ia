import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase/config"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore"
import { COLLECTIONS } from "@/lib/firebase/collections"
import type { ValidationStatus } from "@/types/accounting"

export interface DocumentMetadata {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  documentType: string
  storagePath: string
  downloadUrl: string
  fileName: string
  fileSize: number
  mimeType: string
  visibility: "private" | "shared"
  uploadedBy: string
  validationStatus: ValidationStatus
  createdAt: string
}

export async function uploadDocument(
  file: File,
  metadata: Omit<
    DocumentMetadata,
    "id" | "storagePath" | "downloadUrl" | "createdAt"
  >
): Promise<DocumentMetadata> {
  const storage = getFirebaseStorage()
  const db = getFirebaseDb()
  if (!storage || !db) throw new Error("Firebase no configurado")

  const docId = crypto.randomUUID()
  const storagePath = `orgs/${metadata.organizationId}/producers/${metadata.producerId}/periods/${metadata.periodId}/${metadata.documentType}/${docId}-${metadata.fileName}`

  const storageRef = ref(storage, storagePath)
  await uploadBytes(storageRef, file, { contentType: metadata.mimeType })
  const downloadUrl = await getDownloadURL(storageRef)

  const docData = {
    ...metadata,
    storagePath,
    downloadUrl,
    createdAt: serverTimestamp(),
  }

  const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENTS), docData)
  return { id: docRef.id, ...docData, createdAt: new Date().toISOString() }
}

export async function getDocumentsForPeriod(
  producerId: string,
  periodId: string
): Promise<DocumentMetadata[]> {
  const db = getFirebaseDb()
  if (!db) return []

  const q = query(
    collection(db, COLLECTIONS.DOCUMENTS),
    where("producerId", "==", producerId),
    where("periodId", "==", periodId)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DocumentMetadata))
}
