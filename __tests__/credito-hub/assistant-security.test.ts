import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock de auditoría ────────────────────────────────────────────────────────
const auditCalls: Array<Record<string, unknown>> = []
vi.mock("@/lib/firebase/audit", () => ({
  writeAuditLog: vi.fn(async (params: Record<string, unknown>) => {
    auditCalls.push(params)
  }),
}))

// ─── Mock de Firestore Admin SDK en memoria (reutilizado de workflow) ──────────

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
      if (c.op === ">") return String(val) > String(c.value)
      if (c.op === "<") return String(val) < String(c.value)
      return false
    })
  }

  async get() {
    const map = store.col(this.colName)
    const results = Array.from(map.entries())
      .filter(([, d]) => this.matches(d))
      .slice(0, this.limitN ?? Infinity)
    return {
      empty: results.length === 0,
      docs: results.map(([id, data]) => ({
        id,
        data: () => data,
        ref: { id, path: `${this.colName}/${id}`, delete: async () => { store.col(this.colName).delete(id) } },
      })),
    }
  }
}

const fakeDb = {
  collection: (name: string) => ({
    doc: (id?: string) => {
      const docId = id ?? store.nextId()
      return {
        id: docId,
        get: async () => {
          return {
            id: docId,
            exists: store.col(name).has(docId),
            data: () => store.col(name).get(docId),
          }
        },
        set: async (data: Doc, opts?: { merge?: boolean }) => {
          const old = store.col(name).get(docId)
          if (opts?.merge && old) {
            resolveWrite(old, data)
          } else {
            const newDoc: Doc = {}
            resolveWrite(newDoc, data)
            store.col(name).set(docId, newDoc)
          }
        },
        update: async (data: Doc) => {
          const old = store.col(name).get(docId)
          if (!old) throw new Error("update on missing doc")
          resolveWrite(old, data)
        },
        delete: async () => {
          store.col(name).delete(docId)
        },
      }
    },
    add: async (data: Doc) => {
      const id = store.nextId()
      const newDoc: Doc = {}
      resolveWrite(newDoc, data)
      store.col(name).set(id, newDoc)
      return { id }
    },
    where: (field: string, op: "==" | "in" | "<" | ">", value: unknown) =>
      new FakeQuery(name, [{ field, op, value }]),
  }),
}

const require: any = (id: string) => {
  if (id === "@/lib/firebase/admin-sdk") return { getAdminDb: () => fakeDb }
  throw new Error(`Unexpected require: ${id}`)
}

vi.mock("@/lib/firebase/admin-sdk", () => ({
  getAdminDb: () => fakeDb,
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue,
}))

// ─── Imports bajo prueba ──────────────────────────────────────────────────────

import {
  validateImportOperation,
  cancelImportOperation,
  executeConfirmedImport,
} from "@/lib/services/import-operations"
import {
  savePreparedImportOperation,
  markImportOperationConfirmed,
  markImportOperationExecuted,
  markImportOperationCanceled,
  cleanupExpiredOperations,
} from "@/lib/services/assistant-pending-imports"
import { prepareImportFromIntent } from "@/lib/services/import-preparation"
import { generateFieldPreview, getKeyFieldsPreview } from "@/lib/services/field-preview"
import type { PendingImportOperation, ExtractedDocumentData } from "@/types/import-pending"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makePendingOp(overrides: Partial<PendingImportOperation> = {}): PendingImportOperation {
  return {
    operationId: "op-sec-1",
    folderOwnerOrganizationId: "org-root",
    documentId: "doc-sec-1",
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
    ...overrides,
  }
}

function makeExtractedData(overrides: Partial<ExtractedDocumentData> = {}): ExtractedDocumentData {
  return {
    documentId: "doc-sec-1",
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
      {
        fieldCode: "pasivoCorriente",
        fieldLabel: "Pasivo Corriente",
        normalizedValue: 50000,
        confidence: 0.85,
        extractionMethod: "TABLE_EXTRACTION",
        reviewStatus: "CONFIRMED",
      },
    ],
    company: {
      name: "Test Company SRL",
      cuit: "30-12345678-9",
    },
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Cross-org isolation", () => {
  beforeEach(() => {
    store.collections.clear()
    auditCalls.length = 0
  })

  it("contador A no puede operar sobre carpeta del contador B (sin link)", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ folderOwnerOrganizationId: "org-contador-b" })

    // user-a es miembro de org-contador-a
    store.col("organization_members").set("mem-a", {
      uid: "user-a",
      organizationId: "org-contador-a",
      status: "active",
    })

    const result = await validateImportOperation(db, op, "user-a", "org-contador-a")

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("acceso al legajo"))).toBe(true)
  })

  it("usuario no miembro es rechazado incluso en la misma org", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ folderOwnerOrganizationId: "org-root" })

    // No hay registros en organization_members

    const result = await validateImportOperation(db, op, "user-stranger", "org-root")

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("miembro activo"))).toBe(true)
  })

  it("miembro inactivo es rechazado", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp()

    store.col("organization_members").set("mem-inactive", {
      uid: "user-1",
      organizationId: "org-root",
      status: "suspended",
    })

    const result = await validateImportOperation(db, op, "user-1", "org-root")

    expect(result.valid).toBe(false)
  })

  it("contador vinculado puede operar sobre carpeta del productor", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ folderOwnerOrganizationId: "org-producer" })

    store.col("organization_members").set("mem-acc", {
      uid: "user-acc",
      organizationId: "org-accountant",
      status: "active",
    })

    store.col("producer_accountant_links").set("link-1", {
      producerId: "org-producer",
      accountantId: "org-accountant",
      status: "active",
    })

    const result = await validateImportOperation(db, op, "user-acc", "org-accountant")

    expect(result.valid).toBe(true)
  })

  it("operación expirada es rechazada", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    })

    store.col("organization_members").set("mem-1", {
      uid: "user-1",
      organizationId: "org-root",
      status: "active",
    })

    const result = await validateImportOperation(db, op, "user-1", "org-root")

    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes("expirada"))).toBe(true)
  })
})

describe("State machine enforcement", () => {
  beforeEach(() => {
    store.collections.clear()
    auditCalls.length = 0
  })

  it("no se puede confirmar operación ya ejecutada", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ status: "executed" })
    store.col("assistant_pending_imports").set("op-sec-1", op as any)

    await expect(
      markImportOperationConfirmed(db, "op-sec-1", "user-1")
    ).rejects.toThrow("No se puede confirmar")
  })

  it("no se puede ejecutar operación solo preparada (sin confirmar)", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ status: "prepared" })
    store.col("assistant_pending_imports").set("op-sec-1", op as any)

    await expect(
      markImportOperationExecuted(db, "op-sec-1")
    ).rejects.toThrow("No se puede ejecutar")
  })

  it("no se puede cancelar operación ya cancelada", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ status: "canceled" })
    store.col("assistant_pending_imports").set("op-sec-1", op as any)

    await expect(
      markImportOperationCanceled(db, "op-sec-1", "user-1", "test")
    ).rejects.toThrow("No se puede cancelar")
  })

  it("no se puede cancelar operación ya ejecutada", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ status: "executed" })
    store.col("assistant_pending_imports").set("op-sec-1", op as any)

    await expect(
      cancelImportOperation(db, "op-sec-1", "test reason", "user-1")
    ).rejects.toThrow("executed")
  })

  it("cancelar operación inexistente lanza error", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()

    await expect(
      cancelImportOperation(db, "nonexistent-op", "test", "user-1")
    ).rejects.toThrow("no encontrada")
  })

  it("executeConfirmedImport rechaza operación no confirmada", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ status: "prepared" })
    store.col("assistant_pending_imports").set("op-sec-1", op as any)

    const result = await executeConfirmedImport(db, "op-sec-1", op, "user-1", "org-root")

    expect(result.success).toBe(false)
    expect(result.errors?.some((e) => e.includes("confirmada") || e.includes("confirmed"))).toBe(true)
  })

  it("operación preparada se puede confirmar una sola vez", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp()
    store.col("assistant_pending_imports").set("op-sec-1", op as any)

    // Primera confirmación: OK
    const confirmed = await markImportOperationConfirmed(db, "op-sec-1", "user-1")
    expect(confirmed.status).toBe("confirmed")

    // Segunda confirmación: debe fallar (ahora está en status=confirmed, no prepared)
    await expect(
      markImportOperationConfirmed(db, "op-sec-1", "user-1")
    ).rejects.toThrow("No se puede confirmar")
  })
})

describe("TTL and persistence validation", () => {
  beforeEach(() => {
    store.collections.clear()
    auditCalls.length = 0
  })

  it("TTL > 24h es rechazado", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const now = new Date()
    const op = makePendingOp({
      preparedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
    })

    await expect(savePreparedImportOperation(db, op)).rejects.toThrow("24 horas")
  })

  it("operationId vacío es rechazado", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ operationId: "" })

    await expect(savePreparedImportOperation(db, op)).rejects.toThrow("operationId")
  })

  it("documentId vacío es rechazado", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp({ documentId: "" })

    await expect(savePreparedImportOperation(db, op)).rejects.toThrow("documentId")
  })

  it("guardado exitoso genera audit log", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const op = makePendingOp()

    await savePreparedImportOperation(db, op)

    const auditLogs = store.col("audit_logs")
    const entries = Array.from(auditLogs.values())
    const preparedLog = entries.find((e) => e.action === "assistant.import_prepared")
    expect(preparedLog).toBeTruthy()
    expect(preparedLog?.targetId).toBe("op-sec-1")
  })
})

describe("Import preparation actions", () => {
  beforeEach(() => {
    store.collections.clear()
    auditCalls.length = 0
  })

  it("genera create_related_company para entidad nueva con requiresApproval=true", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()
    const extracted = makeExtractedData()

    const op = await prepareImportFromIntent(
      { intent: "create_related_company", action: "prepare" },
      extracted,
      {
        relatedCompany: {
          type: "related_company",
          name: "Nueva Empresa",
          taxId: "30-99999999-9",
          status: "new_to_create",
        },
      },
      "doc-sec-1",
      "org-root",
      db,
    )

    const createAction = op.actions.find((a) => a.type === "create_related_company")
    expect(createAction).toBeTruthy()
    expect(createAction?.requiresApproval).toBe(true)
    expect(op.status).toBe("prepared")
  })

  it("genera associate_related_company para entidad existente", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()

    const op = await prepareImportFromIntent(
      { intent: "attach_to_related_company", action: "prepare" },
      makeExtractedData(),
      {
        relatedCompany: {
          type: "related_company",
          id: "company-123",
          name: "Existing Co",
          status: "found_exact",
        },
      },
      "doc-sec-1",
      "org-root",
      db,
    )

    const assocAction = op.actions.find((a) => a.type === "associate_related_company")
    expect(assocAction).toBeTruthy()
    expect(assocAction?.targetEntityId).toBe("company-123")
  })

  it("siempre incluye link_document", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()

    const op = await prepareImportFromIntent(
      { intent: "review_extraction", action: "show" },
      makeExtractedData({ fields: [] }),
      {},
      "doc-sec-1",
      "org-root",
      db,
    )

    expect(op.actions.find((a) => a.type === "link_document")).toBeTruthy()
  })

  it("genera update_canonical_profile cuando hay CUIT", async () => {
    const db = require("@/lib/firebase/admin-sdk").getAdminDb()

    const op = await prepareImportFromIntent(
      { intent: "attach_to_related_company", action: "prepare" },
      makeExtractedData({ company: { name: "CUIT Co", cuit: "20-12345678-9" } }),
      {},
      "doc-sec-1",
      "org-root",
      db,
    )

    const canonical = op.actions.find((a) => a.type === "update_canonical_profile")
    expect(canonical).toBeTruthy()
    expect((canonical?.payload as any).cuit).toBe("20-12345678-9")
  })
})

describe("Field preview", () => {
  it("ordena campos confirmed antes que detected", async () => {
    const preview = await generateFieldPreview(
      makeExtractedData({
        fields: [
          { fieldCode: "lowConf", confidence: 0.3, reviewStatus: "PENDING" },
          { fieldCode: "confirmed", confidence: 0.9, reviewStatus: "CONFIRMED" },
          { fieldCode: "detected", confidence: 0.8, reviewStatus: "PENDING" },
        ],
      }),
    )

    expect(preview[0].fieldName).toBe("confirmed")
    expect(preview[0].status).toBe("confirmed")
  })

  it("muestra empresa y período cuando no hay campos", async () => {
    const preview = await generateFieldPreview(
      makeExtractedData({
        fields: [],
        company: { name: "Fallback SRL", cuit: "30-00000000-0" },
        period: { start: "2025-01", end: "2025-12" },
      }),
    )

    expect(preview.length).toBeGreaterThan(0)
    expect(preview.some((f) => f.fieldName === "companyName")).toBe(true)
    expect(preview.some((f) => f.fieldName === "periodStart")).toBe(true)
  })

  it("getKeyFieldsPreview limita resultado y filtra calidad", () => {
    const allFields = Array.from({ length: 20 }, (_, i) => ({
      fieldName: `field-${i}`,
      fieldLabel: `Field ${i}`,
      detectedValue: i * 1000,
      confidence: i < 5 ? 0.3 : 0.9,
      source: "table" as const,
      status: i < 3 ? ("confirmed" as const) : ("detected" as const),
    }))

    const key = getKeyFieldsPreview(allFields, 5)

    expect(key.length).toBeLessThanOrEqual(5)
    key.forEach((f) => {
      expect(
        f.status === "confirmed" || (f.status === "detected" && f.confidence > 0.7)
      ).toBe(true)
    })
  })
})
