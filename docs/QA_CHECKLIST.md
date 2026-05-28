# QA Checklist

**Fecha:** 2026-05-28

## Smoke tecnico

- [ ] `pnpm type-check` pasa.
- [ ] `pnpm check:security-shape` pasa.
- [ ] Firestore rules e indexes desplegados.
- [ ] Storage rules desplegadas.
- [ ] Variables cliente y server configuradas.

## Auth y roles

- [ ] Usuario productor tiene `roles=["producer"]` y `defaultOrganizationId`.
- [ ] Usuario banco tiene `roles=["bank_user"]` y `defaultOrganizationId`.
- [ ] Usuario empresa tiene `roles=["agro_company_user"]` y `defaultOrganizationId`.
- [ ] Usuario admin tiene `roles=["admin_platform"]`.
- [ ] `organization_members` refleja membresias activas.

## Flujo productor/contador

- [ ] Contador ve productores vinculados.
- [ ] Contador carga periodo, balance, resultados, impuestos y documentos.
- [ ] Productor ve su dashboard privado.

## Flujo autorizaciones

- [ ] Banco/empresa entra a `/app/entidad/accesos`.
- [ ] Crea solicitud con productor, finalidad, scopes y vigencia.
- [ ] Productor entra a `/app/productor/autorizaciones`.
- [ ] Productor aprueba con scopes acotados.
- [ ] Se crea `access_grants`.
- [ ] Se escriben `audit_logs`.
- [ ] Productor puede revocar el grant.

## Flujo financiacion

- [ ] Banco/empresa entra a `/app/entidad/financiacion`.
- [ ] Crea solicitud asociada a grant vigente.
- [ ] La solicitud aparece en Kanban.
- [ ] Cambiar estado genera historial y auditoria.
- [ ] Productor ve la solicitud en `/app/productor/financiacion`.

## Notificaciones y auditoria

- [ ] Header muestra campana.
- [ ] `/app/notificaciones` lista avisos propios.
- [ ] Marcar leida y ocultar funcionan.
- [ ] `/app/admin/auditoria` lista eventos para admin.

## Criterios de salida a demo

- [ ] No hay lectura publica de documentos.
- [ ] `access_grants` no se escriben desde cliente.
- [ ] `audit_logs` no se escriben desde cliente.
- [ ] Entidad no puede modificar productor, balances, impuestos, bienes ni deudas.
- [ ] Riesgos pendientes documentados en handoff.
