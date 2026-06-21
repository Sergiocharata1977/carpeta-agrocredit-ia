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
import { authFetch, parseApiResponse } from "@/lib/services/api-client"

export interface DocumentMetadata {
  id: string
  producerId: string
  organizationId: string
  periodId: string
  documentType: string
  storagePath: string
  downloadUrl: string | null
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
  const formData = new FormData()
  formData.set("file", file)
  formData.set("producerId", metadata.producerId)
  formData.set("organizationId", metadata.organizationId)
  formData.set("periodId", metadata.periodId)
  formData.set("documentType", metadata.documentType)
  formData.set("fileName", metadata.fileName)
  formData.set("mimeType", metadata.mimeType)

  const response = await authFetch("/api/folders/documents/upload", {
    method: "POST",
    body: formData,
  })
  const payload = await parseApiResponse<{ document: DocumentMetadata }>(response)
  return payload.document
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
