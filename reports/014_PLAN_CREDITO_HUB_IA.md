# Plan CreditoHub IA — Ejecución multi-agente (v2)

**Fecha:** 2026-06-16
**Feature:** Evolucionar Agro-Credit (Legajo) hacia legajo crediticio inteligente con la IA como actor: pipeline documental (carga masiva → clasificación → extracción), perfil canónico con procedencia del dato, revisión profesional del contador, motor de requisitos bancarios y matriz de cumplimiento. Provider IA multiproveedor con Grok (xAI) primario intercambiable.
**Proyecto afectado:** `Agro-Credit` (único repo — standalone, sin conexión a 9001app ni Don Cándido)
**Alcance:** MVP Fases 1–4 con un banco piloto, reusando el pipeline OCR/IA EECC existente, grants/scopes y audit_logs.

> **v2 (2026-06-16):** revisión tras crítica de endurecimiento. Cambios: se agrega **Ola 0 obligatoria**, se adoptan **nombres canónicos de organización** (sin reintroducir `producerId`/`clientId` como centro), se define la entidad **`CreditApplication`**, se fija **compatibilidad con cifrado V1 (Plan 012)** vía metadata + flag de datos reales, se agrega **lease + límites** a la cola, y se **distribuyen tests en cada ola**.

---

## Convención de nombres canónicos (OBLIGATORIA para colecciones nuevas)

No usar `producerId` ni `clientId` en colecciones nuevas. El helper real `assertCanManageAccountingFolder(session, targetOrgId)` (ver `lib/auth/accounting-access.ts`) ya devuelve `{ folderOwnerOrganizationId, accountingFirmId }`. Se adoptan esos nombres:

| Campo canónico | Significado |
|---|---|
| `folderOwnerOrganizationId` | Org dueña del legajo (`system_user` o `system_user_entity`). **Partition key** de todo dato del legajo. |
| `accountingFirmId` | Org del estudio contable. (Se conserva este nombre, ya usado en `statement-imports` y `accounting-access`; NO introducir `accountingFirmOrganizationId` para no crear una tercera variante.) |
| `requestingEntityOrganizationId` | Org del banco / entidad solicitante. |
| `targetOrganizationId` | Org destino en access/financing/grants (alineado a `access_grants`). |
| `createdBy` / `createdByOrganizationId` | UID y org del actor que creó el registro. |

El cliente puede enviar `targetOrganizationId` (la entidad cuyo legajo se opera); el servidor lo valida con `assertCanManageAccountingFolder` y deriva `folderOwnerOrganizationId` + `accountingFirmId`. **Nunca** tomar `folderOwnerOrganizationId` directo del body.

---

## Decisiones de arquitectura (fijadas en Ola 0)

1. **Provider IA multiproveedor** bajo `lib/ai/` con router por `AI_PROVIDER` (`xai`|`anthropic`|`mock`). El código nunca llama un SDK concreto directo.
2. **Grok = OpenAI-compatible** (`https://api.x.ai/v1`, SDK `openai`). **No** hardcodear el nombre del modelo: resolver vía `GET /v1/models` al boot/config y validar que soporta visión. Conservar Anthropic como fallback.
3. **PDF → texto primero, imagen como fallback.** Digital: extraer texto nativo (sin canvas). Escaneado: rasterizar solo las primeras N páginas. Si la rasterización falla → marcar `needsReview`, no romper el pipeline. La estrategia se valida con spike en Ola 0 antes de fijar la librería.
4. **Procesamiento asíncrono con lease.** `intake` solo encola; un worker procesa por documento. Jobs con `claimedBy`/`leaseExpiresAt`/`attempts`/`maxAttempts` y recuperación de `stalled`.
5. **Procedencia obligatoria.** Ningún dato se guarda sin su `ExtractedField` (documento, página, confianza, método, historial).
6. **Compatibilidad con cifrado V1 (Plan 012).** Todo documento fuente nuevo guarda `encryptionStatus` + `encryptionMetadata?` (reservado, forward-compatible) desde el día uno. **El MVP IA corre solo sobre datos de staging/demo** hasta cerrar el cifrado V1 (Plan 012 Ola 3); se controla con env `CREDITO_HUB_ALLOW_REAL_DATA` (default `false`).
7. **La IA nunca certifica ni aprueba crédito.** Propone; el contador confirma/corrige/rechaza. Toda acción sensible → `audit_logs`.
8. **MVP = 4 tipos documentales:** Balance, Estado de Resultados, DDJJ IVA, Formulario 931 + un banco piloto.

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 0 | A (único) | No aplica | Nada — endurecimiento previo |
| 1 | A, B, C | Sí | Ola 0 completa |
| 2 | A, B, C | Sí | Ola 1 completa |
| 3 | A, B, C | Sí | Ola 2 completa |
| 4 | A, B, C | Sí | Ola 3 completa |
| 5 | A, B | Sí | Ola 4 completa |

**Tests distribuidos:** cada ola de implementación incluye sus tests mínimos en el criterio de éxito de los agentes (no se difieren todos a la Ola 5).

**Dueño único de archivos compartidos:** en Ola 1, el **Agente B** es el único que toca `types/`, `lib/schemas/`, `lib/firebase/collections.ts` y `types/audit.ts`.

---

## Ola 0 — Endurecimiento del plan (decisiones + spikes)
> Ola obligatoria antes de codificar. Single-agent (o el dueño del proyecto). ~1 día.

### Agente A — Decisiones de arquitectura, spike PDF y verificación xAI
**Puede ejecutarse en paralelo con:** es el único de esta ola
**Depende de:** nada

#### Objetivo
Cerrar las decisiones que evitan recaídas (nombres, cifrado, costos) y validar los dos riesgos técnicos (modelos xAI reales + rasterización PDF en Vercel) antes de crear `lib/ai/` y colecciones.

#### Archivos a crear
- `docs/credito-hub/000-ola0-decisiones.md` — ADR breve con todas las decisiones cerradas.

#### Tareas
1. **Nombres canónicos:** confirmar la tabla de arriba contra `lib/auth/accounting-access.ts` y `types/statement-imports.ts`. Documentar mapeo legacy→canónico.
2. **`CreditApplication`:** definir la forma final (ver Ola 1 Agente B). Sin esto el matching queda flotando.
3. **Cifrado V1:** decidir explícitamente. Recomendación: **metadata forward-compatible + flag `CREDITO_HUB_ALLOW_REAL_DATA=false`** (MVP en staging/demo hasta cerrar Plan 012 Ola 3). Documentar la decisión del dueño.
4. **Costos por job:** fijar `MAX_JOBS_PER_RUN`, `MAX_FILE_SIZE` (10 MB PDF/img, 5 MB Excel — igual que `extract/route.ts`), `MAX_ZIP_SIZE` (50 MB), `MAX_PDF_PAGES` (8), `JOB_TIMEOUT_MS`, `MAX_ATTEMPTS` (3).
5. **Verificación xAI:** con la `XAI_API_KEY` provista, `GET https://api.x.ai/v1/models`, listar modelos con visión y elegir el modelo default real. **No hardcodear.** Si no hay key disponible: dejar la resolución a runtime/config y marcar el ítem como pendiente del dueño.
6. **Spike PDF→texto/imagen:** probar extracción de texto nativo (pdfjs-dist `getTextContent`, sin canvas) y evaluar rasterización (`pdf-to-img` con `@napi-rs/canvas` — binarios prebuilt, Vercel-friendly) vs fallback a PDF nativo de Anthropic. Documentar la decisión de librería y el comportamiento ante fallo (`needsReview`, no romper).
7. **P1 Plan 013:** confirmar que todas las rutas nuevas usan APIs server-side con Admin SDK y no abren lecturas/escrituras directas Firestore/Storage desde cliente.

#### Criterio de éxito
- `docs/credito-hub/000-ola0-decisiones.md` cerrado y accionable.
- Modelo xAI default resuelto (o marcado como pendiente del dueño con la key).
- Estrategia PDF decidida con su comportamiento de fallo.
- Decisión de cifrado/flag de datos reales registrada.

---

## Ola 1 — Fundaciones
> Ejecutar SOLO después de Ola 0. Ejecutar Agente A + Agente B + Agente C en PARALELO

### Agente A — Capa IA multiproveedor (Grok/Claude/Mock)
**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 0 (decisión de modelo xAI y estrategia PDF)

#### Objetivo
Capa de proveedor IA intercambiable bajo `lib/ai/`, Grok primario, Claude/Mock alternativos, sin tocar el modelo de datos.

#### Archivos a crear
- `lib/ai/AIProvider.ts` — interface `AIProvider` (`classifyDocument`, `extractStructured`, `complete`) + tipos de resultado con confianza.
- `lib/ai/XaiProvider.ts` — OpenAI-compatible (SDK `openai`, `baseURL` xAI). Resuelve modelo de visión (no hardcode). Usa `lib/ai/pdf-to-images.ts` para PDFs.
- `lib/ai/AnthropicProvider.ts` — wrapper del patrón `lib/ocr/ClaudeFinancialStatementProvider.ts` (bloque `document` nativo).
- `lib/ai/MockAIProvider.ts` — respuestas deterministas para dev/tests.
- `lib/ai/index.ts` — factory `getAIProvider()` por `AI_PROVIDER`.
- `lib/ai/pdf-to-images.ts` — helper de texto-primero + rasterización fallback según decisión de Ola 0.
- `__tests__/credito-hub/ai-provider.test.ts` — factory por env; Mock sin key; parsing de respuesta JSON.

#### Archivos a modificar
- `.env.example` — `AI_PROVIDER`, `XAI_API_KEY`, `XAI_BASE_URL`, `XAI_MODEL` (vacío → resuelve runtime), `CREDITO_HUB_ALLOW_REAL_DATA=false`. Conservar `ANTHROPIC_API_KEY`/`CLAUDE_MODEL`.
- `package.json` — `openai` + lib PDF decidida en Ola 0.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit (Legajo), standalone. Stack: Next.js App Router + TypeScript estricto + Firebase Admin SDK. Server-side.
Leé: docs/credito-hub/000-ola0-decisiones.md (modelo xAI y estrategia PDF YA decididos),
lib/ocr/index.ts, lib/ocr/FinancialStatementOCRProvider.ts, lib/ocr/ClaudeFinancialStatementProvider.ts, .env.example.

TAREA: capa IA genérica multiproveedor en lib/ai/ SIN tocar el modelo de datos ni lib/ocr.
1. AIProvider.ts: interface con classifyDocument(buffer,mime,hints)→AIClassificationResult,
   extractStructured(buffer,mime,schemaPrompt,hints)→AIExtractionResult{ fields:Record<string,{value,confidence,page?,rawText?}>, overallConfidence, rawText?, warnings }, complete(system,user)→string.
2. XaiProvider.ts: new OpenAI({apiKey:XAI_API_KEY, baseURL:XAI_BASE_URL ?? "https://api.x.ai/v1"}).
   Modelo: usar el resuelto en Ola 0 (XAI_MODEL si está; si no, GET /v1/models y elegir uno con visión, cachear).
   PDFs: usar pdf-to-images.ts (texto-primero; rasterizar fallback). Pedir JSON; parsear primer {...} como hace ClaudeFinancialStatementProvider.
3. AnthropicProvider.ts: reusar enfoque de ClaudeFinancialStatementProvider (bloque document/image).
4. MockAIProvider.ts: deterministas (confidence ~0.6).
5. index.ts: getAIProvider() por AI_PROVIDER con fallback Mock + console.warn.
6. pdf-to-images.ts: implementar la estrategia decidida en Ola 0; ante fallo de rasterización, lanzar error tipado que el caller mapea a needsReview.
7. .env.example y package.json según "Archivos a modificar".
8. Test ai-provider.test.ts (Vitest): getAIProvider sin key → Mock; con XAI_API_KEY (mockeado) → Xai; parseo de JSON robusto.

NO HAGAS: no tocar types/, lib/schemas/, collections.ts, lib/ocr/, ni API routes. No UI. No keys en código.
ÉXITO: pnpm type-check y pnpm test (de este archivo) pasan. Funciones puras/testables (reciben Buffer).
```

### Agente B — Modelo de datos canónico + colecciones + auditoría
**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 0 (forma de `CreditApplication`, nombres canónicos)

#### Objetivo
Tipos/schemas del dominio con **nombres canónicos**, incluyendo `CreditApplication`. Dueño único de archivos de fundación.

#### Archivos a crear
- `types/credito-hub.ts` — `CanonicalCreditProfile`, `ExtractedField<T>`, `DocumentClassification`, `DocumentJob`, `JobStatus`, `CreditApplication`.
- `types/bank-requirements.ts` — `BankRequirementTemplate`, `BankRequirement`, `RequirementMatch`, `MatchStatus`.
- `lib/schemas/credito-hub.ts` y `lib/schemas/bank-requirements.ts` — Zod.
- `__tests__/credito-hub/schemas.test.ts` — validación de schemas (cuit 11 dígitos, confidence 0..1, enums).

#### Archivos a modificar
- `lib/firebase/collections.ts` — `DOCUMENT_JOBS`, `DOCUMENT_CLASSIFICATIONS`, `EXTRACTED_FIELDS`, `CANONICAL_CREDIT_PROFILES`, `BANK_REQUIREMENT_TEMPLATES`, `CREDIT_APPLICATIONS`, `REQUIREMENT_MATCHES`.
- `types/audit.ts` — `document.uploaded`, `document.classified`, `document.job_queued`, `document.job_failed`, `field.extracted`, `field.confirmed`, `field.corrected`, `field.rejected`, `canonical_profile.updated`, `bank_requirement.created`, `bank_requirement.parsed`, `requirement.matched`, `credit_application.created`, `credit_package.generated`.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit. Stack: Next.js + TypeScript estricto + Firestore + Zod.
Leé: docs/credito-hub/000-ola0-decisiones.md (nombres canónicos + CreditApplication), types/statement-imports.ts,
lib/firebase/collections.ts, types/audit.ts (acciones con punto), lib/accounting/statement-fields.ts,
lib/auth/accounting-access.ts (devuelve folderOwnerOrganizationId + accountingFirmId).

REGLA DE NOMBRES: usar SOLO nombres canónicos. NO usar producerId ni clientId en colecciones nuevas.
Partition key del legajo = folderOwnerOrganizationId. Estudio = accountingFirmId. Banco = requestingEntityOrganizationId.

TAREA (sos dueño único de types/, lib/schemas/, collections.ts, types/audit.ts):
1. types/credito-hub.ts:
   - JobStatus = "queued"|"preprocessing"|"classifying"|"extracting"|"validating"|"awaiting_review"|"completed"|"failed"|"partially_completed"|"stalled"
   - DocumentJob { id; folderOwnerOrganizationId; accountingFirmId|null; documentId; status:JobStatus;
       attempts:number; maxAttempts:number; claimedBy?:string|null; claimedAt?:string|null; leaseExpiresAt?:string|null;
       provider:string; error?:string|null; fileHash:string; encryptionStatus:"plaintext"|"encrypted";
       createdBy; createdByOrganizationId; createdAt; updatedAt }
   - DocumentClassification { id; documentId; folderOwnerOrganizationId; documentType:string; subtype?:string;
       cuit?:string; period?:string; issueDate?:string; expiryDate?:string; issuer?:string; confidence:number;
       needsReview:boolean; createdAt }
   - ExtractedField<T=unknown> { id; folderOwnerOrganizationId; documentId; documentVersionId?:string|null;
       pageNumber:number|null; fieldCode:string; rawLabel:string|null; rawValue:string|null; normalizedValue:T|null;
       currency:string|null; unit:string|null; periodStart:string|null; periodEnd:string|null;
       boundingBox:{x,y,width,height}|null; confidence:number;
       extractionMethod:"NATIVE_TEXT"|"OCR"|"TABLE_EXTRACTION"|"VISION_MODEL"|"MANUAL";
       reviewStatus:"PENDING"|"CONFIRMED"|"CORRECTED"|"REJECTED"; reviewedBy:string|null; reviewedAt:string|null;
       correctionReason:string|null; createdAt }
   - CanonicalCreditProfile { id; folderOwnerOrganizationId; identity:{cuit,legalName,activity};
       economic/financial/fiscal/patrimonial: bloques que REFERENCIAN fieldIds (string[]), no valores sueltos;
       validationState:"incomplete"|"in_review"|"validated"; version:number; createdBy; createdAt; updatedAt }
   - CreditApplication { id; folderOwnerOrganizationId; requestingEntityOrganizationId; requirementTemplateId;
       status:"draft"|"submitted"|"in_review"|"awaiting_documents"|"approved"|"rejected"|"expired";
       requestedAmount?:number; productName?:string; createdBy; createdByOrganizationId; createdAt; updatedAt }
2. types/bank-requirements.ts: BankRequirement, BankRequirementTemplate (con organizationId=requestingEntityOrganizationId,
   version, status draft/published/archived, requirements[]), MatchStatus (fulfilled/partial/missing/expired/inconsistent/
   needs_review/not_applicable/pending_signature/pending_certification/substitutable), RequirementMatch { id;
   creditApplicationId; requirementCode; status:MatchStatus; matchedDocumentIds:string[]; explanation; responsibleRole; dueDate?; createdAt }.
3. lib/schemas/credito-hub.ts y bank-requirements.ts: Zod create/update (cuit 11 dígitos, confidence 0..1, enums cerrados).
4. collections.ts: agregá las 7 constantes nuevas. No borres existentes.
5. types/audit.ts: agregá las acciones listadas en el plan (estilo con punto).
6. __tests__/credito-hub/schemas.test.ts (Vitest): casos válidos/ inválidos de los schemas clave.

NO HAGAS: no servicios, API ni UI. No tocar lib/ai/ ni docs/.
ÉXITO: pnpm type-check y pnpm test (schemas) pasan. Sin dependencias circulares. Cero producerId/clientId en colecciones nuevas.
```

### Agente C — Documentación de diseño CreditoHub
**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 0

#### Objetivo
Documentos de diseño alineados al stack y modelo real, sin tocar código.

#### Archivos a crear
- `docs/credito-hub/001-vision-producto.md`, `004-arquitectura-tecnica.md` (Mermaid pipeline + cola con lease), `005-modelo-datos.md` (Mermaid ER con nombres canónicos), `006-pipeline-documental.md`, `008-requisitos-bancarios.md`, `009-seguridad-y-privacidad.md` (reusa grants/scopes/audit + cifrado V1 compat), `011-plan-mvp.md`, `013-riesgos-y-decisiones-pendientes.md`.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit (Legajo), standalone. Stack: Next.js + Firebase + TypeScript.
Leé: docs/credito-hub/000-ola0-decisiones.md, CLAUDE.md, reports/000, reports/010, reports/012, reports/013, lib/firebase/collections.ts, lib/ocr/*.
TAREA: escribir los 8 documentos en español, concisos y accionables, cada uno con Objetivo, Alcance, Decisiones,
Alternativas, Riesgos, Criterios de aceptación, Dependencias, Preguntas abiertas. Reflejar: IA propone/contador certifica;
provider multiproveedor; cola async con lease; procedencia obligatoria; nombres canónicos (sin producerId/clientId);
reuso de grants/scopes/audit + ruta Storage canónica + cifrado V1 compat (flag CREDITO_HUB_ALLOW_REAL_DATA);
MVP = Balance/Resultados/IVA/F931 + un banco; standalone (solo credenciales LLM compartidas). Diagramas Mermaid.
NO HAGAS: código; nada fuera de docs/credito-hub/.
ÉXITO: 8 docs coherentes con el repo real; sin prometer E2EE ni features fuera del MVP.
```

---

## Ola 2 — Building blocks: cola (con lease), clasificación y extracción
> Ejecutar SOLO después de Ola 1. Agente A + B + C en PARALELO

### Agente A — Servicio de cola con lease y límites
**Depende de:** Ola 1 (tipos `DocumentJob`, colección `DOCUMENT_JOBS`)

#### Archivos a crear
- `lib/services/document-jobs.ts` — `enqueueJob` (idempotente por `fileHash`+`folderOwnerOrganizationId`), `getJob`, `transitionJob` (valida transiciones), `claimNextQueuedJob` (lock con `claimedBy`/`leaseExpiresAt` en transacción), `reclaimStalledJobs` (lease vencido → `queued` si attempts<maxAttempts, si no `failed`), `listJobs`.
- `lib/credito-hub/limits.ts` — constantes (`MAX_JOBS_PER_RUN`, `MAX_FILE_SIZE_PDF_IMG`, `MAX_FILE_SIZE_EXCEL`, `MAX_ZIP_SIZE`, `MAX_PDF_PAGES`, `JOB_TIMEOUT_MS`, `MAX_ATTEMPTS`, `LEASE_MS`).
- `__tests__/credito-hub/document-jobs.test.ts` — idempotencia por hash, transiciones inválidas, claim/lease, reclaim de stalled.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit. Stack: Next.js + Firebase Admin SDK. Leé: lib/firebase/admin-sdk.ts (getAdminDb),
lib/firebase/collections.ts (DOCUMENT_JOBS), types/credito-hub.ts (DocumentJob/JobStatus),
lib/services/statement-imports-admin.ts (patrón Admin SDK), lib/firebase/audit.ts, docs/credito-hub/000-ola0-decisiones.md (límites).
TAREA: lib/credito-hub/limits.ts con las constantes de Ola 0 y lib/services/document-jobs.ts:
- enqueueJob: status "queued", idempotente (mismo fileHash+folderOwnerOrganizationId no-fallido → retorna existente). audit document.job_queued.
- transitionJob(jobId,next,patch?): valida transición; en "failed" setea error + audit document.job_failed.
- claimNextQueuedJob(workerId): transacción; toma "queued" o "stalled" reclamables → "preprocessing" con claimedBy/claimedAt/leaseExpiresAt=now+LEASE_MS; incrementa attempts.
- reclaimStalledJobs(): jobs con leaseExpiresAt<now en estados activos → "queued" si attempts<maxAttempts, si no "failed".
- listJobs(folderOwnerOrganizationId). Todas validan organizationId; serverTimestamp; ISO al leer.
Test document-jobs.test.ts (Vitest, Admin SDK mockeado): idempotencia, transiciones, lease, stalled.
NO HAGAS: no llamar lib/ai, no clasificar/extraer, no API routes, no UI. No editar types/ ni collections.ts.
ÉXITO: pnpm type-check y pnpm test (jobs) pasan.
```

### Agente B — Clasificador documental IA
**Depende de:** Ola 1 (`lib/ai/`, `DocumentClassification`)

#### Archivos a crear
- `lib/ai/classification/document-classifier.ts` — `classify(buffer,mime,hints)` con `getAIProvider().classifyDocument`; `needsReview` si confidence < 0.7.
- `lib/services/document-classification.ts` — persiste/lee en `DOCUMENT_CLASSIFICATIONS` + audit `document.classified`.
- `__tests__/credito-hub/classifier.test.ts` — con MockAIProvider, clasifica los tipos MVP y marca needsReview.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit. Leé: lib/ai/index.ts y AIProvider.ts, types/credito-hub.ts (DocumentClassification),
lib/firebase/collections.ts (DOCUMENT_CLASSIFICATIONS), lib/firebase/audit.ts.
TAREA:
1. document-classifier.ts: classify usa schemaPrompt para identificar tipo argentino entre
   estado_situacion_patrimonial, estado_resultados, ddjj_iva, formulario_931, constancia_cuit, extracto_bancario,
   titulo_propiedad, contrato_social, desconocido. Devuelve DocumentClassification (sin persistir). needsReview=confidence<0.7.
2. document-classification.ts: saveClassification + getClassificationByDocument. audit document.classified.
3. classifier.test.ts (Vitest, getAIProvider→Mock).
NO HAGAS: no cola, no extracción, no API/UI. No editar types/ ni collections.ts.
ÉXITO: pnpm type-check y pnpm test (classifier) pasan. Sin XAI_API_KEY usa Mock.
```

### Agente C — Extractores + perfil canónico con procedencia
**Depende de:** Ola 1 (`lib/ai/`, `ExtractedField`/`CanonicalCreditProfile`)

#### Archivos a crear
- `lib/ai/extraction/extractors.ts` — `extractBalance`, `extractIncome`, `extractIvaReturn`, `extractForm931` → `ExtractedField[]` con procedencia.
- `lib/services/extracted-fields.ts` — persiste/lee `EXTRACTED_FIELDS` + audit `field.extracted`.
- `lib/services/canonical-profile.ts` — `upsertProfileFromFields(folderOwnerOrganizationId, fields)` (referencia fieldIds, recalcula `validationState`) + audit `canonical_profile.updated`.
- `__tests__/credito-hub/extractors.test.ts` — con Mock, cada extractor produce ExtractedField con procedencia completa.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit. Leé: lib/ai/index.ts y AIProvider.ts, lib/accounting/statement-fields.ts (campos contables + DEFAULTs),
lib/ocr/ClaudeFinancialStatementProvider.ts (SYSTEM_PROMPT modelo de campos AR), types/credito-hub.ts, lib/firebase/collections.ts, lib/firebase/audit.ts.
REGLA DE NOMBRES: partition key = folderOwnerOrganizationId. NO usar producerId/clientId.
TAREA:
1. extractors.ts: por tipo MVP arma schemaPrompt (reusá campos del SYSTEM_PROMPT para balance/resultados;
   IVA → débito/crédito fiscal, saldo, período; F931 → empleados, remuneraciones, contribuciones, período).
   Llama getAIProvider().extractStructured y mapea cada campo a ExtractedField (extractionMethod "VISION_MODEL", reviewStatus "PENDING", confidence/page del provider).
2. extracted-fields.ts: saveFields batch + getFieldsByDocument/getFieldsByOwner. audit field.extracted.
3. canonical-profile.ts: upsertProfileFromFields referencia fieldIds, versiona, setea validationState. audit canonical_profile.updated.
4. extractors.test.ts (Vitest, Mock): procedencia completa por campo.
NO HAGAS: no orquestar cola, no aplicar a balance_sheets/income_statements (decide el contador), no API/UI. No editar types/ ni collections.ts.
ÉXITO: pnpm type-check y pnpm test (extractors) pasan. Cada dato tiene procedencia.
```

---

## Ola 3 — Orquestación, API y requisitos bancarios
> Ejecutar SOLO después de Ola 2. Agente A + B + C en PARALELO

### Agente A — API de carga masiva + worker con lease y flag de datos reales
**Depende de:** Ola 2 (cola, clasificador, extractores)

#### Archivos a crear
- `app/api/credito-hub/intake/route.ts` — POST multipart: auth + `assertCanManageAccountingFolder(session, targetOrganizationId)`; valida `CREDITO_HUB_ALLOW_REAL_DATA` (si false, exige `x-staging-data` o rechaza producción); descomprime ZIP; valida límites; sube a Storage (ruta canónica); registra `documents` con `encryptionStatus`; calcula hash; `enqueueJob`. audit `document.uploaded`.
- `app/api/credito-hub/jobs/process/route.ts` — POST Bearer `CRON_SECRET`: `reclaimStalledJobs` → procesa hasta `MAX_JOBS_PER_RUN` (`claimNextQueuedJob` → classify → extract → upsert profile → `awaiting_review`/`failed`). Idempotente, respeta lease/timeout.
- `app/api/credito-hub/jobs/route.ts` — GET estado por `folderOwnerOrganizationId`.
- `__tests__/security/credito-hub-intake.test.ts` — negativos: sesión inválida, org ajena, archivo sobre límite, flag de datos reales.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit. Leé: app/api/accounting/statements/extract/route.ts (patrón upload+Storage+documents+audit+auth),
lib/auth/server-session.ts, lib/auth/accounting-access.ts, lib/credito-hub/limits.ts, lib/services/document-jobs.ts,
lib/services/document-classification.ts, lib/ai/extraction/extractors.ts, lib/services/extracted-fields.ts,
lib/services/canonical-profile.ts, app/api/cron/expire-grants/route.ts (patrón CRON_SECRET), docs/credito-hub/000-ola0-decisiones.md.
REGLA: nunca tomar folderOwnerOrganizationId del body; derivar con assertCanManageAccountingFolder(session, targetOrganizationId).
TAREA:
1. intake/route.ts: auth + validación de folder; si process.env.CREDITO_HUB_ALLOW_REAL_DATA !== "true", solo aceptar datos marcados staging (header/flag) — documentar. Descomprimir ZIP (lib server-side), validar MAX_ZIP_SIZE/MAX_FILE_SIZE/mime; por archivo: subir a Storage (ruta canónica de extract/route.ts), crear documents{documentType:"credit_folder_source", encryptionStatus:"plaintext", folderOwnerOrganizationId,...}, hash SHA-256, enqueueJob. audit document.uploaded. Devolver jobIds.
2. jobs/process/route.ts: Bearer CRON_SECRET. reclaimStalledJobs(); loop hasta MAX_JOBS_PER_RUN: claimNextQueuedJob → descargar buffer Storage → classify → extract por tipo → saveFields → upsertProfileFromFields → transition awaiting_review (o failed con error). Respetar JOB_TIMEOUT_MS.
3. jobs/route.ts: GET por folderOwnerOrganizationId (auth titular/contador vinculado/admin).
4. Test credito-hub-intake.test.ts (Vitest): casos negativos de auth/límites/flag.
NO HAGAS: no procesar pesado en intake (solo encola). No UI.
ÉXITO: pnpm type-check y pnpm test (intake) pasan. 3 archivos → 3 jobs; worker los lleva a awaiting_review.
```

### Agente B — Motor de requisitos bancarios + matching + CreditApplication
**Depende de:** Ola 2 (perfil/fields), Ola 1 (tipos bank-requirements + CreditApplication, lib/ai)

#### Archivos a crear
- `lib/ai/bank-requirements/parser.ts` — `parseRequirementsFromDocument` → `BankRequirement[]` propuestos.
- `lib/services/bank-requirements.ts` — CRUD templates + versionado/publish (`requestingEntityOrganizationId`). audit `bank_requirement.parsed/created`.
- `lib/services/credit-applications.ts` — crear/leer `CreditApplication`. audit `credit_application.created`.
- `lib/services/requirement-matching.ts` — `matchRequirements(creditApplicationId)` → `RequirementMatch[]` con `MatchStatus` y explicación. audit `requirement.matched`.
- `app/api/credito-hub/bank-requirements/route.ts` (POST parse / GET list), `app/api/credito-hub/bank-requirements/[templateId]/match/route.ts` (POST), `app/api/credito-hub/credit-applications/route.ts` (POST/GET).
- `__tests__/credito-hub/requirement-matching.test.ts` — fulfilled/missing/expired según períodos y vigencias.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit. Leé: types/bank-requirements.ts, types/credito-hub.ts (CreditApplication), lib/schemas/bank-requirements.ts,
lib/ai/index.ts, lib/services/document-classification.ts, lib/services/canonical-profile.ts, lib/auth/server-session.ts, lib/firebase/audit.ts.
Banco = organization type "requesting_entity" (requestingEntityOrganizationId).
TAREA:
1. parser.ts: parseRequirementsFromDocument → schemaPrompt que convierte requisitos del banco en BankRequirement[]
   (ej "últimos 3 balances certificados" → periodCount:3, requiresCouncilCertification:true, category FINANCIAL_STATEMENTS, validationRules). Propuesta, no publica.
2. bank-requirements.ts: create/get/list/publish con versionado; solo org banco o admin_platform. audit bank_requirement.parsed/created.
3. credit-applications.ts: createCreditApplication(folderOwnerOrganizationId, requestingEntityOrganizationId, requirementTemplateId, ...) + get/list. audit credit_application.created.
4. requirement-matching.ts: matchRequirements(creditApplicationId) → por cada requirement, busca documentos clasificados + datos del perfil canónico; MatchStatus + explanation + matchedDocumentIds; respeta maxAgeMonths/periodCount. audit requirement.matched.
5. API routes según lista. Auth server-side, sin orgId del body.
6. requirement-matching.test.ts (Vitest): períodos/vigencias.
NO HAGAS: no generar expediente final (post-MVP), no tocar cola/intake. No editar types/ ni collections.ts.
ÉXITO: pnpm type-check y pnpm test (matching) pasan.
```

### Agente C — API de revisión profesional + perfil canónico
**Depende de:** Ola 2 (extracted-fields, canonical-profile)

#### Archivos a crear
- `app/api/credito-hub/review/[targetOrganizationId]/route.ts` — GET campos `PENDING`/baja confianza + documento origen/página.
- `app/api/credito-hub/review/fields/[fieldId]/route.ts` — PATCH `confirm|correct|reject`; recalcula perfil. audit `field.confirmed/corrected/rejected`.
- `app/api/credito-hub/canonical-profile/[targetOrganizationId]/route.ts` — GET perfil canónico.
- `__tests__/security/credito-hub-review.test.ts` — negativos: contador sin link, org ajena.

#### Prompt completo para el agente
```text
Proyecto: Agro-Credit. Leé: lib/services/extracted-fields.ts, lib/services/canonical-profile.ts,
lib/auth/accounting-access.ts (assertCanManageAccountingFolder), app/api/producer-profile/[orgId]/route.ts (patrón API con auth de carpeta), lib/firebase/audit.ts.
REGLA: el param de ruta es targetOrganizationId; validar con assertCanManageAccountingFolder y derivar folderOwnerOrganizationId. Nunca confiar en el body.
TAREA:
1. review/[targetOrganizationId]/route.ts GET: campos PENDING o confidence<0.7 enriquecidos con documentId, fileName, pageNumber, rawText. Auth contador vinculado/titular/admin.
2. review/fields/[fieldId]/route.ts PATCH {action:"confirm"|"correct"|"reject", value?, reason?}: actualiza ExtractedField (reviewedBy/reviewedAt), recalcula perfil con upsertProfileFromFields. audit field.confirmed/corrected/rejected. La IA NO confirma sola.
3. canonical-profile/[targetOrganizationId]/route.ts GET.
4. credito-hub-review.test.ts (Vitest): negativos de auth.
NO HAGAS: no tocar extractores/cola/UI.
ÉXITO: pnpm type-check y pnpm test (review) pasan. Confirmar/corregir actualiza ExtractedField + perfil, con audit.
```

---

## Ola 4 — Frontend
> Ejecutar SOLO después de Ola 3. Agente A + B + C en PARALELO

### Agente A — UI de carga masiva con progreso
**Depende de:** Ola 3 (intake + jobs API)
#### Archivos a crear
- `components/credito-hub/MassUploadDropzone.tsx`, `components/credito-hub/JobProgressList.tsx`, `app/app/contador/productores/[producerId]/legajo/page.tsx`.
> Nota de ruta: la ruta de UEX del contador conserva el segmento legacy `[producerId]` por compatibilidad de routing; internamente ese id se pasa como `targetOrganizationId` a la API. No introducir el nombre legacy en datos nuevos.
#### Prompt
```text
Proyecto: Agro-Credit. Stack: Next.js App Router + React 19 + shadcn/ui (components/ui/) + Tailwind + Lucide.
Leé: components/documents/DocumentUploader.tsx, app/app/contador/productores/[producerId]/documentos/page.tsx, contratos de app/api/credito-hub/intake y jobs.
TAREA: dropzone (webkitdirectory + .zip + multi-file) → fetch con getIdToken() a /api/credito-hub/intake (manda targetOrganizationId = el id de ruta); progreso de subida; JobProgressList pollea /api/credito-hub/jobs cada ~4s mostrando estado por archivo hasta completar. Smoke test manual documentado.
NO HAGAS: lógica server-side. Usá components/ui/.
ÉXITO: pnpm type-check pasa. Subir archivos crea jobs y la lista refleja avance.
```

### Agente B — Visor lado a lado / bandeja de revisión
**Depende de:** Ola 3 (review API)
#### Archivos a crear
- `components/credito-hub/ReviewWorkbench.tsx`, `components/credito-hub/FieldReviewRow.tsx`, `app/app/contador/productores/[producerId]/revision/page.tsx`.
#### Prompt
```text
Proyecto: Agro-Credit. Stack: Next.js + React 19 + shadcn/ui + Tailwind + Lucide.
Leé: contratos de app/api/credito-hub/review/*, components/ui/, app/app/contador/productores/[producerId]/page.tsx.
TAREA: ReviewWorkbench = documento origen a la izquierda (vía endpoint de descarga existente) + campos PENDING/baja confianza a la derecha. FieldReviewRow: valor + confianza (color por umbral) + Confirmar/Corregir(input+motivo)/Rechazar → PATCH /api/credito-hub/review/fields/[fieldId] (manda targetOrganizationId de ruta). Refresca tras la acción. IA propone, contador decide.
NO HAGAS: server-side; no certificar/aprobar automáticamente.
ÉXITO: pnpm type-check pasa. Confirmar/corregir persiste vía API y refresca UI.
```

### Agente C — Constructor de requisitos + matriz de cumplimiento
**Depende de:** Ola 3 (bank-requirements + matching API)
#### Archivos a crear
- `components/credito-hub/RequirementBuilder.tsx`, `components/credito-hub/ComplianceMatrix.tsx`, `app/app/entidad/requisitos/page.tsx`, `app/app/entidad/carpetas/[targetOrgId]/cumplimiento/page.tsx`.
#### Prompt
```text
Proyecto: Agro-Credit. Stack: Next.js + React 19 + shadcn/ui + Tailwind + Lucide.
Leé: contratos de app/api/credito-hub/bank-requirements/* y credit-applications, components/ui/, app/app/entidad/carpetas/[targetOrgId]/page.tsx (vista entidad con grants/scopes).
TAREA: RequirementBuilder sube PDF → muestra BankRequirement[] propuestos editables → publica versión. ComplianceMatrix consume match: requisito/MatchStatus(badge)/documento/período-vigencia/responsable/acción ("solicitar faltante"). Respetar grants/scopes existentes.
NO HAGAS: server-side; no mostrar datos fuera del scope autorizado.
ÉXITO: pnpm type-check pasa. PDF de requisitos → propuesta; matriz muestra cumplido/falta/vencido.
```

---

## Ola 5 — Integración final
> Ejecutar SOLO después de Ola 4. Agente A + B en PARALELO

### Agente A — Tests de integración y aislamiento end-to-end
**Depende de:** Ola 4
#### Archivos a crear
- `__tests__/security/credito-hub-isolation.test.ts` — productor A no ve jobs/fields/perfil/aplicaciones de B; contador sin link no accede; entidad sin grant no ve matriz.
- `__tests__/credito-hub/pipeline-integration.test.ts` — flujo intake→worker→awaiting_review→review→perfil con Mock.
#### Prompt
```text
Proyecto: Agro-Credit (Vitest). Leé __tests__/security/auth-helpers.test.ts (modelo), servicios de Olas 2-3, lib/ai/index.ts.
TAREA: tests deterministas (Admin SDK + getAIProvider→Mock; sin Firebase prod ni keys). Cubrí aislamiento multi-tenant (allow/deny) y el flujo de pipeline completo con Mock.
ÉXITO: pnpm test:smoke pasa.
```

### Agente B — Verificación e2e manual + docs
**Depende de:** Ola 4
#### Archivos a modificar
- `docs/MODULE_REGISTRY.md`, `reports/HANDOFF_ACTUAL.md`, `reports/000_ESTADO_ACTUAL_PROYECTO.md`.
#### Prompt
```text
Proyecto: Agro-Credit. Ejecutá pnpm type-check, pnpm check:security-shape, pnpm test; documentá resultados REALES (no inventar).
Registrá en MODULE_REGISTRY los módulos nuevos (lib/ai, document-jobs, classification, extraction, canonical-profile, bank-requirements, credit-applications, requirement-matching, UIs) con estado y rutas. Actualizá HANDOFF con archivos, pendientes (expediente final, tipos documentales extra, integración bancaria real, cifrado V1) y riesgos.
ÉXITO: docs coherentes con lo implementado; checklist de verificación final ejecutable.
```

---

## Verificación final (manual)

### Ola 0 (gate antes de codificar)
- [ ] `docs/credito-hub/000-ola0-decisiones.md` cerrado.
- [ ] Modelo xAI default resuelto con la key real (o marcado pendiente del dueño).
- [ ] Estrategia PDF (texto-primero + fallback) decidida con comportamiento ante fallo.
- [ ] Decisión cifrado/`CREDITO_HUB_ALLOW_REAL_DATA` registrada.
- [ ] `CreditApplication` definida.

### Configuración IA
- [ ] `.env.local` con `AI_PROVIDER`, `XAI_API_KEY`, `XAI_BASE_URL`, `XAI_MODEL` (o vacío→runtime).
- [ ] Sin key → Mock, nada rompe. `AI_PROVIDER=anthropic` usa Claude sin tocar código.

### Pipeline documental
- [ ] Múltiples archivos / ZIP → un job por archivo (idempotente por hash, con lease).
- [ ] Worker recupera jobs `stalled`; clasifica→extrae→perfil→`awaiting_review`.
- [ ] Cada dato extraído tiene procedencia. Datos reales bloqueados salvo `CREDITO_HUB_ALLOW_REAL_DATA=true`.

### Revisión + requisitos + seguridad
- [ ] Contador ve documento + campos lado a lado; confirma/corrige/rechaza; perfil se actualiza; todo en `audit_logs`.
- [ ] PDF de requisitos → propuesta editable; matriz por cliente con MatchStatus.
- [ ] Productor A no ve datos de B; contador sin link no accede; entidad sin grant no ve matriz.
- [ ] `pnpm type-check`, `pnpm check:security-shape`, `pnpm test` pasan.

---

## Fuera de alcance (post-MVP)
- Generación del expediente bancario final (PDF/ZIP/JSON por banco) — próximo hito inmediato.
- Tipos documentales más allá de los 4 del MVP.
- Verificación automática de matrícula vía API de Consejos Profesionales.
- Antifraude avanzado, scoring, firma digital propia, WhatsApp, integración bancaria viva.
- Cifrado V1 real de archivos fuente (Plan 012 Ola 3) — el MVP queda forward-compatible y limitado a staging hasta cerrarlo.
