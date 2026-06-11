# Skill de Aislamiento — Reparación Progresiva de Builds Fallados

Sos el agente de aislamiento y recuperación de builds de Don Cándido. Tu misión es restaurar el deploy en Vercel de forma sistemática: primero volvés al verde, después reparás commit por commit sin avanzar hasta confirmar que cada build da verde.

**Regla de oro: nunca avanzar al siguiente build roto sin confirmar que el anterior está verde en Vercel.**

---

## PASO 1 — Inventario de builds fallados

Usá el MCP de Vercel para listar deployments del proyecto `prj_QPS7RGLpFDYVUycqCJO9kXQRfQ53` (team `team_1Qiu4kWoC2qA9SP4mKibkWAB`).

Construí una tabla ordenada cronológicamente (más antiguo primero):

| # | Deploy ID | Commit SHA | Mensaje | Estado |
|---|-----------|-----------|---------|--------|
| 1 | ... | ... | ... | ERROR |

Identificá también:
- **Último build verde** (el punto de partida)
- **Cantidad de builds fallados** (cuántos hay que reparar)
- **Archivos afectados** por cada commit fallado (usar `git diff <sha_verde>..<sha_roto> --name-only`)

---

## PASO 2 — Volver al punto 0 (posición verde)

El objetivo es tener Vercel en verde inmediatamente antes de empezar las reparaciones.

**Estrategia:** Crear un commit de aislamiento que deshace temporalmente todos los cambios de los commits fallados.

```bash
# Identificar el último commit verde
COMMIT_VERDE=<sha del último build READY>

# Ver qué archivos cambiaron desde el verde hasta hoy
git diff ${COMMIT_VERDE}..HEAD --name-only

# Revertir solo los archivos problemáticos al estado del commit verde
# (NO hacer git revert — hacer checkout de archivos individuales)
git checkout ${COMMIT_VERDE} -- <archivo1> <archivo2> ...
```

Si la cantidad de archivos es grande o hay archivos nuevos que no existían en el commit verde, comentar el código problemático en lugar de eliminar archivos:

- **Páginas nuevas con errores:** comentar todo el contenido y dejar solo el export default mínimo
- **API routes nuevas con errores:** comentar el handler y retornar `{ ok: false }` temporalmente
- **Componentes nuevos con errores:** comentar la implementación y exportar un placeholder

Hacer el commit de aislamiento:
```bash
git add <archivos_afectados>
git commit -m "fix(aislamiento): revert temporal a estado verde para reparación progresiva"
git push origin main
```

**Monitorear** el deploy en Vercel con el MCP hasta que esté `READY`. Si sigue en `ERROR`, diagnosticar ese error antes de continuar.

---

## PASO 3 — Reparar primer build fallado

Tomá el build fallado más antiguo de la lista del Paso 1.

### 3.1 — Diagnóstico del primer build

```bash
# Ver qué cambió en ese commit
git diff <sha_verde>..<sha_primer_fallado> --name-only
git diff <sha_verde>..<sha_primer_fallado> -- <archivo_sospechoso>
```

Obtener los build logs del deploy fallado via MCP Vercel para ver el error exacto.

Clasificar cada error:
- **TypeScript:** tipo incorrecto, export faltante, import roto
- **Next.js runtime:** `useSearchParams` sin `<Suspense>`, `useRouter` en Server Component
- **Dynamic server usage:** `nextUrl.searchParams` / `request.headers` sin `force-dynamic`
- **Module not found:** import de path inexistente
- **ESLint:** regla que rompe el build

### 3.2 — Aplicar fixes del primer build

Para cada error identificado, aplicar el fix correcto de raíz:

**`useSearchParams` sin Suspense:**
```tsx
// Extraer el componente que usa useSearchParams
function PageContent() {
  const searchParams = useSearchParams();
  // ... resto del componente
}
// Wrapper con Suspense
export default function Page() {
  return <Suspense fallback={<div>Cargando...</div>}><PageContent /></Suspense>;
}
```

**API route con `nextUrl.searchParams` o `request.headers`:**
```typescript
export const dynamic = 'force-dynamic'; // Agregar al inicio del archivo
```

**Import roto:**
```typescript
// Corregir el path al correcto
import { algo } from '@/ruta/correcta';
```

**TypeScript estricto:**
```typescript
// Corregir el tipo, no usar `as any`
```

### 3.3 — Verificar TypeScript local

```bash
npx tsc --noEmit
# Debe salir exit code 0 antes de commitear
```

### 3.4 — Commit y push del primer fix

```bash
git add <archivos_reparados>
git commit -m "fix(aislamiento-1): repara <descripción del error> — build <sha_corto>"
git push origin main
```

### 3.5 — Monitorear hasta VERDE

Usar MCP Vercel para verificar que el nuevo deploy esté `READY`.

- Si está `READY` → continuar al Paso 4
- Si está `ERROR` → obtener los nuevos logs, diagnosticar, reparar, commitear y monitorear de nuevo
- **No avanzar al siguiente build hasta que este esté verde**

---

## PASO 4 — Reparar segundo build fallado

Repetir el mismo proceso del Paso 3 para el segundo commit fallado de la lista.

Recordar que ahora el "estado base" para comparar no es el commit verde original sino el commit que acabamos de reparar.

```bash
# Comparar segundo commit fallado vs el primer fix ya aplicado
git diff <sha_primer_fix>..HEAD --name-only
```

Aplicar fixes, commitear, pushear, monitorear hasta VERDE.

---

## PASO 5 — Continuar con todos los builds

Repetir el ciclo para cada build fallado en orden cronológico:

```
Para cada build fallado (del más antiguo al más reciente):
  1. Diagnosticar errores del build
  2. Aplicar fixes de raíz
  3. Verificar TypeScript local (exit 0)
  4. Commit + push
  5. Monitorear Vercel hasta READY
  6. Si ERROR → diagnosticar nuevo error, fix, repetir desde 4
  7. Solo cuando READY → pasar al siguiente build
```

---

## Patrones frecuentes en este proyecto

### Next.js 14 App Router — errores de build comunes

| Error | Fix |
|---|---|
| `useSearchParams()` sin Suspense | Extraer a componente hijo + `<Suspense>` wrapper |
| `DYNAMIC_SERVER_USAGE` en API route | `export const dynamic = 'force-dynamic'` al inicio |
| `useRouter` en Server Component | Agregar `'use client'` al archivo |
| Import desde path incorrecto | Corregir el path, buscar con Glob |
| `z.record(valueType)` con 1 arg | Cambiar a `z.record(z.string(), valueType)` |
| Bundle size excedido | Dynamic import: `dynamic(() => import(...))` |

### Seguridad — nunca romper estos patrones

- `withAuth` en todas las API routes privadas
- `resolveAuthorizedOrganizationId` para scoping de org
- Nunca tomar `organization_id` de body/query — siempre del token

---

## Contexto del proyecto

- **Proyecto Vercel:** `prj_QPS7RGLpFDYVUycqCJO9kXQRfQ53`
- **Team:** `team_1Qiu4kWoC2qA9SP4mKibkWAB`
- **Branch:** `main`
- **Stack:** Next.js 14.2.18 + TypeScript strict + Firebase
- **Zod:** v4.1.12 — `z.record()` requiere 2 argumentos
- **MCP Vercel disponible:** usar `list_deployments`, `get_deployment_build_logs` para monitoreo

---

## Resumen del protocolo

```
INVENTARIO → PUNTO 0 VERDE → [FIX #1 → VERDE] → [FIX #2 → VERDE] → ... → TODOS VERDE
                                     ↑
                          No avanzar si no es VERDE
```
