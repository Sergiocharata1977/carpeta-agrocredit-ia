# Plan Olas — Asistente Documental Conversacional de CréditoHub

**Fecha:** 2026-07-01  
**Feature:** Transformar chat de carga de documentos en asistente conversacional transaccional: leer → extraer → preguntar → preparar → confirmar → ejecutar.  
**Proyectos afectados:** `Agro-Credit` (carpeta-agrocredit-ia)  
**Stack:** Next.js 14 + TypeScript + React + Firebase Admin SDK  
**Regla de oro:** La IA nunca escribe datos finales directo en Firestore. Puede crear una operación temporal auditada, pero los datos operativos se aplican solo con confirmación explícita: prepara → muestra → confirma → ejecuta.

---

## Enmiendas obligatorias antes de ejecutar

Este plan corrige la primera versión para evitar una implementación visual pero no transaccional. Las reglas siguientes son obligatorias para todos los agentes:

1. **No basta ocultar componentes.** El flujo debe reemplazar la lógica por una conversación con estado, intención, resolución de entidades, operación pendiente, confirmación y ejecución controlada.
2. **Persistencia temporal permitida.** La regla real es: no escribir datos finales antes de confirmar. Sí se debe guardar la operación preparada en `assistant_pending_imports` con TTL, auditoría y estado `prepared | confirmed | executed | canceled`, porque si no el backend no puede confirmar ni ejecutar de forma segura.
3. **Reutilizar arquitectura existente.** No duplicar `document_jobs`, `document_classifications`, `extracted_fields`, `statement_imports`, `balance_sheets`, `income_statements`, `organizations` ni servicios contables ya existentes. El asistente conversa y orquesta; no crea una segunda base paralela.
4. **Modelo de entidades correcto.** En este producto:
   - `accounting_firm` = estudio/cuenta contable, por ejemplo Estudio Gramajo.
   - `system_user` = cliente raíz o carpeta principal.
   - `system_user_entity` = empresa vinculada dentro del cliente raíz, por ejemplo Los Señores del Agro SRL.
5. **La IA no analiza finanzas.** Solo clasifica, extrae, mapea y prepara carga documental. No ratios, scoring, recomendaciones ni interpretación económica.
6. **Todas las escrituras finales pasan por funciones controladas.** Nada de que el modelo genere writes libres. Las funciones deben validar permisos, operación confirmada, estado vigente, tenant y auditoría.
7. **Plan de agentes con dependencias reales.** No marcar como paralelos agentes que importan tipos o servicios creados por otro agente de la misma ola.

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A, B | No — A crea tipos; B depende de A | Nada — primera ola |
| 2 | A, B | Sí — archivos disjuntos | Ola 1 completa |
| 3 | A, B | Sí — archivos disjuntos | Ola 2 completa |
| 4 | A | Único | Ola 3 completa |
| 5 | A | Único | Ola 4 completa |
| 6 | A | Único | Ola 5 completa |

---

## Ola 1 — Arquitectura: tipos, estados y funciones backend

> Ejecutar primero Agente A. Ejecutar Agente B solo cuando A haya terminado y `pnpm type-check` pase.

### Agente A — Tipos y estados del asistente conversacional

**Puede ejecutarse en paralelo con:** Nadie dentro de Ola 1. Es prerequisito de Agente B.  
**Depende de:** Nada — es la primera ola

#### Objetivo

Definir tipos TypeScript y enum de estados internos para la máquina de conversación del asistente.

#### Archivos a crear

- `types/assistant-states.ts` — enum `AssistantConversationState`, interfaces `AssistantContext`, `AssistantMessage`
- `types/import-pending.ts` — tipos para operaciones de importación pendiente: `PendingImportOperation`, `PendingAction`, `ResolvedEntity`, `ExtractedDocumentData`, `ExtractedField`, `ParsedUserIntent`
- `lib/schemas/assistant.ts` — schemas Zod para validación: `parsedUserIntentSchema`, `extractedDocumentDataSchema`, `pendingImportOperationSchema`

#### Archivos a modificar

- `types/audit.ts` — agregar acciones de asistente a enum `AuditAction`

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero multi-tenant
Stack: Next.js 14 + TypeScript strict + React 19 + Firebase Admin SDK 13+ + Zod v4
Directorio: raíz del proyecto (carpeta-agrocredit-ia)

Lee antes de implementar:
1. types/auth.ts — modelo de Organization y OrganizationType
2. types/audit.ts — enum AuditAction existente
3. types/credito-hub.ts — DocumentType, ExtractedDocumentData si existe
4. reports/019_PLAN_ASISTENTE_DOCUMENTAL_CONVERSACIONAL.md si existe, y este plan 019 completo

TAREA 1 — Crear types/assistant-states.ts

Definir:

enum AssistantConversationState {
  idle = "idle",
  uploading = "uploading",
  processing = "processing",
  document_analyzed = "document_analyzed",
  awaiting_user_intent = "awaiting_user_intent",
  resolving_entities = "resolving_entities",
  preparing_import = "preparing_import",
  awaiting_review = "awaiting_review",
  awaiting_confirmation = "awaiting_confirmation",
  executing_import = "executing_import",
  completed = "completed",
  error = "error"
}

interface AssistantContext {
  state: AssistantConversationState;
  documentId?: string;
  fileName?: string;
  extractedData?: ExtractedDocumentData;
  detectedType?: DocumentType;
  detectedCompany?: { name: string; cuit?: string };
  userIntent?: ParsedUserIntent;
  resolvedEntity?: ResolvedEntity;
  pendingImport?: PendingImportOperation;
  error?: string;
  messages: AssistantMessage[];
}

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  actionType?: "upload" | "parse_intent" | "resolve_entity" | "preview" | "confirm" | "execute";
}

Campos obligatorios sin values por defecto; optional si puede ser null.
Las timestamps deben ser ISO strings.

TAREA 2 — Crear types/import-pending.ts

Definir tipos para operaciones de importación:

type ImportAction =
  | "create_related_company"
  | "associate_related_company"
  | "load_balance"
  | "link_document"
  | "update_canonical_profile";

interface PendingImportOperation {
  operationId: string;
  folderOwnerOrganizationId: string;
  accountingFirmId?: string | null;
  documentId: string;
  actions: PendingAction[];
  preparedAt: string;
  expiresAt: string;
  preparedByUid: string;
  preparedByOrganizationId: string;
  confirmedAt?: string;
  confirmedByUid?: string;
  canceledAt?: string;
  executedAt?: string;
  status: "prepared" | "confirmed" | "executed" | "canceled" | "expired";
}

interface PendingAction {
  actionId: string;
  type: ImportAction;
  targetEntityId?: string;
  targetEntityType?: "accounting_firm" | "root_client" | "related_company" | "document" | "canonical_profile";
  targetEntityName: string;
  payload: Record<string, unknown>;
  requiresApproval: boolean;
}

interface ResolvedEntity {
  type: "accounting_firm" | "root_client" | "related_company";
  id?: string;
  name: string;
  taxId?: string;
  parentOrganizationId?: string;
  status: "found_exact" | "found_multiple" | "not_found" | "new_to_create";
  candidates?: EntityCandidate[];
}

interface EntityCandidate {
  id: string;
  name: string;
  taxId: string;
  confidence: number;
}

interface ParsedUserIntent {
  intent: string;
  targetAccountSearch?: string;
  targetCompanySearch?: string;
  action: string;
  modifiers?: Record<string, unknown>;
}

TAREA 3 — Crear lib/schemas/assistant.ts

Schemas Zod para:
- parsedUserIntentSchema con intent enum
- extractedDocumentDataSchema
- extractedFieldSchema
- pendingImportOperationSchema
- pendingActionSchema
- resolvedEntitySchema

Reutilizar DocumentType existente si existe; si no, definir como enum.
Validaciones relevantes: CUIT argentino normalizado de 11 dígitos cuando exista, nombres de entidad 3-160 caracteres, confidence entre 0 y 1, fechas ISO, operationId UUID/string seguro. No agregar validaciones ajenas como password o email.

TAREA 4 — Actualizar types/audit.ts

Agregar a enum AuditAction:
- "assistant.conversation_started"
- "assistant.document_uploaded"
- "assistant.extraction_completed"
- "assistant.intent_parsed"
- "assistant.entity_resolved"
- "assistant.import_prepared"
- "assistant.import_confirmed"
- "assistant.import_executed"
- "assistant.import_canceled"

No cambiar acciones existentes.

Validación de éxito:
- pnpm type-check pasa sin errores
- Sin dependencias circulares
- Tipos importables desde cualquier servicio
- No usar any innecesariamente
```

---

### Agente B — Funciones backend controladas de carga

**Puede ejecutarse en paralelo con:** Nadie dentro de Ola 1  
**Depende de:** Agente A completo y `pnpm type-check` OK

#### Objetivo

Crear servicios server-side que preparen, persistan operación temporal, validen y ejecuten importaciones SIN escribir datos finales en Firestore antes de confirmación.

#### Archivos a crear

- `lib/services/import-operations.ts` — funciones puras de preparación/validación/ejecución
- `lib/services/entity-resolution.ts` — búsqueda de estudio/cuenta contable, cliente raíz y empresas vinculadas
- `lib/services/assistant-pending-imports.ts` — persistencia temporal de operaciones en `assistant_pending_imports`

#### Archivos a modificar

- Ninguno (las rutas API vendrán en Ola 4)

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero multi-tenant
Stack: Next.js 14 + TypeScript strict + Firebase Admin SDK 13+
Directorio: raíz del proyecto

Lee antes:
1. types/import-pending.ts (acaba de crear Agente A Ola 1)
2. types/auth.ts — Organization, memberships
3. lib/services/server-folder-writes.ts — patrón de función server-side
4. firestore.rules — permisos actuales

TAREA 1 — Crear lib/services/import-operations.ts

Funciones server-side (solo Admin SDK, nunca Firebase client):

async function prepareBalanceImport(
  db: Database,
  documentId: string,
  extractedData: ExtractedDocumentData,
  folderOwnerOrganizationId: string,
  targetCompanyId?: string
): Promise<PendingImportOperation>

Lógica:
- Genera operationId único (uuid)
- NO escribe datos finales en Firestore
- Devuelve estructura serializable para guardar en `assistant_pending_imports`
- Devuelve PendingImportOperation con status "prepared"
- Si targetCompanyId dado, prepara acción "load_balance"
- Si no, prepara acciones para crear/asociar `system_user_entity`

async function validateImportOperation(
  db: Database,
  pendingOp: PendingImportOperation,
  requesterUid: string,
  requesterOrgId: string
): Promise<{ valid: boolean; errors: string[] }>

Validación:
- requesterUid es miembro activo de requesterOrgId
- requesterOrgId tiene link activo con folderOwnerOrganizationId (si es contador)
- Si requesterOrgId es requesting_entity, verificar grant activo
- Operación no está expirada (si tiene timestamp)

async function executeConfirmedImport(
  db: Database,
  operationId: string,
  pendingOp: PendingImportOperation,
  actorUid: string,
  actorOrgId: string
): Promise<{ success: boolean; createdEntityIds: string[]; errors?: string[] }>

Lógica:
- Solo ejecuta si pendingOp.status === "confirmed"
- Usa transacción Firestore para atomicidad
- Ejecuta cada PendingAction en orden
- Escribe audit_log para cada acción
- Devuelve IDs creados/modificados
- Si falla una acción, revierte transacción

async function cancelImportOperation(
  db: Database,
  operationId: string,
  reason: string,
  canceledByUid: string
): Promise<void>

Lógica:
- Solo cancela si no está "executed" ni "canceled"
- Actualiza status a "canceled" y canceledAt
- Audita "assistant.import_canceled"

async function getPendingImportOperation(
  db: Database,
  operationId: string
): Promise<PendingImportOperation | null>

Solo lectura, sin filtro de acceso (se valida en ruta).

TAREA 2 — Crear lib/services/assistant-pending-imports.ts

Colección canónica nueva: `assistant_pending_imports`.

Funciones:

async function savePreparedImportOperation(
  db: Database,
  pendingOp: PendingImportOperation
): Promise<void>

async function markImportOperationConfirmed(
  db: Database,
  operationId: string,
  confirmedByUid: string
): Promise<PendingImportOperation>

async function markImportOperationExecuted(
  db: Database,
  operationId: string
): Promise<void>

async function markImportOperationCanceled(
  db: Database,
  operationId: string,
  canceledByUid: string,
  reason: string
): Promise<void>

Reglas:
- TTL máximo 24 horas mediante `expiresAt`.
- Guardar solo operación preparada, preview y referencias a documentos/campos, no duplicar texto completo ni archivo original.
- Validar transición de estado: prepared -> confirmed -> executed; prepared/confirmed -> canceled.
- Auditar cada transición con `writeAuditLog`.
- No guardar datos finales de balance, empresa o perfil canónico hasta `executeConfirmedImport`.

TAREA 3 — Crear lib/services/entity-resolution.ts

Funciones server-side:

async function searchAccountingFirms(
  db: Database,
  query: string
): Promise<EntityCandidate[]>

Busca en `organizations`:
- type === "accounting_firm"
- legalName/name similar a query o taxId si corresponde

async function searchRootClients(
  db: Database,
  query: string,
  accountingFirmId: string
): Promise<EntityCandidate[]>

Busca clientes raíz (`system_user`) vinculados al estudio contable. Reutilizar la relación existente de productor-contador; no inventar una colección nueva si ya existe.

async function searchRelatedCompanies(
  db: Database,
  query: string,
  folderOwnerOrganizationId: string
): Promise<EntityCandidate[]>

Busca en organizations con:
- parentOrganizationId === folderOwnerOrganizationId
- type === "system_user_entity"
- Búsqueda por prefijo/normalización simple: legalName/name similar a query OR taxId matches. Firestore no soporta LIKE real; si se necesita matching fuzzy, limitar candidatos por prefijo y ordenar en memoria.

async function resolveCompanyEntity(
  db: Database,
  folderOwnerOrganizationId: string,
  cuitOrName: string
): Promise<ResolvedEntity>

Devuelve:
- Si encuentra exacto: status "found_exact", id y datos
- Si encuentra múltiples: status "found_multiple", candidates[]
- Si no existe: status "not_found"

async function prepareCompanyCreation(
  razonSocial: string,
  cuit: string,
  activity: string,
  parentOrganizationId: string
): Promise<Omit<Organization, "id">>

Valida:
- CUIT 11 dígitos
- razonSocial 3-120 caracteres
- activity no vacío
- Devuelve objeto listo para insertar (sin id, createdAt)

async function createConfirmedCompany(
  db: Database,
  data: Omit<Organization, "id">,
  creatorUid: string,
  creatorOrgId: string
): Promise<{ companyId: string }>

Solo si fue confirmado:
- Inserta en transacción
- Crea membership automática
- Audita "organization.created" con metadata `{ type: "system_user_entity", source: "assistant_confirmed_import" }`
- Devuelve ID creado

Reglas obligatorias:
- Nunca escribir sin transacción
- Siempre validar membresia activa
- Auditar cada operación confirmada
- No crear datos finales en Firestore antes de confirmación
- Sí guardar operación temporal en `assistant_pending_imports`
- Funciones puras donde sea posible

Validación de éxito:
- pnpm type-check pasa
- Sin imports circulares
- Funciones son async y devuelven tipos esperados
```

---

## Ola 2 — Motor de intención y resolución de entidades

> Ejecutar SOLO después de que Ola 1 esté completa  
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — Intérprete de intención natural

**Puede ejecutarse en paralelo con:** Agente B  
**Depende de:** Ola 1 completa

#### Objetivo

Crear servicio que convierta órdenes en lenguaje natural ("Ingresá ese balance en Gramajo") a `ParsedUserIntent` estructurada.

#### Archivos a crear

- `lib/ai/assistant/intent-parser.ts` — parseUserIntent() que usa IA
- `lib/services/intent-resolution.ts` — resolveIntentToOperations() que conecta intención con resolución de entidades

#### Archivos a modificar

- Ninguno

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA
Stack: Next.js + TypeScript + lib/ai/* (multiproveedor IA)
Directorio: raíz

Lee antes:
1. types/assistant-states.ts — ParsedUserIntent
2. types/import-pending.ts — ResolvedEntity
3. lib/ai/index.ts — getAIProvider(), resolveAIProvider()
4. lib/services/entity-resolution.ts (Ola 1 Agente B)
5. reports/019_PLAN_ASISTENTE_DOCUMENTAL_CONVERSACIONAL.md sección "Ola 2 — Agente A"

TAREA — Crear lib/ai/assistant/intent-parser.ts

async function parseUserIntent(
  userMessage: string,
  context: AssistantContext,
  ai: AIProvider
): Promise<ParsedUserIntent>

Lógica:
- Llama a ai.complete() con system prompt que reconozca intenciones
- System prompt debe pedir JSON estructurado:
  {
    "intent": "attach_to_account" | "attach_to_related_company" | "create_related_company" | "review_extraction" | "modify_field" | "cancel" | "confirm",
    "targetAccountSearch": "Gramajo" si el usuario menciona contador/estudio,
    "targetCompanySearch": "Los Señores" si menciona empresa,
    "action": "prepare" | "confirm" | "execute" | "show",
    "modifiers": {}
  }

Ejemplos de entrada → salida esperada:
- "Ingresá ese balance en Gramajo"
  → { intent: "attach_to_account", targetAccountSearch: "Gramajo", action: "prepare" }
- "Cargalo como Los Señores del Agro"
  → { intent: "attach_to_related_company", targetCompanySearch: "Los Señores del Agro", action: "prepare" }
- "Confirmá"
  → { intent: "confirm", action: "confirm" }

El parser NO debe:
- Hacer análisis financiero
- Crear datos
- Escribir en Firestore
- Asumir entidades; siempre buscar/validar

TAREA — Crear lib/services/intent-resolution.ts

async function resolveIntentToOperations(
  intent: ParsedUserIntent,
  extractedData: ExtractedDocumentData,
  folderOwnerOrganizationId: string,
  accountantOrgId: string,
  db: Database
): Promise<{
  resolvedCompany?: ResolvedEntity;
  resolvedAccount?: ResolvedEntity;
  nextStep: "prepare_import" | "ask_for_clarification" | "confirm" | "error";
  message: string;
}>

Lógica:
1. Si intent tiene targetAccountSearch:
   - Interpretar "cuenta Gramajo" como estudio/cuenta contable o cliente raíz según contexto.
   - Primero buscar `accounting_firm` con `searchAccountingFirms(db, targetAccountSearch)`.
   - Si el usuario ya está dentro de un legajo, no cambiar `folderOwnerOrganizationId` sin confirmación.
   - Devolver `resolvedAccount` con type `"accounting_firm"` o pedir aclaración si hay ambigüedad.
2. Si intent tiene targetCompanySearch:
   - Llamar a resolveCompanyEntity(db, folderOwnerOrganizationId, targetCompanySearch)
   - Devolver resolvedCompany con resultado
3. Determinar nextStep:
   - Si ambas resueltas exactas: "prepare_import"
   - Si hay múltiples candidatos: "ask_for_clarification"
   - Si intent === "confirm": "confirm"
   - Si error: "error"
4. Generar message humanizado explicando lo encontrado

Sin escribir en Firestore.

Validación de éxito:
- pnpm type-check pasa
- Sin imports circulares
- Funciones async correctas
```

### Agente B — Resolución interactiva de entidades

**Puede ejecutarse en paralelo con:** Agente A  
**Depende de:** Ola 1 completa

#### Objetivo

Expandir `lib/services/entity-resolution.ts` (Ola 1 Agente B) con función de interacción que interprete resultados y proponga alternativas al usuario.

#### Archivos a crear

- `lib/services/entity-interaction.ts` — función interactiveEntityResolution()

#### Archivos a modificar

- `lib/services/entity-resolution.ts` — puede usarse, no se modifica

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA
Stack: Next.js + TypeScript + Firebase Admin SDK
Directorio: raíz

Lee antes:
1. types/import-pending.ts — ResolvedEntity, EntityCandidate
2. lib/services/entity-resolution.ts (Ola 1 Agente B)
3. reports/019_PLAN_ASISTENTE_DOCUMENTAL_CONVERSACIONAL.md sección "Ola 2 — Agente B"

TAREA — Crear lib/services/entity-interaction.ts

async function interactiveEntityResolution(
  query: string,
  organizationId: string,
  entityType: "accounting_firm" | "root_client" | "related_company",
  db: Database,
  ai: AIProvider
): Promise<{
  resolved: ResolvedEntity;
  userMessage: string;
  requiresUserSelection: boolean;
  candidates?: EntityCandidate[];
}>

Lógica por caso:

1. Coincidencia exacta (1 resultado):
   - resolved.status = "found_exact"
   - resolved.type = entityType
   - userMessage = "Encontré la [empresa/cuenta] [nombre]."
   - requiresUserSelection = false

2. Varias coincidencias (2-5):
   - resolved.status = "found_multiple"
   - candidates = lista ordenada por similaridad
   - userMessage = "Encontré [N] [empresas/cuentas]. ¿Cuál es? 1) X, 2) Y..."
   - requiresUserSelection = true

3. No existe (0 resultados):
   - resolved.status = "not_found"
   - userMessage = "No encontré '[query]'. ¿Querés crearla nueva o buscar otra?"
   - requiresUserSelection = true

4. Nueva a crear:
   - Solo permitido para `related_company` (`system_user_entity`) luego de confirmación explícita
   - resolved.status = "new_to_create"
   - userMessage = "Voy a crear [nombre] como nueva empresa."
   - requiresUserSelection = false

El servicio NO debe:
- Escribir en Firestore
- Crear entidades (solo preparar)
- Hacer análisis financiero

Usa la IA (si necesario) para mejorar matching por similaridad de nombres.

Validación de éxito:
- pnpm type-check pasa
- Sin escritura en Firestore
- Función async correcta
```

---

## Ola 3 — Preparación de importación y vista previa

> Ejecutar SOLO después de que Ola 2 esté completa  
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — Preparación de importación pendiente

**Puede ejecutarse en paralelo con:** Agente B  
**Depende de:** Ola 2 completa

#### Objetivo

Cuando el usuario confirma intención, preparar `PendingImportOperation` (sin guardar) con todas las acciones a ejecutar.

#### Archivos a crear

- `lib/services/import-preparation.ts` — prepareImportFromIntent()

#### Archivos a modificar

- Ninguno

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA
Stack: Next.js + TypeScript + Firebase Admin SDK
Directorio: raíz

Lee antes:
1. types/import-pending.ts — PendingImportOperation, PendingAction
2. lib/services/import-operations.ts (Ola 1 Agente B)
3. reports/019_PLAN_ASISTENTE_DOCUMENTAL_CONVERSACIONAL.md sección "Ola 3 — Agente A"

TAREA — Crear lib/services/import-preparation.ts

async function prepareImportFromIntent(
  intent: ParsedUserIntent,
  extractedData: ExtractedDocumentData,
  resolvedEntities: {
    relatedCompany?: ResolvedEntity;
    accountingFirm?: ResolvedEntity;
    rootClient?: ResolvedEntity;
  },
  documentId: string,
  folderOwnerOrganizationId: string,
  db: Database
): Promise<PendingImportOperation>

Lógica:
1. Generar operationId único (uuid)
2. Armar array de PendingAction[]:
   - Si relatedCompany.status === "not_found" y usuario quiere crear: action "create_related_company"
   - Si relatedCompany.status === "found_exact" pero no vinculada: action "associate_related_company"
   - action "load_balance" con extractedData.fields mapeados a campos reales de `types/accounting.ts`
   - action "link_document" con documentId
3. Devolver PendingImportOperation:
   - status: "prepared"
   - preparedAt: ISO string
   - No incluir confirmedAt, canceledAt
4. NO escribir datos finales en Firestore. La ruta API guardará la operación preparada en `assistant_pending_imports` para poder confirmarla luego.
5. Devolver estructura legible para renderizar en UI

Validación de éxito:
- pnpm type-check pasa
- Sin escritura de datos finales en Firestore
- operationId es único cada vez
```

### Agente B — Vista previa de campos extraídos

**Puede ejecutarse en paralelo con:** Agente A  
**Depende de:** Ola 2 completa

#### Objetivo

Generar representación clara de campos extraídos para que el usuario revise antes de confirmar.

#### Archivos a crear

- `lib/services/field-preview.ts` — generateFieldPreview()

#### Archivos a modificar

- Ninguno

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA
Stack: Next.js + TypeScript
Directorio: raíz

Lee antes:
1. types/import-pending.ts — ExtractedField
2. types/accounting.ts — balanceSheet, income statement si existen
3. types/credito-hub.ts — `ExtractedField` real con `fieldCode`, `normalizedValue`, `confidence`, `pageNumber`, `reviewStatus`
4. reports/019_PLAN_ASISTENTE_DOCUMENTAL_CONVERSACIONAL.md sección "Ola 3 — Agente B"

TAREA — Crear lib/services/field-preview.ts

interface PreviewField {
  fieldName: string;          // "activoCorriente"
  fieldLabel: string;         // "Activo Corriente"
  detectedValue: unknown;
  mappedValue?: unknown;      // si el usuario corrigió
  confidence: number;         // 0-1
  source: "table" | "text" | "detected";
  status: "confirmed" | "detected" | "uncertain" | "missing";
  observation?: string;       // "Hallado en página 3"
}

async function generateFieldPreview(
  extractedData: ExtractedDocumentData,
  mappedFields?: Record<string, unknown>
): Promise<PreviewField[]>

Lógica:
1. Iterar sobre los `ExtractedField` reales recuperados desde `extracted_fields` por `documentId` y `folderOwnerOrganizationId`
2. Para cada field:
   - Mapear `fieldCode` a fieldLabel humano (ej: "activoCorriente" → "Activo Corriente")
   - Tomar detectedValue de `normalizedValue` o `rawValue`
   - Si existe mappedFields[fieldName], usarlo como mappedValue
   - Devolver array de PreviewField
3. Ordenar por: confirmed primero, detected, uncertain, missing al final

El array se renderiza como tabla en componente.

Sin escribir en Firestore.

Validación de éxito:
- pnpm type-check pasa
- PreviewField[] es serializable a JSON
```

---

## Ola 4 — Confirmación obligatoria y ejecución controlada

> Ejecutar SOLO después de que Ola 3 esté completa

### Agente A — Rutas API de confirmación y ejecución

**Depende de:** Ola 3 completa

#### Objetivo

Crear endpoints que preparen, muestren, esperen confirmación y ejecuten SOLO después de confirmación explícita.

#### Archivos a crear

- `app/api/credito-hub/assistant/prepare-import/route.ts`
- `app/api/credito-hub/assistant/confirm-import/route.ts`
- `app/api/credito-hub/assistant/execute-import/route.ts`
- `app/api/credito-hub/assistant/cancel-import/[operationId]/route.ts`

#### Archivos a modificar

- Ninguno

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA
Stack: Next.js 14 + TypeScript + Firebase Admin SDK
Directorio: raíz

Lee antes:
1. types/assistant-states.ts y types/import-pending.ts (Ola 1)
2. lib/services/import-operations.ts (Ola 1 Agente B)
3. lib/services/assistant-pending-imports.ts (Ola 1 Agente B)
4. lib/services/intent-resolution.ts (Ola 2 Agente A)
5. lib/services/import-preparation.ts (Ola 3 Agente A)
6. lib/services/field-preview.ts (Ola 3 Agente B)
7. app/api/credito-hub/intake/route.ts — como modelo de estructura y validación
8. CLAUDE.md — patrones obligatorios de API routes

TAREA 1 — POST /api/credito-hub/assistant/prepare-import

Auth: JWT válido + assertCanManageAccountingFolder

Body:
{
  documentId: string;
  userIntent: ParsedUserIntent;
  resolvedEntities?: {
    relatedCompany?: ResolvedEntity;
    accountingFirm?: ResolvedEntity;
    rootClient?: ResolvedEntity;
  };
}

Response: 200 OK
{
  operationId: string;
  pendingActions: PendingAction[];
  preview: PreviewField[];
  message: string;
}

Lógica:
1. Validar sesión y assertCanManageAccountingFolder contra documentId
2. Cargar documentId desde document_jobs o documents
3. Llamar prepareImportFromIntent() con los parámetros
4. Llamar generateFieldPreview() para obtener tabla
5. Guardar PendingImportOperation en `assistant_pending_imports` con status "prepared", `expiresAt` <= 24h y referencias al documento/campos
6. Auditar "assistant.import_prepared"
7. Devolver respuesta completa
8. NO guardar datos finales de balance, empresa ni perfil canónico todavía

TAREA 2 — POST /api/credito-hub/assistant/confirm-import

Auth: JWT válido

Body:
{
  operationId: string;
  confirmedAt?: string;
}

Response: 200 OK
{
  success: true;
  operationId: string;
}

Lógica:
1. Validar que operationId existe en `assistant_pending_imports`
2. Validar sesión y permiso sobre folderOwnerOrganizationId de la operación
3. Marcar operationId como "confirmed"
4. Auditar "assistant.import_confirmed"
5. Devolver éxito

NOTA: La colección temporal canónica es `assistant_pending_imports`. Debe tener TTL de 24 horas y no debe contener archivo original ni texto completo duplicado.

TAREA 3 — POST /api/credito-hub/assistant/execute-import

Auth: JWT válido

Body:
{
  operationId: string;
}

Response: 200 OK
{
  success: true;
  createdEntityIds: string[];
}

Lógica:
1. Validar sesión y acceso
2. Cargar PendingImportOperation por operationId
3. Validar que status === "confirmed"
4. Llamar executeConfirmedImport() desde lib/services/import-operations.ts
5. Si éxito: auditar "assistant.import_executed", devolver IDs creados
6. Si error: devolver { success: false; error: string }
7. Marcar operationId como "executed" en la colección

TAREA 4 — DELETE /api/credito-hub/assistant/cancel-import/[operationId]

Auth: JWT válido

Response: 200 OK
{
  success: true;
}

Lógica:
1. Validar sesión
2. Cargar PendingImportOperation por operationId
3. Validar que status !== "executed" y !== "canceled"
4. Llamar cancelImportOperation() desde lib/services/import-operations.ts
5. Auditar "assistant.import_canceled"

Reglas obligatorias en todas las rutas:
- Usar Admin SDK para lectura/escritura
- assertCanManageAccountingFolder en todas
- Transacciones para operaciones múltiples
- Reutilizar servicios existentes de `statement-imports`, `balance-sheets`, `income-statements`, `canonical-profile` y `server-folder-writes` cuando el write ya exista en el sistema
- Audit log en cada transición de estado
- Error handling: devolver 400 para validación, 403 para permisos, 500 para servidor
- Nunca devolver datos sensibles (claves, rutas de storage)
- Rate limit: máximo 10 operaciones/minuto por usuario

Validación de éxito:
- pnpm type-check pasa
- pnpm check:security-shape pasa
- Sin escritura de datos sensibles en respuestas
```

---

## Ola 5 — Integración en flujo conversacional del chat

> Ejecutar SOLO después de que Ola 4 esté completa

### Agente A — Máquina de estados del chat

**Depende de:** Ola 4 completa

#### Objetivo

Rehacer `LegajoAssistantPanel` para usar máquina de estados interna, servicios de Ola 1-4 y flujo conversacional limpio (sin formularios).

#### Archivos a crear

- `hooks/useAssistantConversation.ts` — hook personalizado con máquina de estados
- `components/credito-hub/AssistantConversationFlow.tsx` — renderizado dinámico según estado

#### Archivos a modificar

- `components/credito-hub/LegajoAssistantPanel.tsx` — reemplazar con versión que usa el hook
- `components/layout/AppShell.tsx` — si monta el panel globalmente, no cambiar estructura

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA
Stack: Next.js 14 + TypeScript + React 19 + Tanstack Query
Directorio: raíz

Lee antes:
1. types/assistant-states.ts — AssistantContext, AssistantConversationState
2. hooks/useAuth.ts — getIdToken(), sesión actual
3. components/credito-hub/LegajoAssistantPanel.tsx — estructura actual a reemplazar
4. Ola 4 — endpoints API
5. Todas las funciones de servicios creadas en Olas 1-3

TAREA 1 — Crear hooks/useAssistantConversation.ts

Hook personalizado:

function useAssistantConversation(targetOrganizationId: string) {
  const [context, setContext] = useState<AssistantContext>({
    state: "idle",
    messages: []
  });
  const queryClient = useQueryClient();

  // Transiciones de estado:

  async function uploadDocument(file: File): Promise<void>
  // 1. idle → uploading
  // 2. POST a /api/credito-hub/intake con file
  // 3. uploading → processing
  // 4. Dispara POST /api/credito-hub/jobs/process-now con targetOrganizationId
  // 5. Consulta /api/credito-hub/jobs?targetOrganizationId=... hasta que el job pase a "completed", "awaiting_review" o "partially_completed"
  // 6. Recupera clasificación y extracted_fields asociados al documentId
  // 7. processing → document_analyzed cuando haya clasificación/campos suficientes para resumir o cuando quede awaiting_review con campos parciales

  async function parseUserMessage(message: string): Promise<void>
  // 1. awaiting_user_intent → resolving_entities
  // 2. Llama parseUserIntent() (Ola 2 Agente A)
  // 3. Llama resolveIntentToOperations() (Ola 2 Agente A)
  // 4. resolving_entities → preparing_import (si intención válida)
  // 5. Agregar mensaje del asistente con resultado

  async function reviewAndPrepare(): Promise<void>
  // 1. document_analyzed → awaiting_user_intent
  // 2. Mostrar preguntas dinámicas según documentType detectado
  // 3. Esperar input del usuario

  async function showPreview(): Promise<void>
  // 1. preparing_import → awaiting_review
  // 2. Llamar generateFieldPreview()
  // 3. Mostrar tabla de campos

  async function prepareForConfirmation(): Promise<void>
  // 1. Llamar POST /api/credito-hub/assistant/prepare-import
  // 2. awaiting_review → awaiting_confirmation
  // 3. Mostrar resumen de acciones + tabla de campos

  async function confirmImport(): Promise<void>
  // 1. Validar estado === awaiting_confirmation
  // 2. POST /api/credito-hub/assistant/confirm-import
  // 3. awaiting_confirmation → executing_import

  async function executeImport(): Promise<void>
  // 1. Validar estado === executing_import
  // 2. POST /api/credito-hub/assistant/execute-import
  // 3. executing_import → completed (o error si falla)

  async function cancelImport(): Promise<void>
  // En cualquier estado pre-ejecución
  // DELETE /api/credito-hub/assistant/cancel-import/[operationId]
  // Volver a idle

  return {
    context,
    uploadDocument,
    parseUserMessage,
    reviewAndPrepare,
    showPreview,
    prepareForConfirmation,
    confirmImport,
    executeImport,
    cancelImport
  };
}

Validación de éxito:
- pnpm type-check pasa
- Hook es reutilizable desde cualquier componente
- Estados transicionan correctamente

TAREA 2 — Crear components/credito-hub/AssistantConversationFlow.tsx

Componente que renderiza dinámicamente según context.state:

interface Props {
  context: AssistantContext;
  onUpload: (file: File) => Promise<void>;
  onMessage: (message: string) => Promise<void>;
  onConfirm: () => Promise<void>;
  onCancel: () => Promise<void>;
}

Renders según state:

idle:
  - "Subí un documento"
  - Input de arrastrar y soltar
  - Botón "Seleccionar archivo"

uploading:
  - Barra de progreso
  - "Subiendo..."

processing:
  - "Estoy leyendo el documento..."
  - Spinner

document_analyzed:
  - Resumen: tipo, empresa, CUIT, fecha, confianza
  - Preguntas rápidas como botones
  - Input para orden natural

awaiting_user_intent:
  - Chat con input
  - Esperar mensaje del usuario

resolving_entities:
  - "Buscando Gramajo..."
  - Spinner

preparing_import:
  - "Preparando carga..."
  - Mostrar acciones que se van a ejecutar

awaiting_review:
  - Tabla de PreviewField[]
  - Botones: Revisar datos / Cambiar destino / Continuar

awaiting_confirmation:
  - Resumen de acciones
  - Tabla de campos
  - Botones: Confirmar / Revisar / Cambiar / Cancelar

executing_import:
  - "Guardando..."
  - Spinner

completed:
  - "Listo!"
  - Resumen: empresa, campos cargados, pendientes
  - Links: Ver empresa / Subir otro / Volver

error:
  - Mostrar error humanizado
  - Botón: Reintentar o Cancelar

SIN formularios visibles.
SIN bloques técnicos.

Validación de éxito:
- pnpm type-check pasa
- Renderizado limpio según estados
- Sin elementos fijos, solo dinámicos

TAREA 3 — Actualizar LegajoAssistantPanel

Reemplazar cuerpo del panel para:
- Usar hook useAssistantConversation
- Renderizar AssistantConversationFlow
- Manejar transiciones de estado
- Limpiar estado al cerrar panel

Mantener:
- Button flotante IA cuando está cerrado
- Panel deslizable a la derecha
- Selector de cliente/legajo si es global

Validación de éxito:
- pnpm type-check pasa
- Panel abre/cierra sin errores
- Flujo conversacional funciona end-to-end
```

---

## Ola 6 — Tests de aislamiento y auditoría

> Ejecutar SOLO después de que Ola 5 esté completa

### Agente A — Suite de tests de flujo completo

**Depende de:** Ola 5 completa

#### Objetivo

Tests que validen: preparación sin escritura, confirmación requerida, ejecución con auditoría, cancelación.

#### Archivos a crear

- `__tests__/credito-hub/assistant-workflow.test.ts` — flujo completo
- `__tests__/credito-hub/assistant-security.test.ts` — aislamiento y permisos

#### Archivos a modificar

- Ninguno

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA
Stack: Vitest + TypeScript
Directorio: raíz

Lee antes:
1. __tests__/credito-hub/document-jobs.test.ts — como modelo de estructura
2. Olas 1-5 — toda la implementación
3. reports/019_PLAN_ASISTENTE_DOCUMENTAL_CONVERSACIONAL.md sección "Ola 6"

TAREA — Crear __tests__/credito-hub/assistant-workflow.test.ts

Tests que validen:

describe("Assistant Workflow", () => {
  
  it("should prepare import without writing final business data", async () => {
    // Generar intención
    // Llamar prepareImportFromIntent()
    // Verificar que operation.status === "prepared"
    // Verificar que solo se permite persistir en assistant_pending_imports
    // NO debe escribir balance_sheets, organizations, canonical_credit_profiles, etc.
  });

  it("should fail execute if not confirmed", async () => {
    // Preparar operación
    // Intentar ejecutarla sin confirmar
    // Debe devolver error 400 o similar
    // NO debe escribir nada
  });

  it("should execute only after explicit confirmation", async () => {
    // Preparar
    // Confirmar
    // Ejecutar
    // Verificar que escribió en firestore
    // Verificar audit logs
  });

  it("should cancel import in prepared or confirmed state", async () => {
    // Preparar
    // Cancelar
    // Verificar que status === "canceled"
    // NO debe ejecutar ninguna acción
  });

  it("should not cancel if already executed", async () => {
    // Preparar, confirmar, ejecutar
    // Intentar cancelar
    // Debe fallar con error
  });

  it("should audit each state transition", async () => {
    // Ejecutar flujo completo
    // Verificar audit_logs con acciones:
    //   - assistant.import_prepared
    //   - assistant.import_confirmed
    //   - assistant.import_executed
    // Cada log debe tener actor, timestamp, etc.
  });

});

TAREA — Crear __tests__/credito-hub/assistant-security.test.ts

Tests de aislamiento:

describe("Assistant Security", () => {

  it("contador A no puede preparar import de la carpeta del contador B", async () => {
    // Simular usuario contador B
    // Intentar prepareImportFromIntent() contra folderOwnerOrganizationId de contador A
    // Debe fallar con permiso denegado
  });

  it("financista no puede ejecutar import", async () => {
    // Simular usuario financista (requesting_entity)
    // Intentar executeImport()
    // Debe fallar (solo accountant o admin)
  });

  it("intent parsing no debe crear entidades automáticamente", async () => {
    // Parsear intención "crea Los Señores del Agro"
    // Verificar que NO la crea
    // Devuelve "new_to_create" status
    // Espera confirmación explícita para crearla
  });

  it("extracted data debe ser validado antes de usar", async () => {
    // Extraer datos de documento malformado
    // Verificar que campos dudosos quedan con status "uncertain"
    // No se aplican automáticamente
  });

  it("audit trail debe ser completo", async () => {
    // Flujo completo: prepare → confirm → execute
    // Verificar que hay logs para cada transición
    // Cada log incluye: actor, organizationId, operationId, timestamp, acción
  });

});

Todos los tests deben:
- Ser unitarios (sin dependencia de Firebase real en CI)
- Usar mocks donde aplique (IA, Firestore)
- Tener setup/teardown limpio
- Duración < 5 segundos por test

Validación de éxito:
- pnpm test __tests__/credito-hub/assistant-workflow.test.ts — todos pasan
- pnpm test __tests__/credito-hub/assistant-security.test.ts — todos pasan
- Suite total de asistente >= 20 tests
- Sin flaky tests
```

---

## Verificación final

Después de completar todas las olas:

- [ ] `pnpm type-check` pasa sin errores
- [ ] `pnpm check:security-shape` pasa
- [ ] `pnpm test` suite de asistente >= 20 tests, todos pasan
- [ ] `pnpm build` OK (sin warnings críticos)
- [ ] `LegajoAssistantPanel` usa máquina de estados interna
- [ ] Chat NO muestra formularios fijos, solo conversación
- [ ] Confirmación obligatoria ANTES de guardar
- [ ] Auditoría en CADA transición de estado
- [ ] NO hay escritura directa en Firestore desde parseUserIntent
- [ ] Entity resolution busca en base real
- [ ] Vista previa de campos extraídos funciona
- [ ] Cancelación marca la operación como `canceled` sin efectos sobre datos finales
- [ ] Flujo end-to-end funciona: upload → analyze → intent → resolve → prepare → confirm → execute

---

## Criterios de aceptación final

El asistente está listo cuando:

1. **Usuario sube PDF.** IA lo lee automáticamente sin prompt.
2. **IA muestra resumen:** tipo de documento, empresa detectada, CUIT, fecha, confianza global.
3. **Usuario escribe:** "Ingresá ese balance en Gramajo."
4. **IA busca en base** y:
   - Exacto: "Encontré Estudio Contable Gramajo."
   - Múltiples: "¿Cuál es? 1) X, 2) Y"
   - No existe: "No existe. ¿Creo una?"
5. **IA prepara operación**, mostrando:
   - Lista de acciones (crear empresa, asociar, cargar balance, etc.)
   - Tabla con campos extraídos
   - Botones: Confirmar / Revisar / Cambiar destino / Cancelar
6. **Usuario confirma.** IA SOLO ENTONCES ejecuta.
7. **Resultado:** "Carga completada. Empresa: X, Campos: 42, Pendientes: 3."
8. **Auditoría:** Cada paso (upload, parse, resolve, prepare, confirm, execute) registrado.
