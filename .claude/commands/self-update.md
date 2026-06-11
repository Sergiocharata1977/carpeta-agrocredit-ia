# Skill: /self-update

Revisa y actualiza automáticamente el sistema de skills, la memoria del proyecto (MEMORY.md) y los documentos de referencia para mantenerlos alineados con el estado real del codebase.

**Ejecutar al inicio de cada sesión importante, o cuando se hayan completado varios planes/olas.**

---

## Cuándo usar

- Al inicio de una nueva sesión después de trabajo intenso
- Cuando MEMORY.md puede estar desactualizado (nuevo módulo, nueva decisión arquitectónica)
- Cuando un skill falla o da información incorrecta
- Cuando se completa un Plan de Olas importante
- Periódicamente cada 2-3 sesiones de trabajo

---

## Procedimiento

### Fase 1 — Lectura de estado actual (paralela)

Leer SIMULTÁNEAMENTE:

```
C:\Users\Usuario\.claude\projects\...\memory\MEMORY.md    ← memoria actual
src/config/plugins/index.ts                               ← catálogo real de plugins
reports/00_INDICE.md                                      ← índice de documentación
reports/06_BACKLOG.md                                     ← deuda técnica actual
.claude/commands/                                         ← lista de skills actuales
```

### Fase 2 — Verificación cruzada

Para cada skill en `.claude/commands/`:

1. **¿Menciona rutas de archivo correctas?**
   - `src/lib/api/withAuth.ts` (NO `src/lib/auth/withAuth.ts`)
   - `src/middleware/verifyOrganization.ts` para `resolveAuthorizedOrganizationId`
   - `src/config/plugins/index.ts` para `PLATFORM_PLUGIN_MANIFESTS`

2. **¿Los IDs de plugins están en snake_case?**
   - Correcto: `iso_sgsi_27001`, `crm_whatsapp_inbox`
   - Incorrecto: `iso-sgsi-27001`, `crm-whatsapp-inbox`

3. **¿Menciona módulos o features que ya no existen o fueron renombrados?**

4. **¿Falta algún módulo nuevo** (contabilidad, dealer, sgsi, iso_audit_19011, etc.)?

Para MEMORY.md:

1. **¿El conteo de archivos está actualizado?** (src/app/, src/components/, etc.)
2. **¿Los módulos en "Estado actual" reflejan el trabajo reciente?**
3. **¿Hay decisiones arquitectónicas nuevas que agregar?**
4. **¿Hay deuda técnica resuelta que remover de "Pendiente"?**

### Fase 3 — Aplicar actualizaciones

Para cada desajuste encontrado:

- Si es un skill: usar Write para actualizar el archivo `.claude/commands/{skill}.md`
- Si es MEMORY.md: usar Edit para actualizar las líneas específicas
- Si falta un skill nuevo: crearlo en `.claude/commands/{nombre}.md`

### Fase 4 — Reporte

Generar resumen de lo que se actualizó:

```
## /self-update — [FECHA]

### Skills actualizados
| Skill | Qué cambió |
|---|---|
| /arch-review | Corregido path withAuth |
| /iso-module | Actualizado a snake_case IDs |

### MEMORY.md
- [líneas actualizadas con descripción del cambio]

### Skills nuevos detectados como necesarios
- /[nombre]: [por qué haría falta]

### Todo en orden (sin cambios necesarios)
- [lista de skills que verificados y correctos]

### Próxima auto-actualización recomendada
Después de: [completar X, o en Y sesiones]
```

---

## Checklist rápido de skills existentes

Al verificar cada skill, confirmar que tenga estas referencias correctas:

| Referencia | Valor correcto |
|---|---|
| withAuth path | `src/lib/api/withAuth.ts` |
| org resolver | `src/middleware/verifyOrganization.ts` |
| plugin catalog | `src/config/plugins/index.ts` → `PLATFORM_PLUGIN_MANIFESTS` |
| plugin IDs | snake_case (ej: `iso_sgsi_27001`) |
| Zod version | v4.1.12 — `z.record(z.string(), valueType)` (2 args) |
| Stack | Next.js 14.2.18 + Firebase 12.4 + Claude SDK 0.67 |
| Reports dir | `reports/` (11 archivos activos, obsoletos en `reports/archive/`) |

---

## Skills actuales del sistema (verificar todos)

```
.claude/commands/
  add-doc.md           ← crear docs in-app (módulos válidos)
  analyze-module.md    ← análisis profundo de módulo
  arch-review.md       ← revisión arquitectural completa
  audit-security.md    ← auditar una API route
  analiza-build.md     ← diagnosticar errores de Vercel build
  canales-ia.md        ← análisis de canales IA (form/WA/voz/openclaw)
  check-capability.md  ← verificar plugin/capability
  contabilidad-eventos.md ← patrón event-driven contable
  gov-edition.md       ← vertical gobierno local ISO 18091
  iso-module.md        ← scaffold de módulo ISO nuevo
  manual-calidad.md    ← generar Manual de Calidad PDF
  plan-olas.md         ← planificar feature con sistema multi-agente
  refactor-plan.md     ← plan de refactor para un scope
  self-update.md       ← este skill (auto-mejora)
  session-summary.md   ← resumen de sesión
  ui-review.md         ← verificar design system en componente
```

**Si hay skills en el directorio que no están en esta lista: agregarlos aquí.**
**Si hay skills que deberían existir y no están: crearlos o marcarlo en el reporte.**

---

## Argumentos opcionales

```
/self-update           → revisión completa (todo lo anterior)
/self-update skills    → solo revisar y actualizar skills
/self-update memory    → solo actualizar MEMORY.md
/self-update quick     → verificar solo las referencias de path (fase 2 rápida)
```

$ARGUMENTS
