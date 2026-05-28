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
| `auth_login` | pending | `/login` | — | `users` |
| `auth_session` | pending | — | `lib/auth/session.ts` | `users` |
| `org_members` | pending | `/app/admin/organizaciones` | `lib/services/organizations.ts` | `organizations` · `organization_members` |

### DOMINIO: PRODUCTORES

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `producers_abm` | pending | `/app/contador/productores` | `lib/services/producers.ts` | `producers` |
| `accounting_firms` | pending | `/app/admin/organizaciones` | `lib/services/accounting-firms.ts` | `accounting_firms` |
| `producer_accountant_links` | pending | `/app/contador/productores` | `lib/services/producer-accountant-links.ts` | `producer_accountant_links` |

### DOMINIO: CARPETA CONTABLE

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `accounting_periods` | pending | `/app/contador/productores/[producerId]/carpeta` | `lib/services/accounting-periods.ts` | `accounting_periods` |
| `balance_sheets` | pending | `/app/contador/productores/[producerId]/carpeta` | `lib/services/balance-sheets.ts` | `balance_sheets` |
| `income_statements` | pending | `/app/contador/productores/[producerId]/carpeta` | `lib/services/income-statements.ts` | `income_statements` |
| `tax_documents` | pending | `/app/contador/productores/[producerId]/carpeta` | `lib/services/tax-documents.ts` | `tax_documents` |
| `documents_upload` | pending | `/app/contador/productores/[producerId]/carpeta` | `lib/services/documents.ts` | `documents` |

### DOMINIO: PATRIMONIO

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `assets_real_estate` | pending | `/app/contador/productores/[producerId]/bienes` | `lib/services/assets.ts` | `assets` |
| `assets_movable` | pending | `/app/contador/productores/[producerId]/bienes` | `lib/services/assets.ts` | `assets` |
| `liabilities` | pending | `/app/contador/productores/[producerId]/bienes` | `lib/services/liabilities.ts` | `liabilities` |

### DOMINIO: AUTORIZACIONES

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `access_requests` | pending | `/app/entidad/accesos` · `/app/productor/autorizaciones` | `lib/services/access-requests.ts` | `access_requests` |
| `access_grants` | pending | `/app/productor/autorizaciones` | `lib/services/access-grants.ts` | `access_grants` |

### DOMINIO: FINANCIACIÓN

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `financing_requests` | pending | `/app/entidad/financiacion` · `/app/productor/financiacion` | `lib/services/financing-requests.ts` | `financing_requests` |

### DOMINIO: AUDITORÍA Y NOTIFICACIONES

| Módulo | Estado | Ruta frontend | Servicio | Colecciones |
|---|---|---|---|---|
| `audit_logs` | pending | `/app/admin/auditoria` | `lib/firebase/audit.ts` | `audit_logs` |
| `notifications` | pending | `/app/notificaciones` | `lib/services/notifications.ts` | `notifications` |

---

## Dashboards por rol

| Rol | Ruta dashboard | Estado |
|---|---|---|
| `producer` | `/app/productor` | pending |
| `accountant` | `/app/contador` | pending |
| `accounting_firm_admin` | `/app/contador` | pending |
| `bank_user` | `/app/entidad` | pending |
| `agro_company_user` | `/app/entidad` | pending |
| `admin_platform` | `/app/admin` | pending |

---

## Colecciones Firestore canónicas

| Colección | Módulo dueño | Descripción |
|---|---|---|
| `users` | auth_session | Perfil extendido del usuario autenticado |
| `organizations` | org_members | Tenants/entidades |
| `organization_members` | org_members | Relación usuario-organización |
| `producers` | producers_abm | Productores agropecuarios |
| `accounting_firms` | accounting_firms | Estudios contables |
| `producer_accountant_links` | producer_accountant_links | Vínculo formal productor-contador |
| `financial_entities` | org_members | Bancos/financieras |
| `agro_companies` | org_members | Empresas agrocomerciales |
| `accounting_periods` | accounting_periods | Períodos fiscales/campañas |
| `balance_sheets` | balance_sheets | Balance general |
| `income_statements` | income_statements | Estado de resultados |
| `tax_documents` | tax_documents | IVA, Ganancias/Rentas, 931 |
| `assets` | assets_real_estate / assets_movable | Bienes muebles e inmuebles |
| `liabilities` | liabilities | Deudas bancarias/comerciales |
| `documents` | documents_upload | Metadatos de archivos en Storage |
| `access_requests` | access_requests | Pedidos de acceso de entidades |
| `access_grants` | access_grants | Autorizaciones vigentes o históricas |
| `financing_requests` | financing_requests | Solicitudes de financiación |
| `audit_logs` | audit_logs | Auditoría inmutable lógica |
| `notifications` | notifications | Notificaciones internas |

---

## Cómo actualizar este registro

Al implementar un módulo:
1. Cambiar su estado de `pending` → `beta` → `ga`
2. Confirmar la ruta frontend real y el nombre del servicio
3. Actualizar `reports/HANDOFF_ACTUAL.md` con lo completado
