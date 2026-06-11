# Skill: /workflow-control

Auditoría de estado de un kanban específico contra las reglas del motor de orquestación.

## Uso
/workflow-control [kanban] [--org orgId] [--verbose]

Kanbans disponibles: servicios, repuestos, ventas, credito, compras, entrega, acciones, hallazgos, auditorias, tareas

## Qué audita este skill

Para el kanban seleccionado, verificar:

1. **Instancias bloqueadas sin subproceso activo** — tarjetas en status=blocked pero sin hijos activos
2. **SLA vencidos** — instancias en etapas con sla_hours definido que superaron el tiempo
3. **Instancias sin etapa válida** — current_stage_id apunta a una etapa que no existe en la definición
4. **Subprocesos huérfanos** — instancias hijas cuyo padre fue cancelado pero ellas siguen activas
5. **Vínculos rotos** — WorkflowInstanceLink apuntando a instancias que no existen
6. **Transiciones sin log** — instancias cuyo current_stage_id no tiene registro en transition_logs

## Pasos del skill

1. Leer `src/types/workflowOrchestration.ts` y `src/services/workflows/`
2. Leer `src/app/api/workflow-instances/route.ts` y las routes de trace
3. Identificar el proceso_type del kanban seleccionado
4. Construir queries de auditoría contra Firestore (o via APIs del sistema)
5. Reportar hallazgos en formato:

### Reporte de Control — Kanban [nombre] — [fecha]

**Estado general:** ✅ OK / ⚠️ Alertas / ❌ Errores críticos

| Check | Estado | Detalles |
|---|---|---|
| Instancias bloqueadas sin causa | ✅ / ⚠️ | N instancias afectadas |
| SLA vencidos | ✅ / ⚠️ | N instancias, mayor retraso: X horas |
| Etapas inválidas | ✅ / ❌ | |
| Subprocesos huérfanos | ✅ / ⚠️ | |
| Vínculos rotos | ✅ / ❌ | |
| Logs de transición | ✅ / ⚠️ | |

**Hallazgos críticos:** (lista)
**Recomendaciones:** (lista)

6. Para cada hallazgo crítico, sugerir la corrección específica (query Firestore o acción en UI)
