# /ui-review

Verifica que un componente o página cumpla con el design system del proyecto.

## Argumentos

`$ARGUMENTS` — ruta del componente o página a verificar (ej: `src/components/docs/DocumentationLayout.tsx`)

## Procedimiento

1. Leer el archivo indicado
2. Leer los tokens del design system (colores, tipografía, spacing, radius)
3. Verificar uso de primitivos (BaseCard, BaseButton, BaseBadge, PageHeader)
4. Detectar colores hardcodeados vs tokens semánticos
5. Reportar incumplimientos con la corrección exacta

## Archivos de referencia del design system

```
src/components/design-system/
  tokens/
    colors.ts      ← colores semánticos y moduleAccents
    typography.ts  ← clases para h1/h2/h3/p/label
    spacing.ts     ← padding.card, padding.page, gap.*
    radius.ts      ← radius.card, radius.button, etc.
    shadows.ts     ← shadow.card, shadow.dropdown, etc.
  primitives/
    BaseCard.tsx   ← usar en lugar de <div> con border+shadow
    BaseButton.tsx ← usar en lugar de <button> custom
    BaseBadge.tsx  ← usar en lugar de <span> de badge
  layout/
    PageHeader.tsx ← usar en lugar de headers custom
```

## Checklist de verificación

### Colores — ERRORES MÁS COMUNES

| ❌ Hardcodeado (mal) | ✅ Token semántico (bien) |
|---------------------|--------------------------|
| `bg-slate-50` | `bg-background` |
| `bg-white` | `bg-card` |
| `bg-slate-100` | `bg-muted` |
| `text-slate-900` | `text-foreground` |
| `text-slate-500` | `text-muted-foreground` |
| `text-slate-600` | `text-muted-foreground` |
| `border-slate-200` | `border-border/50` |
| `ring-slate-200` | `ring-border` |
| `shadow-sm` (inline) | usar `BaseCard` con shadow del token |

### Tipografía

| ❌ Hardcodeado (mal) | ✅ Token (bien) |
|---------------------|----------------|
| `text-3xl font-bold` | `${typography.h1}` |
| `text-2xl font-semibold` | `${typography.h2}` |
| `text-xl font-medium` | `${typography.h3}` |
| `text-sm text-slate-600` | `${typography.p}` |

### Primitivos

- [ ] Cards con borde y sombra → usar `BaseCard` (NO `<div className="border shadow rounded-xl">`)
- [ ] Botones → usar `BaseButton` (NO `<button className="...">` custom salvo excepciones)
- [ ] Badges de módulo → usar `BaseBadge` o `DocBadge` (según contexto)
- [ ] Header de página con breadcrumbs → usar `PageHeader` de `@/components/design-system/layout/PageHeader`
  (NO `@/components/ui/PageHeader` que es una versión anterior)

### Colores de módulo (moduleAccents)

Los colores de acento por sistema deben venir de `moduleAccents` en `colors.ts`:
- `quality` → blue
- `agro` → green
- `finance` → amber
- `industry` → purple

No hardcodear `text-emerald-600` para ISO — usar el acento del módulo `quality`.

## Formato de reporte

```
## Revisión UI — [RUTA DEL ARCHIVO]

### Estado: ✅ CUMPLE / ⚠️ MEJORAS RECOMENDADAS / ❌ NO CUMPLE

### Incumplimientos encontrados

| Línea | Código actual | Corrección |
|-------|--------------|-----------|
| L42   | `bg-slate-50` | `bg-background` |
| L67   | `text-slate-900 font-semibold` | `${typography.h3}` |
| L89   | `<div className="border border-slate-200 shadow-sm rounded-xl">` | `<BaseCard>` |

### Primitivos no usados
- [ ] `PageHeader` de @/components/design-system/layout — reemplaza header en L15-30
- [ ] `BaseCard` — reemplaza div con border en L85-120

### Props positivos (qué SÍ está bien)
- [lista de cosas bien hechas]

### Correcciones aplicadas
[Si se realizaron cambios, listar líneas modificadas]
```

### Rendimiento del componente (React best practices)

Verificar junto con el análisis de design system:

| ❌ Antipatrón | ✅ Corrección | Por qué |
|--------------|--------------|---------|
| `{count && <Badge>}` | `{count > 0 && <Badge>}` o `{!!count && <Badge>}` | `&&` con `0` renderiza el número "0" en pantalla |
| Componente definido dentro de otro componente | Extraer fuera o memoizar con `memo()` | Causa remount completo en cada render del padre |
| `const items = list.filter(...).map(...)` en render | `const items = useMemo(() => ..., [list])` o computar fuera | Dos iteraciones en cada render |
| `useState(expensiveInit())` | `useState(() => expensiveInit())` | Lazy init: la función se llama una sola vez |
| `const OBJ = { key: 'val' }` dentro del componente | Mover fuera del componente o `useMemo` | Objeto nuevo en cada render → breaks `memo()` |
| `<Icon />` estático repetido dentro del JSX | `const icon = <Icon />` fuera del componente | JSX hoisted no se recrea |
| `useEffect` para reaccionar a acción de usuario | Lógica en el event handler directamente | Effects son para sincronizar estado externo, no UI |

**Condicional rendering — regla crítica:**
```tsx
// ❌ Mal — renderiza "0" si items.length es 0
{items.length && <List items={items} />}

// ✅ Bien
{items.length > 0 && <List items={items} />}
```

**Componentes dentro de componentes — regla crítica:**
```tsx
// ❌ Mal — SubComp se remonta en cada render de Parent
function Parent() {
  function SubComp() { return <div>...</div> }
  return <SubComp />
}

// ✅ Bien — extraído al nivel del módulo
function SubComp() { return <div>...</div> }
function Parent() { return <SubComp /> }
```

Agregar al reporte si se detectan:
```
### Antipatrones de rendimiento encontrados
| Línea | Antipatrón | Corrección |
|-------|-----------|-----------|
| L34   | `{errors.length && <Alert>}` | `{errors.length > 0 && <Alert>}` |
```

## Cómo aplicar las correcciones

1. Primero generar el reporte sin modificar
2. Preguntar si aplicar las correcciones automáticamente
3. Si sí: editar el archivo línea a línea usando Edit tool
4. Verificar que el componente siga compilando: buscar imports faltantes
5. Agregar imports de BaseCard, BaseButton, etc. si no están presentes:
   ```typescript
   import { BaseCard } from '@/components/design-system/primitives/BaseCard';
   import { PageHeader } from '@/components/design-system/layout/PageHeader';
   ```
