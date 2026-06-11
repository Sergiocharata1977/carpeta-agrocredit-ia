import { describe, it, expect } from "vitest"

// ─── Inline types so tests don't require Firebase imports ─────────────────────
interface ServerSession {
  uid: string
  email: string | null
  roles: string[]
  defaultOrganizationId: string | null
  orgStatus: string | null
}

// ─── Pure logic extracted from server-session.ts for testability ─────────────

function requireAnyRole(session: ServerSession, allowedRoles: string[]): void {
  if (!allowedRoles.some((role) => session.roles.includes(role))) {
    throw new Error("No tenes permisos para esta accion")
  }
}

function isAdminPlatform(session: ServerSession): boolean {
  return session.roles.includes("admin_platform")
}

function isProducerRole(session: ServerSession): boolean {
  return session.roles.includes("producer")
}

function isAccountantRole(session: ServerSession): boolean {
  return session.roles.includes("accountant") || session.roles.includes("accounting_firm_admin")
}

function requireDefaultOrganization(session: ServerSession): string {
  if (!session.defaultOrganizationId) throw new Error("La sesion no tiene organizacion por defecto")
  return session.defaultOrganizationId
}

// ─── Grant expiry logic ───────────────────────────────────────────────────────

function isGrantActive(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt) > now
}

function calcGrantExpiry(approvedDays: number, startsAt: Date = new Date()): Date {
  return new Date(startsAt.getTime() + approvedDays * 24 * 60 * 60 * 1000)
}

function grantHasScope(allowedScopes: string[], requiredScope: string): boolean {
  return allowedScopes.includes("full_credit_folder") || allowedScopes.includes(requiredScope)
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("requireAnyRole", () => {
  const adminSession: ServerSession = {
    uid: "u1", email: "admin@test.com", roles: ["admin_platform"],
    defaultOrganizationId: null, orgStatus: null,
  }
  const producerSession: ServerSession = {
    uid: "u2", email: "prod@test.com", roles: ["producer"],
    defaultOrganizationId: "org1", orgStatus: "active",
  }

  it("passes when session has one of the required roles", () => {
    expect(() => requireAnyRole(adminSession, ["admin_platform"])).not.toThrow()
    expect(() => requireAnyRole(producerSession, ["producer", "accountant"])).not.toThrow()
  })

  it("throws when session has none of the required roles", () => {
    expect(() => requireAnyRole(producerSession, ["admin_platform", "bank_user"])).toThrow()
  })

  it("an empty roles array always throws", () => {
    const noRoles: ServerSession = { ...producerSession, roles: [] }
    expect(() => requireAnyRole(noRoles, ["producer"])).toThrow()
  })
})

describe("role helpers", () => {
  it("isAdminPlatform returns true only for admin_platform", () => {
    expect(isAdminPlatform({ uid: "", email: null, roles: ["admin_platform"], defaultOrganizationId: null, orgStatus: null })).toBe(true)
    expect(isAdminPlatform({ uid: "", email: null, roles: ["producer"], defaultOrganizationId: null, orgStatus: null })).toBe(false)
  })

  it("isProducerRole returns true for producer role", () => {
    expect(isProducerRole({ uid: "", email: null, roles: ["producer"], defaultOrganizationId: null, orgStatus: null })).toBe(true)
  })

  it("isAccountantRole returns true for accountant and accounting_firm_admin", () => {
    expect(isAccountantRole({ uid: "", email: null, roles: ["accountant"], defaultOrganizationId: null, orgStatus: null })).toBe(true)
    expect(isAccountantRole({ uid: "", email: null, roles: ["accounting_firm_admin"], defaultOrganizationId: null, orgStatus: null })).toBe(true)
    expect(isAccountantRole({ uid: "", email: null, roles: ["producer"], defaultOrganizationId: null, orgStatus: null })).toBe(false)
  })
})

describe("requireDefaultOrganization", () => {
  it("returns the org id when present", () => {
    const session: ServerSession = { uid: "", email: null, roles: [], defaultOrganizationId: "org-123", orgStatus: null }
    expect(requireDefaultOrganization(session)).toBe("org-123")
  })

  it("throws when defaultOrganizationId is null", () => {
    const session: ServerSession = { uid: "", email: null, roles: [], defaultOrganizationId: null, orgStatus: null }
    expect(() => requireDefaultOrganization(session)).toThrow()
  })
})

describe("grant expiry logic", () => {
  const PAST = "2020-01-01T00:00:00.000Z"
  const FUTURE = "2099-01-01T00:00:00.000Z"
  const NOW = new Date("2025-06-11T00:00:00.000Z")

  it("expired grant is not active", () => {
    expect(isGrantActive(PAST, NOW)).toBe(false)
  })

  it("future grant is active", () => {
    expect(isGrantActive(FUTURE, NOW)).toBe(true)
  })

  it("calcGrantExpiry returns correct date for 30 days", () => {
    const start = new Date("2025-06-11T00:00:00.000Z")
    const expiry = calcGrantExpiry(30, start)
    expect(expiry.toISOString()).toBe("2025-07-11T00:00:00.000Z")
  })

  it("calcGrantExpiry returns correct date for 1 day", () => {
    const start = new Date("2025-06-11T12:00:00.000Z")
    const expiry = calcGrantExpiry(1, start)
    expect(expiry.toISOString()).toBe("2025-06-12T12:00:00.000Z")
  })

  it("a grant with 0 days is immediately expired", () => {
    const start = new Date("2025-06-11T00:00:00.000Z")
    const expiry = calcGrantExpiry(0, start)
    expect(isGrantActive(expiry.toISOString(), start)).toBe(false)
  })
})

describe("grantHasScope", () => {
  it("full_credit_folder grants access to any scope", () => {
    expect(grantHasScope(["full_credit_folder"], "balance_sheets")).toBe(true)
    expect(grantHasScope(["full_credit_folder"], "documents")).toBe(true)
  })

  it("specific scope grants only that scope", () => {
    expect(grantHasScope(["balance_sheets", "income_statements"], "balance_sheets")).toBe(true)
    expect(grantHasScope(["balance_sheets"], "documents")).toBe(false)
  })

  it("empty scopes denies everything", () => {
    expect(grantHasScope([], "accounting_summary")).toBe(false)
  })
})

describe("onboarding endpoints — organizationId must come from auth, not body", () => {
  it("schema does NOT include organizationId as an accepted field", async () => {
    // Import lazily so Firebase Admin SDK is not initialised in test env
    const { registrationSchema } = await import("@/lib/schemas/onboarding")
    const validData = {
      email: "test@example.com",
      password: "password123",
      displayName: "Test User",
      role: "system_user" as const,
    }
    // Valid data should parse
    expect(() => registrationSchema.parse(validData)).not.toThrow()

    // organizationId in body must be silently stripped (Zod .strip() default)
    const withOrgId = { ...validData, organizationId: "injected-org" }
    const parsed = registrationSchema.parse(withOrgId)
    expect((parsed as Record<string, unknown>).organizationId).toBeUndefined()
  })
})
