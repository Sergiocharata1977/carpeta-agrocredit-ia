# Estado Actual del Proyecto — AgroCredit Hub

**Fecha de actualización:** 2026-06-02  
**Repositorio:** `Agro-Credit` (rama `master`)  
**Deploy:** Vercel — automático desde `master`  
**Stack:** Next.js App Router + Firebase + TypeScript + Tailwind  
**Último commit conocido:** `e2a49d7` — feat: align registro with landing design

---

## 1. Qué es el producto

**Carpeta crediticia agrofinanciera digital multi-tenant.**

El contador carga la información contable, fiscal y patrimonial del productor una sola vez. El productor autoriza accesos trazables a bancos, financieras y empresas agrocomerciales. Cada acceso tiene scope, fecha de vencimiento y registro de auditoría.

### Lo que resuelve

- El productor evita viajes de hasta 100 km para entregar documentación actualizada.
- El contador carga una vez; no repite el mismo pedido para cada entidad.
- El banco/empresa accede solo si existe una autorización vigente, con alcance definido.
- Todo queda auditado: quién vio qué, por cuánto tiempo y con qué autorización.

### Lo que NO es

- No es un sistema contable ni reemplaza al contador.
- No liquida impuestos ni sueldos.
- No decide automáticamente un crédito.
- No entrega información sin autorización expresa del productor.

---

## 2. Actores del sistema

| Actor | Nombre canónico (`org.type`) | Descripción |
|---|---|---|
| Usuario del sistema | `system_user` | Persona física — dueña de la información |
| Empresa hija | `system_user_entity` | Entidad fiscal con `parentOrganizationId` |
| Contador / estudio | `accounting_firm` | Carga y mantiene la carpeta |
| Banco / empresa / financiera | `requesting_entity` | Solicita acceso o financiación |
| Admin plataforma | `platform` | Soporte y configuración |

**Subtypes de `requesting_entity`:** `bank` · `financial_entity` · `agro_company` · `maquinaria_agricola` · `insumos_agricolas`

---

## 3. Regla central de permisos

```
Contador carga → Productor autoriza → Entidad accede (scope + vencimiento)
                       ↓
                 audit_logs inmutables
```

Scopes disponibles: `profile_basic` · `accounting_summary` · `balance_sheets` · `income_statements` · `tax_documents` · `assets` · `liabilities` · `documents` · `full_credit_folder`

Estados de grants: `draft` → `requested` → `approved` / `rejected` → `revoked` / `expired`

---

## 4. Estado de todos los planes

### Plan 001 — Diseño base del proyecto
**Estado:** Completo — es el documento de arquitectura fundacional.  
Ver: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`

---

### Plan 002 — Reorganización base de datos
**Estado:** Completo — migración al modelo unificado `organizations`.  
Ver: `reports/002_REORGANIZACION_BASE_DATOS.md`

**Cambios clave aplicados:**
- `producerId` → `targetOrganizationId` en access y financing
- `requestedExpirationDays` → `requestedDays`
- `expirationDays` → `approvedDays`
- `folderOwnerOrganizationId` como FK canónica de carpeta

---

### Plan 003 — Vistas por rol
**Estado:** Completo — dashboards por rol implementados.  
Ver: `reports/003_PLAN_VISTAS_POR_ROL.md`

Rutas operativas por rol:
- Productor: `/app/productor`
- Contador: `/app/contador`
- Entidad: `/app/entidad`
- Admin: `/app/admin`

---

### Plan 004 — Onboarding y registro
**Estado:** Olas 1 y 2 completas. Ola 3 pendiente.  
Ver: `reports/004_PLAN_ONBOARDING_Y_REGISTRO.md`

| Ola | Estado | Contenido |
|-----|--------|-----------|
| 1 | Completa | Tipos, schemas, APIs de onboarding, Firestore rules |
| 2 | Completa | Wizards `/registro/usuario`, `/registro/contador`, `/registro/entidad` |
| 3 | Pendiente | `ScopeGuard`, `GrantStatusBanner`, `GrantExpiredBlocker`, vista carpeta entidad con guard |

---

### Plan 005 — Roadmap Integration Core
**Estado:** Diseñado — pendiente de implementación.  
Ver: `reports/005_ROADMAP_INTEGRATION_CORE.md`

Visión: convertir el hub en el cerebro documental del ecosistema. Olas pendientes:

| Ola | Contenido |
|-----|-----------|
| 4 | API de integración `/api/hub/*` |
| 5 | Webhooks / sistema de eventos |
| 6 | API Keys + scopes + multi-tenant seguro |
| 7 | SDK interno reutilizable |
| 8 | MCP para Don Cándido IA |
| 9 | Integración piloto externa (Agro Biciuffa o 9001app) |

---

### Plan 006 — OCR/IA para carga de EECC
**Estado:** Diseñado — pendiente de implementación.  
Ver: `reports/006_PLAN_OCR_IA_EECC.md`

Upload PDF/imagen/Excel → OCR/IA → mapper a rubros contables → preview editable → aplicación manual a Balance/Resultados.  
Colección propuesta: `financial_statement_imports`.  
Nota: provider IA real aún no definido; requiere variables de entorno en producción.

---

### Plan 007 — Single productor: perfil extendido
**Estado:** Completo (todas las olas).  
Ver: `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`

| Ola | Contenido | Estado |
|-----|-----------|--------|
| 1 | Tipos, schema Zod, servicio, API `GET/PATCH /api/producer-profile/[orgId]` | Completa |
| 2 | Layout, header, sub-nav, rutas base del single productor | Completa |
| 3 | EntitySelector (chips empresa en carpeta) | Completa |
| 4 | ProducerProfileForm (4 secciones: fiscal, productivo, financiero, patrimonial) | Completa |
| 5 | DocumentChecklist (7 tipos de documentos con estado) | Completa |

---

### Plan 008 — ABM Clientes y Empresas
**Estado:** Completo (todas las olas).  
Ver: `reports/008_PLAN_ABM_CLIENTES_EMPRESAS.md`

| Ola | Contenido | Estado |
|-----|-----------|--------|
| 1 | Servicios per-organización, API `GET /api/contador/empresas` | Completa |
| 2 | Frontend: `/clientes`, `/clientes/[id]`, `/empresas`, `/empresas/[id]/*` | Completa |
| 3 | Integración sidebar, redirects, layout empresa | Completa |

---

## 5. Módulos implementados (resumen)

### ga (producción)

| Dominio | Módulos |
|---------|---------|
| Auth / Org | `auth_login` · `auth_session` · `auth_guards` |
| Productores / Clientes | `producers_abm` · `producer_accountant_links` · `accounting_firms` |
| Carpeta contable | `accounting_periods` · `balance_sheets` · `income_statements` · `tax_documents` · `documents_upload` |
| Patrimonio | `assets_real_estate` · `assets_movable` · `liabilities` |
| Autorizaciones | `access_requests` · `access_grants` |
| Financiación | `financing_requests` |
| Auditoría | `audit_logs` · `notifications` |
| UI/Shell | `AppSidebar` · `AppHeader` · `AppUserMenu` · `AuthGuard` · `RoleGate` |

### beta (funcional, en refinamiento)

- `producer_profile_extended` — formulario extendido, checklist documental
- `system_user_entities` — EntitySelector en carpeta
- `org_members` — panel admin organizaciones

---

## 6. Colecciones Firestore activas

```
users · organizations · organization_members · organization_profiles
producers · accounting_firms · producer_accountant_links
accounting_periods · balance_sheets · income_statements · tax_documents
assets · liabilities · documents
access_requests · access_grants · financing_requests
audit_logs · notifications
```

Colecciones planificadas (no creadas aún):
```
integrations · api_keys · sync_logs · financial_statement_imports
```

---

## 7. Rutas frontend activas

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública (Motion.dev) |
| `/login` | Autenticación |
| `/registro` | Selector de tipo de registro |
| `/registro/usuario` | Wizard sistema_user |
| `/registro/contador` | Wizard accounting_firm |
| `/registro/entidad` | Wizard requesting_entity |

### Privadas — Contador
| Ruta | Descripción |
|------|-------------|
| `/app/contador` | Dashboard |
| `/app/contador/clientes` | Lista de clientes |
| `/app/contador/clientes/[id]` | Datos personales + empresas |
| `/app/contador/empresas` | Lista de empresas del estudio |
| `/app/contador/empresas/[id]/carpeta` | Balance + resultados |
| `/app/contador/empresas/[id]/impuestos` | TaxGridForm |
| `/app/contador/empresas/[id]/bienes` | Assets + pasivos |
| `/app/contador/productores/[id]/*` | Legacy — redirige a nueva estructura |

### Privadas — Usuario/Productor
| Ruta | Descripción |
|------|-------------|
| `/app/productor` | Dashboard del productor |
| `/app/productor/autorizaciones` | Ver y gestionar grants |
| `/app/usuario` | Alias temporal → `/app/productor` |

### Privadas — Entidad
| Ruta | Descripción |
|------|-------------|
| `/app/entidad` | Dashboard |
| `/app/entidad/accesos` | Solicitar acceso a carpetas |
| `/app/entidad/financiacion` | Solicitudes de financiación |

---

## 8. APIs activas

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/onboarding/system-user` | Registro usuario del sistema |
| POST | `/api/onboarding/accounting-firm` | Registro estudio contable |
| POST | `/api/onboarding/requesting-entity` | Registro entidad solicitante |
| GET/POST | `/api/organizations` | Búsqueda de organizaciones activas |
| GET/POST | `/api/organizations/[orgId]/entities` | Empresas hijas de un usuario |
| GET | `/api/contador/productores` | Listar clientes del estudio (Admin SDK) |
| GET | `/api/contador/empresas` | Listar empresas del estudio |
| GET/PATCH | `/api/producer-profile/[orgId]` | Perfil extendido |
| PATCH | `/api/producer-accountant-links/[linkId]` | Aceptar/rechazar vínculo |
| POST | `/api/access-requests` | Solicitar acceso a carpeta |
| POST | `/api/access-grants` | Aprobar/revocar grant |
| POST | `/api/financing-requests` | Crear solicitud de financiación |

---

## 9. Seguridad — reglas críticas vigentes

- **Deny by default** en Firestore y Storage — nada es público.
- `organizationId` siempre derivado de Auth/claims/membership — nunca del cliente.
- Grants vencidos no habilitan lectura.
- `audit_logs` no son editables desde el cliente.
- Documentos privados nunca son lectura pública.
- Toda acción sensible genera entrada en `audit_logs`.

---

## 10. Pendientes prioritarios (próximas sesiones)

| Prioridad | Plan | Tarea |
|-----------|------|-------|
| Alta | 004 Ola 3 | `ScopeGuard`, `GrantStatusBanner`, `GrantExpiredBlocker`, vista carpeta entidad con guard |
| Alta | — | Desplegar `firestore.rules` e índices actualizados |
| Media | 005 Ola 4 | API de integración `/api/hub/*`, colecciones `integrations`, `api_keys` |
| Media | 006 | OCR/IA para prellenar Balance/Resultados desde PDF/Excel |
| Baja | 005 Olas 5-9 | Webhooks, SDK, MCP Don Cándido IA, integración Agro Biciuffa |

---

## 11. Deuda técnica conocida

- Rutas y servicios con nombre `productor` conservados por compatibilidad — no introducir nuevas superficies con ese nombre.
- `/api/auth/setup-claims` mantiene roles legacy en su schema.
- `ClienteNuevoDialog` usa endpoint de onboarding; revisar si conviene endpoint dedicado.
- No se ejecutó build completo local en algunos commits recientes — siempre ejecutar `pnpm build` antes de hacer push.
- Claims legacy `producer` y `bank_user` activos por compatibilidad hacia atrás.

---

## 12. Comandos de desarrollo

```bash
pnpm dev                                    # servidor local
pnpm build                                  # build producción
pnpm type-check                             # npx tsc --noEmit — antes de cada commit
pnpm check:security-shape                   # validar shape de seguridad
firebase deploy --only firestore:rules      # reglas Firestore
firebase deploy --only firestore:indexes    # índices Firestore
firebase deploy --only storage              # reglas Storage
```

---

## 13. Ecosistema conectado

| Proyecto | Relación |
|----------|----------|
| `9001app-firebase` | Referencia técnica de patrones (OCR, permisos, AppShell) |
| `Landing-Agrobiciufa` | Posible integración piloto externa (Plan 005 Ola 9) |
| `Don Cándido IA` | Destinatario del MCP (Plan 005 Ola 8) |
| `SIG-Agro` | Integración futura de datos productivos |
