import { NextRequest } from "next/server"
import JSZip from "jszip"
import { createHash, randomUUID } from "node:crypto"
import { FieldValue } from "firebase-admin/firestore"
import { getAdminDb, getAdminStorage } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { assertCanManageAccountingFolder } from "@/lib/auth/accounting-access"
import { enqueueJob, findReusableJob } from "@/lib/services/document-jobs"
import { getActiveProviderName } from "@/lib/ai/provider-config"
import {
  MAX_FILE_SIZE_EXCEL,
  MAX_FILE_SIZE_PDF_IMG,
  MAX_ZIP_SIZE,
} from "@/lib/credito-hub/limits"

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

function isExcel(mimeType: string): boolean {
  return mimeType.includes("excel") || mimeType.includes("spreadsheetml")
}

function isOfficeText(mimeType: string): boolean {
  return mimeType.includes("msword") || mimeType.includes("wordprocessingml")
}

function isZip(file: File): boolean {
  return file.type === "application/zip" || file.name.toLowerCase().endsWith(".zip")
}

function inferMimeType(name: string, fallback: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith(".pdf")) return "application/pdf"
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg"
  if (lower.endsWith(".png")) return "image/png"
  if (lower.endsWith(".webp")) return "image/webp"
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel"
  if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  if (lower.endsWith(".doc")) return "application/msword"
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  return fallback || "application/octet-stream"
}

function validateFile(name: string, mimeType: string, size: number): string | null {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return `Tipo no permitido: ${name}`
  const max = isExcel(mimeType) || isOfficeText(mimeType) ? MAX_FILE_SIZE_EXCEL : MAX_FILE_SIZE_PDF_IMG
  if (size > max) return `Archivo muy grande: ${name}`
  return null
}

async function expandFiles(files: File[]): Promise<Array<{ name: string; mimeType: string; buffer: Buffer }>> {
  const expanded: Array<{ name: string; mimeType: string; buffer: Buffer }> = []
  for (const file of files) {
    if (isZip(file)) {
      if (file.size > MAX_ZIP_SIZE) throw new Error("ZIP demasiado grande")
      const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()))
      for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue
        const buffer = await entry.async("nodebuffer")
        expanded.push({
          name: entry.name.split("/").pop() ?? entry.name,
          mimeType: inferMimeType(entry.name, ""),
          buffer,
        })
      }
    } else {
      expanded.push({
        name: file.name,
        mimeType: file.type || inferMimeType(file.name, ""),
        buffer: Buffer.from(await file.arrayBuffer()),
      })
    }
  }
  return expanded
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const formData = await request.formData()
    const targetOrganizationId = String(formData.get("targetOrganizationId") ?? "")
    if (!targetOrganizationId) return Response.json({ error: "targetOrganizationId requerido" }, { status: 400 })

    if (process.env.CREDITO_HUB_ALLOW_REAL_DATA !== "true" && request.headers.get("x-staging-data") !== "true") {
      return Response.json({ error: "CreditoHub IA solo acepta datos staging/demo hasta habilitar CREDITO_HUB_ALLOW_REAL_DATA" }, { status: 403 })
    }

    const rawFiles = formData.getAll("files").filter((item): item is File => item instanceof File)
    const single = formData.get("file")
    if (single instanceof File) rawFiles.push(single)
    if (rawFiles.length === 0) return Response.json({ error: "Archivos requeridos" }, { status: 400 })

    const { folderOwnerOrganizationId, accountingFirmId } =
      await assertCanManageAccountingFolder(session, targetOrganizationId)

    const files = await expandFiles(rawFiles)
    if (files.length === 0) return Response.json({ error: "No hay archivos procesables" }, { status: 400 })

    const db = getAdminDb()
    const bucket = getAdminStorage().bucket()
    const jobIds: string[] = []
    const documents: string[] = []
    const duplicateJobIds: string[] = []
    const activeProviderName = (await getActiveProviderName()) || "mock"

    for (const file of files) {
      const validationError = validateFile(file.name, file.mimeType, file.buffer.length)
      if (validationError) return Response.json({ error: validationError }, { status: 400 })

      const fileHash = createHash("sha256").update(file.buffer).digest("hex")
      const reusableJob = await findReusableJob(folderOwnerOrganizationId, fileHash)
      if (reusableJob) {
        jobIds.push(reusableJob.id)
        documents.push(reusableJob.documentId)
        duplicateJobIds.push(reusableJob.id)
        continue
      }

      const documentId = randomUUID()
      const storagePath = `orgs/${folderOwnerOrganizationId}/producers/${targetOrganizationId}/credito-hub/${documentId}-${safeName(file.name)}`
      await bucket.file(storagePath).save(file.buffer, { contentType: file.mimeType, resumable: false })

      await db.collection(COLLECTIONS.DOCUMENTS).doc(documentId).set({
        producerId: targetOrganizationId,
        folderOwnerOrganizationId,
        documentType: "credit_folder_source",
        storagePath,
        fileName: file.name,
        mimeType: file.mimeType,
        fileSize: file.buffer.length,
        fileHash,
        encryptionStatus: "plaintext",
        visibility: "private",
        uploadedBy: session.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      await writeAuditLog({
        actorUid: session.uid,
        actorOrganizationId: session.defaultOrganizationId,
        action: "document.uploaded",
        targetType: "document",
        targetId: documentId,
        metadata: { folderOwnerOrganizationId, fileName: file.name, source: "credito_hub_intake" },
      })

      const job = await enqueueJob({
        folderOwnerOrganizationId,
        accountingFirmId,
        documentId,
        provider: activeProviderName,
        fileHash,
        encryptionStatus: "plaintext",
        createdBy: session.uid,
        createdByOrganizationId: session.defaultOrganizationId ?? folderOwnerOrganizationId,
      })
      jobIds.push(job.id)
      documents.push(documentId)
    }

    return Response.json({ jobIds, documentIds: documents, duplicateJobIds }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
