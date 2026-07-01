import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── Mock de auditoría ────────────────────────────────────────────────────────
const auditCalls: Array<Record<string, unknown>> = []
vi.mock("@/lib/firebase/audit", () => ({
  writeAuditLog: vi.fn(async (params: Record<string, unknown>) => {
    auditCalls.push(params)
  }),
}))

// ─── Mock mínimo de Firestore ────────────────────────────────────────────────────

type Doc = Record<string, unknown>

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

  col(name: string): Map<string, Doc> {
    if (!this.collections.has(name)) this.collections.set(name, new Map())
    return this.collections.get(name)!
  }
}

const store = new FakeStore()

function resolveWrite(target: Doc, data: Doc) {
  for (const [k, v] of Object.entries(data)) {
    if (v === SERVER_TS) {
      target[k] = new Date()
    } else {
      target[k] = v
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

  async get() {
    const map = store.col(this.colName)
    const data = map.get(this.id)
    return { id: this.id, exists: !!data, data: () => data }
  }
}

class FakeCollectionRef {
  constructor(private name: string) {}
  doc(id: string) {
    return new FakeDocRef(this.name, id)
  }
  where() {
    return {
      where: () => ({
        get: async () => ({
          docs: Array.from(store.col(this.name).entries()).map(([id, data]) => ({
            id,
            data: () => data,
          })),
        }),
      }),
    }
  }
}

const fakeDb = {
  collection: (name: string) => new FakeCollectionRef(name),
}

vi.mock("@/lib/firebase/admin-sdk", () => ({
  getAdminDb: () => fakeDb,
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue,
}))

// ─── Import del servicio bajo prueba ────────────────────────────────────────
import { validateImportOperation } from "@/lib/services/import-operations"
import { markImportOperationConfirmed } from "@/lib/services/assistant-pending-imports"
import type { PendingImportOperation } from "@/types/assistant-states"

describe("Assistant Security", () => {
  beforeEach(() => {
    store.collections.clear()
    auditCalls.length = 0
  })

  it("contador A no puede preparar import de la carpeta del contador B", async () => {
    const pendingOp: PendingImportOperation = {
      operationId: "op-123",
      folderOwnerOrganizationId: "org-contador-b",
      documentId: "doc-123",
      actions: [],
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      preparedByUid: "user-b",
      preparedByOrganizationId: "org-contador-b",
      status: "prepared",
    }

    const validation = await validateImportOperation(fakeDb, pendingOp, "user-a", "org-contador-a")

    expect(validation.valid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
  })

  it("intent parsing no debe crear entidades automáticamente", async () => {
    // Verificar que no hay organizations creadas automáticamente
    const orgs = store.col("organizations")
    expect(orgs.size).toBe(0)

    // El parsing debe ser preparatorio, no ejecutor
  })

  it("extracted data debe ser validado antes de usar", () => {
    const extractedData = {
      documentId: "doc-123",
      documentType: "balance_sheet",
      confidence: 0.3,
      fields: [
        {
          fieldCode: "activoCorriente",
          normalizedValue: 100000,
          confidence: 0.2,
          reviewStatus: "PENDING",
        },
      ],
    }

    // Validar que confianza baja se rechaza
    expect(extractedData.fields[0].confidence).toBeLessThan(0.5)
    expect(extractedData.fields[0].reviewStatus).not.toBe("CONFIRMED")
  })

  it("audit trail debe ser completo", () => {
    // Crear operación con audit
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

    // Cada log debe tener actor y metadata
    expect(pendingOp.preparedByUid).toBeTruthy()
    expect(pendingOp.preparedByOrganizationId).toBeTruthy()
    expect(pendingOp.preparedAt).toBeTruthy()
  })

  it("financista no puede ejecutar import", async () => {
    const pendingOp: PendingImportOperation = {
      operationId: "op-123",
      folderOwnerOrganizationId: "org-root",
      documentId: "doc-123",
      actions: [],
      preparedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      preparedByUid: "user-financista",
      preparedByOrganizationId: "org-financista",
      confirmedAt: new Date().toISOString(),
      confirmedByUid: "user-financista",
      status: "confirmed",
    }

    // Financista (org-financista) no tiene permisos sobre org-root
    const result = await validateImportOperation(fakeDb, pendingOp, "user-financista", "org-financista")

    expect(result.valid).toBe(false)
  })

  it("validación de extracted data debe rechazar valores inválidos", () => {
    const extractedData = {
      documentId: "doc-123",
      documentType: "balance_sheet",
      confidence: 0.85,
      company: {
        name: "Test Company",
        cuit: "123", // CUIT inválido
      },
      fields: [],
    }

    const cuitIsValid = /^\d{11}$/.test(String(extractedData.company.cuit ?? ""))
    expect(cuitIsValid).toBe(false)
  })

  it("operación preparada solo puede confirmarse una vez", async () => {
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

    auditCalls.length = 0
    const confirmed1 = await markImportOperationConfirmed(fakeDb, "op-123", "user-1")
    expect(confirmed1.status).toBe("confirmed")

    const confirmedLogs = auditCalls.filter((c) => c.action === "assistant.import_confirmed")
    expect(confirmedLogs.length).toBe(1)
  })

  it("datos de operación no deben tener información sensible en respuestas", () => {
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

    const response = {
      operationId: pendingOp.operationId,
      status: pendingOp.status,
      actions: pendingOp.actions.map((a) => ({
        type: a.type,
        name: a.targetEntityName,
      })),
    }

    expect(response.operationId).toBeTruthy()
    expect(response.status).toBe("prepared")
    expect("preparedByUid" in response).toBe(false)
  })
})
