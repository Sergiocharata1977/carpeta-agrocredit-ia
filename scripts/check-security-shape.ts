import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const requiredPaths = [
  "firestore.rules",
  "storage.rules",
  "lib/auth/server-session.ts",
  "lib/auth/server-access.ts",
  "app/api/access-requests/route.ts",
  "app/api/access-requests/[requestId]/decision/route.ts",
  "app/api/access-grants/[grantId]/revoke/route.ts",
  "app/api/financing-requests/route.ts",
  "app/api/financing-requests/[requestId]/status/route.ts",
  "components/access/AuthorizationDecisionDialog.tsx",
  "components/financing/FinancingKanban.tsx",
  "components/notifications/NotificationBell.tsx",
  "components/audit/AuditLogTable.tsx",
]

const requiredRuleMarkers = [
  "match /access_requests",
  "match /access_grants",
  "match /financing_requests",
  "match /audit_logs",
  "match /notifications",
  "allow write: if false;",
  "requesterOrganizationId == defaultOrgId()",
  "producerOrgId(resource.data.producerId) == defaultOrgId()",
]

let failed = false

for (const relativePath of requiredPaths) {
  const fullPath = join(root, relativePath)
  if (!existsSync(fullPath)) {
    console.error(`Falta archivo requerido: ${relativePath}`)
    failed = true
  }
}

const rules = readFileSync(join(root, "firestore.rules"), "utf8")
for (const marker of requiredRuleMarkers) {
  if (!rules.includes(marker)) {
    console.error(`Falta marcador de reglas: ${marker}`)
    failed = true
  }
}

const packageJson = readFileSync(join(root, "package.json"), "utf8")
for (const scriptName of ["seed:demo", "check:security-shape", "test:smoke"]) {
  if (!packageJson.includes(`"${scriptName}"`)) {
    console.error(`Falta script npm: ${scriptName}`)
    failed = true
  }
}

if (failed) {
  process.exit(1)
}

console.log("Security shape OK: rutas, reglas y scripts principales presentes.")
