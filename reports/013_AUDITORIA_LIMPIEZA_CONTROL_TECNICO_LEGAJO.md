# Auditoria Legajo — 2026-06-15

## Decision ejecutiva

Agro-Credit queda orientado comercialmente como **Legajo** y el riesgo real hoy esta en el plano de control tecnico: el modelo de legajo seguro ya valida grants/scopes en APIs criticas, pero todavia conviven servicios cliente con Firestore/Storage rules permisivas por rol. Se corrigieron dos fallas puntuales de alto impacto sin borrar archivos: reasignacion de claims y campos inconsistentes en endpoints hub. La limpieza destructiva queda bloqueada hasta migrar escrituras/lecturas sensibles a APIs server-side.

## Hallazgos de seguridad

| ID | Severidad | archivo:linea | Estado | Fix / criterio de cierre |
| --- | --- | --- | --- | --- |
| SEG-01 | Critico | `app/api/auth/setup-claims/route.ts:21` | Corregido | El endpoint ya no permite que el propio usuario se reasigne claims. Solo `admin_platform` puede operar y el rol solicitado debe coincidir con la membership activa. Cierre: prueba negativa usuario no-admin recibe 403. |
| SEG-02 | Alto | `firestore.rules:51`, `firestore.rules:94` | Pendiente controlado | Las rules permiten a cualquier contador leer/escribir colecciones de carpeta por rol, sin validar vinculo al productor. No se endurecio aun porque hay servicios cliente activos. Cierre: migrar CRUD de carpeta a APIs server-side y luego dejar Firestore write=false para cliente. |
| SEG-03 | Alto | `storage.rules:26` | Pendiente controlado | Storage permite lectura directa por rol si se conoce la ruta. La vista segura ya usa endpoint con URL firmada, pero upload/lectura cliente siguen existiendo. Cierre: mover uploads/downloads a APIs con Admin SDK, grants y URLs firmadas cortas; despues `allow read, write: if false`. |
| SEG-04 | Medio | `app/api/hub/producers/route.ts:34`, `app/api/hub/credit-folders/[producerId]/route.ts:42` | Corregido | Los endpoints hub consultaban campos legacy (`granteeOrganizationId`, `producerOrganizationId`) que no existen en el modelo canonico. Se cambio a `grantedToOrganizationId` y `targetOrganizationId`. Cierre: prueba con API key y grant aprobado devuelve productores/carpeta. |
| SEG-05 | Medio | `app/api/cron/expire-grants/route.ts:8` | Mantener | Cron exige `CRON_SECRET` via Bearer. Cierre: verificar env en Vercel y rotacion documentada. |

## Hallazgos de deuda tecnica

| # | Categoria | archivo | Accion | Impacto |
| --- | --- | --- | --- | --- |
| 1 | Refactorizar | `lib/services/balance-sheets.ts`, `income-statements.ts`, `tax-documents.ts`, `assets.ts`, `liabilities.ts`, `documents.ts`, `accounting-periods.ts` | Migrar escrituras cliente a API routes con `verifyRequestSession` + validacion de vinculo. | Permite cerrar Firestore/Storage rules sin romper el dashboard del contador. |
| 2 | Fusionar | Endpoints de carpeta readonly y hub | Extraer helper comun para validar grant activo, expiracion y scopes. | Reduce divergencias de nombres de campos y reglas de acceso. |
| 3 | Mantener | `app/api/cron/expire-grants/route.ts` | Mantener con secreto y auditoria. | Ya cumple control minimo; falta test automatizado. |
| 4 | Eliminar luego | Campos legacy `granteeOrganizationId` / `producerOrganizationId` si existen en datos viejos | Crear migracion o compat temporal antes de borrar. | Evita que integraciones antiguas queden invisibles. |

## Metricas

| Metrica | Resultado |
| --- | --- |
| Archivos borrados | 0 |
| Limpieza destructiva | No ejecutada |
| Endpoints/rules revisados | Auth claims, hub API, carpeta readonly/download, cron, Firestore rules, Storage rules |
| Servicios cliente sensibles detectados | 7 familias de servicios |
| Validacion liviana | `pnpm exec tsx scripts/check-security-shape.ts` OK |
| Validacion TypeScript | `pnpm exec tsc --noEmit --pretty false` sin resultado: timeout a 5 minutos |

## Arquitectura simplificada

Para Legajo, el camino mas seguro es una unica frontera server-side para datos sensibles:

1. Cliente pide acciones de legajo a `/api/...`.
2. API valida Firebase ID token, membership, vinculo contador-productor o grant entidad-productor.
3. API escribe/lee con Admin SDK.
4. Firestore y Storage quedan deny-by-default para colecciones/archivos de carpeta.
5. Entidades externas usan API key + scopes, siempre contra campos canonicos `targetOrganizationId` y `grantedToOrganizationId`.

## Pendientes priorizados

| Prioridad | Pendiente | Criterio de cierre |
| --- | --- | --- |
| P1 | Migrar CRUD de carpeta contable/documental a APIs server-side. | Ningun componente usa `addDoc`, `updateDoc`, `deleteDoc`, `uploadBytes` directo para datos de legajo. |
| P1 | Endurecer `firestore.rules` y `storage.rules` despues de la migracion. | Colecciones de legajo y rutas `orgs/{orgId}/producers/{producerId}` quedan sin acceso directo cliente salvo excepciones documentadas. |
| P2 | Agregar tests negativos para `setup-claims`. | Usuario no-admin no puede cambiar su rol; admin no puede setear rol distinto a membership activa. |
| P2 | Test de API hub con grant aprobado y vencido. | Grant vigente devuelve carpeta; grant vencido devuelve 403/lista vacia. |
| P3 | Revisar dependencias UI no usadas y duplicacion de componentes shadcn. | Reporte de deps/componentes con accion mantener/eliminar, sin borrar hasta confirmar uso. |

## Regla anti-recaida

Documentada en `CLAUDE.md`: no habilitar lectura/escritura directa por rol en Firestore/Storage para datos de legajo. El acceso de contadores y entidades debe pasar por APIs server-side con vinculo, grant, scope y expiracion validados.

