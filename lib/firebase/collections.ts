// Nombres canónicos de colecciones Firestore — fuente de verdad
// Ver reports/002_REORGANIZACION_BASE_DATOS.md para el modelo de datos completo
// ELIMINADAS: producers, accounting_firms, financial_entities, agro_companies
// Todas las entidades viven en organizations (con type + subtype)
export const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations",
  ORGANIZATION_MEMBERS: "organization_members",
  ORGANIZATION_PROFILES: "organization_profiles",
  PRODUCER_ACCOUNTANT_LINKS: "producer_accountant_links",
  ACCOUNTING_PERIODS: "accounting_periods",
  BALANCE_SHEETS: "balance_sheets",
  INCOME_STATEMENTS: "income_statements",
  TAX_DOCUMENTS: "tax_documents",
  ASSETS: "assets",
  LIABILITIES: "liabilities",
  DOCUMENTS: "documents",
  ACCESS_REQUESTS: "access_requests",
  ACCESS_GRANTS: "access_grants",
  ACCESS_INVITATIONS: "access_invitations",
  FINANCING_REQUESTS: "financing_requests",
  AUDIT_LOGS: "audit_logs",
  NOTIFICATIONS: "notifications",
  FINANCIAL_STATEMENT_IMPORTS: "financial_statement_imports",
  API_KEYS: "api_keys",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
