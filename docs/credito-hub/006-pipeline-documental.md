# CreditoHub — 006 · Pipeline documental

**Fecha:** 2026-06-16
**Estado:** Diseño (Ola 1 / Agente C). Sin código.
**Fuente de verdad de decisiones:** `docs/credito-hub/000-ola0-decisiones.md`.

---

## Objetivo

Definir las etapas del pipeline desde la carga masiva hasta la revisión del contador, con procesamiento asíncrono, lease y procedencia obligatoria. **La IA propone en cada etapa; el contador certifica al final.**

## Alcance
- Etapas: intake → preprocesamiento → clasificación → extracción → validación → revisión.
- 4 tipos documentales MVP: Balance, Estado de Resultados, DDJJ IVA, Formulario 931.
- No incluye UI (Olas 4) ni matching de requisitos (ver `008-requisitos-bancarios.md`).

## Etapas

### 1. Intake (`/api/credito-hub/intake`)
- Auth + `assertCanManageAccountingFolder(session, targetOrganizationId)` → deriva `folderOwnerOrganizationId`.
- Verifica `CREDITO_HUB_ALLOW_REAL_DATA`: si `false`, solo acepta datos marcados staging/demo.
- Descomprime ZIP, valida `MAX_ZIP_SIZE` / `MAX_FILE_SIZE_*` / mime.
- Por archivo: sube a Storage (ruta canónica), crea `documents` con `encryptionStatus: "plaintext"`, calcula hash SHA-256, llama `enqueueJob` (idempotente por `fileHash` + `folderOwnerOrganizationId`).
- Audit `document.uploaded`. **No procesa: solo encola.** Devuelve `jobIds`.

### 2. Preprocesamiento (worker, estado `preprocessing`)
- `reclaimStalledJobs()` recupera jobs con lease vencido.
- `claimNextQueuedJob(workerId)` toma un job (`claimedBy`, `leaseExpiresAt = now + LEASE_MS`, `attempts++`).
- `lib/ai/pdf-to-images.ts`: **texto-primero**. PDF digital → texto nativo (`pdfjs-dist`, sin canvas). PDF escaneado → rasteriza solo `MAX_PDF_PAGES`. Si la rasterización falla → marca `needsReview`, **no rompe el job**.

### 3. Clasificación (estado `classifying`)
- `getAIProvider().classifyDocument(buffer, mime, hints)` → tipo entre: `estado_situacion_patrimonial`, `estado_resultados`, `ddjj_iva`, `formulario_931`, `constancia_cuit`, `extracto_bancario`, `titulo_propiedad`, `contrato_social`, `desconocido`.
- Persiste `DocumentClassification`. `needsReview = confidence < 0.7`. Audit `document.classified`.

### 4. Extracción (estado `extracting`)
- Según tipo MVP, `extractStructured` con schemaPrompt dedicado:
  - **Balance / Resultados:** reusa el modelo de campos del `SYSTEM_PROMPT` de `lib/ocr/ClaudeFinancialStatementProvider.ts`.
  - **DDJJ IVA:** débito/crédito fiscal, saldo, período.
  - **Formulario 931:** empleados, remuneraciones, contribuciones, período.
- Cada campo → `ExtractedField` con `extractionMethod` (`VISION_MODEL`/`NATIVE_TEXT`), `pageNumber`, `confidence`, `reviewStatus: "PENDING"`. Audit `field.extracted`.

### 5. Validación (estado `validating`)
- Arma/normaliza `ExtractedField[]` con procedencia completa.
- `upsertProfileFromFields(folderOwnerOrganizationId, fields)`: el perfil canónico referencia fieldIds, versiona, recalcula `validationState`. Audit `canonical_profile.updated`.
- Transición a `awaiting_review` (o `partially_completed` si quedan campos `needsReview`, o `failed` con error si `attempts >= maxAttempts`).

### 6. Revisión profesional (`awaiting_review` → contador)
- Bandeja: documento origen + campos `PENDING`/baja confianza lado a lado.
- Contador hace `confirm` | `correct` | `reject` → actualiza `ExtractedField` (`reviewedBy`, `reviewedAt`) y recalcula el perfil. Audit `field.confirmed` / `field.corrected` / `field.rejected`.
- **La IA no confirma sola.** Solo cuando los campos clave están confirmados el perfil pasa a `validated`.

## Estados del job (`JobStatus`)

`queued` → `preprocessing` → `classifying` → `extracting` → `validating` → `awaiting_review` → `completed`. Salidas alternativas: `failed`, `partially_completed`, `stalled` (lease vencido, recuperable).

## Decisiones
- Intake solo encola; el trabajo pesado vive en el worker (límites de Vercel).
- Texto-primero antes que visión (costo/exactitud).
- Ningún fallo de rasterización rompe el pipeline: degrada a `needsReview`.
- Idempotencia por `fileHash` evita re-procesar el mismo archivo.

## Alternativas
- **Procesar en el request de subida:** descartado (timeout/costo).
- **Un job por lote en vez de por archivo:** descartado; granularidad por archivo permite reintentos y procedencia claros.

## Riesgos
- Clasificación errónea de tipos parecidos (balance vs. resultados). Mitigación: `needsReview` + revisión humana.
- Extracción con baja confianza masiva. Mitigación: umbral 0.7 marca revisión; nada se confirma solo.
- Reintentos infinitos. Mitigación: `MAX_ATTEMPTS` → `failed`.

## Criterios de aceptación
- Lote multi-archivo / ZIP → un job por archivo, idempotente por hash, con lease.
- Worker clasifica → extrae → perfil → `awaiting_review`; recupera `stalled`.
- Cada dato extraído tiene procedencia; nada `CONFIRMED` sin acción del contador.

## Dependencias
- Capa IA (Ola 1 A), cola (Ola 2 A), clasificador (Ola 2 B), extractores/perfil (Ola 2 C).
- `lib/ocr/ClaudeFinancialStatementProvider.ts` como base de prompts.

## Preguntas abiertas
- ¿Manejo de documentos multi-período en un solo archivo (ej. balance comparativo)?
- ¿Reprocesamiento manual de un job `failed` desde la UI? (post-MVP probable).
