# 017 — Plan: Legajo único del cliente (operado por el contador)

**Fecha:** 2026-06-17
**Tipo:** Plan
**Estado:** 🟡 En progreso — Olas 1 a 6 implementadas (2026-06-17); sello visible para financista cerrado; restan refinamientos (visor de documento real y completitud global).
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

**Modelo mixto (decidido):**
- **Titular:** Identidad · Perfil (fiscal, productivo, financiero general, patrimonio global) · Contable · Patrimonio · Documentos.
- **Empresa:** Identidad (CUIT, actividad) · Contable · Fiscal · Patrimonio propio · Documentos.
- **Perfil productivo/financiero propio por empresa:** opcional — se habilita solo si la empresa tiene actividad separada o carpeta bancaria propia. Así no se duplica carga pero queda margen para casos reales.

## Ruta canónica

Toda la superficie nueva vive en **`/app/contador/clientes/[clientId]/legajo`**. No seguir expandiendo `/app/contador/productores/*` salvo por compatibilidad (ese árbol queda como legacy; ver deuda técnica de `000`).

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
- **Endpoint (corregido):** `POST /api/credito-hub/assistant/[targetOrganizationId]`. Body solo `{ message, history? }` — **nada sensible viaja en el body** (ni `clientId`/`organizationId`). El backend deriva acceso con `assertCanManageAccountingFolder(session, targetOrganizationId)`, exige rol `accountant` / `accounting_firm_admin` / `admin_platform` y obtiene el `folderOwnerOrganizationId` de ahí. Audita `assistant.queried`.
- **Guardrails v1 (reforzados):**
  - Responde **con base en evidencias del legajo** ("según el balance 2024…", "faltan estos documentos…"). Si un dato no está, dice **"no consta en el legajo"** — no inventa.
  - **No recomienda aprobar/rechazar** un crédito (es asesor del contador, no decisor).
  - **Solo lectura:** no ejecuta acciones ni modifica datos.
  - **Límite de tokens** por respuesta y **rate limit** por contador/cliente.
- **Componente:** `components/credito-hub/LegajoAssistantChat.tsx` (modal con chips + historial + input), montado en el header del legajo.

> Nota anti-recaída: el patrón visual se inspira en "IA de Originación" de Agro Biciuffa, pero **no hay conexión de datos ni código** con ese proyecto. El asistente solo lee el legajo del propio cliente en `agrocredit-ia-saas`.

## Cambios de datos

Reusar `document_jobs`, `extracted_fields`, `canonical_credit_profiles`, `documents`. Dos colecciones nuevas (no mezclar en `organizations`):

### `folder_certifications`
Certificación profesional por carpeta. Un cambio posterior en un campo confirmado / documento / balance debe pasar la certificación a `outdated`.

```
folderOwnerOrganizationId   // carpeta certificada (titular o empresa)
accountingFirmId            // estudio que certifica
certificationScope          // identity | accounting | fiscal | patrimonial | full_folder
status                      // draft | certified | outdated | revoked
certifiedByUid
certifiedByName
certifiedAt
sourceVersion               // huella de los datos certificados (para detectar cambios)
invalidatedAt
invalidatedReason
```
Auditar `folder.certified` / `folder.certification_invalidated`.

### `document_routing_decisions`
Trazabilidad de a qué carpeta fue cada documento (auditar por qué cayó en Titular, Empresa 1 o "Sin asignar").

```
documentId
detectedCuit
detectedDocumentType
suggestedFolderOwnerOrganizationId
assignedFolderOwnerOrganizationId
routingStatus               // auto_assigned | needs_manual_assignment | manually_assigned | rejected
routingConfidence
reviewedBy
reviewedAt
```
(Alternativa: estos campos embebidos en `documents`; se decide en Ola 3.)

## Olas de implementación

> Orden revisado (recomendación 2ª IA, aprobado): el **Asistente IA va temprano** (Ola 2) porque es visible, de alto valor comercial y seguro si es solo lectura; la carga masiva/auto-routing (más riesgosa) queda después.

| Ola | Alcance |
|-----|---------|
| 1 | **Shell del Legajo único:** ruta canónica `/app/contador/clientes/[clientId]/legajo`, pestañas por carpeta (titular + empresas), secciones con estado de completitud (solo lectura/links a lo existente). |
| 2 | **Asistente IA contextual (read-only):** endpoint `POST /api/credito-hub/assistant/[targetOrganizationId]` (contexto del legajo server-side + `resolveAIProvider().complete`), modal `LegajoAssistantChat` con preguntas sugeridas, guardrails (fuentes, no inventa, no aprueba crédito), auditoría y rate limit. |
| 3 | **Carga única + auto-routing:** dropzone que encola a `document_jobs`, decisión de routing por CUIT/tipo (`document_routing_decisions`), bandeja "Sin asignar". |
| 4 | **Revisión embebida** por sección (documento origen + campos + confirmar/corregir) reusando `ReviewWorkbench`. |
| 5 | **Certificación:** colección `folder_certifications`, botón "Validar y certificar", invalidación automática a `outdated` al cambiar datos, sello visible para el financista en la carpeta read-only. |
| 6 | **Completitud + QA:** indicadores (por sección/carpeta/total), tests de aislamiento y docs. |

## Riesgos / preguntas abiertas

- **Visor de documento** resuelto en `ReviewWorkbench` con preview firmado para PDF/imagen. Para Excel/otros archivos se ofrece abrir/descargar.
- **PDFs escaneados:** la rasterización server-side está deshabilitada en Vercel (ver fix canvas en HANDOFF). Para visión sobre escaneados usar Anthropic (bloque PDF nativo) o worker externo.
- **Datos reales:** mantener `CREDITO_HUB_ALLOW_REAL_DATA=false` para pruebas. **No habilitar carga real masiva** hasta resolver cifrado V1 (Plan 012) o documentar una excepción explícita.
- **Perfil por empresa:** resuelto con modelo mixto (ver sección "Secciones por carpeta").

## Validación al cerrar cada ola

`pnpm type-check` · `pnpm check:security-shape` · `pnpm test`. Ninguna API nueva toma `organizationId` del body: se deriva de sesión + vínculo contador-cliente.
