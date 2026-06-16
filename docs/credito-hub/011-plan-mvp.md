# CreditoHub — 011 · Plan MVP (Fases 1–4)

**Fecha:** 2026-06-16
**Estado:** Diseño (Ola 1 / Agente C). Sin código.
**Fuente de verdad de decisiones:** `docs/credito-hub/000-ola0-decisiones.md`.

---

## Objetivo

Entregar un MVP funcional de CreditoHub con **4 tipos documentales** (Balance, Estado de Resultados, DDJJ IVA, Formulario 931) y **un banco piloto**, corriendo sobre datos staging/demo, con la IA proponiendo y el contador certificando.

## Alcance MVP
- Carga masiva + pipeline asíncrono → revisión del contador → perfil canónico.
- Template de requisitos del banco piloto + matriz de cumplimiento.
- Provider IA multiproveedor con Mock por defecto si no hay key.
- Datos reales bloqueados (`CREDITO_HUB_ALLOW_REAL_DATA=false`).

## Fases (mapeadas a las olas del Plan 014)

### Fase 1 — Fundaciones (Ola 1)
- Capa IA (`lib/ai/`): provider multiproveedor + `pdf-to-images` texto-primero.
- Modelo de datos canónico: tipos, schemas Zod, colecciones, acciones de auditoría.
- Documentación de diseño (este conjunto de docs).
- **Salida:** `pnpm type-check` y tests de schemas/provider pasan; cero `producerId`/`clientId` en datos nuevos.

### Fase 2 — Building blocks (Ola 2)
- Cola con lease (`document-jobs`) + límites.
- Clasificador documental IA.
- Extractores por tipo MVP + perfil canónico con procedencia.
- **Salida:** tests de jobs/clasificador/extractores pasan; cada dato con procedencia.

### Fase 3 — Orquestación + API (Ola 3)
- API de carga masiva (intake) + worker con lease y flag de datos reales.
- Motor de requisitos + matching + `CreditApplication`.
- API de revisión profesional + perfil canónico.
- **Salida:** 3 archivos → 3 jobs → `awaiting_review`; tests de seguridad (intake/review) pasan.

### Fase 4 — Frontend (Ola 4)
- UI de carga masiva con progreso (dropzone + `JobProgressList`).
- Bandeja de revisión (visor documento + campos lado a lado).
- Constructor de requisitos + matriz de cumplimiento.
- **Salida:** `pnpm type-check` pasa; subir archivos crea jobs y la UI refleja avance; confirmar/corregir persiste.

> Ola 5 (integración + docs) cierra el MVP con tests de aislamiento e2e y actualización de `MODULE_REGISTRY`/`HANDOFF`.

## Banco piloto
- Un único `requestingEntityOrganizationId` piloto.
- Su listado real de requisitos define el primer `BankRequirementTemplate` y el prompt de parseo.
- La entidad accede a la matriz solo vía grant/scope.

## Decisiones
- MVP en staging/demo; datos reales recién al cerrar Plan 012 Ola 3.
- Mock como provider por defecto: el MVP funciona sin keys para demo/tests.
- Expediente bancario final queda **fuera** del MVP (próximo hito inmediato).

## Alternativas
- **Más tipos documentales en el MVP:** descartado; 4 cubren el núcleo de una carpeta agrofinanciera.
- **Varios bancos piloto:** descartado; uno valida el motor de requisitos con menor superficie.

## Riesgos
- Sin `XAI_API_KEY` verificada, el modelo de visión real no está confirmado. Mitigación: runtime resolve + fallback Mock/Anthropic.
- Spike `pdf-to-img` en Vercel. Mitigación: validar al inicio de Ola 1 A antes de fijar dependencia.
- Alcance creep hacia scoring/expediente. Mitigación: lista "fuera de alcance" explícita.

## Criterios de aceptación (gate de MVP)
- Pipeline completo con Mock: intake → worker → `awaiting_review` → review → perfil.
- Matriz de cumplimiento del banco piloto: cumplido/falta/vencido.
- Aislamiento multi-tenant verificado por tests.
- `pnpm type-check`, `pnpm check:security-shape`, `pnpm test` pasan.

## Dependencias
- Ola 0 cerrada (gate). Ola N depende de Ola N-1.
- Pipeline OCR existente, grants/scopes, auditoría.

## Preguntas abiertas
- Identidad y formato de requisitos del banco piloto.
- Fecha de cierre de Plan 012 Ola 3 (habilita datos reales).
- ¿Disparo del worker en MVP: Vercel Cron, manual, o ambos?
