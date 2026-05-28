# Handoff Actual - Carpeta AgroCredit IA

**Fecha:** 2026-05-28  
**Proyecto:** `carpeta-agrocredit-ia`  
**Estado general:** Olas 1, 2, 3, 4 y 5 completas en codigo/documentacion local  
**Stack:** Next.js App Router + Firebase + TypeScript + Vercel  
**Producto:** SaaS privado de carpeta crediticia agrofinanciera

---

## Activadores de protocolo

Cuando el usuario escriba cualquiera de estas frases, aplicar este protocolo antes de tocar codigo:

- `protocolo-inicio` · `handoff` · `protocolo`
- `que hay pendiente` · `carga contexto` / `cargá contexto`

**Entrada obligatoria:** leer este archivo + `docs/MODULE_REGISTRY.md` + `CLAUDE.md` antes de tocar codigo.

**Orden obligatorio de lectura para cualquier IA:**

1. `reports/HANDOFF_ACTUAL.md`
2. `docs/MODULE_REGISTRY.md`
3. `CLAUDE.md`
4. `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md` si el cambio toca alcance, olas o modelo de datos

**Cierre obligatorio de sesion:**

1. Ejecutar `pnpm type-check`.
2. Ejecutar `git status --short` y `git diff --stat`.
3. Actualizar este HANDOFF y `docs/MODULE_REGISTRY.md` si cambio un modulo.
4. Hacer `git add` selectivo y commit cuando Git este disponible.

---

## 1. Contexto de negocio

Carpeta digital agrofinanciera donde el contador carga informacion contable/fiscal del productor una sola vez, y el productor autoriza accesos controlados a bancos, financieras y empresas agrocomerciales.

Lo que NO es:

- No es sistema contable.
- No reemplaza al contador.
- No decide creditos automaticamente.
- No entrega informacion sin autorizacion expresa del productor.

Actores:

| Actor | Permisos clave |
|---|---|
| Productor | Duenio de la informacion; aprueba, rechaza y revoca accesos |
| Contador | Carga y mantiene carpetas de productores vinculados |
| Banco/Financiera | Solicita acceso y gestiona financiacion con grant vigente |
| Empresa agrocomercial | Solicita acceso y gestiona financiacion comercial |
| Admin plataforma | Auditoria, soporte y configuracion |

---

## 2. Estado actual - 2026-05-28

### Infraestructura

- [x] Repo GitHub privado: `Sergiocharata1977/carpeta-agrocredit-ia`
- [x] Firebase project: `agrocredit-ia-saas` - Auth email/pass habilitado
- [x] Vercel production: `carpeta-agrocredit-ia.vercel.app` - build verde previo
- [x] Variables base en Vercel
- [ ] Firestore Database - habilitar/verificar desde Firebase Console
- [ ] Firebase Storage - habilitar/verificar desde Firebase Console
- [ ] Desplegar reglas e indices actualizados

### Ola 1 - Scaffold base

- [x] Next.js App Router + TypeScript + Firebase + shadcn/ui
- [x] `lib/firebase/config.ts`, `admin-sdk.ts`, `auth-client.ts`
- [x] `components/ui/`
- [x] `firestore.rules`, `storage.rules`, `firebase.json`

### Ola 2 - Dominio, seguridad y contratos

- [x] Tipos canonicos en `types/`
- [x] Schemas Zod en `lib/schemas/`
- [x] Auth, roles, session y memberships
- [x] Firestore/Storage deny-by-default
- [x] Auditoria server-side

### Ola 3 - Modulos core

- [x] Productores, estudios contables y vinculos
- [x] Carpeta contable/fiscal
- [x] Bienes, deudas y documentos
- [x] Shell privado con sidebar y header
- [x] Dashboards por rol

### Ola 4 - Autorizaciones, financiacion, notificaciones y auditoria

- [x] `lib/services/access-requests.ts`
- [x] `lib/services/access-grants.ts`
- [x] `lib/services/financing-requests.ts`
- [x] `lib/services/notifications.ts`
- [x] `lib/services/expirations.ts`
- [x] `lib/services/audit-logs.ts`
- [x] APIs privadas:
  - `/api/access-requests`
  - `/api/access-requests/[requestId]/decision`
  - `/api/access-grants/[grantId]/revoke`
  - `/api/financing-requests`
  - `/api/financing-requests/[requestId]/status`
- [x] Productor:
  - `/app/productor/autorizaciones`
  - `/app/productor/financiacion`
- [x] Entidad:
  - `/app/entidad/accesos`
  - `/app/entidad/financiacion`
- [x] Notificaciones:
  - `/app/notificaciones`
  - `NotificationBell`
  - `NotificationList`
- [x] Auditoria:
  - `/app/admin/auditoria`
  - `AuditLogTable`
- [x] Reglas Firestore endurecidas para datos sensibles y grants
- [x] Indices Firestore ampliados para consultas de Ola 4

### Ola 5 - Verificacion, documentacion y deploy

- [x] `scripts/seed-demo-data.ts`
- [x] `scripts/check-security-shape.ts`
- [x] Scripts:
  - `pnpm seed:demo`
  - `pnpm check:security-shape`
  - `pnpm test:smoke`
- [x] `README.md`
- [x] `docs/ARQUITECTURA.md`
- [x] `docs/MODELO_DATOS.md`
- [x] `docs/PERMISOS.md`
- [x] `docs/DEPLOY_VERCEL_FIREBASE.md`
- [x] `docs/QA_CHECKLIST.md`
- [x] `.env.example` actualizado

---

## 3. Riesgos abiertos

| Riesgo | Nivel | Estado |
|---|---|---|
| Firestore Database no habilitado/verificado | Bloqueante operativo | Requiere Firebase Console |
| Firebase Storage no habilitado/verificado | Bloqueante para documentos | Requiere Firebase Console |
| Reglas e indices no desplegados tras Ola 4 | Alto | Ejecutar deploy Firebase |
| Custom claims y onboarding real | Alto | Falta endpoint/flujo productivo para setear roles/defaultOrganizationId |
| Lectura de carpeta sensible por entidad | Medio | Falta endpoint server-side por scope para exponer datos con grant |
| Seed demo no crea usuarios Auth | Bajo | Documentado; crea perfiles Firestore |

---

## 4. Decisiones arquitectonicas vigentes

- `organizationId` operativo no se acepta libremente desde cliente; las APIs usan custom claims y membership.
- `access_grants` se escriben solo con Admin SDK.
- `audit_logs` se escriben solo server-side.
- Productor decide accesos; contador solo autoriza si existe delegacion `canAuthorize=true`.
- Grants vencidos no deben habilitar lectura.
- Notificaciones son internas; no hay email ni WhatsApp en esta ola.
- Entidades no editan productor, balance, impuestos, bienes, deudas ni documentos.

---

## 5. Proximos pasos recomendados

1. Habilitar/verificar Firestore y Storage en Firebase Console.
2. Desplegar reglas e indices:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

3. Crear usuarios reales Auth y setear custom claims.
4. Ejecutar validacion:

```bash
pnpm type-check
pnpm check:security-shape
```

5. Opcional demo controlada:

```bash
$env:SEED_DEMO_DATA_CONFIRM="YES"
pnpm seed:demo
```

6. Siguiente mejora: endpoints server-side de lectura por scope para que bancos/empresas vean resumen contable, balances, impuestos, bienes, deudas y documentos solo si el grant activo lo permite.

---

## 6. Validacion de esta sesion

- `pnpm type-check` - ejecutado antes de docs, OK.
- Validacion final pendiente al cierre: `pnpm type-check` + `pnpm check:security-shape`.

---

## 7. Coordinacion multi-IA

**Sesion 2026-05-28 - Codex**

Trabajo tomado: cierre de Ola 4 y Ola 5, integrando trabajo parcial previo del otro agente.

Archivos principales creados/modificados:

- `app/api/**`
- `app/app/productor/autorizaciones/page.tsx`
- `app/app/productor/financiacion/page.tsx`
- `app/app/entidad/accesos/page.tsx`
- `app/app/entidad/financiacion/page.tsx`
- `app/app/notificaciones/page.tsx`
- `app/app/admin/auditoria/page.tsx`
- `components/access/**`
- `components/financing/**`
- `components/notifications/**`
- `components/audit/**`
- `lib/auth/server-session.ts`
- `lib/auth/server-access.ts`
- `lib/services/**`
- `firestore.rules`
- `firestore.indexes.json`
- `scripts/**`
- `docs/**`
- `README.md`

Regla de continuidad: si hay conflicto entre este handoff y el codigo real, confiar en el codigo y actualizar el handoff.
