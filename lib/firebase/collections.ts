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
  PLATFORM_SETTINGS: "platform_settings",
  // CreditoHub (Ola 1)
  DOCUMENT_JOBS: "document_jobs",
  DOCUMENT_CLASSIFICATIONS: "document_classifications",
  EXTRACTED_FIELDS: "extracted_fields",
  CANONICAL_CREDIT_PROFILES: "canonical_credit_profiles",
  BANK_REQUIREMENT_TEMPLATES: "bank_requirement_templates",
  CREDIT_APPLICATIONS: "credit_applications",
  REQUIREMENT_MATCHES: "requirement_matches",
  DOCUMENT_ROUTING_DECISIONS: "document_routing_decisions",
  FOLDER_CERTIFICATIONS: "folder_certifications",
  // Asistente conversacional (Ola 1-6)
  ASSISTANT_PENDING_IMPORTS: "assistant_pending_imports",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
