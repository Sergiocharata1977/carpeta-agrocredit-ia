# Skill: /gov-edition

Genera planes de implementación en olas para el vertical **Don Cándido — Gobierno Local (ISO 18091)**.
Produce prompts autocontenidos listos para ejecutar en paralelo con el sistema de olas.

## Contexto del vertical municipal

**Arquitectura:** No fork. Un campo `edition: 'enterprise' | 'government'` en `organizations/{orgId}`.
**Core compartido:** auth, permisos, procesos, auditorías, documentos, kanban, IA, portal, app móvil.
**Exclusivo government:** plugins `gov_*` activables como capabilities.

**Plugins gov_* disponibles:**
- `gov_ciudadano_360` — atención ciudadana, reclamos, solicitudes
- `gov_expedientes` — trámites con numeración EXP-YYYY-NNNNN, estados, SLA
- `gov_service_catalog` — carta de servicios públicos con SLA y requisitos
- `gov_org_structure` — secretarías, subsecretarías, direcciones (extiende departments)
- `gov_indicators_kpi` — KPIs de servicio público (tiempo respuesta, NPS ciudadano, fill rate)
- `gov_control_interno` — auditorías con taxonomía municipal
- `gov_normativa` — ordenanzas, decretos, resoluciones, disposiciones
- `gov_maturity_18091` — diagnóstico de madurez ISO 18091 Anexo B (5 dimensiones, 4 niveles)
- `gov_transparencia` — presupuesto, compras, actos administrativos (doble capa: interna + pública)
- `gov_participacion` — encuestas ciudadanas, consultas públicas, presupuesto participativo
- `gov_procurement` — compras públicas con flujo licitación/concurso/compra directa
- `gov_territorial_ops` — obras, mantenimiento urbano, inspecciones georreferenciadas

**Taxonomy government:**
| Enterprise | Government |
|---|---|
| cliente | ciudadano |
| oportunidad | expediente |
| vendedor | agente |
| producto | servicio público |
| pipeline | mesa de entradas |
| cuenta | contribuyente |
| organización | municipio |

**Colecciones Firestore municipales:**
- `citizens` — ciudadanos / vecinos / contribuyentes
- `expedientes` — trámites y reclamos
- `service_catalog` — carta de servicios
- `normativas` — actos administrativos
- `maturity_assessments` — diagnósticos de madurez

---

## Reglas del sistema de olas (SIEMPRE aplicar)

1. **Todos los agentes de una misma ola son independientes entre sí** — no tocan el mismo archivo
2. **Agente de ola N puede leer lo creado por ola N-1**
3. **Cada prompt es autocontenido** — incluye todo el contexto necesario para ejecutar sin preguntar
4. Si dos tareas se tocan → van en olas distintas

### Formato obligatorio de cada agente

```
## Ola N — Agente [Letra] — [Nombre]
**Paralelo con:** [otros agentes de la misma ola]
**Depende de:** [ola anterior o "nada"]

### Objetivo
[una oración: qué crea o modifica]

### Archivos a crear/modificar
- ruta/exacta.ts — descripción

### Prompt completo
[prompt autocontenido con: stack, archivos modelo, tipos exactos, qué NO hacer, criterio de éxito]
```

### Orden habitual de olas para un plugin gov_*

| Ola | Contenido |
|-----|-----------|
| 1 | Foundation: manifest + types + edition field (si no existe) |
| 2 | Backend: Zod schemas + API routes + Firestore rules |
| 3 | Frontend: páginas lista + detalle + formulario |
| 4 | Integración: onboarding seed + IA contextual + portal público |

---

## Stack del proyecto (incluir en cada prompt)

```
Next.js 14.2.18 + TypeScript strict + React 18
Firebase 12.4 (Firestore/Auth) + Admin SDK 13.5
Zod v4.1.12 — z.record(z.string(), z.unknown()) NO z.record(z.unknown())
Radix UI + Tailwind + Framer Motion
withAuth: src/lib/api/withAuth.ts           ← CORRECTO (NO lib/auth/)
resolveAuthorizedOrganizationId: src/middleware/verifyOrganization.ts
Plugin IDs: snake_case SIEMPRE (gov_expedientes NO gov-expedientes)
PLATFORM_PLUGIN_MANIFESTS: src/config/plugins/index.ts
Scaffold de plugin: usar /iso-module como referencia
```

---

## Tarea

Dado el argumento `$ARGUMENTS`, generar el plan de olas correspondiente.

**Si el argumento es un plugin específico** (ej: `gov_expedientes`):
→ Generar olas 1-3 solo para ese plugin con prompts completos.

**Si el argumento es una fase** (ej: `fase 1`, `foundation`):
→ Generar las olas de esa fase específica.

**Si el argumento es `completo` o está vacío**:
→ Mostrar el listado de plugins gov_* disponibles arriba
→ Preguntar qué plugin o fase quiere planificar primero

**Si el argumento es un requerimiento funcional** (ej: `quiero reclamos ciudadanos`):
→ Mapear al plugin correspondiente y generar el plan de ese plugin.

**En todos los casos:**
- Los prompts deben ser suficientemente detallados para un agente frío (sin contexto previo)
- Incluir siempre el stack del proyecto en cada prompt
- Mencionar archivos modelo existentes que el agente debe leer como referencia
- Usar `/iso-module` como base para el scaffold de cada plugin gov_*
- Incluir criterio de éxito verificable
- Recordar el patrón Zod v4 en todos los schemas
- IDs siempre en snake_case

$ARGUMENTS
