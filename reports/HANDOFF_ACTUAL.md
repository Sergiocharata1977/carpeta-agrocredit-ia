# Handoff Actual — Carpeta AgroCredit IA

**Fecha:** 2026-05-28
**Proyecto:** carpeta-agrocredit-ia
**Estado general:** Planificación completa — implementación no iniciada
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
6. Si Git no esta disponible, registrar el bloqueo aca para que el siguiente agente no asuma que hubo commit.

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

### Completado
- [x] Plan completo de producto en `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
- [x] Modelo de datos Firestore definido (20 colecciones)
- [x] Roles, scopes, estados y reglas de seguridad diseñados
- [x] Arquitectura de olas multi-agente documentada (5 olas, 12 agentes)
- [x] CLAUDE.md creado
- [x] MODULE_REGISTRY.md creado
- [x] HANDOFF_ACTUAL.md creado (este archivo)

### Scaffold base existente (Ola 1 parcial)
Archivos ya presentes en el proyecto:
- `app/` — estructura Next.js App Router
- `components/ui/` — componentes UI base
- `lib/firebase/` — config cliente y admin
- `styles/globals.css`
- `firestore.rules`, `storage.rules`, `firebase.json`
- `tsconfig.json`, `next.config.mjs`, `package.json`

### Pendiente — Por implementar

#### Ola 2 — Dominio, seguridad y contratos
- [ ] `types/` — tipos TypeScript canónicos (auth, producer, accounting, assets, access, financing, audit)
- [ ] `lib/schemas/` — schemas Zod de dominio
- [ ] `lib/auth/roles.ts`, `session.ts`, `memberships.ts`
- [ ] `components/auth/AuthGuard.tsx`, `RoleGate.tsx`
- [ ] `app/app/layout.tsx` — layout privado base
- [ ] `app/login/page.tsx` — conectar con Firebase Auth real
- [ ] `lib/firebase/collections.ts` — nombres canónicos
- [ ] `lib/firebase/audit.ts` — helper audit logs server-side
- [ ] `firestore.rules` — reglas multi-tenant deny-by-default
- [ ] `storage.rules` — Storage privado por productor

#### Ola 3 — Módulos core
- [ ] Productores, estudios contables, vínculos productor-contador
- [ ] Carpeta contable/fiscal (periodos, balances, resultados, impuestos, documentos)
- [ ] Bienes muebles, inmuebles y deudas
- [ ] Shell privado (sidebar por rol, dashboards iniciales)

#### Ola 4 — Autorizaciones y financiación
- [ ] Sistema de access_requests y access_grants
- [ ] Panel de autorizaciones del productor
- [ ] Solicitudes de financiación + Kanban
- [ ] Notificaciones internas y alertas de vencimiento
- [ ] Vista de audit_logs para admin

#### Ola 5 — Verificación y documentación
- [ ] Scripts de seed para demo
- [ ] Documentación operativa completa
- [ ] Checklist QA

---

## 3. RIESGOS ABIERTOS

| Riesgo | Nivel | Notas |
|---|---|---|
| Reglas Firestore demasiado abiertas | Alto | Scaffold actual tiene placeholders — implementar en Ola 2 |
| Scaffold vs. plan: verificar que no queden rutas/textos del repo fuente de transparencia | Medio | Revisar antes de implementar Ola 2 |
| Firebase project configurado | Bloqueante | Requiere proyecto Firebase real para funcionar |
| Variables de entorno | Bloqueante | `.env.local` no existe — usar `.env.example` como guía |

---

## 4. DECISIONES ARQUITECTÓNICAS TOMADAS

- **Deny by default** en Firestore y Storage desde el día 1
- `organizationId` nunca se toma del cliente — siempre del token de auth
- El contador carga; el productor autoriza — nunca a la inversa sin delegación auditada
- Audit logs obligatorios en toda acción sensible
- Grants vencidos cortan acceso inmediatamente
- Storage path canónico: `orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}`

---

## 5. PRÓXIMOS PASOS RECOMENDADOS

1. Verificar scaffold actual: `pnpm type-check` y revisar que no queden referencias al repo de transparencia
2. Implementar Ola 2 (tipos + auth + reglas de seguridad) — es el prerequisito de todo lo demás
3. Implementar Olas 3-4 en orden
4. Configurar Firebase project real y variables de entorno

---

## 6. COMMITS RECIENTES

_Sin commits aún — proyecto en estado de planificación_

---

## 7. COORDINACIÓN MULTI-IA

**Claude Code:** Dueño de implementación actual. Actualizó protocolo 2026-05-28.
**Codex:** Trabajo actual 2026-05-28: reforzar documentacion de protocolo multi-IA. No toma ningun modulo funcional.

### Regla de reparto de trabajo
- Una sola IA trabaja por módulo a la vez
- Al iniciar sesión: leer este HANDOFF y declarar qué módulo se toma
- Al cerrar: actualizar este archivo con lo hecho y lo pendiente
- Si hay conflicto entre lo que dice este HANDOFF y el código real: confiar en el código, actualizar el HANDOFF

### Sesion 2026-05-28 - Codex

**Trabajo realizado:**
- Reforzado protocolo de entrada y cierre para coordinacion multi-IA.
- Alineadas reglas de coordinacion en `CLAUDE.md`, `reports/HANDOFF_ACTUAL.md` y `docs/MODULE_REGISTRY.md`.

**Archivos modificados:**
- `reports/HANDOFF_ACTUAL.md`
- `CLAUDE.md`
- `docs/MODULE_REGISTRY.md`

**Pendientes:**
- Inicializar o ubicar el repo Git correcto para poder hacer `git status`, `git diff --stat` y commit.
- Ejecutar `pnpm type-check` al cierre de esta sesion.

**Riesgos nuevos:**
- La carpeta actual no tiene `.git`; no se puede dejar commit local desde este directorio.
