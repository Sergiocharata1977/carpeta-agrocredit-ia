# Carpeta AgroCredit IA — Contexto del Proyecto

SaaS privado multi-tenant de carpeta crediticia agrofinanciera. Next.js App Router + Firebase + TypeScript. Productores, contadores, bancos y empresas agrocomerciales.

> **Proyecto STANDALONE (regla anti-recaída):** Agro-Credit es un proyecto totalmente independiente, SIN conexión alguna a `9001app-firebase` / Don Cándido ni a los proyectos Agro Biciuffa. Toda integración externa futura va por API gateway y requiere confirmación explícita del dueño. No reconectar ni deployar a repos/proyectos de Don Cándido.

## Comandos esenciales

```bash
pnpm dev             # desarrollo local
pnpm build           # build de producción
pnpm type-check      # npx tsc --noEmit — correr antes de cada commit
firebase deploy --only firestore:rules    # desplegar reglas Firestore
firebase deploy --only firestore:indexes  # desplegar índices Firestore
firebase deploy --only storage            # desplegar reglas Storage
```

## Arquitectura en una línea

Roles multi-tenant (productor · contador · banco · empresa · admin) + carpeta contable privada + sistema de grants de acceso + trazabilidad de autorizaciones.

## Patrones obligatorios — NUNCA omitir

### API routes (Server Actions o Route Handlers)
```typescript
// Nunca tomar organizationId del body — siempre del token de auth
// Validar membership antes de leer/escribir datos del productor
// Toda acción sensible debe llamar a lib/firebase/audit.ts
```

### Roles canónicos (snake_case)
```
admin_platform
producer
accountant
accounting_firm_admin
bank_user
agro_company_user
```

### Tipos de organización
```
platform · producer · accounting_firm · bank · financial_entity · agro_company
```

### Scopes de acceso (grants)
```
profile_basic · accounting_summary · balance_sheets · income_statements
tax_documents · assets · liabilities · documents · full_credit_folder
```

### Estados de grants
```
draft · requested · approved · rejected · revoked · expired
```

### Estados de financiación
```
draft · requested · pending_authorization · documents_received
in_review · observed · approved · rejected · expired
```

## Módulos canónicos — ver docs/MODULE_REGISTRY.md

Antes de crear cualquier ruta, servicio, componente o colección: buscar en `docs/MODULE_REGISTRY.md`.

## Archivos clave

| Archivo | Para qué |
|---|---|
| `lib/firebase/config.ts` | Firebase cliente |
| `lib/firebase/admin-sdk.ts` | Firebase Admin (server-side) |
| `lib/firebase/collections.ts` | Nombres canónicos de colecciones Firestore |
| `lib/firebase/audit.ts` | Helper server-side para audit_logs |
| `lib/auth/roles.ts` | Helpers de roles y permisos |
| `lib/auth/session.ts` | Lectura de usuario y claims |
| `lib/auth/memberships.ts` | Validación de memberships |
| `firestore.rules` | Reglas multi-tenant — deny-by-default |
| `storage.rules` | Storage privado por productor/organización |
| `types/` | Tipos TypeScript canónicos del dominio |
| `lib/schemas/` | Schemas Zod para validación |
| `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md` | Plan completo y modelo de datos |

## Colecciones Firestore canónicas

```
users · organizations · organization_members
producers · accounting_firms · producer_accountant_links
financial_entities · agro_companies
accounting_periods · balance_sheets · income_statements · tax_documents
assets · liabilities · documents
access_requests · access_grants
financing_requests
audit_logs · notifications
```

## Reglas de seguridad — CRÍTICAS

- **Deny by default** en Firestore y Storage — nada es público
- NUNCA confiar en `organizationId` enviado desde el cliente — validar contra auth/membership
- Productor autoriza acceso; contador solo carga y mantiene
- Banco/empresa solo lee datos si existe grant activo, no vencido y con scope suficiente
- `audit_logs` no son editables desde el cliente
- Documentos privados nunca son lectura pública
- Grants vencidos no habilitan lectura

## Rutas Storage

```
orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}
```

## Stack técnico

- Next.js App Router + TypeScript + React 19
- Firebase 12+ (Firestore/Auth/Storage) + Admin SDK 13+
- Zod + React Hook Form
- Radix UI / shadcn-style + Tailwind + Lucide icons
- Recharts (dashboards)
- Vercel (deploy)

## Coordinación multi-IA

### Entrada obligatoria

Antes de tocar cualquier codigo o documentacion estructural, leer en este orden:

1. `reports/HANDOFF_ACTUAL.md` - estado actual, pendientes, riesgos y que IA trabaja en que.
2. `docs/MODULE_REGISTRY.md` - modulos existentes, rutas, servicios y colecciones canonicas.
3. `CLAUDE.md` - patrones obligatorios, comandos, convenciones y reglas de seguridad.
4. `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md` - referencia completa si el cambio toca alcance, olas o modelo de datos.

### Activadores

Aplicar este protocolo cuando el usuario escriba:
- `handoff`
- `protocolo`
- `protocolo-inicio`
- `que hay pendiente`
- `carga contexto` / `cargar contexto`

### Reglas de trabajo

- Una sola IA dueña por modulo; si el HANDOFF asigna un modulo a otra IA, no reimplementar.
- Buscar en `docs/MODULE_REGISTRY.md` antes de crear rutas, APIs, servicios, componentes o colecciones.
- No crear colecciones fuera del registro canonico sin actualizar `docs/MODULE_REGISTRY.md` primero.
- Nunca tomar `organizationId` del cliente; siempre derivarlo de Auth, claims o membership validado server-side.
- No habilitar lectura/escritura directa por rol en Firestore/Storage para datos de legajo. El acceso de contadores y entidades debe pasar por APIs server-side con vínculo, grant, scope y expiración validados.
- Firestore y Storage quedan deny-by-default; toda regla permisiva debe ser deliberada y documentada.
- Toda accion sensible (crear productor, vincular, autorizar, revocar, subir documento) genera `audit_logs`.

### Cierre obligatorio

Al terminar cada sesion:
1. Ejecutar `pnpm type-check`.
2. Ejecutar `git status --short` y `git diff --stat` si Git esta disponible.
3. Actualizar `reports/HANDOFF_ACTUAL.md` con lo hecho, archivos modificados, pendientes, riesgos y validacion.
4. Actualizar `docs/MODULE_REGISTRY.md` si cambio el estado de algun modulo, ruta, servicio o coleccion.
5. Hacer `git add` selectivo y `git commit -m "descripcion"` cuando el directorio sea un repo Git.
6. Ejecutar `git push origin master` — SIEMPRE pushear al terminar. El deploy en Vercel es automatico desde master.
