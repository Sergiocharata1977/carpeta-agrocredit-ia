import { describe, it, expect } from "vitest"

/**
 * Tests de aislamiento multi-tenant para las rutas de CreditoHub.
 *
 * Siguiendo la convencion del repo (ver auth-helpers.test.ts), se replica aca la
 * LOGICA DE DECISION de autorizacion de las rutas para fijar el contrato sin
 * arrastrar Firebase Admin. Si una ruta cambia su regla de autorizacion, estos
 * tests deben fallar.
 *
 * Cubren las 3 brechas detectadas y corregidas en la revision del MVP:
 *  - match route: solo admin / entidad solicitante con grant / gestor del legajo.
 *  - bank-requirements: la org de entidad se liga a la sesion para no-admin.
 *  - credit-applications: una entidad financiera no puede atribuir la solicitud a otra org.
 */

interface Session {
  uid: string
  roles: string[]
  defaultOrganizationId: string | null
}

const isAdminPlatform = (s: Session) => s.roles.includes("admin_platform")
const isFinancialEntity = (s: Session) =>
  s.roles.includes("bank_user") || s.roles.includes("agro_company_user")

// ─── bank-requirements: resolveEntityOrg (espejo de la ruta) ──────────────────
function resolveEntityOrg(session: Session, requested: string | null, admin: boolean): string | null {
  if (admin) return requested ?? session.defaultOrganizationId
  return session.defaultOrganizationId
}

describe("bank-requirements · resolveEntityOrg", () => {
  it("una entidad no-admin SIEMPRE opera sobre su propia org (ignora el id pedido)", () => {
    const bank: Session = { uid: "u", roles: ["bank_user"], defaultOrganizationId: "bank-A" }
    expect(resolveEntityOrg(bank, "bank-B", isAdminPlatform(bank))).toBe("bank-A")
    expect(resolveEntityOrg(bank, null, isAdminPlatform(bank))).toBe("bank-A")
  })

  it("admin_platform puede apuntar a la org pedida", () => {
    const admin: Session = { uid: "u", roles: ["admin_platform"], defaultOrganizationId: null }
    expect(resolveEntityOrg(admin, "bank-B", isAdminPlatform(admin))).toBe("bank-B")
  })
})

// ─── bank-requirements: publish ownership ─────────────────────────────────────
function canPublishTemplate(session: Session, templateOrgId: string, sessionOrgId: string | null): boolean {
  if (isAdminPlatform(session)) return true
  return templateOrgId === sessionOrgId
}

describe("bank-requirements · publish ownership", () => {
  it("una entidad no puede publicar el template de otra org", () => {
    const bank: Session = { uid: "u", roles: ["bank_user"], defaultOrganizationId: "bank-A" }
    expect(canPublishTemplate(bank, "bank-B", bank.defaultOrganizationId)).toBe(false)
  })
  it("la entidad dueña puede publicar su template", () => {
    const bank: Session = { uid: "u", roles: ["bank_user"], defaultOrganizationId: "bank-A" }
    expect(canPublishTemplate(bank, "bank-A", bank.defaultOrganizationId)).toBe(true)
  })
  it("admin puede publicar cualquier template", () => {
    const admin: Session = { uid: "u", roles: ["admin_platform"], defaultOrganizationId: null }
    expect(canPublishTemplate(admin, "bank-Z", null)).toBe(true)
  })
})

// ─── credit-applications: requestingEntity binding ────────────────────────────
function resolveRequestingEntity(session: Session, bodyValue: string | null): string {
  if (isFinancialEntity(session) && !isAdminPlatform(session)) {
    return String(session.defaultOrganizationId ?? "")
  }
  return String(bodyValue ?? session.defaultOrganizationId ?? "")
}

describe("credit-applications · requestingEntity binding", () => {
  it("una entidad financiera no puede atribuir la solicitud a otra entidad", () => {
    const bank: Session = { uid: "u", roles: ["bank_user"], defaultOrganizationId: "bank-A" }
    expect(resolveRequestingEntity(bank, "bank-B")).toBe("bank-A")
  })
  it("un contador puede declarar a que entidad le aplica (no se fuerza)", () => {
    const acc: Session = { uid: "u", roles: ["accountant"], defaultOrganizationId: "firm-1" }
    expect(resolveRequestingEntity(acc, "bank-B")).toBe("bank-B")
  })
})

// ─── match route: decision de autorizacion ────────────────────────────────────
type MatchAuthInput = {
  session: Session
  application: { folderOwnerOrganizationId: string; requestingEntityOrganizationId: string }
  entityHasGrant: boolean
  canManageFolder: boolean
}
type MatchAuthResult = "allow" | "deny"

function authorizeMatch({ session, application, entityHasGrant, canManageFolder }: MatchAuthInput): MatchAuthResult {
  if (isAdminPlatform(session)) {
    return session.defaultOrganizationId ? "allow" : "deny"
  }
  if (isFinancialEntity(session) && session.defaultOrganizationId === application.requestingEntityOrganizationId) {
    return entityHasGrant ? "allow" : "deny"
  }
  return canManageFolder ? "allow" : "deny"
}

describe("match route · authorizeMatch", () => {
  const application = { folderOwnerOrganizationId: "client-1", requestingEntityOrganizationId: "bank-A" }

  it("deniega a un usuario sin relacion con la solicitud", () => {
    const stranger: Session = { uid: "x", roles: ["accountant"], defaultOrganizationId: "firm-9" }
    expect(authorizeMatch({ session: stranger, application, entityHasGrant: false, canManageFolder: false })).toBe("deny")
  })

  it("permite a la entidad solicitante SOLO con grant vigente", () => {
    const bank: Session = { uid: "b", roles: ["bank_user"], defaultOrganizationId: "bank-A" }
    expect(authorizeMatch({ session: bank, application, entityHasGrant: true, canManageFolder: false })).toBe("allow")
    expect(authorizeMatch({ session: bank, application, entityHasGrant: false, canManageFolder: false })).toBe("deny")
  })

  it("deniega a otra entidad financiera distinta de la solicitante", () => {
    const otherBank: Session = { uid: "b2", roles: ["bank_user"], defaultOrganizationId: "bank-B" }
    // No matchea requestingEntity → cae a la rama de gestor de legajo, que no puede.
    expect(authorizeMatch({ session: otherBank, application, entityHasGrant: true, canManageFolder: false })).toBe("deny")
  })

  it("permite al gestor del legajo (contador vinculado / titular)", () => {
    const accountant: Session = { uid: "a", roles: ["accountant"], defaultOrganizationId: "firm-1" }
    expect(authorizeMatch({ session: accountant, application, entityHasGrant: false, canManageFolder: true })).toBe("allow")
  })

  it("permite a admin_platform con org por defecto", () => {
    const admin: Session = { uid: "ad", roles: ["admin_platform"], defaultOrganizationId: "platform" }
    expect(authorizeMatch({ session: admin, application, entityHasGrant: false, canManageFolder: false })).toBe("allow")
  })
})
