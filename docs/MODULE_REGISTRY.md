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
| `accounting_periods` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/accounting-periods.ts` | `accounting_periods` |
| `balance_sheets` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/balance-sheets.ts` | `balance_sheets` |
| `income_statements` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/income-statements.ts` | `income_statements` |
| `tax_documents` | ga | `/app/contador/productores/[producerId]/carpeta` | `lib/services/tax-documents.ts` | `tax_documents` |
| `documents_upload` | ga | `/app/contador/productores/[producerId]/carpeta` · `/app/contador/productores/[producerId]/documentos` | `lib/services/documents.ts` | `documents` |

### DOMINIO: PATRIMONIO

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `assets_real_estate` | ga | `/app/contador/productores/[producerId]/bienes` | `lib/services/assets.ts` | `assets` |
| `assets_movable` | ga | `/app/contador/productores/[producerId]/bienes` | `lib/services/assets.ts` | `assets` |
| `liabilities` | ga | `/app/contador/productores/[producerId]/bienes` | `lib/services/liabilities.ts` | `liabilities` |

### DOMINIO: AUTORIZACIONES

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `access_requests` | ga | `/app/entidad/accesos` · `/app/productor/autorizaciones` | `lib/services/access-requests.ts` | `access_requests` |
| `access_grants` | ga | `/app/productor/autorizaciones` | `lib/services/access-grants.ts` | `access_grants` |
| `access_invitations` | draft | `/app/productor/autorizaciones` · `/invitar/acceso/[token]` · `/app/entidad/carpetas/[targetOrgId]` | — pendiente — | `access_invitations` |
| `scope_guard` | draft | — (componente transversal) | — pendiente — | `access_grants` |

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
| `statement_imports` | draft | `/app/contador/empresas/[id]/carpeta` (integrado) | — pendiente Ola 2 — | `financial_statement_imports` |

### DOMINIO: HABILITACIÓN DE ESTUDIOS (ADMIN)

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `accounting_firm_approval` | ga | `/app/admin/estudios` | `app/api/admin/accounting-firms/*` | `organizations` |

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
| `financial_statement_imports` | statement_imports | draft | Borradores de importación OCR/IA de EECC — Plan 006 |
| `access_invitations` | access_invitations | draft | Invitaciones de acceso por link — Plan 009 |

---

## Cómo actualizar este registro

Al implementar un módulo:
1. Cambiar su estado de `pending` → `beta` → `ga`
2. Confirmar la ruta frontend real y el nombre del servicio
3. Actualizar `reports/HANDOFF_ACTUAL.md` con lo completado
