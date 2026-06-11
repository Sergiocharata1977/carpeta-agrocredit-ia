# /arch-review

Revisión arquitectural completa del proyecto. Evalúa patrones de código, consistencia, acoplamiento y escalabilidad.

## Cuándo usar

- Antes de iniciar un refactor importante
- Cuando se sospecha deuda técnica acumulada
- Para onboarding de un nuevo desarrollador al proyecto
- Para validar que el proyecto sigue sus propios patrones

## Procedimiento

1. Leer los archivos de arquitectura clave (middleware, withAuth, types index, Firestore rules)
2. Muestrear 5 APIs random para verificar consistencia de patrones
3. Muestrear 5 componentes random para verificar design system
4. Analizar el grafo de dependencias entre módulos
5. Reportar hallazgos con evidencia concreta

## Archivos de arquitectura a leer SIEMPRE

```
src/middleware.ts                         ← gate global
src/lib/api/withAuth.ts                   ← wrapper APIs (CORRECTO: lib/api/)
src/middleware/verifyOrganization.ts      ← resolveAuthorizedOrganizationId
firestore.rules                           ← reglas multi-tenant
storage.rules                             ← reglas de storage
src/config/plugins/index.ts              ← catálogo de plugins (PLATFORM_PLUGIN_MANIFESTS)
next.config.js                            ← transpile, headers
package.json                              ← dependencias y versiones
```

## Áreas de evaluación

### 1. Consistencia de patrones de API

Verificar que TODAS las API routes:
- Usan `withAuth` de `src/lib/api/withAuth.ts` (NO de `src/lib/auth/withAuth.ts`)
- Usan `resolveAuthorizedOrganizationId` (no inline org check)
- Tienen validación Zod del body en POST/PUT
- Retornan errores con formato consistente

Método: muestrear 5 routes en `src/app/api/` con grep y leerlas.

### 2. Plugin/Capability system

- ¿Todos los plugins tienen manifest en `src/config/plugins/`?
- ¿Los manifests están registrados en `PLATFORM_PLUGIN_MANIFESTS`?
- ¿Los IDs son snake_case (no kebab-case)?
- ¿El gating usa `hasCapability(plugin_id)` o scope check?

### 3. Acoplamiento entre módulos

Buscar imports cruzados entre módulos:
- ¿Los componentes de `crm/` importan desde `auditorias/`?
- ¿Las APIs de un módulo llaman directamente a APIs de otro?
- ¿Hay un módulo que es importado por muchos otros (riesgo de cambio)?

### 4. Consistencia de tipos

- ¿Todos los tipos tienen `organization_id: string`?
- ¿Todos tienen `created_at`, `updated_at`, `created_by`?
- ¿Hay tipos duplicados entre archivos?
- ¿Se usa `unknown` en lugar de `any` donde corresponde?

### 5. Consistencia de UI

- ¿Las páginas usan `PageHeader` del design system?
- ¿Las cards usan `BaseCard`?
- ¿Los colores son tokens semánticos o hardcodeados?
- ¿Hay patrones de loading/empty state consistentes?

### 6. Contabilidad event-driven

- ¿Los plugins que registran operaciones económicas llaman `emitAccountingEvent()`?
- ¿Tienen reglas en `src/lib/accounting/rules/`?
- ¿Usan `idempotency_key` único?

### 7. Cobertura de tests

- ¿Cuántas API routes tienen tests? (buscar en `src/__tests__/`)
- ¿Los tests de seguridad cubren cross-org scenarios?

### 8. Gestión de errores

- ¿Las APIs retornan status codes correctos (404, 403, 409, 422)?
- ¿Los errores tienen mensajes útiles?
- ¿Los errores se loguean en Sentry correctamente?

## Formato de reporte

```
## Revisión Arquitectural — [FECHA]

### Estado global: CONSISTENTE / MAYORMENTE CONSISTENTE / INCONSISTENTE

### Patrones de API
- Muestra analizada: [lista de 5 routes]
- Cumplimiento withAuth: X/5
- Cumplimiento resolveAuthorizedOrganizationId: X/5
- Validación Zod: X/5
- Hallazgos: [...]

### Sistema de plugins
- Plugins con manifest formal: X de Y
- IDs kebab-case detectados: [lista — deben migrarse]
- Gating correcto: X/Y

### Acoplamiento
- Módulos más acoplados: [lista]
- Dependencias circulares detectadas: SÍ/NO
- Recomendación: [...]

### Tipos TypeScript
- Inconsistencias encontradas: [lista con archivos]
- Uso de `any`: X ocurrencias en Y archivos
- Campos faltantes: [...]

### UI / Design System
- Páginas sin PageHeader: [lista]
- Colores hardcodeados detectados: [lista de archivos]
- Estimación de compliance: X% de archivos revisados

### Cobertura de tests
- APIs con test: estimado X% (basado en muestra)
- Tests de seguridad cross-org: [lista]

### Top 5 inconsistencias críticas
| # | Inconsistencia | Archivos afectados | Esfuerzo de fix |
|---|---------------|-------------------|-----------------|

### Recomendaciones de arquitectura
1. [recomendación con justificación]
2. ...
```

## Notas

- Este análisis es costoso en tokens — usarlo cuando realmente se necesite
- Para módulos específicos, preferir `/analyze-module [nombre]`
- Combinar con `/refactor-plan` para accionar sobre los hallazgos
