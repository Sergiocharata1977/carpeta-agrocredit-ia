# /session-summary

Genera un **resumen ejecutivo de la sesión actual** — qué se hizo, qué archivos se tocaron, qué queda pendiente.
Útil para: cerrar una sesión, pasarle contexto a otra IA, o cuando el crédito de contexto se está terminando.

## Cuándo usarlo

- Cuando el contexto de la conversación está llegando al límite
- Antes de iniciar una nueva sesión de Claude
- Para documentar una jornada de trabajo
- Para pasarle a otra IA el estado exacto del proyecto

## Procedimiento

1. Revisar todo el historial de la conversación actual
2. Leer `C:\Users\Usuario\.claude\projects\...\memory\MEMORY.md` para contexto del proyecto
3. Generar el resumen en el siguiente formato EXACTO

## Formato de salida

```
# Resumen de Sesión — [FECHA HOY YYYY-MM-DD]

## Qué se hizo (por pantalla/módulo)

**[Módulo o área]**
- [Acción concreta] → [archivo o ruta afectada]
- [Acción concreta] → [archivo o ruta afectada]

**[Módulo o área]**
- ...

## Archivos creados/modificados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `ruta/archivo.ts` | Creado / Modificado | Qué hace |

## Bugs corregidos

- **[Bug]** → Causa: [X] → Fix: [Y]

## Decisiones técnicas tomadas

- [Decisión] — Razón: [por qué]

## Pendiente para la próxima sesión

- [ ] [Tarea pendiente 1]
- [ ] [Tarea pendiente 2]

## Cómo retomar (prompt para la próxima IA)

> Continuamos el proyecto 9001app-firebase. Hoy se hizo: [resumen en 2 líneas].
> La próxima tarea es: [tarea pendiente principal].
> Contexto: [archivo o ruta clave para arrancar].
```

## Reglas

- Ser CONCRETO: "Moví gestion-crediticia a /crm/" no "Cambios de layout"
- Incluir rutas de archivo exactas
- El "Cómo retomar" debe ser copiable directamente como primer mensaje de la nueva sesión
- Si se tocaron temas de seguridad, marcarlos con ⚠️
- Si algo quedó roto o incompleto, marcarlo con 🔴
- Si algo quedó bien pero sin testear, marcarlo con 🟡
- Si algo quedó funcionando y verificado, marcarlo con ✅

## Guardar el resumen

Después de generarlo, preguntar al usuario:
"¿Guardo este resumen en `reports/sesiones/YYYY-MM-DD_sesion.md`?"
Si confirma, crearlo con el contenido generado.
