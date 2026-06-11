# /analyze-module

Análisis profundo de un módulo específico del proyecto: arquitectura, estado, deuda técnica y oportunidades.

## Argumentos

`$ARGUMENTS` — nombre del módulo a analizar (ej: `crm`, `onboarding`, `rrhh`, `auditorias`, `capabilities`, `ia`)

## Procedimiento

1. Mapear todos los archivos del módulo (tipos, APIs, componentes, tests, docs)
2. Leer los archivos clave (tipos, API principal, componente principal)
3. Evaluar cada aspecto con calificación ALTO/MEDIO/BAJO
4. Identificar riesgos y oportunidades
5. Generar reporte estructurado

## Directorios a explorar por módulo

Para el módulo `$ARGUMENTS`, buscar en:

```
src/types/         → tipos relacionados al módulo
src/lib/           → servicios y lógica de negocio
src/app/api/       → endpoints REST
src/app/(dashboard)/  → páginas del módulo
src/components/    → componentes UI del módulo
src/ai/            → si el módulo tiene integración IA
content/docs/      → documentación interna del módulo
*.test.ts          → tests del módulo
```

## Checklist de análisis

### Arquitectura
- [ ] ¿Los tipos están definidos en `src/types/[modulo].ts`?
- [ ] ¿Las APIs usan `withAuth` y `resolveAuthorizedOrganizationId`?
- [ ] ¿Hay validación Zod en las APIs?
- [ ] ¿El modelo tiene `organizationId` en todos los documentos?
- [ ] ¿Existen Firestore rules para las colecciones del módulo?

### Funcionalidad
- [ ] ¿Qué operaciones CRUD están implementadas?
- [ ] ¿Qué flujos de negocio están completos vs. pendientes?
- [ ] ¿El módulo tiene capability/flag de acceso?
- [ ] ¿Hay integración con otros módulos? (referencias cruzadas)

### Calidad y seguridad
- [ ] ¿Cuántos tests existen? (contar archivos `.test.ts`)
- [ ] ¿Hay tests de org-scoping (cross-org security)?
- [ ] ¿Las APIs validan el rol del usuario?
- [ ] ¿Hay manejo de errores consistente?

### UX y documentación
- [ ] ¿El módulo tiene documentación in-app en `content/docs/`?
- [ ] ¿Usa el design system (BaseCard, PageHeader, tokens)?
- [ ] ¿Hay estados vacíos (empty states) en la UI?
- [ ] ¿Está integrado con `ContextHelpButton`?

### Deuda técnica
- [ ] ¿Hay TODOs o FIXMEs en el código?
- [ ] ¿Hay `any` o castings TypeScript inseguros?
- [ ] ¿Hay colores hardcodeados en lugar de tokens?
- [ ] ¿Hay lógica duplicada con otros módulos?

## Formato de reporte

```
## Análisis de Módulo — [NOMBRE] — [FECHA]

### Inventario de archivos
| Tipo | Archivos | Líneas estimadas |
|------|---------|-----------------|
| Tipos | src/types/[modulo].ts | ~XXX |
| APIs | src/app/api/[modulo]/ | N endpoints |
| Componentes | src/components/[modulo]/ | ~XXX líneas |
| Tests | X archivos .test.ts | |
| Docs in-app | content/docs/[modulo]/ | X archivos |

### Evaluación por aspecto
| Aspecto | Estado | Evidencia | Nota |
|---------|--------|-----------|------|
| Tipos TypeScript | ALTO/MEDIO/BAJO | src/types/... | ... |
| Seguridad multi-tenant | | | |
| Tests | | | |
| Documentación interna | | | |
| Design system | | | |
| Capability gating | | | |

### Calificación global: ALTO / MEDIO-ALTO / MEDIO / BAJO

### Top 3 riesgos
1. [riesgo con archivo específico]
2. ...
3. ...

### Top 3 oportunidades
1. [mejora concreta]
2. ...
3. ...

### Plan de acción recomendado
| Acción | Urgencia | Esfuerzo | Impacto |
|--------|----------|----------|---------|
| ... | Alta/Media/Baja | S/M/L | Alto/Medio/Bajo |
```

## Niveles de análisis

- **Superficial** (default): solo leer tipos, API principal y página principal
- **Profundo** (agregar `--deep`): leer todos los archivos del módulo incluyendo tests
- **Comparativo** (agregar `--compare [otro-modulo]`): comparar con otro módulo para identificar gaps
