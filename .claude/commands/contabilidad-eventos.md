# Skill: /contabilidad-eventos

Documenta y verifica la arquitectura contable por eventos para cualquier proyecto SaaS multi-tenant.

## Cuándo usar

- Al diseñar un módulo contable nuevo en cualquier vertical
- Al revisar si un plugin está emitiendo eventos contables correctamente
- Al auditar que no se están creando asientos manuales donde debería haber automatización
- Al explicar la arquitectura a otro developer o IA

---

## Arquitectura: Contabilidad Orientada a Eventos (Decision Record)

### Principio central

> **Los asientos contables son consecuencias de operaciones de negocio, no acciones independientes.**

El contador NO crea asientos uno por uno. El sistema los genera automáticamente cuando ocurre una operación en cualquier plugin vertical.

### Flujo estándar

```
Plugin vertical (CRM, Dealer, HSE, etc.)
  └─ Formulario de operación (venta, compra, pago, siniestro...)
       └─ Al guardar → emitAccountingEvent(evento)
            └─ AccountingEngine recibe el evento
                 └─ Aplica reglas contables predefinidas del plugin
                      └─ Genera asiento en acc_entries + acc_entry_lines
                           └─ Saldos = sumatoria en tiempo real por cuenta
```

### Colecciones Firestore

```
acc_entries          — cabecera del asiento (fecha, periodo, origen, plugin_id, status)
acc_entry_lines      — renglones debe/haber (entry_id, cuenta_codigo, lado, importe)
acc_accounts         — plan de cuentas (codigo, nombre, naturaleza, imputable)
acc_rules            — reglas por operation_type: qué cuenta debita y acredita
acc_periods          — períodos YYYY-MM (abierto/cerrado)
acc_snapshots        — saldos pre-calculados por período (performance)
acc_outbox           — eventos pendientes de procesar (tolerancia a fallos)
```

### Regla de oro para saldos

```typescript
// NO hay un campo "saldo" en las cuentas — se calcula siempre:
const saldo = sumatoria(acc_entry_lines donde cuenta_codigo = X y lado = 'debe')
            - sumatoria(acc_entry_lines donde cuenta_codigo = X y lado = 'haber')
// (o inverso según la naturaleza de la cuenta)
```

El "Mayor" = `acc_entry_lines` filtrado por `cuenta_codigo`, ordenado por fecha. No existe como registro separado.

### Lo que SÍ tiene el módulo contable central

- **Plan de cuentas** — administrado por admin, no por el contador operativo
- **Reglas contables** — una por `operation_type` de cada plugin (configurables)
- **Períodos** — apertura y cierre, bloqueo de escritura en períodos cerrados
- **Libro diario** — vista READ-ONLY de `acc_entries` filtrada por período
- **Mayor** — vista READ-ONLY de `acc_entry_lines` filtrada por cuenta
- **Balance de sumas y saldos** — agregación por cuenta en tiempo real (o desde snapshot)
- **Outbox** — para tolerancia a fallos al emitir eventos

### Lo que NO tiene (deliberado)

- ~~Formulario de creación manual de asientos~~ (solo correcciones de ajuste, muy restringido)
- ~~Proceso manual de "pasar al mayor"~~ (sale automático del filtro)
- ~~Cuentas con saldo almacenado~~ (siempre calculado)
- ~~Sincronización periódica batch~~ (tiempo real salvo snapshots de performance)

### Cómo agrega un plugin vertical sus reglas

```typescript
// En el plugin (ej: CRM), al instalar:
// acc_rules/crm_factura → { debe: '1.1.03', haber: ['4.1.01', '2.1.04'] }

// En el formulario de venta (API route del plugin CRM):
await emitAccountingEvent({
  organization_id,
  plugin_id: 'crm',
  operation_type: 'crm_factura',
  importe_total: factura.total,
  importe_iva: factura.iva,
  documento_id: factura.id,
  tercero_id: contacto.id,
  periodo: getCurrentPeriodo(),        // YYYY-MM
  idempotency_key: `crm_factura_${factura.id}`,
});
// El AccountingEngine toma las reglas y genera el asiento automáticamente
```

### Checklist para implementar en un nuevo plugin vertical

- [ ] Definir los `operation_type` que genera este plugin (ej: `crm_factura`, `crm_cobro`)
- [ ] Escribir las reglas contables: para cada `operation_type`, qué cuenta debita y acredita
- [ ] Incluir las reglas en `migrations.install` del manifest del plugin
- [ ] En cada API route de operación → llamar `emitAccountingEvent()` al final del happy path
- [ ] Usar `idempotency_key` único por documento para evitar asientos duplicados
- [ ] Verificar que el plugin tiene `optional_capabilities: ['contabilidad_central']` en su manifest

### Ejemplo de reglas para verticales comunes

| Plugin | Operación | Debe | Haber |
|---|---|---|---|
| CRM | `crm_factura` | Clientes (1.1.03) | Ventas (4.1.01) + IVA (2.1.04) |
| CRM | `crm_cobro` | Caja (1.1.01) | Clientes (1.1.03) |
| CRM | `crm_credito_otorgado` | Créditos (1.1.04) | Ventas financiadas (4.1.02) |
| Dealer | `dealer_factura_repuesto` | Clientes (1.1.03) | Ventas (4.1.01) + IVA (2.1.04) |
| Dealer | `dealer_servicio_tecnico` | Clientes (1.1.03) | Servicios prestados (4.1.05) |
| HSE | `hse_multa_ambiental` | Multas y sanciones (6.3.01) | Proveedores a pagar (2.1.01) |

---

## Uso del skill

```
/contabilidad-eventos
```

Sin argumentos: muestra este resumen completo.

```
/contabilidad-eventos checklist [plugin_id]
```

Verifica si el plugin dado implementa correctamente el patrón (lee su manifest y sus API routes).
