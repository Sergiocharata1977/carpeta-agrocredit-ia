# Plan Asistente Lateral Operativo — Ejecucion multi-agente

**Fecha:** 2026-07-01
**Feature:** Chat IA incorporado al shell del legajo que empuja la pantalla, lee contexto y encola archivos para extraccion/revision.
**Proyectos afectados:** `carpeta-agrocredit-ia`

---

## Resumen de olas

| Ola | Agentes | Paralelos entre si | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A, B | Si | Nada |
| 2 | A, B | Si | Ola 1 completa |
| 3 | A | No aplica | Ola 2 completa |

---

## Ola 1 — Base tecnica y limites de seguridad
> Ejecutar Agente A + Agente B en PARALELO

## Agente A — Plan de interfaz lateral
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** nada — es la primera ola

### Objetivo
Reemplazar el asistente modal por un panel lateral integrado en la pagina de legajo que contrae el contenido al abrirse.

### Archivos a crear
- `components/credito-hub/LegajoAssistantPanel.tsx` — panel lateral con chat, adjuntos y estado de procesamiento.

### Archivos a modificar
- `app/app/contador/clientes/[clientId]/legajo/page.tsx` — usar el panel en layout de dos columnas y eliminar el modal.
- `components/credito-hub/LegajoAssistantChat.tsx` — retirar o dejar sin uso, segun el cierre.

### Prompt completo para el agente
```text
─── DOCUMENTO FUENTE DE ESTE PLAN ───
Documento: `reports/018_PLAN_ASISTENTE_LATERAL_OPERATIVO.md`
Posicion:  Ola 1 — Agente A

Lee el documento antes de implementar. Contiene el diseño completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto: Next.js App Router + Firebase + TypeScript. El asistente actual esta en
`components/credito-hub/LegajoAssistantChat.tsx` y usa `/api/credito-hub/assistant/[targetOrganizationId]`.
Debes convertir la UX a panel lateral incorporado, no modal. El panel debe abrir/cerrar desde la pagina
`app/app/contador/clientes/[clientId]/legajo/page.tsx`, empujar/contraer el contenido en desktop y ocupar pantalla
en mobile. No cambies reglas de auth ni endpoints.

Criterio de exito: el boton "Asistente IA" abre un panel derecho persistente; el contenido queda visible y mas angosto;
cerrar el panel restaura el ancho.
```

## Agente B — Ingesta documental desde chat
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** nada — es la primera ola

### Objetivo
Permitir que el panel suba PDF, imagen, Excel, ZIP y Word usando el pipeline existente de CreditoHub.

### Archivos a crear
- ninguno.

### Archivos a modificar
- `app/api/credito-hub/intake/route.ts` — aceptar `.doc` y `.docx` como documentos de entrada.
- `components/credito-hub/MassUploadDropzone.tsx` — alinear texto/accept si se mantiene visible.

### Prompt completo para el agente
```text
─── DOCUMENTO FUENTE DE ESTE PLAN ───
Documento: `reports/018_PLAN_ASISTENTE_LATERAL_OPERATIVO.md`
Posicion:  Ola 1 — Agente B

Lee el documento antes de implementar. Contiene el diseño completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto: ya existe `POST /api/credito-hub/intake`, `document_jobs`, `process-now`, `JobProgressList` y el flujo de
revision. No crear una segunda cola. Agregar soporte Word solo como archivo aceptado/encolado. Si el extractor automatico
no lo soporta, el job debe quedar en revision o pendiente segun el pipeline actual. No escribir datos finales en tablas
contables sin paso de revision.

Criterio de exito: el usuario puede adjuntar Word desde el chat/pipeline y queda trazado como documento privado del legajo.
```

---

## Ola 2 — Acciones operativas dentro del panel
> Ejecutar SOLO despues de que Ola 1 este completa
> Ejecutar Agente A + Agente B en PARALELO

## Agente A — Chat contextual con adjuntos
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 1 completa

### Objetivo
Integrar mensajes, preguntas sugeridas, upload de archivos y disparo de procesamiento IA dentro del mismo panel.

### Archivos a crear
- ninguno.

### Archivos a modificar
- `components/credito-hub/LegajoAssistantPanel.tsx` — formulario de chat, adjuntos, llamada al intake, llamada a process-now y refresco.

### Prompt completo para el agente
```text
─── DOCUMENTO FUENTE DE ESTE PLAN ───
Documento: `reports/018_PLAN_ASISTENTE_LATERAL_OPERATIVO.md`
Posicion:  Ola 2 — Agente A

Usar el endpoint existente `/api/credito-hub/assistant/[targetOrganizationId]` para respuestas solo lectura.
Para archivos usar `/api/credito-hub/intake` con `targetOrganizationId` y `x-staging-data: true` como en
`MassUploadDropzone`. Para procesar usar `/api/credito-hub/jobs/process-now`. Mostrar estados con `JobProgressList`.
No crear escritura directa en Firestore.

Criterio de exito: desde el panel se puede preguntar, adjuntar documentos y disparar "Procesar con IA".
```

## Agente B — Texto de capacidades y guardrails
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 1 completa

### Objetivo
Actualizar documentacion y registro del modulo para declarar el asistente como panel operativo con acciones controladas.

### Archivos a crear
- ninguno.

### Archivos a modificar
- `docs/MODULE_REGISTRY.md` — actualizar `legajo_assistant`.
- `reports/HANDOFF_ACTUAL.md` — registrar el cambio y los limites.

### Prompt completo para el agente
```text
─── DOCUMENTO FUENTE DE ESTE PLAN ───
Documento: `reports/018_PLAN_ASISTENTE_LATERAL_OPERATIVO.md`
Posicion:  Ola 2 — Agente B

Documentar que el asistente es operativo pero no aplica datos finales sin revision. Debe quedar claro que puede leer
contexto, encolar archivos y disparar procesamiento, pero la insercion final en base contable sigue pasando por review/apply
con auditoria.

Criterio de exito: registro y handoff describen el estado real sin prometer automatismos inseguros.
```

---

## Ola 3 — Verificacion final
> Ejecutar SOLO despues de que Ola 2 este completa

## Agente A — Validacion tecnica y visual
**Puede ejecutarse en paralelo con:** es el unico de esta ola
**Depende de:** Ola 2 completa

### Objetivo
Validar TypeScript y revisar visualmente que el panel abre, contrae la pantalla y no tapa controles principales.

### Archivos a crear
- ninguno.

### Archivos a modificar
- ninguno, salvo fixes de integracion.

### Prompt completo para el agente
```text
─── DOCUMENTO FUENTE DE ESTE PLAN ───
Documento: `reports/018_PLAN_ASISTENTE_LATERAL_OPERATIVO.md`
Posicion:  Ola 3 — Agente A

Ejecutar `pnpm type-check`. Si se levanta dev server, verificar en navegador el legajo:
boton Asistente IA, apertura/cierre, carga de adjuntos y estado responsive. Registrar resultado en handoff.
```

---

## Verificacion final

- `pnpm type-check` OK.
- En desktop, el panel derecho se incorpora a la pagina y el contenido se contrae.
- En mobile, el panel ocupa la pantalla sin romper el sidebar/shell.
- El chat responde con contexto del legajo.
- El panel permite adjuntar PDF, imagen, Excel, ZIP y Word.
- Los documentos se encolan en `document_jobs` y se procesan por el pipeline existente.
- La insercion definitiva en datos contables/perfil queda sujeta a revision/aplicacion con auditoria.
