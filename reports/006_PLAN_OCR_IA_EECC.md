# Plan OCR IA EECC - Ejecucion multi-agente

**Fecha:** 2026-06-01 (revisado 2026-06-01)
**Feature:** Cargar balances por archivo y prellenar Estado de Situacion Patrimonial y Estado de Resultados con OCR/IA.
**Proyectos afectados:** `Agro-Credit` como implementacion; `9001app-firebase` como referencia tecnica.

---

## Decision ejecutiva

Si, conviene implementarlo ahora como feature core de Agro-Credit. El valor es alto porque reduce carga manual del contador, permite revisar campos antes de guardar y aprovecha la estructura de rubros que ya existe en `lib/accounting/statement-fields.ts`.

La decision de seguridad es obligatoria: la IA nunca guarda el balance final sola. El flujo correcto es:

1. Subir PDF, imagen o Excel.
2. Extraer datos con Claude Vision (PDF/imagen) o parser directo (Excel).
3. Mapear a rubros canonicos.
4. Mostrar previsualizacion editable con confianza por campo.
5. Guardar recien cuando el contador confirma.

---

## Provider IA real: Claude API con vision

**Decision tomada:** el provider de produccion es **Claude API** (`claude-haiku-4-5` o `claude-sonnet-4-6`) con capacidades de vision.

Razon: los PDFs de EECC argentinos tienen estructura semitabular, texto mixto y contexto contable. Claude entiende ese contexto sin necesidad de diccionarios de aliases manuales. El mapper de aliases solo se mantiene para el caso Excel, donde se lee texto de celdas sin modelo de lenguaje.

Variable de entorno requerida:
- `ANTHROPIC_API_KEY` — clave de API Anthropic (solo server-side, nunca en el browser).

Dependencia a agregar en Ola 2:
```bash
pnpm add @anthropic-ai/sdk
```

El mock provider queda disponible para desarrollo local cuando `ANTHROPIC_API_KEY` no esta configurada.

---

## Analisis del OCR existente en 9001app-firebase

Archivos revisados en `9001app-firebase`:

- `src/lib/ocr/OCRProvider.ts`
- `src/lib/ocr/MockOCRProvider.ts`
- `src/lib/ocr/index.ts`
- `src/app/api/commercial-accounting/purchases/invoices/extract/route.ts`
- `src/app/(dashboard)/contabilidad-comercial/compras/facturas/nueva/InvoiceUploadZone.tsx`
- `src/app/(dashboard)/contabilidad-comercial/compras/facturas/nueva/InvoiceReviewForm.tsx`

Que se puede reutilizar conceptualmente:
- Provider intercambiable con selector por env.
- Resultado estructurado con `value`, `confidence` y `source`.
- Borrador intermedio antes de guardar.
- Preview editable con alertas de baja confianza.
- Confirmacion humana y auditoria.

Que no se debe copiar directo:
- El contrato de facturas, categorias dealer y eventos contables de compras.
- La coleccion anidada `organizations/{orgId}/purchase_invoices`.
- El mock como solucion final.

---

## Alcance funcional

Incluido:
- Upload desde la carpeta del contador para `balance_sheet`, `income_statement` o `combined`.
- Soporte de MIME: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Limites de tamano: **10 MB para PDF/imagen, 5 MB para Excel**. PDFs de balance agropecuario tipicos son de 2-6 paginas y no superan 5 MB.
- Parser de Excel directo (sin IA) usando la libreria `xlsx`.
- Provider Claude Vision para PDF/imagenes.
- Mapeo a los rubros actuales de `BalanceSheetDetails` e `IncomeStatementDetails`.
- Calculo automatico de totales usando `calculateBalanceTotals` y `calculateIncomeTotals`.
- Previsualizacion editable antes de guardar.
- Captura del ejercicio anterior como metadata (no se persiste como periodo, se guarda en el import draft).
- Vinculo del documento fuente mediante `documentIds`.
- Auditoria de extraccion y aplicacion.

Excluido en esta primera version:
- Guardado automatico sin revision humana.
- Persistencia del ejercicio anterior como periodo Firestore separado.
- Lectura perfecta de PDFs escaneados de baja calidad. Se muestra confianza baja y advertencia.
- Mobile nativo.

---

## Modelo de datos

### Nueva coleccion canonica

`financial_statement_imports`

### Convencion de claves de `fieldConfidence`

Las claves del mapa `fieldConfidence` siguen el patron:
- Balance: `"{group}.{field}"` donde `group` es uno de `currentAssets | nonCurrentAssets | currentLiabilities | nonCurrentLiabilities` y `field` es el nombre del campo en `BalanceSheetDetails`. Ejemplo: `"currentAssets.cashAndBanks"`.
- Resultados: `"{field}"` directo. Ejemplo: `"netSales"`, `"costOfGoodsSold"`.
- Patrimonio neto: `"equityTotal"`.

Esta convencion es la unica valida. Los agentes no deben inventar otros formatos de clave.

### Campos principales

```ts
type StatementImportKind = "balance_sheet" | "income_statement" | "combined"
type StatementImportStatus = "uploaded" | "extracted" | "reviewed" | "applied" | "rejected" | "failed"

type FieldConfidence = {
  confidence: number        // 0.0 a 1.0
  source: "ocr" | "ai" | "excel" | "manual"
}

interface ExtractedBalance {
  details: BalanceSheetDetails
  equityTotal: number
  currency: "ARS" | "USD"
  previousDetails?: BalanceSheetDetails    // ejercicio anterior si el PDF/Excel lo incluye
  previousEquityTotal?: number
}

interface ExtractedIncomeStatement {
  details: IncomeStatementDetails
  currency: "ARS" | "USD"
  previousDetails?: IncomeStatementDetails // ejercicio anterior si el PDF/Excel lo incluye
}

interface FinancialStatementImport {
  id: string
  producerId: string
  folderOwnerOrganizationId: string
  accountingFirmId: string | null
  periodId: string
  kind: StatementImportKind
  status: StatementImportStatus
  sourceDocumentId: string
  sourceStoragePath: string
  sourceFileName: string
  sourceMimeType: string
  provider: string                          // "claude-haiku-4-5" | "mock" | "excel"
  overallConfidence: number                 // 0.0 a 1.0
  extractedBalance?: ExtractedBalance
  extractedIncomeStatement?: ExtractedIncomeStatement
  fieldConfidence: Record<string, FieldConfidence>
  warnings: string[]
  rawText?: string
  appliedBalanceSheetId?: string
  appliedIncomeStatementId?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}
```

Regla: los import drafts se guardan server-side con Admin SDK. No confiar en `organizationId` enviado por el cliente; se valida el vinculo contador-cliente o membership del productor.

Nota sobre `combined`: cuando `kind = "combined"`, el mismo import puede tener `extractedBalance` y `extractedIncomeStatement` poblados. En el frontend se tratan como dos revisiones independientes dentro del mismo import. No requiere modelo diferente.

---

## Resumen de olas (simplificado)

| Ola | Contenido | Depende de |
|-----|-----------|------------|
| 1 | Tipos, schemas, coleccion, aliases Excel, mapper Excel | Nada |
| 2 | Provider Claude Vision + mock + Excel reader + endpoint extract + reglas Firestore/Storage | Ola 1 completa |
| 3 | Endpoints review y apply | Ola 2 completa |
| 4 | Frontend (uploader, confianza, revision, integracion carpeta) + QA + cierre | Ola 3 completa |

Reduccion respecto al plan original: de 6 olas a 4. La logica de aliases (antes Ola 1B) queda acotada solo al caso Excel. El provider real (Claude Vision) entra en Ola 2 junto al endpoint, evitando un agente que construye un mock y otro que lo conecta.

---

## Ola 1 — Contrato de datos y mapper Excel

### Agente A — Tipos, schemas y coleccion
**Depende de:** nada.

#### Objetivo
Crear el contrato canonico para borradores de importacion de EECC sin tocar todavia APIs ni UI.

#### Archivos a crear
- `types/statement-imports.ts` — tipos completos segun modelo de datos de este documento.
- `lib/schemas/statement-imports.ts` — schemas Zod para extract, update/review y apply.

#### Archivos a modificar
- `lib/firebase/collections.ts` — agregar `FINANCIAL_STATEMENT_IMPORTS: "financial_statement_imports"`.
- `types/audit.ts` — agregar acciones `statement_import.extracted`, `statement_import.reviewed`, `statement_import.applied`, `statement_import.rejected`.
- `scripts/check-security-shape.ts` — agregar a `requiredRuleMarkers` la cadena `"match /financial_statement_imports"`.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 1 — Agente A

Lee el documento completo antes de implementar. Contiene el diseno, modelo de datos con
convencion de claves de fieldConfidence, y lo que hacen los otros agentes.

Contexto:
- Proyecto: Agro-Credit, Next.js App Router + Firebase + TypeScript.
- Campos canonicos actuales: `lib/accounting/statement-fields.ts`.
- Schemas contables actuales: `lib/schemas/accounting.ts`.
- Tipos contables actuales: `types/accounting.ts`.
- Colecciones canonicas: `lib/firebase/collections.ts`.
- Auditoria: `types/audit.ts` y `lib/firebase/audit.ts`.
- Script de seguridad: `scripts/check-security-shape.ts`.

Implementar:
1. Crear `types/statement-imports.ts` con los tipos exactos del modelo del plan:
   - `StatementImportKind`, `StatementImportStatus`, `FieldConfidence`.
   - `ExtractedBalance` con `previousDetails?` y `previousEquityTotal?`.
   - `ExtractedIncomeStatement` con `previousDetails?`.
   - `FinancialStatementImport`.
2. Crear `lib/schemas/statement-imports.ts` con schemas Zod para:
   - `extractStatementSchema` (multipart: producerId, periodId, kind, currency).
   - `reviewStatementImportSchema` (patch parcial de extractedBalance/extractedIncomeStatement).
   - `applyStatementImportSchema` (confirmacion con kind a aplicar).
3. Agregar `FINANCIAL_STATEMENT_IMPORTS` en `COLLECTIONS`.
4. Agregar las 4 acciones auditables en `types/audit.ts`.
5. Agregar `"match /financial_statement_imports"` al array `requiredRuleMarkers` en `scripts/check-security-shape.ts`.

Convencion de claves de fieldConfidence (leer el plan):
- Balance: "{group}.{field}" — ej: "currentAssets.cashAndBanks".
- Resultados: "{field}" — ej: "netSales".
- Patrimonio neto: "equityTotal".

No hacer:
- No crear endpoints.
- No modificar formularios.
- No agregar provider OCR ni aliases.

Criterio de exito:
- `pnpm type-check` no falla por los nuevos tipos.
- Los schemas no aceptan organizationId editable como autoridad de seguridad.
- El script check-security-shape tiene el nuevo marcador.
```

### Agente B — Aliases y mapper para Excel
**Depende de:** nada. Puede ejecutarse en paralelo con Agente A.

#### Objetivo
Crear el diccionario de sinonimos y el mapper que convierte filas de Excel a rubros canonicos.
Este mapper NO se usa para el caso Claude Vision — Claude devuelve JSON estructurado directamente.
Solo es necesario para el parser Excel donde se trabaja con texto de celdas.

#### Archivos a crear
- `lib/accounting/statement-field-aliases.ts` — aliases por campo canonico, solo para lectura de celdas Excel.
- `lib/accounting/statement-import-mapper.ts` — funciones puras de normalizacion y mapeo.

#### Archivos a modificar
- Ninguno.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 1 — Agente B

Lee el documento completo antes de implementar.

Contexto:
- Los rubros fuente estan en `lib/accounting/statement-fields.ts`.
- Balance usa `BalanceSheetDetails`. Resultados usa `IncomeStatementDetails`.
- IMPORTANTE: este mapper es SOLO para el parser Excel. Para el caso Claude Vision,
  el modelo devuelve JSON estructurado directamente y no necesita aliases de texto.
- PDFs argentinos traen variantes como "Caja y bancos", "Creditos por ventas",
  "Bienes de uso", "Ventas netas", "Costo de ventas", "Gastos de administracion".
  Estas variantes son relevantes para celdas Excel, no para el response de Claude.

Implementar:
1. Crear `lib/accounting/statement-field-aliases.ts` con aliases por cada path canonico de
   `BalanceSheetDetails` e `IncomeStatementDetails`. Usar los labels de `BALANCE_FIELD_GROUPS`
   e `INCOME_FIELD_GROUPS` como base mas variantes comunes.
2. Crear `lib/accounting/statement-import-mapper.ts` con funciones puras:
   - `normalizeStatementLabel(label: string): string` — minusculas, sin tildes, sin puntuacion extra.
   - `parseArgentineAmount(value: string | number | null | undefined): number` — soportar
     `1.234.567,89`, `(123,45)` (negativo), `-123,45`, `1234567.89`.
   - `mapBalanceRowsToDetails(rows: { label: string; currentAmount: unknown; previousAmount?: unknown }[]):
     { details: BalanceSheetDetails; equityTotal: number; previousDetails?: BalanceSheetDetails;
       previousEquityTotal?: number; warnings: string[]; fieldConfidence: Record<string, FieldConfidence> }`
   - `mapIncomeRowsToDetails(rows: { label: string; currentAmount: unknown; previousAmount?: unknown }[]):
     { details: IncomeStatementDetails; previousDetails?: IncomeStatementDetails;
       warnings: string[]; fieldConfidence: Record<string, FieldConfidence> }`
3. Usar `DEFAULT_BALANCE_SHEET_DETAILS`, `DEFAULT_INCOME_STATEMENT_DETAILS`, `BALANCE_FIELD_GROUPS`
   y los labels existentes como fuente de verdad.
4. Convencion de claves fieldConfidence: "{group}.{field}" para balance, "{field}" para resultados.
5. Filas no reconocidas -> warning, no se pierden silenciosamente.

No hacer:
- No crear rutas API.
- No tocar formularios.
- No importar archivos de Ola 1 Agente A (pueden usarse en tiempo de ejecucion pero no importar
  tipos que todavia no existen; usar los tipos de statement-fields.ts como fuente).

Criterio de exito:
- El mapper reconoce todos los campos de BALANCE_FIELD_GROUPS e INCOME_FIELD_GROUPS.
- `1.234.567,89` parsea como 1234567.89.
- `(123,45)` parsea como -123.45.
- Campos no reconocidos generan warning con el label original.
- `pnpm type-check` compila.
```

---

## Ola 2 — Provider Claude Vision + Excel reader + endpoint extract + reglas

### Agente A — Provider Claude Vision y Excel reader
**Depende de:** Ola 1 completa.

#### Objetivo
Implementar el provider real (Claude Vision) y el parser de Excel. El selector de provider elige
automaticamente segun variables de entorno.

#### Archivos a crear
- `lib/ocr/FinancialStatementOCRProvider.ts` — interfaz y tipos de resultado crudo.
- `lib/ocr/ClaudeFinancialStatementProvider.ts` — provider real usando `@anthropic-ai/sdk` con vision.
- `lib/ocr/MockFinancialStatementOCRProvider.ts` — provider deterministico para desarrollo.
- `lib/ocr/index.ts` — selector `getFinancialStatementOCRProvider()`.
- `lib/accounting/statement-excel-reader.ts` — lectura de `.xls`/`.xlsx` a filas normalizadas.

#### Archivos a modificar
- `package.json` + `pnpm-lock.yaml` — `pnpm add @anthropic-ai/sdk xlsx`.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 2 — Agente A

Lee el documento completo antes de implementar.

Contexto:
- El provider real es Claude API con vision. Ver seccion "Provider IA real" del plan.
- Dependencia: `@anthropic-ai/sdk`. Instalar con `pnpm add @anthropic-ai/sdk xlsx`.
- Variable de entorno: `ANTHROPIC_API_KEY` (solo server-side).
- El provider recibe un Buffer del archivo y devuelve rubros estructurados, NO texto raw que
  requiera mapeo manual. Claude entiende contexto contable y devuelve JSON.
- El mapper de aliases (Ola 1B) NO se usa para el provider Claude. Solo se usa para Excel.
- El mock provider SÍ usa filas de texto para poder testear el mapper Excel en desarrollo.

Implementar:

1. Crear `FinancialStatementOCRProvider` (interfaz):
   - metodo: `extract(buffer: Buffer, mimeType: string, hints?: { kind?: StatementImportKind; fileName?: string }): Promise<FinancialStatementOCRExtractionResult>`
   - resultado incluye: provider, durationMs, overallConfidence, rawText?, balanceResult?, incomeResult?, warnings.
   - `balanceResult` y `incomeResult` son directamente `ExtractedBalance` / `ExtractedIncomeStatement`
     (ya mapeados a rubros canonicos, no texto crudo).

2. Crear `ClaudeFinancialStatementProvider`:
   - Usar `@anthropic-ai/sdk` con el modelo `claude-haiku-4-5` (o `claude-sonnet-4-6` segun config).
   - Para PDF: convertir a base64 y enviar como `image` o `document` segun el tipo MIME.
   - Prompt de sistema: instruir a Claude a devolver un JSON con los rubros exactos de
     `BalanceSheetDetails` e `IncomeStatementDetails` usando los nombres canonicos en ingles
     (cashAndBanks, tradeReceivables, etc.). Incluir los nombres en espanol como contexto.
   - Capturar tambien `previousDetails` si el documento tiene columna de ejercicio anterior.
   - Si Claude no puede extraer un campo con confianza, devolver 0 y agregar el campo a `warnings`.
   - La confianza por campo se deriva de si Claude pudo identificarlo o lo infiry.
   - No hardcodear la clave de API; leer de `process.env.ANTHROPIC_API_KEY`.

3. Crear `MockFinancialStatementOCRProvider`:
   - Devolver datos realistas de un productor agropecuario argentino.
   - Incluir algunos campos en 0 y un warning para testear el flujo de revision.
   - overallConfidence: 0.82.

4. Crear `getFinancialStatementOCRProvider()`:
   - Si `ANTHROPIC_API_KEY` existe: usar `ClaudeFinancialStatementProvider`.
   - Si no: usar `MockFinancialStatementOCRProvider` y loguear advertencia.

5. Crear `lib/accounting/statement-excel-reader.ts`:
   - Instalar `xlsx` si no esta.
   - Exportar `readFinancialStatementWorkbook(buffer: Buffer): StatementWorkbookReadResult`.
   - `StatementWorkbookReadResult`: `{ rows: { label: string; currentAmount: unknown; previousAmount?: unknown; sheetName: string; rowIndex: number }[]; warnings: string[] }`.
   - Detectar la hoja con mas filas candidatas (por etiquetas contables conocidas).
   - Identificar columnas "Actual" y "Anterior" por headers o posicion.
   - Si no hay estructura reconocible, devolver rows vacio + warnings claros.

No hacer:
- No crear endpoint.
- No guardar datos en Firestore ni Storage.
- No hardcodear ANTHROPIC_API_KEY.

Criterio de exito:
- Con ANTHROPIC_API_KEY configurada, `ClaudeFinancialStatementProvider` compila y puede llamarse.
- Sin ANTHROPIC_API_KEY, `getFinancialStatementOCRProvider()` devuelve el mock.
- El Excel reader devuelve filas que el mapper de Ola 1B puede procesar.
- `pnpm type-check` compila.
```

### Agente B — Endpoint extract + reglas Firestore/Storage
**Depende de:** Ola 1 completa. Puede ejecutarse en paralelo con Agente A.

#### Objetivo
Crear la API que recibe el archivo, valida permisos, ejecuta el extractor y crea el borrador.
Asegurar que la nueva coleccion y rutas Storage respeten el modelo multi-tenant.

#### Archivos a crear
- `app/api/accounting/statements/extract/route.ts` — endpoint `POST` multipart.
- `lib/services/statement-imports-admin.ts` — helpers Admin SDK para crear y leer imports.
- `lib/auth/accounting-access.ts` — helper server-side para validar acceso del contador a la carpeta.

#### Archivos a modificar
- `firestore.rules` — agregar `financial_statement_imports`.
- `storage.rules` — agregar ruta `statement-imports`.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 2 — Agente B

Lee el documento completo antes de implementar.

Contexto:
- APIs existentes usan `verifyRequestSession` en `lib/auth/server-session.ts`.
- Admin SDK esta en `lib/firebase/admin-sdk.ts`.
- NUNCA confiar en `organizationId` del cliente.
- Contador requiere: membership activa en su estudio + link activo en `producer_accountant_links`
  con `systemUserOrganizationId == producerId`.
- Storage actual: `orgs/{orgId}/producers/{producerId}/periods/{periodId}/{type}/{id}-{filename}`.
- El endpoint en esta Ola NO necesita el provider real todavia; puede recibir el extractor
  como dependencia inyectada o importarlo de `lib/ocr/index.ts` de Ola 2A.
  Si Ola 2A no esta disponible, crear un stub que devuelva un resultado vacio con status `extracted`.

Limites de archivo (del plan):
- PDF/imagen: 10 MB.
- Excel: 5 MB.

Implementar:

1. Crear `lib/auth/accounting-access.ts`:
   `assertCanManageAccountingFolder(session, producerId): Promise<{ folderOwnerOrganizationId: string; accountingFirmId: string | null }>`
   - admin_platform: siempre puede.
   - accountant/accounting_firm_admin: defaultOrganizationId != null + membership activa +
     link activo en producer_accountant_links.
   - producer: solo si session.uid tiene membership activa en la org del producerId.

2. Crear `app/api/accounting/statements/extract/route.ts` (POST multipart):
   - Leer `file`, `producerId`, `periodId`, `kind`, `currency` (opcional).
   - Validar MIME contra la lista del plan. Rechazar otros con 400.
   - Validar tamano: PDF/imagen <= 10 MB, Excel <= 5 MB.
   - Llamar `assertCanManageAccountingFolder`. Si falla: 403.
   - Guardar archivo en Storage bajo:
     `orgs/{folderOwnerOrganizationId}/producers/{producerId}/periods/{periodId}/statement-imports/{uuid}-{filename}`.
   - Crear documento en `documents` con `documentType: "financial_statement_source"` y `folderOwnerOrganizationId`.
   - Si es Excel: usar `readFinancialStatementWorkbook` + mapper.
   - Si es PDF/imagen: usar `getFinancialStatementOCRProvider().extract(...)`.
   - Crear documento en `financial_statement_imports` con status `extracted` (o `failed` si hubo error).
   - Si el archivo se subio a Storage pero la extraccion falla: igualmente crear el import con
     status `failed` y `sourceStoragePath` relleno (para trazabilidad y limpieza futura).
   - Escribir audit log `statement_import.extracted`.
   - Responder 201: `{ importId, status, overallConfidence, extractedBalance?, extractedIncomeStatement?, fieldConfidence, warnings }`.

3. Crear `lib/services/statement-imports-admin.ts` con:
   - `createStatementImport(data): Promise<string>`
   - `getStatementImport(importId): Promise<FinancialStatementImport | null>`
   - `updateStatementImport(importId, patch): Promise<void>`

4. Firestore rules — agregar:
   ```
   match /financial_statement_imports/{docId} {
     allow read: if canReadFolderData(resource.data.folderOwnerOrganizationId);
     allow write: if false; // solo via Admin SDK server-side
   }
   ```

5. Storage rules — agregar bajo el bloque de `orgs/{orgId}`:
   ```
   match /producers/{producerId}/periods/{periodId}/statement-imports/{fileName} {
     allow read: if request.auth != null && request.auth.token.defaultOrganizationId == orgId;
     allow write: if false;
   }
   ```

No hacer:
- No crear balance_sheets ni income_statements todavia.
- No guardar automaticamente sin revision.
- No tomar `organizationId` del body.
- No relajar rules para entidades solicitantes sin grant.

Criterio de exito:
- 403 para usuario sin acceso.
- 400 para MIME invalido o archivo fuera de limite.
- Import draft creado en Firestore con status correcto.
- `pnpm type-check` compila.
- `pnpm check:security-shape` pasa (el marcador fue agregado en Ola 1A).
```

---

## Ola 3 — Endpoints de revision y aplicacion

### Agente A
**Depende de:** Ola 2 completa.

#### Objetivo
Crear los endpoints para revisar, rechazar o aplicar un borrador de importacion a `balance_sheets`
y/o `income_statements`.

#### Archivos a crear
- `app/api/accounting/statement-imports/[importId]/route.ts` — `GET` y `PATCH`.
- `app/api/accounting/statement-imports/[importId]/apply/route.ts` — `POST` para guardar EECC finales.

#### Archivos a modificar
- `lib/services/statement-imports-admin.ts` — agregar helpers de update/apply si no quedaron en Ola 2.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 3 — Agente A

Lee el documento completo antes de implementar.

Contexto:
- Los formularios actuales guardan balance con `createBalanceSheet` y resultados con
  `createIncomeStatement` (client-side). El flujo de importacion es server-side.
- Usar schemas de Ola 1.
- Recalcular totales server-side con `calculateBalanceTotals` y `calculateIncomeTotals`
  (importar de `lib/accounting/statement-fields.ts`).
- `assertCanManageAccountingFolder` ya existe desde Ola 2.

Implementar:

1. `GET /api/accounting/statement-imports/[importId]`:
   - Verificar sesion y acceso con `assertCanManageAccountingFolder`.
   - Devolver el import completo.

2. `PATCH /api/accounting/statement-imports/[importId]`:
   - Validar con `reviewStatementImportSchema` de Ola 1.
   - Permitir editar `extractedBalance.details`, `extractedBalance.equityTotal`,
     `extractedIncomeStatement.details`, campo por campo.
   - Actualizar `fieldConfidence` de los campos editados a `{ source: "manual", confidence: 1.0 }`.
   - Cambiar status a `reviewed`.
   - Escribir audit log `statement_import.reviewed`.

3. `POST /api/accounting/statement-imports/[importId]/apply`:
   - No permitir apply si status es `failed`, `rejected` o `applied`.
   - Recibir `{ applyBalance?: boolean, applyIncomeStatement?: boolean }`.
   - Si `applyBalance` y hay `extractedBalance`:
     - Recalcular totales server-side.
     - Si el balance no cuadra (|activo - pasivo - patrimonio| > 0.01): devolver 422 con detalle.
     - Crear documento en `balance_sheets`.
     - Linkear `documentIds` con `sourceDocumentId` del import.
     - Escribir audit log `balance_sheet.created`.
   - Si `applyIncomeStatement` y hay `extractedIncomeStatement`:
     - Recalcular totales server-side.
     - Crear documento en `income_statements`.
     - Linkear `documentIds`.
     - Escribir audit log `income_statement.created`.
   - Marcar import como `applied`. Guardar `appliedBalanceSheetId` y/o `appliedIncomeStatementId`.
   - Escribir audit log `statement_import.applied`.
   - Responder 200 con ids de los documentos creados.

No hacer:
- No confiar en totales enviados por el cliente.
- No guardar si el contador no tiene acceso validado.
- No permitir doble apply (status ya applied -> 409).

Criterio de exito:
- Apply crea documentos finales solo con revision/confirmacion previa.
- Balance descuadrado devuelve 422 sin guardar.
- `pnpm type-check` compila.
```

---

## Ola 4 — Frontend y cierre

### Agente A — Componentes de importacion
**Depende de:** Ola 3 completa.

#### Objetivo
Crear componentes reutilizables para subir archivo, mostrar confianza y revisar datos.

#### Archivos a crear
- `components/accounting/StatementImportUploader.tsx` — dropzone para PDF, imagen y Excel.
- `components/accounting/StatementImportConfidenceBadge.tsx` — badge de confianza.
- `components/accounting/StatementImportReview.tsx` — panel de revision editable.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 4 — Agente A

Lee el documento completo antes de implementar.

Contexto:
- UI usa sonner, shadcn-style, Lucide icons, Tailwind.
- `BalanceSheetForm` e `IncomeStatementForm` ya aceptan `defaultValues`.
- Consistencia visual: columna unica vertical, sin acordeones.
- MIME permitidos: pdf, jpeg, png, webp, xls, xlsx.
- Limites: 10 MB PDF/imagen, 5 MB Excel.

Implementar:

1. `StatementImportUploader`:
   - Props: `producerId`, `periodId`, `kind: StatementImportKind`, `onExtracted(importId: string): void`.
   - Estados: `idle | uploading | processing | extracted | error`.
   - Valida MIME y tamano en cliente antes de enviar.
   - Llama `POST /api/accounting/statements/extract` con `getFreshIdToken()`.
   - Muestra barra de progreso durante upload.
   - Al extraer, llama `onExtracted(importId)`.
   - Si falla, muestra error con opcion de reintentar.

2. `StatementImportConfidenceBadge`:
   - Props: `confidence: number`, `source: "ocr" | "ai" | "excel" | "manual"`.
   - Alta (>= 0.85): verde.
   - Media (0.5 - 0.84): amarillo.
   - Baja (< 0.5): rojo.
   - "manual": azul (editado por el usuario).

3. `StatementImportReview`:
   - Props: `importId: string`, `onApplied(): void`.
   - Carga el import con `GET /api/accounting/statement-imports/[importId]`.
   - Muestra warnings con icono de alerta.
   - Muestra campos de balance/resultados con badge de confianza por campo.
   - Permite editar cualquier valor (llama PATCH al cambiar un campo con debounce 500ms).
   - Botones: "Aplicar a balance" y/o "Aplicar a resultados" segun what esta disponible.
   - Si `combined`: muestra los dos paneles.
   - Texto del boton de confirmacion: "Revisar antes de guardar" como hint previo; boton final "Aplicar al periodo".
   - Al aplicar, llama `POST /api/accounting/statement-imports/[importId]/apply`.

No hacer:
- No modificar la pagina de carpeta. Eso lo hace Agente B.
- No guardar automaticamente al terminar extraccion.

Criterio de exito:
- Componentes compilan aislados.
- El flujo completo (upload -> review -> apply) funciona con el mock provider.
```

### Agente B — Integracion en carpeta + QA + cierre
**Depende de:** Ola 3 completa. Puede ejecutarse en paralelo con Agente A.

#### Objetivo
Integrar la carga en la pantalla del contador, validar el flujo completo y cerrar con commit/push.

#### Archivos a modificar
- `app/app/contador/productores/[producerId]/carpeta/page.tsx`
- `components/accounting/BalanceSheetForm.tsx` (si hace falta para defaultValues de import)
- `components/accounting/IncomeStatementForm.tsx` (si hace falta para defaultValues de import)
- `reports/HANDOFF_ACTUAL.md`
- `docs/MODULE_REGISTRY.md`

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 4 — Agente B

Lee el documento completo antes de implementar.

Contexto:
- Pagina de carpeta: `app/app/contador/productores/[producerId]/carpeta/page.tsx`.
- Tabs actuales: Balance, Resultados, Impuestos, Bienes, Inmuebles, Documentos.
- Layout: tabs verticales (sidebar izquierdo).
- Mantener Resultados en forma vertical, sin acordeones.

Implementar:

1. En el tab Balance:
   - Si no hay balance cargado: agregar boton "Cargar desde archivo" arriba del `BalanceSheetForm`.
   - Al hacer click: mostrar `StatementImportUploader` con `kind="balance_sheet"`.
   - Al extraer: mostrar `StatementImportReview`.
   - Al aplicar: refrescar `getBalanceSheetsForPeriod`.
   - Mantener el formulario manual disponible.

2. En el tab Resultados: igual con `kind="income_statement"`.

3. Soporte para `combined`:
   - Opcion "Cargar balance y resultados desde un mismo archivo" que use `kind="combined"`.
   - `StatementImportReview` ya maneja combined (muestra dos paneles).
   - Al aplicar combined, refrescar ambos.

4. La carga manual sigue disponible en todo momento. El uploader es una opcion, no reemplaza el form.

5. Validar el flujo completo:
   - `pnpm type-check` -> OK.
   - `pnpm check:security-shape` -> OK.
   - Prueba manual local:
     - subir archivo con mock provider.
     - ver preview con confianza.
     - editar un campo.
     - aplicar.
     - verificar que balance/resultados aparezcan en el tab.
     - usuario sin permiso recibe 403.

6. Actualizar `reports/HANDOFF_ACTUAL.md` con:
   - Lo implementado en cada ola.
   - Provider real pendiente de configurar en produccion (`ANTHROPIC_API_KEY`).
   - Pendientes: limpieza de archivos Storage de imports fallidos, soporte a PDFs escaneados de baja calidad.

7. `git status --short`, `git add` selectivo, commit descriptivo, `git push origin master`.

No hacer:
- No volver a layout de dos columnas para Resultados.
- No ocultar rubros de balance en acordeones.
- No subir `ANTHROPIC_API_KEY` al repositorio.

Criterio de exito:
- Un contador puede subir archivo, revisar y aplicar desde la carpeta.
- Si la IA falla o no hay clave, el formulario manual sigue funcionando.
- Handoff actualizado y commit pusheado.
```

---

## Checklist de cierre funcional

- [ ] El contador puede subir PDF/imagen/Excel desde la carpeta del productor.
- [ ] El sistema guarda el archivo fuente de forma privada en Storage.
- [ ] El sistema crea un borrador de importacion, no un balance final automatico.
- [ ] Balance muestra todos los rubros, no solo titulares.
- [ ] Resultados mantiene lectura vertical: ventas, costos, resultado bruto, gastos, impuesto y resultado final.
- [ ] Cada campo prellenado muestra badge de confianza.
- [ ] El usuario puede corregir cualquier importe antes de aplicar.
- [ ] Al aplicar, se recalculan totales server-side.
- [ ] El balance descuadrado devuelve 422, no se guarda silenciosamente.
- [ ] El documento fuente queda linkeado en `documentIds`.
- [ ] Si el PDF tiene ejercicio anterior, se captura en `previousDetails` del import draft.
- [ ] Hay audit log de extraccion y aplicacion.
- [ ] No hay acceso cross-tenant.
- [ ] `pnpm type-check` OK.
- [ ] `pnpm check:security-shape` OK.
- [ ] `ANTHROPIC_API_KEY` no esta en el repositorio.

---

## Riesgos y decisiones

| Tema | Decision |
|------|----------|
| Provider IA | Claude API (`claude-haiku-4-5`). Variable `ANTHROPIC_API_KEY` solo server-side. Mock disponible para dev. |
| Ejercicio anterior | Se captura en `previousDetails` del import draft. No se persiste como periodo separado. |
| Balance descuadrado | Devuelve 422. El usuario debe corregir antes de aplicar. No se ignora. |
| Archivos Storage de imports fallidos | Se conservan con el import `status: failed` para trazabilidad. Limpieza futura via job. |
| PDFs escaneados de baja calidad | Se muestran con confianza baja y warnings. No bloquea la carga; el usuario puede corregir manualmente. |
| Costos IA | Limitar a 10 MB y preferir `claude-haiku-4-5` para reducir costo por extraccion. |
| Campos `combined` en frontend | Se tratan como dos revisiones en el mismo import. Sin cambio de modelo. |
