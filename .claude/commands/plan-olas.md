# Skill: /plan-olas

Genera un plan de ejecución multi-agente en olas para un feature o tarea compleja.
Produce un documento MD estructurado con prompts listos para ejecutar en paralelo.

## Reglas del sistema de olas

### Numeración — CONVENCIÓN OBLIGATORIA
- **Olas** se numeran desde 1: Ola 1, Ola 2, Ola 3...
- **Agentes** dentro de cada ola se nombran con letras desde A: Agente A, Agente B, Agente C...
- Referencia completa: "Ola 1 — Agente A", "Ola 2 — Agente B", etc.
- NUNCA usar formato combinado como "1A", "2B" — son cosas distintas: número = ola, letra = agente dentro de esa ola

### Reglas de independencia (CRÍTICAS)
1. Todos los agentes de una misma ola deben ser **completamente independientes entre sí**
   - No pueden leer archivos que otro agente de la misma ola está escribiendo
   - No pueden modificar el mismo archivo
2. Un agente de Ola 2 puede leer archivos creados por agentes de Ola 1
3. Cada prompt de agente debe ser **autocontenido**: incluye todo el contexto que el agente necesita para trabajar sin preguntar
4. Si dos tareas dependen entre sí → van en olas distintas (no en la misma)

### Formato obligatorio de cada agente

Cada bloque de agente SIEMPRE tiene estas secciones en este orden:

```
## Agente [Letra] — [Nombre descriptivo]
**Puede ejecutarse en paralelo con:** [lista de agentes de la misma ola, o "es el único de esta ola"]
**Depende de:** [ola anterior que debe completar primero, o "nada — es la primera ola"]

### Objetivo
[Una oración clara: qué crea o modifica este agente]

### Archivos a crear
- `ruta/exacta/del/archivo.ts` — descripción de qué hace

### Archivos a modificar
- `ruta/exacta/del/archivo.ts` — qué cambio específico hace

### Prompt completo para el agente
[El prompt que se le pasa al agente. Debe incluir:]
- **Referencia al documento fuente del plan** (ver regla abajo)
- Contexto del proyecto (stack, patrones usados)
- Referencias a archivos existentes que debe leer como modelo
- Qué exactamente debe implementar (con tipos, firmas de función si aplica)
- Qué NO debe hacer (límites del scope)
- Cómo sabe que terminó bien (criterio de éxito)
```

### Regla: referencia al documento fuente — OBLIGATORIA en cada prompt

Cada prompt de agente DEBE incluir al inicio un bloque que indique:
1. El documento de plan que lo originó
2. En qué ola y agente se encuentra dentro del plan

```
─── DOCUMENTO FUENTE DE ESTE PLAN ───
Documento: `reports/NNN_NOMBRE_DEL_PLAN.md`
Posición:  Ola N — Agente X (ej: Ola 2 — Agente B)

Lee el documento antes de implementar. Contiene el diseño completo, modelo de datos,
decisiones arquitectónicas y lo que hacen los otros agentes para no duplicar trabajo.
```

Esto garantiza que el agente pueda:
- Saber exactamente su rol dentro del plan total
- Consultar el modelo de datos completo
- Entender decisiones que afectan su scope
- Ver qué hacen los otros agentes (misma ola y olas anteriores) para no duplicar trabajo
- Tener el contexto de negocio sin necesitar preguntar

### Estructura del documento de plan

```markdown
# Plan [NombreFeature] — Ejecución multi-agente

**Fecha:** YYYY-MM-DD
**Feature:** descripción en una línea
**Proyectos afectados:** lista de repos

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A, B, C | Sí | Nada |
| 2 | A, B | Sí | Ola 1 completa |
| 3 | A | No aplica (único) | Ola 2 completa |

---

## Ola 1 — [Nombre de la ola]
> Ejecutar Agente A + Agente B + Agente C en PARALELO

### Agente A — [Nombre]
...

### Agente B — [Nombre]
...

---

## Ola 2 — [Nombre de la ola]
> Ejecutar SOLO después de que Ola 1 esté completa
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — [Nombre]
...

---

## Verificación final
[Checklist manual para confirmar que todo funciona]
```

---

## Tarea

Analiza el feature solicitado y produce el documento MD completo siguiendo el formato de arriba.

El feature a planificar es: $ARGUMENTS

Si no se especifica un feature, pregunta cuál es el feature antes de continuar.

**Consideraciones al dividir en olas:**
- Backend (types, services, API routes) → generalmente Ola 1
- Frontend (páginas, componentes) → generalmente Ola 2 (depende del backend)
- Tests e integración → generalmente Ola 3
- Si un componente usa un tipo definido en otra tarea → van en olas distintas

**Sobre los prompts de cada agente:**
- Deben ser lo suficientemente detallados para que un agente frío (sin contexto previo) pueda ejecutarlos
- **SIEMPRE incluir al inicio la referencia al documento fuente** (`reports/NNN_...md`) donde está el diseño completo
- Incluir siempre: stack del proyecto, ruta de archivos modelo a copiar, tipos exactos si aplica
- El agente no debe necesitar preguntar nada

**Recordatorio de nomenclatura:**
- CORRECTO: "Ola 1 — Agente A", "Ola 2 — Agente B"
- INCORRECTO: "1A", "2B", "Agente 1A"
