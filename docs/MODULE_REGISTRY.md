# Module Registry — Carpeta AgroCredit IA

**Versión:** 2026-05-28
**Regla crítica:** Antes de crear cualquier módulo, ruta, API o componente, buscar aquí primero.

---

## Uso en protocolo multi-IA

- Este archivo es la fuente canonica para modulos, rutas, servicios y colecciones Firestore.
- Ninguna IA debe crear rutas, APIs, servicios, componentes de modulo o colecciones sin buscar primero aca.
- No crear colecciones fuera de la tabla "Colecciones Firestore canonicas" sin actualizar este registro primero.
- Si un modulo pasa de `pending` a `beta` o `ga`, actualizar su fila y registrar el cambio en `reports/HANDOFF_ACTUAL.md`.
- Si el HANDOFF asigna un modulo a otra IA, no reimplementar: integrar, documentar dependencia o dejar pendiente.

---

## Regla anti-duplicación

1. Buscar si ya existe un módulo que cubra el caso.
2. Buscar si existe una ruta frontend similar en `app/`.
3. Buscar si existe un servicio similar en `lib/services/`.
4. Buscar si existe la colección Firestore en `lib/firebase/collections.ts`.
5. Si existe algo similar → integrar o migrar. **No crear una segunda implementación paralela.**

---

## Convenciones obligatorias

- IDs de módulo en **snake_case**: `access_grants` ✓ — `accessGrants` ✗
- Rutas frontend: kebab-case (`/app/productor/autorizaciones`)
- Servicios: `lib/services/{module}.ts`
- Tipos: `types/{domain}.ts`
- Schemas Zod: `lib/schemas/{domain}.ts`
- Estado: `ga` (implementado) · `beta` · `draft` (solo diseñado) · `pending` (en plan, no iniciado)

---

## Módulos por dominio

### DOMINIO: AUTH / ORGANIZACIÓN

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `auth_login` | ga | `/login` | `lib/firebase/auth-client.ts` | `users` |
| `auth_session` | ga | — | `lib/auth/session.ts` | `users` |
| `auth_guards` | ga | — | `lib/auth/roles.ts`, `memberships.ts` | `organization_members` |
| `org_members` | beta | `/app/admin/organizaciones` | — | `organizations` · `organization_members` |

### DOMINIO: PRODUCTORES

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `producers_abm` | ga | `/app/contador/productores` · `/app/contador/productores/new` | `lib/services/producers.ts` · `app/api/contador/productores` | `producers` |
| `producer_profile_extended` | beta | `/app/contador/productores/[producerId]` · `/app/contador/productores/[producerId]/documentos` | `lib/services/producer-profile.ts` · `app/api/producer-profile/[orgId]` · `components/producers/ProducerProfileForm.tsx` · `components/producers/DocumentChecklist.tsx` | `organization_profiles` · `documents` |
| `system_user_entities` | beta | `/app/contador/productores/[producerId]/carpeta` | `components/producers/EntitySelector.tsx` · `app/api/organizations/[orgId]/entities` | `organizations` |
| `accounting_firms` | ga | `/app/admin/organizaciones` | `lib/services/accounting-firms.ts` | `accounting_firms` |
| `producer_accountant_links` | ga | `/app/contador/productores` | `lib/services/producer-accountant-links.ts` | `producer_accountant_links` |

### DOMINIO: CARPETA CONTABLE

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `accounting_periods` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/accounting-periods.ts` / `app/api/accounting/periods/*` | `accounting_periods` |
| `balance_sheets` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/balance-sheets.ts` / `app/api/accounting/balance-sheets/*` | `balance_sheets` |
| `income_statements` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/income-statements.ts` / `app/api/accounting/income-statements/*` | `income_statements` |
| `tax_documents` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/tax-documents.ts` / `app/api/accounting/tax-documents/*` | `tax_documents` |
| `documents_upload` | ga | `/app/contador/productores/[producerId]/carpeta` · `/app/contador/productores/[producerId]/documentos` | `lib/services/documents.ts` | `documents` |

### DOMINIO: PATRIMONIO

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `assets_real_estate` | ga | `/app/contador/productores/[producerId]/bienes` | `lib/services/assets.ts` / `app/api/folders/assets/*` | `assets` |
| `assets_movable` | ga | `/app/contador/productores/[producerId]/bienes` | `lib/services/assets.ts` / `app/api/folders/assets/*` | `assets` |
| `liabilities` | ga | `/app/contador/productores/[producerId]/bienes` | `lib/services/liabilities.ts` / `app/api/folders/liabilities/*` | `liabilities` |

### DOMINIO: AUTORIZACIONES

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `access_requests` | ga | `/app/entidad/accesos` · `/app/productor/autorizaciones` | `lib/services/access-requests.ts` | `access_requests` |
| `access_grants` | ga | `/app/productor/autorizaciones` | `lib/services/access-grants.ts` | `access_grants` |
| `access_invitations` | ga | `/app/productor/autorizaciones` · `/app/contador/clientes/[clientId]` · `/app/contador/empresas/[empresaId]` · `/invitar/acceso/[token]` · `/app/entidad/carpetas/[targetOrgId]` | `app/api/access-invitations/*` · `lib/auth/access-invitation-access.ts` · `components/access/CreateAccessInvitationDialog.tsx` · `AccessInvitationTable.tsx` · `AcceptAccessInvitation.tsx` | `access_invitations` |
| `scope_guard` | ga | `/app/entidad/carpetas/[targetOrgId]` | `app/api/folders/[targetOrgId]/readonly` · `components/access/ScopeGuard.tsx` · `GrantStatusBanner.tsx` · `GrantExpiredBlocker.tsx` | `access_grants` |

### DOMINIO: FINANCIACIÓN

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `financing_requests` | ga | `/app/entidad/financiacion` · `/app/productor/financiacion` | `lib/services/financing-requests.ts` | `financing_requests` |

### DOMINIO: AUDITORÍA Y NOTIFICACIONES

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `audit_logs` | ga | `/app/admin/auditoria` | `lib/firebase/audit.ts` · `lib/services/audit-logs.ts` | `audit_logs` |
| `notifications` | ga | `/app/notificaciones` | `lib/services/notifications.ts` | `notifications` |

### DOMINIO: IMPORTACIÓN CONTABLE (OCR/IA)

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `statement_imports` | ga | `/app/contador/productores/[producerId]/carpeta` · `/app/contador/empresas/[empresaId]/carpeta` | `app/api/accounting/statements/extract` · `app/api/accounting/statement-imports/*` · `lib/services/statement-imports-admin.ts` · `lib/ocr/*` · `components/accounting/StatementImport*` | `financial_statement_imports` |

### DOMINIO: CREDITO HUB IA

| Modulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `credito_hub_plan` | ga | `/app/contador/productores/[producerId]/legajo` - `/app/contador/productores/[producerId]/revision` - `/app/entidad/requisitos` - `/app/entidad/carpetas/[targetOrgId]/cumplimiento` | `reports/014_PLAN_CREDITO_HUB_IA.md` - `docs/credito-hub/*` | - |
| `ai_provider_router` | beta | `/app/admin/ia` | `lib/ai/*` (Groq · Anthropic · xAI · Mock) - `lib/ai/provider-config.ts` - `app/api/admin/ai-config/*` | `platform_settings` |
| `document_jobs` | beta | `/app/contador/productores/[producerId]/legajo` | `app/api/credito-hub/intake` - `app/api/credito-hub/jobs` - `app/api/credito-hub/jobs/process` - `app/api/credito-hub/jobs/process-now` - `app/api/credito-hub/jobs/[jobId]` - `app/api/credito-hub/jobs/[jobId]/retry` - `lib/services/document-jobs.ts` | `document_jobs` |
| `document_classification` | beta | - | `lib/ai/classification/document-classifier.ts` - `lib/services/document-classification.ts` | `document_classifications` |
| `extracted_fields` | beta | `/app/contador/productores/[producerId]/revision` | `lib/ai/extraction/extractors.ts` - `lib/services/extracted-fields.ts` - `app/api/credito-hub/review/*` | `extracted_fields` |
| `canonical_credit_profiles` | beta | `/app/contador/productores/[producerId]/revision` | `lib/services/canonical-profile.ts` - `app/api/credito-hub/canonical-profile/[targetOrganizationId]` | `canonical_credit_profiles` |
| `bank_requirements` | beta | `/app/entidad/requisitos` - `/app/entidad/carpetas/[targetOrgId]/cumplimiento` | `app/api/credito-hub/bank-requirements/*` - `lib/services/bank-requirements.ts` - `lib/services/requirement-matching.ts` | `bank_requirement_templates` - `requirement_matches` |
| `credit_applications` | beta | `/app/entidad/carpetas/[targetOrgId]/cumplimiento` | `app/api/credito-hub/credit-applications` - `lib/services/credit-applications.ts` | `credit_applications` |
| `legajo_unico_contador` | beta | `/app/contador/clientes/[clientId]/legajo` | (shell; reusa entities + folders status) | `organizations` |
| `legajo_assistant` | beta | (modal en legajo) | `app/api/credito-hub/assistant/[targetOrganizationId]` · `lib/credito-hub/assistant-context.ts` · `components/credito-hub/LegajoAssistantChat.tsx` | (solo lectura) |
| `legajo_routing` | beta | (en legajo) | `app/api/credito-hub/routing/[rootOrganizationId]/*` · `lib/services/document-routing.ts` · `lib/credito-hub/folder-routing.ts` · `components/credito-hub/{CarpetaUploadSection,UnassignedDocsTray}.tsx` | `document_routing_decisions` |
| `legajo_review` | beta | (en legajo) | `components/credito-hub/CarpetaReviewSection.tsx` (reusa `ReviewWorkbench`) | `extracted_fields` |
| `legajo_certification` | beta | (en legajo) | `app/api/credito-hub/certification/[targetOrganizationId]` · `lib/services/folder-certification.ts` · `lib/credito-hub/folder-fingerprint.ts` · `components/credito-hub/{CertificationBadge,CertifyFolderButton}.tsx` | `folder_certifications` |

### DOMINIO: HABILITACIÓN DE ESTUDIOS (ADMIN)

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `accounting_firm_approval` | ga | `/app/admin/estudios` | `app/api/admin/accounting-firms/*` | `organizations` |
| `admin_requesting_entity_create` | beta | `/app/admin/entidades` | `app/api/admin/entities` (POST) · `components/admin/NuevaEntidadDialog.tsx` | `organizations` |

### DOMINIO: INTEGRATION CORE (Olas 4–8)

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `api_keys` | beta | `/app/admin/api-keys` | `lib/services/api-keys.ts` · `app/api/api-keys/*` | `api_keys` |
| `hub_producers` | beta | — | `app/api/hub/producers` | `organizations` · `producer_accountant_links` · `access_grants` |
| `hub_credit_folders` | beta | — | `app/api/hub/credit-folders/[producerId]` | `organizations` · `organization_profiles` · `access_grants` · `producer_accountant_links` |

---

## Dashboards por rol

| Rol | Ruta dashboard | Estado |
|---|---|---|
| `producer` | `/app/productor` | ga |
| `accountant` | `/app/contador` | ga |
| `accounting_firm_admin` | `/app/contador` | ga |
| `bank_user` | `/app/entidad` | ga |
| `agro_company_user` | `/app/entidad` | ga |
| `admin_platform` | `/app/admin` | ga |

---

## Shell privado

| Componente | Estado | Archivo |
|---|---|---|
| `AppSidebar` | ga | `components/layout/AppSidebar.tsx` |
| `AppHeader` | ga | `components/layout/AppHeader.tsx` |
| `SummaryCard` | ga | `components/dashboard/SummaryCard.tsx` |
| `AuthGuard` | ga | `components/auth/AuthGuard.tsx` |
| `RoleGate` | ga | `components/auth/RoleGate.tsx` |

---

## Colecciones Firestore canónicas

| Colección | Módulo dueño | Estado servicio | Descripción |
|---|---|---|---|
| `users` | auth_session | ga | Perfil extendido del usuario autenticado |
| `organizations` | org_members | beta | Tenants/entidades |
| `organization_members` | org_members | ga | Relación usuario-organización |
| `organization_profiles` | producer_profile_extended | beta | Perfil extendido del productor/contribuyente |
| `producers` | producers_abm | ga | Productores agropecuarios |
| `accounting_firms` | accounting_firms | ga | Estudios contables |
| `producer_accountant_links` | producer_accountant_links | ga | Vínculo formal productor-contador |
| `financial_entities` | org_members | pending | Bancos/financieras |
| `agro_companies` | org_members | pending | Empresas agrocomerciales |
| `accounting_periods` | accounting_periods | ga | Períodos fiscales/campañas |
| `balance_sheets` | balance_sheets | ga | Balance general |
| `income_statements` | income_statements | ga | Estado de resultados |
| `tax_documents` | tax_documents | ga | IVA, Ganancias/Rentas, 931 |
| `assets` | assets_real_estate / assets_movable | ga | Bienes muebles e inmuebles |
| `liabilities` | liabilities | ga | Deudas bancarias/comerciales |
| `documents` | documents_upload | ga | Metadatos de archivos en Storage |
| `access_requests` | access_requests | ga | Pedidos de acceso de entidades |
| `access_grants` | access_grants | ga | Autorizaciones vigentes o históricas |
| `financing_requests` | financing_requests | ga | Solicitudes de financiación |
| `audit_logs` | audit_logs | ga | Auditoría inmutable lógica |
| `notifications` | notifications | ga | Notificaciones internas |
| `financial_statement_imports` | statement_imports | ga | Borradores de importación OCR/IA de EECC |
| `access_invitations` | access_invitations | ga | Invitaciones de acceso por link |
| `api_keys` | api_keys | beta | Claves de API para integraciones externas (hash SHA-256, scoped) |
| `document_jobs` | document_jobs | beta | Cola asincronica de procesamiento documental CreditoHub con lease e idempotencia |
| `document_classifications` | document_classification | beta | Clasificaciones IA de documentos fuente con confianza y revision |
| `extracted_fields` | extracted_fields | beta | Campos extraidos con procedencia obligatoria por documento, pagina y metodo |
| `canonical_credit_profiles` | canonical_credit_profiles | beta | Perfil crediticio canonico basado en referencias a campos extraidos |
| `bank_requirement_templates` | bank_requirements | draft | Plantillas versionadas de requisitos bancarios |
| `credit_applications` | credit_applications | draft | Solicitudes crediticias que unen carpeta, entidad y template de requisitos |
| `requirement_matches` | bank_requirements | draft | Resultado del cruce entre requisitos bancarios y legajo disponible |
| `platform_settings` | ai_provider_router | beta | Config de plataforma (doc `ai`: proveedor IA activo). Solo Admin SDK; deny-by-default para el cliente |
| `document_routing_decisions` | legajo_routing | beta | Trazabilidad de a qué carpeta fue cada documento (auto/manual) por CUIT y tipo |
| `folder_certifications` | legajo_certification | beta | Certificación profesional por carpeta (sello del contador, invalidación perezosa a outdated) |

---

## Cómo actualizar este registro

Al implementar un módulo:
1. Cambiar su estado de `pending` → `beta` → `ga`
2. Confirmar la ruta frontend real y el nombre del servicio
3. Actualizar `reports/HANDOFF_ACTUAL.md` con lo completado
