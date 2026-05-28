export const COLLECTIONS = {
  USERS: "users",
  ORGANIZATIONS: "organizations",
  ORGANIZATION_MEMBERS: "organization_members",
  PRODUCERS: "producers",
  ACCOUNTING_FIRMS: "accounting_firms",
  PRODUCER_ACCOUNTANT_LINKS: "producer_accountant_links",
  FINANCIAL_ENTITIES: "financial_entities",
  AGRO_COMPANIES: "agro_companies",
  ACCOUNTING_PERIODS: "accounting_periods",
  BALANCE_SHEETS: "balance_sheets",
  INCOME_STATEMENTS: "income_statements",
  TAX_DOCUMENTS: "tax_documents",
  ASSETS: "assets",
  LIABILITIES: "liabilities",
  DOCUMENTS: "documents",
  ACCESS_REQUESTS: "access_requests",
  ACCESS_GRANTS: "access_grants",
  FINANCING_REQUESTS: "financing_requests",
  AUDIT_LOGS: "audit_logs",
  NOTIFICATIONS: "notifications",
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]
