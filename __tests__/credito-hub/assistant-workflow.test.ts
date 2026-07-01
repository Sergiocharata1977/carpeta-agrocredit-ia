import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock de auditoría ────────────────────────────────────────────────────────
const auditCalls: Array<Record<string, unknown>> = []
vi.mock("@/lib/firebase/audit", () => ({
  writeAuditLog: vi.fn(async (params: Record<string, unknown>) => {
    auditCalls.push(params)
  }),
}))

// ─── Mock mínimo de Firestore Admin SDK en memoria ─────────────────────────────

type Doc = Record<string, unknown>

interface IncrementOp {
  __increment: number
}
function isIncrement(v: unknown): v is IncrementOp {
  return typeof v === "object" && v !== null && "__increment" in v
}

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
  op: "==" | "in" | "<" | ">"
  value: unknown
}

class FakeQuery {
  constructor(
    private colName: string,
    private clauses: WhereClause[] = [],
    private limitN: number | null = null
  ) {}

  where(field: string, op: "==" | "in" | "<" | ">", value: unknown): FakeQuery {
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
      if (c.op === ">") return (val as number) > (c.value as number)
      if (c.op === "<") return (val as number) < (c.value as number)
      return false
    })
  }

  async get() {
    const map = store.col(this.colName)
    const results = Array.from(map.entries()).filter(([, d]) => this.matches(d))
    return {
      docs: results.slice(0, this.limitN ?? results.length).map(([id, data]) => ({
        id,
        data: () => data,
      })),
    }
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
    if (!data) return { id: this.id, exists: false, data: () => undefined }
    return { id: this.id, exists: true, data: () => ({ ...data }) }
  }
}

class FakeCollectionRef extends FakeQuery {
  constructor(private name: string) {
    super(name)
  }
  doc(id?: string): FakeDocRef {
    return new FakeDocRef(this.name, id ?? store.nextId())
  }
  async add(data: Doc) {
    const ref = this.doc()
    await ref.set(data)
    return ref
  }
}

const fakeDb = {
  collection: (name: string) => new FakeCollectionRef(name),
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return fn({
      get: async (ref: FakeDocRef) => ref.get(),
      set: async (ref: FakeDocRef, data: Doc) => ref.set(data),
      update: async (ref: FakeDocRef, data: Doc) => ref.update(data),
    })
  },
}

vi.mock("@/lib/firebase/admin-sdk", () => ({
  getAdminDb: () => fakeDb,
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue,
}))

// ─── Import del servicio bajo prueba (después de los mocks) ────────────────────
import type { PendingImportOperation, ExtractedDocumentData } from "@/types/assistant-states"
import { prepareBalanceImport, validateImportOperation, executeConfirmedImport, cancelImportOperation } from "@/lib/services/import-operations"
import { savePreparedImportOperation, markImportOperationConfirmed, markImportOperationExecuted } from "@/lib/services/assistant-pending-imports"

describe("Assistant Workflow", () => {
  beforeEach(() => {
    store.collections.clear()
    auditCalls.length = 0
  })

  it("should prepare import without writing final business data", async () => {
    const extractedData: ExtractedDocumentData = {
      documentId: "doc-123",
      documentType: "balance_sheet",
      fileName: "balance.pdf",
      confidence: 0.95,
      fields: [
        {
          fieldCode: "activoCorriente",
          fieldLabel: "Activo Corriente",
          normalizedValue: 100000,
          confidence: 0.9,
          extractionMethod: "TABLE_EXTRACTION",
          reviewStatus: "CONFIRMED",
        },
      ],
      company: {
        name: "Test Company SRL",
        cuit: "30000000001",
      },
    }

    const pendingOp = await prepareBalanceImport(fakeDb as any, "doc-123", extractedData, "org-root", "org-company-123")

    expect(pendingOp.status).toBe("prepared")
    expect(pendingOp.operationId).toBeTruthy()
    expect(pendingOp.actions.length).toBeGreaterThan(0)

    const balanceSheets = store.col("balance_sheets")
    expect(balanceSheets.size).toBe(0)
  })

  it("should fail execute if not confirmed", async () => {
    const pendingOp: PendingImportOperation = {
      operationId: "op-123",
      folderOwnerOrganizationId: "org-root",
      documentId: "doc-123",
      actions: [
        {
          actionId: "act-1",
          type: "load_balance",
          targetEntityName: "Test Company",
          payload: {},
          requiresApproval: false,
        },
      ],
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      preparedByUid: "user-1",
      preparedByOrganizationId: "org-root",
      status: "prepared",
    }

    const result = await executeConfirmedImport(fakeDb as any, "op-123", pendingOp, "user-1", "org-root")

    expect(result.success).toBe(false)
    expect(result.errors?.some((e) => e.includes("confirmada") || e.includes("confirmed"))).toBe(true)
  })

  it("should execute only after explicit confirmation", async () => {
    const pendingOp: PendingImportOperation = {
      operationId: "op-123",
      folderOwnerOrganizationId: "org-root",
      documentId: "doc-123",
      actions: [
        {
          actionId: "act-1",
          type: "load_balance",
          targetEntityName: "Test Company",
          targetEntityId: "org-company-123",
          targetEntityType: "related_company",
          payload: { fields: [{ fieldCode: "activoCorriente", value: 100000 }] },
          requiresApproval: false,
        },
      ],
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      preparedByUid: "user-1",
      preparedByOrganizationId: "org-root",
      confirmedAt: new Date().toISOString(),
      confirmedByUid: "user-1",
      status: "confirmed",
    }

    const doc = fakeDb.collection("assistant_pending_imports").doc(pendingOp.operationId)
    await doc.set(pendingOp as any)

    const result = await executeConfirmedImport(fakeDb as any, "op-123", pendingOp, "user-1", "org-root")

    expect(result.success).toBe(true)

    // Audit logs are written directly to Firestore, not via writeAuditLog mock
    const auditLogs = Array.from(store.col("audit_logs").values())
    const assistantExecutedLogs = auditLogs.filter((c) => c.action === "assistant.import_executed")
    expect(assistantExecutedLogs.length).toBeGreaterThan(0)
  })

  it("should cancel import in prepared or confirmed state", async () => {
    const pendingOp: PendingImportOperation = {
      operationId: "op-123",
      folderOwnerOrganizationId: "org-root",
      documentId: "doc-123",
      actions: [],
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      preparedByUid: "user-1",
      preparedByOrganizationId: "org-root",
      status: "prepared",
    }

    // Guardar en store
    const doc = fakeDb.collection("assistant_pending_imports").doc(pendingOp.operationId)
    await doc.set(pendingOp as any)

    await cancelImportOperation(fakeDb as any, "op-123", "User canceled", "user-1")

    const canceled = await doc.get()
    expect((canceled.data() as any).status).toBe("canceled")
    expect((canceled.data() as any).canceledAt).toBeTruthy()
  })

  it("should not cancel if already executed", async () => {
    const pendingOp: PendingImportOperation = {
      operationId: "op-123",
      folderOwnerOrganizationId: "org-root",
      documentId: "doc-123",
      actions: [],
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      preparedByUid: "user-1",
      preparedByOrganizationId: "org-root",
      executedAt: new Date().toISOString(),
      status: "executed",
    }

    const doc = fakeDb.collection("assistant_pending_imports").doc(pendingOp.operationId)
    await doc.set(pendingOp as any)

    try {
      await cancelImportOperation(fakeDb as any, "op-123", "User canceled", "user-1")
      expect.fail("Should have thrown error")
    } catch (error) {
      expect((error as Error).message).toContain("executed")
    }
  })

  it("should audit each state transition", async () => {
    const pendingOp: PendingImportOperation = {
      operationId: "op-123",
      folderOwnerOrganizationId: "org-root",
      documentId: "doc-123",
      actions: [],
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      preparedByUid: "user-1",
      preparedByOrganizationId: "org-root",
      status: "prepared",
    }

    const doc = fakeDb.collection("assistant_pending_imports").doc(pendingOp.operationId)
    await doc.set(pendingOp as any)

    await markImportOperationConfirmed(fakeDb as any, "op-123", "user-1")

    // Audit logs are written directly to Firestore, not via writeAuditLog mock
    const auditLogs = Array.from(store.col("audit_logs").values())
    const confirmedLogs = auditLogs.filter((c) => c.action === "assistant.import_confirmed")
    expect(confirmedLogs.length).toBe(1)
    expect(confirmedLogs[0].targetId).toBe("op-123")
  })
})
