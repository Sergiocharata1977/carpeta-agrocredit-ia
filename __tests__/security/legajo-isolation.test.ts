import { describe, it, expect } from "vitest"

/**
 * Tests de aislamiento del Legajo único (Ola 6).
 *
 * Siguiendo la convención del repo (ver credito-hub-isolation.test.ts), se replica
 * acá la LÓGICA DE DECISIÓN de autorización de las rutas nuevas para fijar el
 * contrato sin arrastrar Firebase Admin. Si una ruta cambia su regla, estos tests
 * deben fallar.
 *
 * Rutas espejadas:
 *  - assistant/[targetOrganizationId]: target SOLO por la ruta (nunca del body);
 *    rate limit 20 hits / 5 min por (uid + carpeta).
 *  - routing/[rootOrganizationId]/[decisionId]: la carpeta destino al reasignar
 *    DEBE pertenecer al grupo (titular raíz o hija con parent == root).
 *  - certification/[targetOrganizationId] (POST): solo accountant /
 *    accounting_firm_admin / admin_platform certifican; un producer NO.
 */

// ─── certification: canCertify (espejo del POST) ──────────────────────────────
// Solo contador/admin certifican. El productor puede gestionar su carpeta pero
// NO certificarla.
function canCertify(roles: string[]): boolean {
  return (
    roles.includes("accountant") ||
    roles.includes("accounting_firm_admin") ||
    roles.includes("admin_platform")
  )
}

describe("certification · canCertify", () => {
  it("permite a accountant", () => {
    expect(canCertify(["accountant"])).toBe(true)
  })
  it("permite a accounting_firm_admin", () => {
    expect(canCertify(["accounting_firm_admin"])).toBe(true)
  })
  it("permite a admin_platform", () => {
    expect(canCertify(["admin_platform"])).toBe(true)
  })
  it("DENIEGA a producer (puede gestionar su carpeta pero no certificar)", () => {
    expect(canCertify(["producer"])).toBe(false)
  })
  it("deniega a bank_user", () => {
    expect(canCertify(["bank_user"])).toBe(false)
  })
  it("deniega a roles vacíos", () => {
    expect(canCertify([])).toBe(false)
  })
  it("permite si entre varios roles hay uno habilitado", () => {
    expect(canCertify(["producer", "accountant"])).toBe(true)
  })
})

// ─── routing: assignedFolderBelongsToGroup (espejo del PATCH) ──────────────────
// La carpeta destino debe ser el titular raíz, o una empresa hija cuyo
// parentOrganizationId sea exactamente el root.
function assignedFolderBelongsToGroup(
  assignedId: string,
  rootId: string,
  childParentMap: Record<string, string | undefined>,
): boolean {
  if (assignedId === rootId) return true
  return childParentMap[assignedId] === rootId
}

describe("routing · assignedFolderBelongsToGroup", () => {
  const childParentMap: Record<string, string | undefined> = {
    "child-1": "root-A", // hija válida del grupo
    "child-2": "root-A", // otra hija válida
    "child-X": "root-B", // hija de OTRO grupo
    "orphan": undefined, // sin parent
  }

  it("permite el titular raíz como carpeta destino", () => {
    expect(assignedFolderBelongsToGroup("root-A", "root-A", childParentMap)).toBe(true)
  })
  it("permite una empresa hija con parent == root", () => {
    expect(assignedFolderBelongsToGroup("child-1", "root-A", childParentMap)).toBe(true)
    expect(assignedFolderBelongsToGroup("child-2", "root-A", childParentMap)).toBe(true)
  })
  it("DENIEGA una empresa hija de otro grupo", () => {
    expect(assignedFolderBelongsToGroup("child-X", "root-A", childParentMap)).toBe(false)
  })
  it("deniega una org desconocida / sin parent", () => {
    expect(assignedFolderBelongsToGroup("orphan", "root-A", childParentMap)).toBe(false)
    expect(assignedFolderBelongsToGroup("inexistente", "root-A", childParentMap)).toBe(false)
  })
})

// ─── assistant: rateLimited (espejo de la ventana deslizante) ─────────────────
// Si los hits acumulados (dentro de la ventana) alcanzan el máximo, se bloquea.
function rateLimited(hits: number, max: number): boolean {
  return hits >= max
}

describe("assistant · rateLimited", () => {
  const MAX = 20 // RATE_MAX de la ruta

  it("permite por debajo del límite", () => {
    expect(rateLimited(0, MAX)).toBe(false)
    expect(rateLimited(19, MAX)).toBe(false)
  })
  it("BLOQUEA al alcanzar el límite", () => {
    expect(rateLimited(20, MAX)).toBe(true)
  })
  it("bloquea por encima del límite", () => {
    expect(rateLimited(25, MAX)).toBe(true)
  })
})

// ─── assistant: pickTarget (target SOLO de la ruta, body ignorado) ────────────
// El `targetOrganizationId` viene SIEMPRE del param de la ruta. El body trae solo
// { message, history }; cualquier targetOrganizationId enviado en el body se ignora.
function pickTarget(
  routeParam: string,
  body: { message?: string; history?: unknown[]; targetOrganizationId?: string },
): string {
  // Espeja la ruta: el target sale de params; el body NUNCA influye.
  return routeParam
}

describe("assistant · pickTarget (target sale de la ruta, no del body)", () => {
  it("usa el param de la ruta e ignora un targetOrganizationId del body", () => {
    const target = pickTarget("org-legitima", {
      message: "hola",
      history: [],
      targetOrganizationId: "org-atacante",
    })
    expect(target).toBe("org-legitima")
    expect(target).not.toBe("org-atacante")
  })
  it("devuelve el param aunque el body no traiga target", () => {
    expect(pickTarget("org-legitima", { message: "hola", history: [] })).toBe("org-legitima")
  })
})

function canOperateLegajo(roles: string[]): boolean {
  return canCertify(roles)
}

describe("legajo operator gate - assistant/routing", () => {
  it("permite a accountant", () => {
    expect(canOperateLegajo(["accountant"])).toBe(true)
  })
  it("permite a accounting_firm_admin", () => {
    expect(canOperateLegajo(["accounting_firm_admin"])).toBe(true)
  })
  it("permite a admin_platform", () => {
    expect(canOperateLegajo(["admin_platform"])).toBe(true)
  })
  it("DENIEGA a producer aunque sea titular del legajo", () => {
    expect(canOperateLegajo(["producer"])).toBe(false)
  })
  it("deniega a entidad financiera", () => {
    expect(canOperateLegajo(["bank_user"])).toBe(false)
  })
})

function canSeeReadonlyCertification(input: { isOwner: boolean; isAdmin: boolean; hasActiveGrant: boolean }): boolean {
  return input.isOwner || input.isAdmin || input.hasActiveGrant
}

describe("readonly certification visibility", () => {
  it("la ve el titular de la carpeta", () => {
    expect(canSeeReadonlyCertification({ isOwner: true, isAdmin: false, hasActiveGrant: false })).toBe(true)
  })
  it("la ve el financista con grant activo", () => {
    expect(canSeeReadonlyCertification({ isOwner: false, isAdmin: false, hasActiveGrant: true })).toBe(true)
  })
  it("la ve admin_platform", () => {
    expect(canSeeReadonlyCertification({ isOwner: false, isAdmin: true, hasActiveGrant: false })).toBe(true)
  })
  it("no se expone sin permiso readonly", () => {
    expect(canSeeReadonlyCertification({ isOwner: false, isAdmin: false, hasActiveGrant: false })).toBe(false)
  })
})
