import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock de auditoría: nunca tocar Firestore real ────────────────────────────
const auditCalls: Array<Record<string, unknown>> = []
vi.mock("@/lib/firebase/audit", () => ({
  writeAuditLog: vi.fn(async (params: Record<string, unknown>) => {
    auditCalls.push(params)
  }),
}))

// ─── Mock mínimo de Firestore Admin SDK en memoria ────────────────────────────
//
// Soporta lo que usa lib/services/document-jobs.ts:
//   collection().doc() / doc(id), where(==), where(in), limit(),
//   get(), set(), update(), runTransaction(), tx.get/tx.update,
//   FieldValue.serverTimestamp() / FieldValue.increment().

type Doc = Record<string, unknown>

interface IncrementOp {
  __increment: number
}
function isIncrement(v: unknown): v is IncrementOp {
  return typeof v === "object" && v !== null && "__increment" in v
}

// vi.hoisted: estos valores se necesitan dentro de la factory de vi.mock,
// que se eleva al tope del módulo.
const { SERVER_TS, FieldValue } = vi.hoisted(() => {
  const serverTs = Symbol("serverTimestamp")
  return {
    SERVER_TS: serverTs,
    FieldValue: {
      serverTimestamp: () => serverTs,
      increment: (n: number) => ({ __increment: n }),
    },
  }
})

class FakeStore {
  collections = new Map<string, Map<string, Doc>>()
  private seq = 0

  col(name: string): Map<string, Doc> {
    if (!this.collections.has(name)) this.collections.set(name, new Map())
    return this.collections.get(name)!
  }

  nextId(): string {
    this.seq += 1
    return `gen-${this.seq}`
  }
}

const store = new FakeStore()

function resolveWrite(target: Doc, data: Doc) {
  for (const [k, v] of Object.entries(data)) {
    if (v === SERVER_TS) {
      target[k] = new Date()
    } else if (isIncrement(v)) {
      target[k] = ((target[k] as number) ?? 0) + v.__increment
    } else {
      target[k] = v
    }
  }
}

interface WhereClause {
  field: string
  op: "==" | "in"
  value: unknown
}

class FakeQuery {
  constructor(
    private colName: string,
    private clauses: WhereClause[] = [],
    private limitN: number | null = null,
  ) {}

  where(field: string, op: "==" | "in", value: unknown): FakeQuery {
    return new FakeQuery(this.colName, [...this.clauses, { field, op, value }], this.limitN)
  }

  limit(n: number): FakeQuery {
    return new FakeQuery(this.colName, this.clauses, n)
  }

  private matches(data: Doc): boolean {
    return this.clauses.every((c) => {
      const val = data[c.field]
      if (c.op === "==") return val === c.value
      if (c.op === "in") return (c.value as unknown[]).includes(val)
      return false
    })
  }

  run() {
    const map = store.col(this.colName)
    let docs = [...map.entries()]
      .filter(([, data]) => this.matches(data))
      .map(([id, data]) => makeSnap(this.colName, id, data))
    if (this.limitN != null) docs = docs.slice(0, this.limitN)
    return { empty: docs.length === 0, docs }
  }

  async get() {
    return this.run()
  }
}

function makeSnap(colName: string, id: string, data: Doc) {
  return {
    id,
    exists: true,
    data: () => ({ ...data }),
    ref: new FakeDocRef(colName, id),
  }
}

class FakeDocRef {
  constructor(public colName: string, public id: string) {}

  async set(data: Doc) {
    const map = store.col(this.colName)
    const target: Doc = {}
    resolveWrite(target, data)
    map.set(this.id, target)
  }

  async update(data: Doc) {
    const map = store.col(this.colName)
    const existing = map.get(this.id)
    if (!existing) throw new Error("update on missing doc")
    resolveWrite(existing, data)
  }

  async get() {
    const map = store.col(this.colName)
    const data = map.get(this.id)
    if (!data) return { id: this.id, exists: false, data: () => undefined, ref: this }
    return { id: this.id, exists: true, data: () => ({ ...data }), ref: this }
  }
}

class FakeCollectionRef extends FakeQuery {
  constructor(private name: string) {
    super(name)
  }
  doc(id?: string): FakeDocRef {
    return new FakeDocRef(this.name, id ?? store.nextId())
  }
  add(data: Doc) {
    const ref = this.doc()
    return ref.set(data).then(() => ref)
  }
}

const fakeDb = {
  collection: (name: string) => new FakeCollectionRef(name),
  async runTransaction<T>(fn: (tx: FakeTx) => Promise<T>): Promise<T> {
    return fn(new FakeTx())
  },
}

class FakeTx {
  async get(q: FakeQuery | FakeDocRef) {
    if (q instanceof FakeDocRef) return q.get()
    return (q as FakeQuery).get()
  }
  update(ref: FakeDocRef, data: Doc) {
    // En esta fake, aplicamos sincrónicamente (la transacción es serial).
    void ref.update(data)
  }
  set(ref: FakeDocRef, data: Doc) {
    void ref.set(data)
  }
}

vi.mock("@/lib/firebase/admin-sdk", () => ({
  getAdminDb: () => fakeDb,
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue,
}))

// ─── Import del servicio bajo prueba (después de los mocks) ────────────────────
import {
  enqueueJob,
  getJob,
  listJobs,
  transitionJob,
  claimNextQueuedJob,
  reclaimStalledJobs,
  isTransitionAllowed,
  type EnqueueJobInput,
} from "@/lib/services/document-jobs"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { LEASE_MS, MAX_ATTEMPTS } from "@/lib/credito-hub/limits"

const baseInput: EnqueueJobInput = {
  folderOwnerOrganizationId: "org-legajo-1",
  accountingFirmId: "firm-1",
  documentId: "doc-1",
  provider: "mock",
  fileHash: "hash-abc",
  createdBy: "user-1",
  createdByOrganizationId: "org-creator-1",
}

function clearStore() {
  store.collections.clear()
  auditCalls.length = 0
}

// Helper para mutar directamente un job en el store (simular estado intermedio).
function patchJobDirect(jobId: string, patch: Doc) {
  const map = store.col(COLLECTIONS.DOCUMENT_JOBS)
  const data = map.get(jobId)
  if (!data) throw new Error("job no existe en store de prueba")
  Object.assign(data, patch)
}

beforeEach(() => {
  clearStore()
})

describe("enqueueJob", () => {
  it("crea un job en queued con attempts 0 y maxAttempts = MAX_ATTEMPTS", async () => {
    const job = await enqueueJob(baseInput)
    expect(job.status).toBe("queued")
    expect(job.attempts).toBe(0)
    expect(job.maxAttempts).toBe(MAX_ATTEMPTS)
    expect(job.folderOwnerOrganizationId).toBe("org-legajo-1")
    expect(job.encryptionStatus).toBe("plaintext")
  })

  it("emite audit document.job_queued", async () => {
    await enqueueJob(baseInput)
    expect(auditCalls.some((c) => c.action === "document.job_queued")).toBe(true)
  })

  it("es idempotente por fileHash + folderOwnerOrganizationId (no-failed)", async () => {
    const first = await enqueueJob(baseInput)
    const second = await enqueueJob(baseInput)
    expect(second.id).toBe(first.id)
    const all = await listJobs("org-legajo-1")
    expect(all).toHaveLength(1)
  })

  it("NO reusa un job failed: crea uno nuevo", async () => {
    const first = await enqueueJob(baseInput)
    patchJobDirect(first.id, { status: "failed" })
    const second = await enqueueJob(baseInput)
    expect(second.id).not.toBe(first.id)
    const all = await listJobs("org-legajo-1")
    expect(all).toHaveLength(2)
  })

  it("diferentes legajos con mismo hash no colisionan", async () => {
    const a = await enqueueJob(baseInput)
    const b = await enqueueJob({ ...baseInput, folderOwnerOrganizationId: "org-legajo-2" })
    expect(a.id).not.toBe(b.id)
  })
})

describe("getJob / listJobs", () => {
  it("getJob retorna el job creado y null si no existe", async () => {
    const job = await enqueueJob(baseInput)
    expect((await getJob(job.id))?.id).toBe(job.id)
    expect(await getJob("inexistente")).toBeNull()
  })

  it("listJobs filtra por folderOwnerOrganizationId", async () => {
    await enqueueJob(baseInput)
    await enqueueJob({ ...baseInput, fileHash: "hash-2", documentId: "doc-2" })
    await enqueueJob({ ...baseInput, folderOwnerOrganizationId: "org-otra", fileHash: "hash-3" })
    expect(await listJobs("org-legajo-1")).toHaveLength(2)
    expect(await listJobs("org-otra")).toHaveLength(1)
  })
})

describe("isTransitionAllowed / transitionJob", () => {
  it("permite transiciones válidas del pipeline", () => {
    expect(isTransitionAllowed("queued", "preprocessing")).toBe(true)
    expect(isTransitionAllowed("preprocessing", "classifying")).toBe(true)
    expect(isTransitionAllowed("classifying", "extracting")).toBe(true)
    expect(isTransitionAllowed("extracting", "validating")).toBe(true)
    expect(isTransitionAllowed("validating", "completed")).toBe(true)
  })

  it("rechaza transiciones inválidas", () => {
    expect(isTransitionAllowed("queued", "completed")).toBe(false)
    expect(isTransitionAllowed("completed", "queued")).toBe(false)
    expect(isTransitionAllowed("preprocessing", "extracting")).toBe(false)
  })

  it("transitionJob aplica una transición válida", async () => {
    const job = await enqueueJob(baseInput)
    const next = await transitionJob(job.id, "preprocessing")
    expect(next.status).toBe("preprocessing")
  })

  it("transitionJob lanza ante transición inválida", async () => {
    const job = await enqueueJob(baseInput)
    await expect(transitionJob(job.id, "completed")).rejects.toThrow()
  })

  it("transitionJob lanza si el job no existe", async () => {
    await expect(transitionJob("nope", "preprocessing")).rejects.toThrow()
  })

  it("failed setea error y emite audit document.job_failed", async () => {
    const job = await enqueueJob(baseInput)
    const failed = await transitionJob(job.id, "failed", { error: "boom" })
    expect(failed.status).toBe("failed")
    expect(failed.error).toBe("boom")
    expect(auditCalls.some((c) => c.action === "document.job_failed")).toBe(true)
  })

  it("reintento failed -> queued incrementa attempts y limpia error", async () => {
    const job = await enqueueJob(baseInput)
    patchJobDirect(job.id, { status: "failed", attempts: 1, error: "x" })
    const requeued = await transitionJob(job.id, "queued")
    expect(requeued.status).toBe("queued")
    expect(requeued.attempts).toBe(2)
    expect(requeued.error).toBeNull()
  })

  it("reproceso awaiting_review -> queued incrementa attempts y limpia statusMessage", async () => {
    const job = await enqueueJob(baseInput)
    patchJobDirect(job.id, { status: "awaiting_review", attempts: 1, statusMessage: "revisar" })
    const requeued = await transitionJob(job.id, "queued")
    expect(requeued.status).toBe("queued")
    expect(requeued.attempts).toBe(2)
    expect(requeued.statusMessage).toBeNull()
  })
})

describe("claimNextQueuedJob", () => {
  it("toma un job queued, lo pasa a preprocessing con lease e incrementa attempts", async () => {
    const job = await enqueueJob(baseInput)
    const claimed = await claimNextQueuedJob("worker-1")
    expect(claimed).not.toBeNull()
    expect(claimed!.id).toBe(job.id)
    expect(claimed!.status).toBe("preprocessing")
    expect(claimed!.claimedBy).toBe("worker-1")
    expect(claimed!.attempts).toBe(1)
    expect(claimed!.leaseExpiresAt).toBeTruthy()

    const lease = new Date(claimed!.leaseExpiresAt!).getTime()
    const claimedAt = new Date(claimed!.claimedAt!).getTime()
    expect(lease - claimedAt).toBeCloseTo(LEASE_MS, -2)
  })

  it("retorna null cuando no hay jobs reclamables", async () => {
    expect(await claimNextQueuedJob("worker-1")).toBeNull()
  })

  it("también reclama jobs en estado stalled", async () => {
    const job = await enqueueJob(baseInput)
    patchJobDirect(job.id, { status: "stalled" })
    const claimed = await claimNextQueuedJob("worker-2")
    expect(claimed?.id).toBe(job.id)
    expect(claimed?.status).toBe("preprocessing")
  })

  it("no toma jobs en estado activo (preprocessing)", async () => {
    const job = await enqueueJob(baseInput)
    patchJobDirect(job.id, { status: "preprocessing" })
    expect(await claimNextQueuedJob("worker-3")).toBeNull()
  })
})

describe("reclaimStalledJobs", () => {
  it("vuelve a queued si attempts < maxAttempts y el lease venció", async () => {
    const job = await enqueueJob(baseInput)
    patchJobDirect(job.id, {
      status: "preprocessing",
      attempts: 1,
      maxAttempts: MAX_ATTEMPTS,
      leaseExpiresAt: new Date(Date.now() - 1000),
    })
    const count = await reclaimStalledJobs()
    expect(count).toBe(1)
    const reread = await getJob(job.id)
    expect(reread?.status).toBe("queued")
    expect(reread?.claimedBy).toBeNull()
  })

  it("marca failed si attempts >= maxAttempts y emite audit", async () => {
    const job = await enqueueJob(baseInput)
    patchJobDirect(job.id, {
      status: "extracting",
      attempts: MAX_ATTEMPTS,
      maxAttempts: MAX_ATTEMPTS,
      leaseExpiresAt: new Date(Date.now() - 1000),
    })
    const count = await reclaimStalledJobs()
    expect(count).toBe(1)
    const reread = await getJob(job.id)
    expect(reread?.status).toBe("failed")
    expect(auditCalls.some((c) => c.action === "document.job_failed")).toBe(true)
  })

  it("no reclama jobs con lease vigente", async () => {
    const job = await enqueueJob(baseInput)
    patchJobDirect(job.id, {
      status: "validating",
      attempts: 0,
      leaseExpiresAt: new Date(Date.now() + LEASE_MS),
    })
    expect(await reclaimStalledJobs()).toBe(0)
    expect((await getJob(job.id))?.status).toBe("validating")
  })

  it("no reclama jobs queued (no son activos)", async () => {
    await enqueueJob(baseInput)
    expect(await reclaimStalledJobs()).toBe(0)
  })
})
