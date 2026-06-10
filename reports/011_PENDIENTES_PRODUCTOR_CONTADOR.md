# Plan 011 — Experiencia Productor y Dashboard Contador

**Fecha:** 2026-06-10  
**Estado:** Implementado en esta sesion

---

## Problema que resuelve

El productor es el titular de la carpeta pero tenia la peor experiencia post-registro:
- Ambos cards del dashboard apuntaban a `/app/productor/autorizaciones` (incorrecto).
- No habia camino claro para completar el perfil ni elegir contador.
- El dashboard del contador mostraba metricas estaticas (`"—"`) y no tenia seccion de vinculos pendientes.

---

## Cambios implementados

### 1. API: POST + GET /api/producer-accountant-links

**Archivo:** `app/api/producer-accountant-links/route.ts` (nuevo)

- `POST` — el productor solicita vinculo con un estudio contable.
  - Valida sesion, rol `producer`, membership activa.
  - Verifica que el estudio existe y esta habilitado (`status: "active"`).
  - Rechaza si ya existe vinculo `active` o `pending` con ese mismo estudio.
  - Crea link con `status: "pending"` y escribe `audit_log`.
- `GET` — el productor consulta sus vinculos actuales.
  - Devuelve lista enriquecida con `firmLegalName`, `firmTaxId`, `firmContactEmail`.

### 2. API: GET /api/contador/vinculos-pendientes

**Archivo:** `app/api/contador/vinculos-pendientes/route.ts` (nuevo)

- Solo accesible para `accountant` / `accounting_firm_admin`.
- Devuelve todos los links con `status: "pending"` donde `accountingFirmId == sesion.defaultOrganizationId`.
- Enriquece cada link con `organizationLegalName` y `taxId` de la organizacion solicitante.

### 3. API: PATCH /api/organizations/[orgId]

**Archivo:** `app/api/organizations/[orgId]/route.ts` (nuevo)

- Solo el titular (`defaultOrganizationId == orgId`) o `admin_platform` puede actualizar.
- Campos permitidos: `legalName`, `taxId`, `personType`, `activity`, `province`, `city`, `address`, `phone`, `email`.
- Valida membership activa antes de escribir. Escribe `audit_log`.

### 4. Pagina /app/productor/perfil

**Archivo:** `app/app/productor/perfil/page.tsx` (nuevo)

- Formulario react-hook-form + zod para completar datos basicos del productor.
- Lee estado actual via `/api/producer-profile/[orgId]` al montar.
- Guarda via `PATCH /api/organizations/[orgId]`.
- Feedback visual inmediato: spinner durante carga, check verde al guardar.

### 5. Pagina /app/productor/contador

**Archivo:** `app/app/productor/contador/page.tsx` (nuevo)

- Muestra el contador activo (si hay vinculo `active`).
- Muestra solicitudes pendientes con estado "Esperando aceptacion".
- Busqueda de estudios contables habilitados via `GET /api/organizations?type=accounting_firm`.
- Boton "Solicitar vinculo" por cada estudio que no tenga vinculo previo.
- Historial de vinculos rechazados/inactivos al final.

### 6. Dashboard productor actualizado

**Archivo:** `app/app/productor/page.tsx` (modificado)

- Cards ahora apuntan a rutas correctas: `/app/productor/perfil` y `/app/productor/contador`.
- Botones de accion rapida en el hero (Completar mi perfil + Elegir contador).
- Tres pasos en orden: 1. Mi Perfil → 2. Mi Contador → 3. Autorizaciones.
- `ProducerLegajoHabilitationsPanel` se mantiene pero se ubica despues de los pasos.

### 7. AppSidebar actualizado

**Archivo:** `components/layout/AppSidebar.tsx` (modificado)

- Productor ahora ve en el menu: Dashboard · Mi Perfil · Mi Contador · Habilitaciones · Autorizaciones · Notificaciones.
- "Configuracion" renombrado a "Autorizaciones" para ser descriptivo.

### 8. Dashboard contador con datos reales

**Archivo:** `app/app/contador/page.tsx` (modificado)

- Carga real de conteo de clientes via `/api/contador/productores`.
- Carga real de vinculos pendientes via `/api/contador/vinculos-pendientes`.
- Muestra seccion `VinculoPendienteCard` cuando hay solicitudes pendientes de productores.
- Al aceptar/rechazar, el contador puede decidir directamente desde el dashboard.

---

## Reconciliacion HANDOFF vs MODULE_REGISTRY (Plan 004 Ola 3)

La inconsistencia entre los dos documentos queda resuelta:

| Item | Estado real |
|---|---|
| `ScopeGuard.tsx` | Implementado (existe en `components/access/`) |
| `GrantStatusBanner.tsx` | Implementado |
| `GrantExpiredBlocker.tsx` | Implementado |
| Vista carpeta entidad con guard | Implementada en `/app/entidad/carpetas/[targetOrgId]` |
| `AuthorizationDecisionDialog` con `approvedDays` editable | Ya estaba implementado |
| `GrantScopeAndDurationForm` standalone | No es necesario — la funcionalidad esta dentro de `AuthorizationDecisionDialog` |
| `VinculoPendienteCard` en dashboard contador | Implementado en esta sesion |
| `ClienteNuevoDialog` en dashboard contador | Ya estaba via `NuevoProductorDialog` |

**Plan 004 Ola 3 puede marcarse como completa.**

---

## Pendientes que QUEDAN fuera de este plan

1. **Carga de perfil en perfil page:** La pagina `/app/productor/perfil` actualmente intenta leer datos via `/api/producer-profile/[orgId]` que devuelve el perfil extendido, no la organizacion basica. En la proxima sesion conviene agregar un campo `organization` en esa respuesta o crear un endpoint `GET /api/organizations/[orgId]` para el titular.

2. **Indicador de completitud del productor:** No se implemento un calculo real de "perfil N% completo". Se puede calcular client-side contando campos no vacios.

3. **Notificacion al estudio cuando llega solicitud:** Cuando un productor solicita un vinculo, no se envia notificacion al estudio. Hay que agregar escritura en la coleccion `notifications` dentro del POST de producer-accountant-links.

4. **QR de acceso:** Marcado como "proximo" en el panel. No implementado.

5. **Metricas reales del dashboard contador:** `Carpetas completas` y `Pendientes de carga` siguen mostrando `"—"`. Requieren query sobre `organization_profiles` o `documents`.

6. **Dashboard admin con datos reales:** Sigue con fallbacks demo en auditoria y metricas.

---

## Validacion

- `pnpm type-check`: pendiente de ejecutar en cierre de sesion.
- Archivos nuevos creados en esta sesion sin errores de escritura.
