// Servicio de cola de jobs documentales — CreditoHub Ola 2 / Agente A
// Admin SDK. NO orquesta IA (eso es Ola 3): solo encola, transiciona,
// reclama jobs con lease y recupera jobs trabados (stalled).
//
// Reglas (docs/credito-hub/000-ola0-decisiones.md secciones 1 y 4):
//   - Partition key = folderOwnerOrganizationId (nunca producerId/clientId).
//   - Lease anti-stalled: claimedBy/claimedAt/leaseExpiresAt.
//   - Idempotencia por fileHash + folderOwnerOrganizationId.
// Patrón de servicio Admin SDK: FieldValue.serverTimestamp() al escribir,
// normalización de timestamps a ISO string al leer (ver statement-imports-admin.ts).

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { FieldValue, type Firestore } from "firebase-admin/firestore"
import { writeAuditLog } from "@/lib/firebase/audit"
import { LEASE_MS, MAX_ATTEMPTS } from "@/lib/credito-hub/limits"
import type { DocumentJob, JobStatus } from "@/types/credito-hub"

// ─── Conjuntos de estados ─────────────────────────────────────────────────────

/** Estados en los que un worker está procesando activamente (sujetos a lease). */
export const ACTIVE_STATUSES: JobStatus[] = [
  "preprocessing",
  "classifying",
  "extracting",
  "validating",
]

/** Estados de los que un worker puede tomar (claim) el job. */
export const CLAIMABLE_STATUSES: JobStatus[] = ["queued", "stalled"]

/** Estados terminales: no admiten más transiciones (salvo reintento desde failed). */
export const TERMINAL_STATUSES: JobStatus[] = [
  "completed",
  "partially_completed",
  "failed",
]

// ─── Mapa de transiciones permitidas ──────────────────────────────────────────
// Modela el avance normal del pipeline + reintentos + lease vencido (stalled).

const ALLOWED_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  queued: ["preprocessing", "failed", "stalled"],
  preprocessing: ["classifying", "awaiting_review", "failed", "stalled"],
  classifying: ["extracting", "awaiting_review", "failed", "stalled"],
  extracting: ["validating", "awaiting_review", "failed", "stalled"],
  validating: [
    "completed",
    "partially_completed",
    "awaiting_review",
    "failed",
    "stalled",
  ],
  // awaiting_review espera intervención manual del contador.
  awaiting_review: ["queued", "extracting", "validating", "completed", "partially_completed", "failed"],
  // stalled vuelve a la cola o muere.
  stalled: ["queued", "preprocessing", "failed"],
  // Terminales: solo failed admite reintento (re-encolar).
  completed: [],
  partially_completed: [],
  failed: ["queued"],
}

export function isTransitionAllowed(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

// ─── Normalización de timestamps a ISO al leer ────────────────────────────────

type FirestoreData = Record<string, unknown>

function toIso(value: unknown): string | null | undefined {
  if (value == null) return value as null | undefined
  // Firestore Timestamp expone toDate()
  const maybeTs = value as { toDate?: () => Date }
  if (typeof maybeTs.toDate === "function") {
    return maybeTs.toDate().toISOString()
  }
  return value as string
}

function mapJob(id: string, data: FirestoreData): DocumentJob {
  return {
    ...(data as Omit<DocumentJob, "id">),
    id,
    claimedAt: toIso(data.claimedAt) ?? null,
    leaseExpiresAt: toIso(data.leaseExpiresAt) ?? null,
    createdAt: toIso(data.createdAt) as string,
    updatedAt: toIso(data.updatedAt) as string,
  }
}

// ─── enqueueJob ───────────────────────────────────────────────────────────────

export interface EnqueueJobInput {
  folderOwnerOrganizationId: string
  accountingFirmId?: string | null
  documentId: string
  provider: string
  fileHash: string
  encryptionStatus?: DocumentJob["encryptionStatus"]
  createdBy: string
  createdByOrganizationId: string
}

export async function findReusableJob(
  folderOwnerOrganizationId: string,
  fileHash: string,
): Promise<DocumentJob | null> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.DOCUMENT_JOBS)
    .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
    .where("fileHash", "==", fileHash)
    .get()

  const existing = snap.docs.find(
    (d) => (d.data().status as JobStatus) !== "failed",
  )
  return existing ? mapJob(existing.id, existing.data()) : null
}

/**
 * Crea un job en estado "queued". Idempotente: si ya existe un job NO fallido
 * (estado != "failed") con el mismo fileHash + folderOwnerOrganizationId, lo
 * retorna en lugar de crear uno nuevo.
 */
export async function enqueueJob(input: EnqueueJobInput): Promise<DocumentJob> {
  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.DOCUMENT_JOBS)

  // Idempotencia: buscar job existente no-fallido con mismo hash + legajo.
  const existing = await findReusableJob(input.folderOwnerOrganizationId, input.fileHash)
  if (existing) return existing

  const ref = col.doc()
  const now = FieldValue.serverTimestamp()
  const docData = {
    folderOwnerOrganizationId: input.folderOwnerOrganizationId,
    accountingFirmId: input.accountingFirmId ?? null,
    documentId: input.documentId,
    status: "queued" as JobStatus,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    claimedBy: null,
    claimedAt: null,
    leaseExpiresAt: null,
    provider: input.provider,
    error: null,
    statusMessage: null,
    fileHash: input.fileHash,
    encryptionStatus: input.encryptionStatus ?? "plaintext",
    createdBy: input.createdBy,
    createdByOrganizationId: input.createdByOrganizationId,
    createdAt: now,
    updatedAt: now,
  }
  await ref.set(docData)

  await writeAuditLog({
    actorUid: input.createdBy,
    actorOrganizationId: input.createdByOrganizationId,
    action: "document.job_queued",
    targetType: "document_job",
    targetId: ref.id,
    metadata: {
      folderOwnerOrganizationId: input.folderOwnerOrganizationId,
      documentId: input.documentId,
      fileHash: input.fileHash,
    },
  })

  const created = await ref.get()
  return mapJob(created.id, created.data() ?? {})
}

export interface DeleteDocumentJobOptions {
  actorUid: string
  actorOrganizationId: string | null
}

export async function deleteDocumentJob(
  jobId: string,
  options: DeleteDocumentJobOptions,
): Promise<{ job: DocumentJob; documentDeleted: boolean }> {
  const db = getAdminDb()
  const job = await getJob(jobId)
  if (!job) {
    throw new Error(`document-jobs: job ${jobId} no existe`)
  }

  const documentRef = db.collection(COLLECTIONS.DOCUMENTS).doc(job.documentId)
  const documentSnap = await documentRef.get()
  const document = documentSnap.exists ? documentSnap.data() ?? {} : null

  await deleteQueryDocs(db, COLLECTIONS.EXTRACTED_FIELDS, "documentId", job.documentId)
  await deleteQueryDocs(db, COLLECTIONS.DOCUMENT_CLASSIFICATIONS, "documentId", job.documentId)
  await deleteQueryDocs(db, COLLECTIONS.DOCUMENT_ROUTING_DECISIONS, "documentId", job.documentId)

  if (document?.storagePath) {
    try {
      const { getAdminStorage } = await import("@/lib/firebase/admin-sdk")
      await getAdminStorage().bucket().file(String(document.storagePath)).delete({ ignoreNotFound: true })
    } catch (error) {
      console.warn("[document-jobs] No se pudo borrar archivo de Storage", error)
    }
  }

  if (documentSnap.exists) {
    await documentRef.delete()
  }
  await db.collection(COLLECTIONS.DOCUMENT_JOBS).doc(jobId).delete()

  await writeAuditLog({
    actorUid: options.actorUid,
    actorOrganizationId: options.actorOrganizationId,
    action: "document.job_deleted",
    targetType: "document_job",
    targetId: jobId,
    metadata: {
      folderOwnerOrganizationId: job.folderOwnerOrganizationId,
      documentId: job.documentId,
      previousStatus: job.status,
      documentDeleted: documentSnap.exists,
    },
  })

  return { job, documentDeleted: documentSnap.exists }
}

async function deleteQueryDocs(
  db: Firestore,
  collectionName: string,
  field: string,
  value: string,
): Promise<void> {
  const snap = await db.collection(collectionName).where(field, "==", value).get()
  await Promise.all(snap.docs.map((doc) => doc.ref.delete()))
}

// ─── getJob / listJobs ────────────────────────────────────────────────────────

export async function getJob(jobId: string): Promise<DocumentJob | null> {
  const db = getAdminDb()
  const snap = await db.collection(COLLECTIONS.DOCUMENT_JOBS).doc(jobId).get()
  if (!snap.exists) return null
  return mapJob(snap.id, snap.data() ?? {})
}

export async function listJobs(
  folderOwnerOrganizationId: string,
): Promise<DocumentJob[]> {
  const db = getAdminDb()
  const snap = await db
    .collection(COLLECTIONS.DOCUMENT_JOBS)
    .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
    .get()
  const jobs = snap.docs.map((d) => mapJob(d.id, d.data()))
  const enriched = await Promise.all(
    jobs.map(async (job) => {
      const doc = await db.collection(COLLECTIONS.DOCUMENTS).doc(job.documentId).get()
      return {
        ...job,
        fileName: doc.exists ? String(doc.data()?.fileName ?? "") || null : null,
      }
    }),
  )
  return enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ─── transitionJob ────────────────────────────────────────────────────────────

export interface TransitionOptions {
  /** Mensaje de error a guardar cuando nextStatus === "failed". */
  error?: string | null
  /** Actor para auditoría (job_failed). */
  actorUid?: string
  actorOrganizationId?: string | null
  /** Campos adicionales a fusionar en el documento. */
  patch?: Partial<DocumentJob>
}

/**
 * Transiciona un job a nextStatus validando que la transición esté permitida.
 * - Lanza si el job no existe o la transición es inválida.
 * - Reintento (failed/awaiting_review -> queued): incrementa attempts y limpia mensajes.
 * - failed: setea error y emite audit document.job_failed.
 */
export async function transitionJob(
  jobId: string,
  nextStatus: JobStatus,
  options: TransitionOptions = {},
): Promise<DocumentJob> {
  const db = getAdminDb()
  const ref = db.collection(COLLECTIONS.DOCUMENT_JOBS).doc(jobId)
  const snap = await ref.get()
  if (!snap.exists) {
    throw new Error(`document-jobs: job ${jobId} no existe`)
  }
  const data = snap.data() ?? {}
  const current = data.status as JobStatus

  if (!isTransitionAllowed(current, nextStatus)) {
    throw new Error(
      `document-jobs: transición inválida ${current} -> ${nextStatus} (job ${jobId})`,
    )
  }

  const update: FirestoreData = {
    ...(options.patch ?? {}),
    status: nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  }

  const isRetry = (current === "failed" || current === "awaiting_review") && nextStatus === "queued"
  if (isRetry) {
    update.attempts = FieldValue.increment(1)
    // Reintento limpia el error previo y el lease.
    update.error = null
    update.statusMessage = null
    update.claimedBy = null
    update.claimedAt = null
    update.leaseExpiresAt = null
  }

  if (nextStatus === "failed") {
    update.error = options.error ?? "unknown error"
    update.statusMessage = null
  }

  await ref.update(update)

  if (nextStatus === "failed") {
    await writeAuditLog({
      actorUid: options.actorUid ?? (data.createdBy as string) ?? "system",
      actorOrganizationId:
        options.actorOrganizationId ??
        (data.createdByOrganizationId as string) ??
        null,
      action: "document.job_failed",
      targetType: "document_job",
      targetId: jobId,
      metadata: {
        folderOwnerOrganizationId: data.folderOwnerOrganizationId,
        from: current,
        error: options.error ?? "unknown error",
      },
    })
  }

  const updated = await ref.get()
  return mapJob(updated.id, updated.data() ?? {})
}

// ─── claimNextQueuedJob ───────────────────────────────────────────────────────

/**
 * Toma (claim) en transacción el próximo job reclamable ("queued" o "stalled")
 * y lo pasa a "preprocessing" con lease: claimedBy=workerId, claimedAt=now,
 * leaseExpiresAt=now+LEASE_MS. Incrementa attempts. Retorna el job o null.
 */
export async function claimNextQueuedJob(
  workerId: string,
): Promise<DocumentJob | null> {
  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.DOCUMENT_JOBS)

  return db.runTransaction(async (tx) => {
    // Buscamos un candidato reclamable. Ordenamos por createdAt (FIFO) si existe.
    const candidateSnap = await tx.get(
      col.where("status", "in", CLAIMABLE_STATUSES).limit(1),
    )
    if (candidateSnap.empty) return null

    const docSnap = candidateSnap.docs[0]
    const data = docSnap.data()
    const ref = docSnap.ref

    const now = new Date()
    const leaseExpiresAt = new Date(now.getTime() + LEASE_MS)

    tx.update(ref, {
      status: "preprocessing" as JobStatus,
      claimedBy: workerId,
      claimedAt: FieldValue.serverTimestamp(),
      leaseExpiresAt,
      attempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // Reflejamos el cambio en el objeto retornado (los serverTimestamp se
    // resuelven server-side; aquí aproximamos a ISO local para el caller).
    return mapJob(docSnap.id, {
      ...data,
      status: "preprocessing",
      claimedBy: workerId,
      claimedAt: now,
      leaseExpiresAt,
      attempts: ((data.attempts as number) ?? 0) + 1,
      updatedAt: now,
    })
  })
}

/**
 * Toma (claim) un job específico por id, en transacción, solo si sigue reclamable
 * ("queued" o "stalled"). Lo pasa a "preprocessing" con lease. Retorna el job o
 * null si ya no es reclamable (otro worker lo tomó). Útil para procesamiento
 * scopeado por legajo (botón "Procesar con IA"), sin índices compuestos.
 */
export async function claimJobById(
  jobId: string,
  workerId: string,
): Promise<DocumentJob | null> {
  const db = getAdminDb()
  const ref = db.collection(COLLECTIONS.DOCUMENT_JOBS).doc(jobId)

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const data = snap.data() ?? {}
    const status = data.status as JobStatus
    if (!CLAIMABLE_STATUSES.includes(status)) return null

    const now = new Date()
    const leaseExpiresAt = new Date(now.getTime() + LEASE_MS)
    tx.update(ref, {
      status: "preprocessing" as JobStatus,
      claimedBy: workerId,
      claimedAt: FieldValue.serverTimestamp(),
      leaseExpiresAt,
      attempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return mapJob(snap.id, {
      ...data,
      status: "preprocessing",
      claimedBy: workerId,
      claimedAt: now,
      leaseExpiresAt,
      attempts: ((data.attempts as number) ?? 0) + 1,
      updatedAt: now,
    })
  })
}

// ─── reclaimStalledJobs ───────────────────────────────────────────────────────

/**
 * Recupera jobs trabados: estados activos con leaseExpiresAt < now.
 *   - attempts < maxAttempts  -> vuelven a "queued"
 *   - attempts >= maxAttempts -> "failed"
 * Retorna cuántos jobs reclamó.
 */
export async function reclaimStalledJobs(): Promise<number> {
  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.DOCUMENT_JOBS)
  const now = new Date()

  const snap = await col.where("status", "in", ACTIVE_STATUSES).get()

  let reclaimed = 0
  for (const docSnap of snap.docs) {
    const data = docSnap.data()
    const leaseRaw = data.leaseExpiresAt
    const leaseDate = toLeaseDate(leaseRaw)
    // Sin lease o lease no vencido => no es stalled.
    if (!leaseDate || leaseDate >= now) continue

    const attempts = (data.attempts as number) ?? 0
    const maxAttempts = (data.maxAttempts as number) ?? MAX_ATTEMPTS

    if (attempts < maxAttempts) {
      await docSnap.ref.update({
        status: "queued" as JobStatus,
        claimedBy: null,
        claimedAt: null,
        leaseExpiresAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      await docSnap.ref.update({
        status: "failed" as JobStatus,
        error: "lease expired: max attempts reached",
        claimedBy: null,
        claimedAt: null,
        leaseExpiresAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      })
      await writeAuditLog({
        actorUid: (data.createdBy as string) ?? "system",
        actorOrganizationId: (data.createdByOrganizationId as string) ?? null,
        action: "document.job_failed",
        targetType: "document_job",
        targetId: docSnap.id,
        metadata: {
          folderOwnerOrganizationId: data.folderOwnerOrganizationId,
          reason: "lease_expired_max_attempts",
          attempts,
          maxAttempts,
        },
      })
    }
    reclaimed += 1
  }

  return reclaimed
}

function toLeaseDate(value: unknown): Date | null {
  if (value == null) return null
  if (value instanceof Date) return value
  const maybeTs = value as { toDate?: () => Date }
  if (typeof maybeTs.toDate === "function") return maybeTs.toDate()
  if (typeof value === "string") {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

// Re-export para tests / callers que necesiten el handle de DB.
export type { Firestore }
