# Handoff Actual — Carpeta AgroCredit IA

**Fecha:** 2026-05-28
**Proyecto:** carpeta-agrocredit-ia
**Estado general:** Olas 1, 2 y 3 completas — listo para Ola 4
**Stack:** Next.js App Router + Firebase + TypeScript + Vercel
**Producto:** SaaS privado de carpeta crediticia agrofinanciera

---

## Activadores de protocolo

Cuando el usuario escriba cualquiera de estas frases, aplicar este protocolo antes de tocar código:

- `protocolo-inicio` · `handoff` · `protocolo`
- `que hay pendiente` · `carga contexto` / `cargá contexto`

**Regla de entrada obligatoria:** Leer este archivo + `docs/MODULE_REGISTRY.md` + `CLAUDE.md` antes de tocar cualquier código.

**Orden obligatorio de lectura para cualquier IA:**
1. `reports/HANDOFF_ACTUAL.md` - estado actual, pendientes, riesgos y dueños de trabajo.
2. `docs/MODULE_REGISTRY.md` - modulos existentes, rutas, servicios y colecciones canonicas.
3. `CLAUDE.md` - patrones obligatorios, comandos, convenciones y reglas de seguridad.
4. `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md` - plan completo cuando el cambio toque alcance, olas o modelo de datos.

**Cierre obligatorio de sesion:**
1. Ejecutar `pnpm type-check`.
2. Ejecutar `git status --short` y `git diff --stat` cuando el directorio sea un repo Git.
3. Actualizar este HANDOFF con lo hecho, archivos modificados, validacion, pendientes y riesgos.
4. Actualizar `docs/MODULE_REGISTRY.md` si cambio el estado de un modulo, ruta, servicio o coleccion.
5. Hacer `git add` selectivo y `git commit -m "descripcion"` cuando Git este disponible.

---

## 1. CONTEXTO DE NEGOCIO

### Qué es este producto
Carpeta digital agrofinanciera donde el contador carga la información contable/fiscal del productor una sola vez, y el productor autoriza accesos controlados a bancos, financieras y empresas agrocomerciales.

### Lo que NO es
- No es un sistema contable (no liquida IVA, Ganancias ni sueldos)
- No reemplaza al contador
- No decide créditos automáticamente
- No entrega información sin autorización expresa del productor

### Actores principales
| Actor | Rol | Permisos clave |
|---|---|---|
| Productor | Dueño de la información | Autoriza/revoca accesos |
| Contador | Carga y mantiene la carpeta | Escribe datos contables de productores vinculados |
| Banco/Financiera | Evaluación crediticia | Solo lee con grant vigente |
| Empresa agrocomercial | Financiamiento comercial | Solo lee con grant vigente |
| Admin plataforma | Soporte y configuración | Acceso administrativo controlado |

---

## 2. ESTADO ACTUAL — 2026-05-28

### Infraestructura
- [x] Repo GitHub privado: `Sergiocharata1977/carpeta-agrocredit-ia`
- [x] Firebase project: `agrocredit-ia-saas` — Auth email/pass habilitado
- [x] Vercel production: `carpeta-agrocredit-ia.vercel.app` — build verde
- [x] 9 variables de entorno en Vercel (Firebase client + Admin SDK)
- [ ] Firestore Database — habilitar desde Firebase Console
- [ ] Firebase Storage — habilitar desde Firebase Console

### Ola 1 — Scaffold base ✅ COMPLETA
- [x] Next.js App Router + TypeScript + Firebase + shadcn/ui
- [x] `lib/firebase/config.ts`, `admin-sdk.ts`, `auth-client.ts`
- [x] `components/ui/` — 57 componentes shadcn
- [x] `firestore.rules`, `storage.rules`, `firebase.json`
- [x] `hooks/use-mobile.ts`, `hooks/use-toast.ts`

### Ola 2 — Dominio, seguridad y contratos ✅ COMPLETA
- [x] `types/` — 8 archivos de tipos TypeScript canónicos
- [x] `lib/schemas/` — 6 archivos de schemas Zod
- [x] `lib/auth/roles.ts`, `session.ts`, `memberships.ts`
- [x] `components/auth/AuthGuard.tsx`, `RoleGate.tsx`
- [x] `lib/firebase/collections.ts`, `audit.ts`, `firestore-converters.ts`
- [x] `firestore.rules` — multi-tenant deny-by-default con custom claims
- [x] `storage.rules` — privado por organización/productor
- [x] `firestore.indexes.json` — 12 índices compuestos
- [x] `docs/SEGURIDAD_FIRESTORE.md`

### Ola 3 — Módulos core ✅ COMPLETA
- [x] `lib/services/producers.ts`, `accounting-firms.ts`, `producer-accountant-links.ts`
- [x] `lib/services/accounting-periods.ts`, `balance-sheets.ts`, `income-statements.ts`, `tax-documents.ts`, `documents.ts`
- [x] `lib/services/assets.ts`, `liabilities.ts`
- [x] `components/producers/` — ProducerForm, ProducerTable
- [x] `components/accounting/` — AccountingPeriodSelector, BalanceSheetForm, IncomeStatementForm, TaxDocumentsForm, AccountantLinkPanel
- [x] `components/documents/` — DocumentUploader, DocumentList
- [x] `components/assets/` — RealEstateAssetForm, MovableAssetForm, AssetsTable, AssetsSummary
- [x] `components/liabilities/` — LiabilityForm, LiabilitiesTable
- [x] `components/layout/` — AppSidebar (por rol), AppHeader
- [x] `components/dashboard/` — SummaryCard
- [x] `app/app/layout.tsx` — shell privado con sidebar + header
- [x] `app/app/productor/page.tsx`, `contador/page.tsx`, `entidad/page.tsx`, `admin/page.tsx`
- [x] `app/app/contador/productores/page.tsx`, `/new/page.tsx`
- [x] `app/app/contador/productores/[producerId]/carpeta/page.tsx`
- [x] `app/app/contador/productores/[producerId]/bienes/page.tsx`
- [x] `app/app/admin/organizaciones/page.tsx`

### Pendiente — Ola 4: Autorizaciones y financiación
- [ ] `lib/services/access-requests.ts`, `access-grants.ts`
- [ ] `app/app/productor/autorizaciones/page.tsx`
- [ ] `app/app/entidad/accesos/page.tsx`
- [ ] `components/access/` — AccessRequestForm, AccessRequestTable, GrantScopePicker, AuthorizationDecisionDialog
- [ ] `lib/services/financing-requests.ts`
- [ ] `app/app/entidad/financiacion/page.tsx`, `app/app/productor/financiacion/page.tsx`
- [ ] `components/financing/` — FinancingRequestForm, FinancingKanban, FinancingRequestCard, FinancingStatusBadge
- [ ] `lib/services/notifications.ts`, `lib/services/expirations.ts`
- [ ] `app/app/notificaciones/page.tsx`, `app/app/admin/auditoria/page.tsx`
- [ ] `components/notifications/` — NotificationBell, NotificationList
- [ ] `components/audit/` — AuditLogTable
- [ ] `components/layout/AppHeader.tsx` — conectar campana con notificaciones reales

### Pendiente — Ola 5: Verificación y documentación
- [ ] `scripts/seed-demo-data.ts`
- [ ] `docs/ARQUITECTURA.md`, `MODELO_DATOS.md`, `PERMISOS.md`, `DEPLOY_VERCEL_FIREBASE.md`
- [ ] `docs/QA_CHECKLIST.md`
- [ ] `README.md` completo

---

## 3. RIESGOS ABIERTOS

| Riesgo | Nivel | Notas |
|---|---|---|
| Firestore Database no habilitado | Bloqueante | Habilitar desde Firebase Console antes de probar |
| Firebase Storage no habilitado | Bloqueante para documentos | Habilitar desde Firebase Console |
| Reglas Firestore desplegadas | Medio | Ejecutar `firebase deploy --only firestore:rules,firestore:indexes` |
| Validación de membership server-side | Alto | Servicios actuales son cliente-side — Ola 4 debe agregar Server Actions con validación profunda |
| Custom claims no seteados | Bloqueante para auth | Admin SDK debe setear `roles` y `defaultOrganizationId` en el token — falta endpoint de setup de usuario |
| `organizationId` desde `user.defaultOrganizationId` | Medio | Flujo asume que el usuario tiene defaultOrganizationId — falta endpoint de onboarding |

---

## 4. DECISIONES ARQUITECTÓNICAS TOMADAS

- **Deny by default** en Firestore y Storage desde el día 1
- `organizationId` nunca se toma del cliente — siempre del token de auth
- El contador carga; el productor autoriza — nunca a la inversa sin delegación auditada
- Audit logs obligatorios en toda acción sensible
- Grants vencidos cortan acceso inmediatamente
- Storage path canónico: `orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}`
- Servicios cliente-side en Ola 3 — Server Actions con validación profunda se agregan en Ola 4
- Custom claims (`roles`, `defaultOrganizationId`) se leen del token — Admin SDK los setea server-side

---

## 5. PRÓXIMOS PASOS RECOMENDADOS

1. **Habilitar Firestore + Storage** desde Firebase Console (5 min)
2. **Desplegar reglas**: `firebase deploy --only firestore:rules,firestore:indexes,storage`
3. **Crear endpoint de onboarding** (Server Action): crear organización + usuario + setear custom claims con Admin SDK
4. **Implementar Ola 4**: solicitudes de acceso, grants, Kanban de financiación, notificaciones
5. **Smoke test manual**: crear productor → cargar carpeta → agregar bienes → verificar UI

---

## 6. COMMITS RECIENTES

- `f07f0a4` — fix: add hooks/use-mobile and hooks/use-toast re-exports for shadcn sidebar
- `0629ae6` — feat: Ola 1+2 scaffold inicial - AgroCredit IA SaaS agrofinanciero
- (pendiente) — feat: Ola 3 módulos core

---

## 7. COORDINACIÓN MULTI-IA

**Claude Code:** Dueño de implementación. Sesión 2026-05-28 — Olas 1, 2 y 3 completas.
**Codex:** No tiene módulos asignados actualmente.

### Regla de reparto de trabajo
- Una sola IA trabaja por módulo a la vez
- Al iniciar sesión: leer este HANDOFF y declarar qué módulo se toma
- Al cerrar: actualizar este archivo con lo hecho y lo pendiente
- Si hay conflicto entre lo que dice este HANDOFF y el código real: confiar en el código, actualizar el HANDOFF

### Sesión 2026-05-28 - Claude Code

**Trabajo realizado:**
- Ola 1: scaffold completo (Next.js + Firebase + shadcn/ui + 57 componentes UI)
- Ola 2: tipos, schemas, auth, reglas Firestore/Storage multi-tenant, audit helper, colecciones
- Infraestructura: GitHub repo privado, Firebase project `agrocredit-ia-saas`, Vercel deploy producción
- Ola 3: 10 servicios Firestore, 14+ componentes, 9 páginas, shell privado con sidebar por rol
- type-check: 0 errores

**Archivos principales creados/modificados:**
- `lib/services/` — 10 servicios
- `components/producers/`, `accounting/`, `documents/`, `assets/`, `liabilities/`, `layout/`, `dashboard/`
- `app/app/` — 9 páginas nuevas, layout actualizado

**Validación:** `pnpm type-check` → 0 errores

**Pendientes:**
- Ola 4 (autorizaciones, financiación, notificaciones)
- Habilitar Firestore + Storage en Firebase Console
- Desplegar reglas Firestore/Storage
- Endpoint de onboarding de usuario (custom claims)
