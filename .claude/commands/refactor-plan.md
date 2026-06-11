# /refactor-plan

Genera un plan de refactor detallado para un área o problema específico del proyecto.

## Argumentos

`$ARGUMENTS` — scope del refactor (ej: `design-system-tokens`, `api-consistency`, `types-cleanup`, `auth-flow`, `docs-components`)

## Procedimiento

1. Entender el scope: leer los archivos afectados
2. Identificar el estado actual vs. el estado objetivo
3. Estimar el impacto (cuántos archivos cambian)
4. Ordenar cambios para minimizar riesgo
5. Generar el plan paso a paso con criterios de validación

## Scopes predefinidos

### `design-system-tokens`
Refactorizar todos los componentes para usar tokens semánticos en lugar de colores hardcodeados.
- Archivos a buscar: todos los `.tsx` en `src/components/` con `bg-slate-`, `text-slate-`, `border-slate-`
- Objetivo: 0 colores hardcodeados, 100% tokens semánticos

### `api-consistency`
Estandarizar todas las API routes para usar el mismo patrón de auth y error handling.
- Archivos: todos los `route.ts` en `src/app/api/`
- Verificar: withAuth, resolveAuthorizedOrganizationId, Zod validation, error format

### `types-cleanup`
Limpiar y estandarizar tipos TypeScript.
- Buscar: `any`, tipos duplicados, campos faltantes (organizationId, timestamps)
- Objetivo: strict TypeScript sin `any`

### `auth-flow`
Unificar el flujo de autenticación y autorización.
- Verificar: middleware, withAuth, org resolver
- Eliminar: inline org checks, auth duplicada

### `react-performance`
Eliminar antipatrones de rendimiento React en componentes del proyecto.
- Buscar: componentes definidos dentro de componentes, `&&` con valores falsy numéricos, objetos/arrays literales como default props, `useEffect` modelando lógica de usuario
- Buscar con Grep: `function.*{` dentro de funciones component, `\.length &&`, `useState({`, `useState([`
- Objetivo: 0 remounts innecesarios, 0 renders de "0", props estables para `memo()`

**Checklist de antipatrones a buscar:**
```bash
# Componentes dentro de componentes (buscar function/const dentro de returns)
grep -rn "return.*function\|const.*= (" src/components/ --include="*.tsx"

# Riesgo de renderizar "0"
grep -rn "\.length &&\|\.size &&" src/ --include="*.tsx"

# Barrel imports del design system (carga todo el barrel)
grep -rn "from '@/components/design-system/layout'" src/ --include="*.tsx"
grep -rn "from '@/components/design-system/primitives'" src/ --include="*.tsx"
```

### `docs-components`
Actualizar los componentes del sistema de documentación para usar el design system.
- Archivos: `src/components/docs/`, `src/app/(dashboard)/documentacion/`
- Objetivo: usar BaseCard, PageHeader del design system, tokens semánticos

## Checklist del plan de refactor

### Antes de empezar
- [ ] ¿El área tiene tests que funcionan como safety net?
- [ ] ¿El build actual pasa (`npm run build`)?
- [ ] ¿Hay cambios sin commitear que pueden interferir?
- [ ] ¿Cuántos archivos se van a tocar? (si son más de 20, dividir en sub-planes)

### Durante el refactor
- [ ] Cambiar UN archivo a la vez
- [ ] Verificar que el build pasa después de cada cambio significativo
- [ ] No mezclar refactor con nuevas features
- [ ] Mantener el comportamiento externo idéntico

### Al finalizar
- [ ] `npm run build` exitoso
- [ ] `npm test` pasando
- [ ] PR con descripción clara del patrón cambiado

## Formato de reporte

```
## Plan de Refactor — [SCOPE] — [FECHA]

### Estado actual
- [descripción del problema con ejemplos concretos y archivos]

### Estado objetivo
- [descripción del estado final esperado]

### Impacto estimado
- Archivos afectados: ~X
- Riesgo: ALTO/MEDIO/BAJO
- Esfuerzo: S (horas) / M (días) / L (semanas)

### Dependencias
- Requiere que [X] esté hecho primero (si aplica)
- No puede hacerse en paralelo con [Y] (si aplica)

### Plan de ejecución

#### Fase 1 — [nombre] (X archivos)
1. [acción concreta con archivo específico]
2. ...
Validación: `npm run build` pasa

#### Fase 2 — [nombre] (X archivos)
1. ...
Validación: `npm test` pasa

### Archivos a modificar (ordenados por prioridad)
| # | Archivo | Cambio | Riesgo |
|---|---------|--------|--------|
| 1 | src/... | Reemplazar X por Y | Bajo |

### Script de búsqueda para verificación final
```bash
# Verificar que no quedan ocurrencias del patrón viejo:
grep -r "bg-slate-" src/components/ --include="*.tsx"
```

### Criterio de éxito
- [ ] 0 ocurrencias del patrón viejo en los archivos afectados
- [ ] build y tests pasando
- [ ] Code review aprobado
```

## Notas de uso

- Para refactors grandes (20+ archivos), generar sub-planes por módulo
- Siempre tener un commit "antes" para poder hacer rollback fácil
- Preferir búsqueda-y-reemplazo atómico (Edit con replace_all) para cambios de nombre
- Documentar el nuevo patrón en CLAUDE.md o en un comentario en el archivo de tokens
