# 017 — Plan: Legajo único del cliente (operado por el contador)

**Fecha:** 2026-06-17
**Tipo:** Plan
**Estado:** 📐 Planificado — diseño aprobado, pendiente de implementar
**Relacionados:** [[014_PLAN_CREDITO_HUB_IA]] (carga masiva / revisión / extractores) · [[016_INFORMACION_CARGA_CLIENTE]] (inventario de campos) · [[012_PLAN_LANZAMIENTO_SEGURO_ENCRIPTACION]] (cifrado de archivos fuente).

---

## Objetivo

Una sola pantalla de trabajo donde el **contador** carga toda la información de un cliente, organizada **por carpeta** (Titular + cada Empresa). El contador sube los documentos en una zona única, la **IA los clasifica y reparte** a la carpeta y sección correctas y prellena los campos; el contador **revisa, corrige y certifica**. Esa certificación profesional es el sello de confianza para el financista.

Además, cada cliente tiene un **botón "Asistente IA"** que abre un **chat contextual** ya cargado con el legajo de ese cliente, para asesorar al contador (estado financiero, qué falta para certificar, riesgos, resumen). Patrón de UX inspirado en "IA de Originación" de otro producto — **es inspiración visual, no conexión de datos** (Agro-Credit sigue standalone; el chat solo lee el legajo propio del cliente vía Admin SDK).

> No es un módulo desde cero: **orquesta** lo ya existente (Legajo IA / carga masiva, cola `document_jobs`, clasificador y extractores, revisión de campos, prefill AFIP, formularios de identidad/contable/patrimonio).

## Decisiones aprobadas (dueño, 2026-06-17)

1. **Carga y validación por el contador** — el cliente no carga datos en esta etapa; el contador es quien carga y valida (certificación profesional → confianza para el financista).
2. **Navegación:** pestañas arriba — `Titular | Empresa 1 | Empresa 2 | + Empresa`.
3. **Carga IA:** una sola zona; la IA reparte cada documento a su carpeta/sección (auto-routing por CUIT + tipo documental).
4. **Certificación:** sello global por carpeta — botón "Validar y certificar" que estampa *"Certificado por [Contador], [fecha]"* (además de la confirmación campo por campo).

## Layout

```
┌─ LEGAJO · {Cliente} ({CUIT})   [⚠ NN%]  [🤖 Asistente IA]  [✓ Validar y certificar] ┐
│  📥 Zona única: soltar PDF/imagen/Excel/.zip → IA clasifica, reparte y prellena    │
│  [ 👤 Titular ] [ 🏢 Empresa 1 ] [ 🏢 Empresa 2 ] [ + Empresa ]                    │
│  Secciones de la carpeta activa (con estado ✓/◑/○):                                │
│   ① Identidad y datos   ② Perfil   ③ Contable (por período)   ④ Patrimonio   ⑤ Docs│
│  Al abrir sección: documento origen (izq) + campos extraídos con % conf. (der)     │
│  → [Confirmar] / [Corregir]                                                        │
└────────────────────────────────────────────────────────────────────────────────────┘

[🤖 Asistente IA] abre un modal de chat contextual (ver sección "Asistente IA"):
┌─ Asistente IA · Hector Gramajo ───────────────────────────── x ┐
│ Preguntas útiles:                                              │
│ [Estado financiero] [Qué falta para certificar] [Riesgos]     │
│ [Resumen del legajo] [Capacidad de pago]                      │
│ ────────────────────────────────────────────────────────     │
│ (conversación)                                                │
│ ┌──────────────────────────────────────────────┐  [ ➤ ]      │
│ │ Escribí tu pregunta…                          │            │
│ └──────────────────────────────────────────────┘            │
└────────────────────────────────────────────────────────────────┘
```

## Secciones por carpeta (campos = ver `016`)

- **Titular:** Identidad · Perfil (fiscal/productivo/financiero/patrimonial) · Contable · Patrimonio · Documentos.
- **Empresa:** Identidad · Contable · Patrimonio · Documentos (el perfil productivo/financiero vive en el titular; revisar si alguna empresa lo necesita propio).

## Flujo IA (auto-routing)

1. Contador suelta todo en la zona única (acepta `.zip`).
2. Cada archivo entra a la cola `document_jobs` (estado `queued`), se procesa con el botón **"Procesar con IA"** on-demand (plan Hobby; ver Ola 2 de 014) o el cron.
3. El clasificador determina **tipo** (constancia AFIP, balance, estado de resultados, F931, IVA, etc.) y **CUIT** → se decide la **carpeta destino** (titular vs empresa) y la **sección**.
4. Los extractores prellenan campos con procedencia y % de confianza → quedan `PENDING` para revisión.
5. Contador confirma/corrige (Revisión) → los datos confirmados pueblan Identidad/Contable/etc.
6. Cuando la carpeta está completa, **"Validar y certificar"** sella la carpeta.

**Regla de routing:** si el CUIT del documento no matchea ninguna carpeta, queda en bandeja "Sin asignar" para que el contador lo rutee a mano (nunca se asigna a ciegas).

## Asistente IA por cliente (chat contextual)

Botón **"🤖 Asistente IA"** en el header del legajo de cada cliente. Abre un modal de chat ya preparado para asesorar al contador sobre **ese** cliente.

- **Preguntas sugeridas (chips):** Estado financiero · Qué falta para certificar · Riesgos / alertas · Resumen del legajo · Capacidad de pago estimada. (Editable después.)
- **Contexto:** el endpoint arma server-side el contexto del cliente desde lo ya cargado — `canonical_credit_profiles`, totales de balance/resultados, perfil, estado de completitud (`getFolderDataStatus`) y campos en revisión. Ese contexto va como system prompt; **no** se manda desde el cliente.
- **Motor:** reusa la capa IA multiproveedor — `resolveAIProvider().complete(systemPrompt, pregunta)` (Groq/Anthropic según `/app/admin/ia`). Sin key → responde en modo demo con aviso.
- **Endpoint:** `POST /api/credito-hub/assistant` con `{ clientId, message, history? }`. Auth: contador con **vínculo activo** al cliente (o admin); deriva el `folderOwnerOrganizationId` de la sesión + vínculo, nunca del body. Audita `assistant.queried`.
- **Alcance v1:** asesor de lectura — explica, resume y señala faltantes/riesgos sobre el legajo. **No** ejecuta acciones ni modifica datos. No inventa: si un dato no está en el legajo, lo dice.
- **Componente:** `components/credito-hub/LegajoAssistantChat.tsx` (modal con chips + historial + input), montado en el header del legajo.

> Nota anti-recaída: el patrón visual se inspira en "IA de Originación" de Agro Biciuffa, pero **no hay conexión de datos ni código** con ese proyecto. El asistente solo lee el legajo del propio cliente en `agrocredit-ia-saas`.

## Cambios de datos (mínimos)

- Certificación: agregar a la organización (titular/empresa) o a un doc dedicado `folder_certifications`:
  `certificationStatus` (`draft` | `certified` | `outdated`), `certifiedByUid`, `certifiedByName`, `certifiedAt`. Auditar `folder.certified`.
- Reusar `document_jobs`, `extracted_fields`, `canonical_credit_profiles`, `documents` tal como están.

## Olas de implementación (propuestas)

| Ola | Alcance |
|-----|---------|
| 1 | Shell del Legajo único: ruta `/app/contador/clientes/[clientId]/legajo`, pestañas por carpeta (titular + empresas), secciones con estado de completitud (solo lectura/links a lo existente). |
| 2 | Zona única de carga + auto-routing: dropzone que encola a `document_jobs`, asignación de carpeta por CUIT/tipo, bandeja "Sin asignar". |
| 3 | Revisión embebida por sección (documento origen + campos + confirmar/corregir) reusando `ReviewWorkbench`. |
| 4 | Certificación: campos en datos, botón "Validar y certificar", sello visible para el financista en la carpeta read-only. |
| 5 | Indicadores de completitud (por sección/carpeta/total) y QA + docs. |
| 6 | Asistente IA por cliente: endpoint `POST /api/credito-hub/assistant` (contexto del legajo server-side + `resolveAIProvider().complete`), modal `LegajoAssistantChat` con preguntas sugeridas, auditoría y guardrails (solo lectura, no inventa). |

## Riesgos / preguntas abiertas

- **Visor de documento** sigue pendiente (placeholder en `ReviewWorkbench`) — afecta la columna "documento origen" de la sección 3.
- **PDFs escaneados:** la rasterización server-side está deshabilitada en Vercel (ver fix canvas en HANDOFF). Para visión sobre escaneados usar Anthropic (bloque PDF nativo) o worker externo.
- **Datos reales:** mantener `CREDITO_HUB_ALLOW_REAL_DATA=false` hasta cerrar cifrado V1 (Plan 012).
- ¿La empresa necesita su propio perfil productivo/financiero o alcanza con el del titular?

## Validación al cerrar cada ola

`pnpm type-check` · `pnpm check:security-shape` · `pnpm test`. Ninguna API nueva toma `organizationId` del body: se deriva de sesión + vínculo contador-cliente.
