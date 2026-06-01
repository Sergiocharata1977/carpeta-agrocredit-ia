# Plan OCR IA EECC - Ejecucion multi-agente

**Fecha:** 2026-06-01
**Feature:** Cargar balances por archivo y prellenar Estado de Situacion Patrimonial y Estado de Resultados con OCR/IA.
**Proyectos afectados:** `Agro-Credit` como implementacion; `9001app-firebase` como referencia tecnica.

---

## Decision ejecutiva

Si, conviene implementarlo ahora como feature core de Agro-Credit. El valor es alto porque reduce carga manual del contador, permite revisar campos antes de guardar y aprovecha la estructura de rubros que ya existe en `lib/accounting/statement-fields.ts`.

La decision de seguridad es obligatoria: la IA nunca guarda el balance final sola. El flujo correcto es:

1. Subir PDF, imagen o Excel.
2. Extraer datos con OCR/IA o parser de planilla.
3. Mapear a rubros canonicos.
4. Mostrar previsualizacion editable con confianza por campo.
5. Guardar recien cuando el contador confirma.

---

## Analisis del OCR existente en 9001app-firebase

Archivos revisados en `9001app-firebase`:

- `src/lib/ocr/OCRProvider.ts`
- `src/lib/ocr/MockOCRProvider.ts`
- `src/lib/ocr/index.ts`
- `src/app/api/commercial-accounting/purchases/invoices/extract/route.ts`
- `src/app/(dashboard)/contabilidad-comercial/compras/facturas/nueva/page.tsx`
- `src/app/(dashboard)/contabilidad-comercial/compras/facturas/nueva/InvoiceUploadZone.tsx`
- `src/app/(dashboard)/contabilidad-comercial/compras/facturas/nueva/InvoiceReviewForm.tsx`
- `src/app/api/mobile/operaciones/dealer-accounting/invoices/route.ts`
- `src/app/api/mobile/operaciones/dealer-accounting/invoices/[id]/confirm/route.ts`
- `android/app/src/main/java/com/doncandido/vendedor/data/repository/PurchaseInvoiceRepository.kt`
- `android/app/src/main/java/com/doncandido/vendedor/ui/viewmodel/FacturaViewModel.kt`

Hallazgos:

- Existe una interfaz limpia `OCRProvider` con `extract(buffer, mimeType, hints)` y resultado con `fields`, `raw_text`, `provider` y `duration_ms`.
- El provider real actual es `MockOCRProvider`; la tuberia esta preparada, pero no hay OCR/IA productivo en ese modulo.
- El endpoint web de facturas acepta `PDF/JPG/PNG`, valida tamano y MIME, guarda el archivo en Storage, ejecuta el provider, crea un borrador y devuelve `ocr_result` con confianza.
- La UI web tiene upload, estado de procesamiento, preview del archivo, formulario editable y badges de confianza.
- La app Android repite la idea para captura mobile: envia base64, crea borrador, navega a revision y confirma.
- La confirmacion final es separada de la extraccion; ese patron es correcto para Agro-Credit.

Que se puede reutilizar conceptualmente:

- Provider intercambiable.
- Resultado estructurado con `value`, `confidence` y `source`.
- Borrador intermedio antes de guardar.
- Preview editable con alertas de baja confianza.
- Confirmacion humana y auditoria.

Que no se debe copiar directo:

- El contrato de facturas, categorias dealer y eventos contables de compras.
- La coleccion anidada `organizations/{orgId}/purchase_invoices`.
- El mock como solucion final.
- La logica mobile, salvo como referencia futura.

---

## Alcance funcional

Incluido:

- Upload desde la carpeta del contador para `balance_sheet`, `income_statement` o `combined`.
- Soporte inicial para `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `application/vnd.ms-excel` y `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`.
- Parser de Excel para tablas claras.
- Provider OCR/IA para PDF/imagenes con contrato reemplazable.
- Mapeo a los rubros actuales de `BalanceSheetDetails` e `IncomeStatementDetails`.
- Calculo automatico de totales usando `calculateBalanceTotals` y `calculateIncomeTotals`.
- Previsualizacion editable antes de guardar.
- Vinculo del documento fuente mediante `documentIds`.
- Auditoria de extraccion y aplicacion.

Excluido en esta primera version:

- Guardado automatico sin revision humana.
- Comparativo `Actual/Anterior` en una misma carga. Se deja preparado como metadata futura, pero el guardado canonico sigue usando el periodo seleccionado.
- Lectura perfecta de cualquier PDF escaneado. Se debe mostrar confianza y advertencias.
- Mobile nativo.

---

## Modelo propuesto

Nueva coleccion canonica:

- `financial_statement_imports`

Campos principales:

```ts
type StatementImportKind = "balance_sheet" | "income_statement" | "combined"
type StatementImportStatus = "uploaded" | "extracted" | "reviewed" | "applied" | "rejected" | "failed"

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
  provider: string
  overallConfidence: number
  extractedBalance?: {
    details: BalanceSheetDetails
    equityTotal: number
    currency: "ARS" | "USD"
  }
  extractedIncomeStatement?: {
    details: IncomeStatementDetails
    currency: "ARS" | "USD"
  }
  fieldConfidence: Record<string, { confidence: number; source: "ocr" | "ai" | "excel" | "manual" }>
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

---

## Resumen de olas

| Ola | Agentes | Paralelos entre si | Dependen de |
|-----|---------|--------------------|-------------|
| 1 | A, B | Si | Nada |
| 2 | A, B | Si | Ola 1 completa |
| 3 | A, B | Si | Ola 2 completa |
| 4 | A | No aplica | Ola 3 completa |
| 5 | A, B | Si | Ola 4 completa |
| 6 | A | No aplica | Ola 5 completa |

---

## Ola 1 - Contrato de datos y mapeo base
> Ejecutar Agente A + Agente B en PARALELO

### Agente A — Tipos, schemas y coleccion de importacion
**Puede ejecutarse en paralelo con:** Agente B de la misma ola.
**Depende de:** nada - es la primera ola.

#### Objetivo
Crear el contrato canonico para borradores de importacion de EECC sin tocar todavia APIs ni UI.

#### Archivos a crear
- `types/statement-imports.ts` - tipos `FinancialStatementImport`, `StatementImportKind`, `StatementImportStatus`, confianza por campo y payload extraido.
- `lib/schemas/statement-imports.ts` - schemas Zod para extract, update/review y apply.

#### Archivos a modificar
- `lib/firebase/collections.ts` - agregar `FINANCIAL_STATEMENT_IMPORTS: "financial_statement_imports"`.
- `types/audit.ts` - agregar acciones `statement_import.extracted`, `statement_import.reviewed`, `statement_import.applied`, `statement_import.rejected`.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 1 — Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Proyecto: Agro-Credit, Next.js App Router + Firebase + TypeScript.
- Campos canonicos actuales: `lib/accounting/statement-fields.ts`.
- Schemas contables actuales: `lib/schemas/accounting.ts`.
- Tipos contables actuales: `types/accounting.ts`.
- Colecciones canonicas: `lib/firebase/collections.ts`.
- Auditoria: `types/audit.ts` y `lib/firebase/audit.ts`.

Implementar:
1. Crear `types/statement-imports.ts`.
2. Crear `lib/schemas/statement-imports.ts`.
3. Agregar `FINANCIAL_STATEMENT_IMPORTS` en `COLLECTIONS`.
4. Agregar acciones auditables nuevas en `types/audit.ts`.

El tipo debe soportar:
- kind: `balance_sheet`, `income_statement`, `combined`.
- status: `uploaded`, `extracted`, `reviewed`, `applied`, `rejected`, `failed`.
- producerId, folderOwnerOrganizationId, accountingFirmId, periodId.
- sourceDocumentId, sourceStoragePath, sourceFileName, sourceMimeType.
- extractedBalance opcional con `BalanceSheetDetails`, `equityTotal`, `currency`.
- extractedIncomeStatement opcional con `IncomeStatementDetails`, `currency`.
- fieldConfidence por path de campo.
- warnings y rawText.

No hacer:
- No crear endpoints.
- No modificar formularios.
- No agregar provider OCR.

Criterio de exito:
- `pnpm type-check` no debe fallar por los nuevos tipos.
- Los schemas permiten validar extract/review/apply sin aceptar organizationId editable como autoridad de seguridad.
```

### Agente B — Alias y mapper de rubros EECC
**Puede ejecutarse en paralelo con:** Agente A de la misma ola.
**Depende de:** nada - es la primera ola.

#### Objetivo
Crear el diccionario de sinonimos y normalizacion que permite mapear texto OCR/Excel a los rubros actuales.

#### Archivos a crear
- `lib/accounting/statement-field-aliases.ts` - aliases por campo canonico.
- `lib/accounting/statement-import-mapper.ts` - normalizador de etiquetas, parser numerico argentino y mapeo a `BalanceSheetDetails` / `IncomeStatementDetails`.

#### Archivos a modificar
- Ninguno.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 1 — Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Los rubros fuente estan en `lib/accounting/statement-fields.ts`.
- Balance usa `BalanceSheetDetails`.
- Resultados usa `IncomeStatementDetails`.
- Los PDFs de EECC suelen traer variantes como "Caja y bancos", "Creditos por ventas", "Bienes de uso", "Ventas netas", "Costo de ventas", "Gastos de administracion".

Implementar:
1. Crear `lib/accounting/statement-field-aliases.ts` con aliases por cada path canonico.
2. Crear `lib/accounting/statement-import-mapper.ts` con funciones puras:
   - `normalizeStatementLabel(label: string): string`
   - `parseArgentineAmount(value: string | number | null | undefined): number`
   - `mapBalanceRowsToDetails(rows): { details, equityTotal, warnings, fieldConfidence }`
   - `mapIncomeRowsToDetails(rows): { details, warnings, fieldConfidence }`
3. Usar `DEFAULT_BALANCE_SHEET_DETAILS`, `DEFAULT_INCOME_STATEMENT_DETAILS`, `BALANCE_FIELD_GROUPS` y los labels existentes como fuente de verdad.

No hacer:
- No crear rutas API.
- No tocar formularios.
- No importar archivos de Ola 1 Agente A.

Criterio de exito:
- El mapper reconoce todos los campos visibles de Balance y Resultados agregados en la sesion anterior.
- Los numeros argentinos como `1.234.567,89`, `(123,45)` y `-123,45` se parsean correctamente.
- Los campos no reconocidos vuelven como warnings, no se pierden silenciosamente.
```

---

## Ola 2 - Extraccion de archivos
> Ejecutar Agente A + Agente B en PARALELO despues de Ola 1

### Agente A — Provider OCR/IA para estados contables
**Puede ejecutarse en paralelo con:** Agente B de la misma ola.
**Depende de:** Ola 1 completa.

#### Objetivo
Crear una abstraccion OCR/IA equivalente al patron de 9001, adaptada a estados contables.

#### Archivos a crear
- `lib/ocr/FinancialStatementOCRProvider.ts` - interfaz provider y tipos de resultado crudo.
- `lib/ocr/MockFinancialStatementOCRProvider.ts` - provider local deterministico para desarrollo.
- `lib/ocr/index.ts` - selector `getFinancialStatementOCRProvider()`.

#### Archivos a modificar
- Ninguno.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 2 — Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Tomar como referencia conceptual `9001app-firebase/src/lib/ocr/OCRProvider.ts`.
- Agro-Credit no tiene `lib/ocr` actualmente.
- El provider debe devolver filas/valores detectados, no guardar Firestore ni Storage.
- El guardado lo hara la API de Ola 3.

Implementar:
1. Crear `FinancialStatementOCRProvider` con metodo:
   `extract(fileBuffer: Buffer, mimeType: string, hints?: { kind?: StatementImportKind; fileName?: string }): Promise<FinancialStatementOCRExtractionResult>`.
2. El resultado debe incluir:
   - provider
   - durationMs
   - overallConfidence
   - rawText opcional
   - balanceRows opcional
   - incomeRows opcional
   - warnings
3. Crear `MockFinancialStatementOCRProvider` con datos realistas de balance y resultados para permitir probar el flujo sin credenciales IA.
4. Crear `getFinancialStatementOCRProvider()` con seleccion por env:
   - si no hay provider real configurado, usar mock.
   - dejar el punto de extension listo para provider real.

No hacer:
- No implementar endpoint.
- No agregar UI.
- No guardar datos.
- No hardcodear claves de IA.

Criterio de exito:
- El provider mock devuelve rubros que el mapper de Ola 1 Agente B puede reconocer.
- `pnpm type-check` compila.
```

### Agente B — Parser de Excel para balances
**Puede ejecutarse en paralelo con:** Agente A de la misma ola.
**Depende de:** Ola 1 completa.

#### Objetivo
Permitir que Excel/XLSX se procese sin OCR visual, convirtiendo hojas a filas contables normalizadas.

#### Archivos a crear
- `lib/accounting/statement-excel-reader.ts` - lectura de `.xls`/`.xlsx` a filas `{ label, currentAmount, previousAmount?, sheetName, rowIndex }`.

#### Archivos a modificar
- `package.json` - agregar dependencia `xlsx` si no existe.
- `pnpm-lock.yaml` - actualizar lockfile al instalar dependencia.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 2 — Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Agro-Credit actualmente no tiene parser Excel.
- El usuario quiere poder subir PDF/imagen/Excel.
- Para Excel, no usar OCR: leer planilla y mapear por etiquetas.

Implementar:
1. Agregar `xlsx` con `pnpm add xlsx` si el repo no lo tiene.
2. Crear `lib/accounting/statement-excel-reader.ts`.
3. Exportar funcion:
   `readFinancialStatementWorkbook(buffer: Buffer): StatementWorkbookReadResult`.
4. Detectar hojas y filas candidatas por etiquetas contables.
5. Identificar columnas "Actual" y "Anterior" si existen. Para esta version, usar "Actual" para el periodo seleccionado y dejar "Anterior" como metadata/warning.

No hacer:
- No crear UI ni API.
- No guardar datos.
- No mapear a schemas finales si eso ya lo hace `statement-import-mapper`.

Criterio de exito:
- Devuelve filas normalizadas desde una planilla.
- Si la planilla no tiene estructura reconocible, devuelve warnings claros.
- TypeScript compila.
```

---

## Ola 3 - API de extraccion y seguridad
> Ejecutar Agente A + Agente B en PARALELO despues de Ola 2

### Agente A — Endpoint server-side de extraccion
**Puede ejecutarse en paralelo con:** Agente B de la misma ola.
**Depende de:** Ola 2 completa.

#### Objetivo
Crear la API que recibe el archivo, valida permisos, guarda fuente, ejecuta extractor y crea el borrador de importacion.

#### Archivos a crear
- `app/api/accounting/statements/extract/route.ts` - endpoint `POST` multipart.
- `lib/services/statement-imports-admin.ts` - helpers Admin SDK para crear y leer imports.
- `lib/auth/accounting-access.ts` - helper server-side para validar si el contador puede operar la carpeta del productor.

#### Archivos a modificar
- Ninguno obligatorio, salvo imports si el repo lo requiere.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 3 — Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- APIs existentes usan `verifyRequestSession` en `lib/auth/server-session.ts`.
- Admin SDK esta en `lib/firebase/admin-sdk.ts`.
- No confiar en `organizationId` del cliente.
- Contador debe tener membership activa en su estudio y link activo con el productor en `producer_accountant_links`.
- Storage actual usa ruta `orgs/{orgId}/producers/{producerId}/periods/{periodId}/...`.

Implementar:
1. Crear `lib/auth/accounting-access.ts` con helper:
   `assertCanManageAccountingFolder(session, producerId): Promise<{ folderOwnerOrganizationId: string; accountingFirmId: string | null }>`
   - admin_platform puede.
   - contador/accounting_firm_admin requiere defaultOrganizationId + membership activa + link activo con `systemUserOrganizationId == producerId` o `producerId == producerId`.
   - producer puede operar solo su propia organizacion si se decide soportarlo.
2. Crear `app/api/accounting/statements/extract/route.ts`.
3. Recibir multipart:
   - `file`
   - `producerId`
   - `periodId`
   - `kind`
   - `currency` opcional
4. Validar MIME y tamano. Propuesta: 25 MB.
5. Guardar fuente en Storage server-side.
6. Crear metadata en `documents` con `documentType: "financial_statement_source"` y `folderOwnerOrganizationId`.
7. Si es Excel, usar `statement-excel-reader`; si es PDF/imagen, usar provider OCR/IA.
8. Mapear a balance/resultados con el mapper.
9. Crear documento en `financial_statement_imports` con status `extracted` o `failed`.
10. Escribir audit log `statement_import.extracted`.
11. Responder `{ importId, status, extractedBalance, extractedIncomeStatement, fieldConfidence, warnings }`.

No hacer:
- No crear balance_sheets ni income_statements todavia.
- No guardar automaticamente sin revision.
- No tomar `organizationId` del body.

Criterio de exito:
- Usuario no autorizado recibe 403.
- Archivo invalido recibe 400.
- Extract valido crea document source + import draft.
- `pnpm type-check` compila.
```

### Agente B — Reglas Firestore/Storage y shape de seguridad
**Puede ejecutarse en paralelo con:** Agente A de la misma ola.
**Depende de:** Ola 2 completa.

#### Objetivo
Asegurar que la nueva coleccion y rutas Storage respeten el modelo multi-tenant.

#### Archivos a crear
- Ninguno.

#### Archivos a modificar
- `firestore.rules` - agregar `financial_statement_imports`.
- `storage.rules` - permitir ruta de importacion bajo `orgs/{orgId}/producers/{producerId}/periods/{periodId}/statement-imports/...`.
- `scripts/check-security-shape.ts` - agregar marcadores esperados si el script verifica colecciones/rutas criticas.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 3 — Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Firestore es deny-by-default.
- Colecciones contables actuales estan en `firestore.rules`.
- Storage actual permite documentos bajo `orgs/{orgId}/producers/{producerId}/...`.
- La validacion fina se hace server-side, pero las reglas no deben abrir datos publicos.

Implementar:
1. Agregar match para `/financial_statement_imports/{docId}`.
2. Lectura: usar `canReadFolderData(resource.data.folderOwnerOrganizationId)`.
3. Escritura cliente: preferir `false` o solo admin/contador si se mantiene compatibilidad, pero el flujo nuevo debe usar API Admin SDK.
4. Storage: mantener ruta privada bajo `orgs/{orgId}/producers/{producerId}/periods/{periodId}/statement-imports/...`.
5. Actualizar `scripts/check-security-shape.ts` si aplica.

No hacer:
- No tocar endpoints.
- No relajar rules para entidades solicitantes sin grant server-side.

Criterio de exito:
- `pnpm check:security-shape` pasa.
- No queda ninguna regla publica para imports.
```

---

## Ola 4 - Revision y aplicacion final
> Ejecutar SOLO despues de que Ola 3 este completa

### Agente A — Endpoints de review/apply
**Puede ejecutarse en paralelo con:** es el unico de esta ola.
**Depende de:** Ola 3 completa.

#### Objetivo
Crear los endpoints para revisar, rechazar o aplicar un borrador de importacion a `balance_sheets` y/o `income_statements`.

#### Archivos a crear
- `app/api/accounting/statement-imports/[importId]/route.ts` - `GET` y `PATCH`.
- `app/api/accounting/statement-imports/[importId]/apply/route.ts` - `POST` para guardar EECC finales.

#### Archivos a modificar
- `lib/services/statement-imports-admin.ts` - agregar helpers de update/apply si no quedaron en Ola 3.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 4 — Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Los formularios actuales guardan balance con `createBalanceSheet` y resultados con `createIncomeStatement`, pero el flujo de importacion debe ser server-side por seguridad y auditoria.
- Usar schemas de Ola 1.
- Usar `calculateBalanceTotals` y `calculateIncomeTotals` antes de persistir.

Implementar:
1. `GET /api/accounting/statement-imports/[importId]`: devuelve import si el usuario tiene acceso.
2. `PATCH /api/accounting/statement-imports/[importId]`: guarda revision editable, cambia status a `reviewed`, actualiza confianza manual y warnings.
3. `POST /api/accounting/statement-imports/[importId]/apply`: crea o actualiza:
   - `balance_sheets` si hay extractedBalance confirmado.
   - `income_statements` si hay extractedIncomeStatement confirmado.
4. Linkear `documentIds` con el documento fuente.
5. Marcar import como `applied`.
6. Escribir audit logs:
   - `statement_import.reviewed`
   - `statement_import.applied`
   - `balance_sheet.created` o `income_statement.created` segun corresponda.

No hacer:
- No permitir apply si status es `failed`, `rejected` o ya `applied`.
- No confiar en totales enviados por el cliente; recalcular server-side.
- No guardar si falta `periodId` o si el acceso al productor no esta validado.

Criterio de exito:
- Apply crea los documentos finales solo despues de revision/confirmacion.
- Si el balance no cuadra, devuelve 422 o warning segun decision del schema, pero no ignora la diferencia.
- `pnpm type-check` compila.
```

---

## Ola 5 - Frontend de carga y previsualizacion
> Ejecutar Agente A + Agente B en PARALELO despues de Ola 4

### Agente A — Componentes de importacion EECC
**Puede ejecutarse en paralelo con:** Agente B de la misma ola.
**Depende de:** Ola 4 completa.

#### Objetivo
Crear componentes reutilizables para subir archivo, mostrar confianza y revisar datos antes de aplicar.

#### Archivos a crear
- `components/accounting/StatementImportUploader.tsx` - dropzone/upload para PDF, imagen y Excel.
- `components/accounting/StatementImportConfidenceBadge.tsx` - badge de confianza por campo.
- `components/accounting/StatementImportReview.tsx` - panel de revision editable para balance/resultados.

#### Archivos a modificar
- Ninguno obligatorio.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 5 — Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- UI actual usa `sonner`, shadcn-style components y formularios en `components/accounting`.
- `BalanceSheetForm` e `IncomeStatementForm` ya aceptan `defaultValues`.
- El usuario pidio consistencia visual vertical.

Implementar:
1. `StatementImportUploader`:
   - props: producerId, periodId, kind, onExtracted(importId).
   - usa token del usuario y llama `/api/accounting/statements/extract`.
   - valida MIME y tamano en cliente.
2. `StatementImportConfidenceBadge`:
   - muestra baja/media/alta confianza.
3. `StatementImportReview`:
   - recibe import draft.
   - muestra warnings.
   - permite aplicar a balance/resultados llamando endpoints de Ola 4.
   - no rompe la lectura vertical de Resultados.

No hacer:
- No modificar la pagina principal de carpeta; eso lo hace Agente B.
- No guardar automaticamente al terminar OCR.

Criterio de exito:
- Componentes compilan aislados.
- Estados: idle, uploading, processing, extracted, error.
- Textos claros: "Revisar antes de guardar", "Aplicar a balance", "Aplicar a resultados".
```

### Agente B — Integracion en carpeta contable
**Puede ejecutarse en paralelo con:** Agente A de la misma ola.
**Depende de:** Ola 4 completa.

#### Objetivo
Integrar la carga OCR/IA en la pantalla del contador sin romper los formularios manuales.

#### Archivos a crear
- Ninguno.

#### Archivos a modificar
- `app/app/contador/productores/[producerId]/carpeta/page.tsx` - agregar entrada de importacion en tabs Balance/Resultados o bloque comun.
- `components/accounting/BalanceSheetForm.tsx` - ajustar si hace falta para recibir defaultValues desde import.
- `components/accounting/IncomeStatementForm.tsx` - ajustar si hace falta para recibir defaultValues desde import.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 5 — Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Pagina principal: `app/app/contador/productores/[producerId]/carpeta/page.tsx`.
- Forms existentes:
  - `components/accounting/BalanceSheetForm.tsx`
  - `components/accounting/IncomeStatementForm.tsx`
- Ambos forms ya tienen `defaultValues`.
- Mantener Resultado en forma vertical, uno debajo del otro.

Implementar:
1. En Balance, agregar accion "Cargar desde archivo" arriba del formulario manual.
2. En Resultados, agregar accion "Cargar desde archivo" arriba del formulario manual.
3. Si se sube `combined`, permitir usar el mismo import para completar ambos tabs.
4. Al aplicar, refrescar `getBalanceSheetsForPeriod` y/o `getIncomeStatementsForPeriod`.
5. Mantener la carga manual disponible.

No hacer:
- No crear un landing ni pantalla separada innecesaria.
- No volver a layout de dos columnas para Resultados.
- No ocultar los rubros del balance en acordeones.

Criterio de exito:
- Un contador puede subir archivo y revisar datos desde la carpeta del productor.
- La UI mantiene consistencia visual vertical.
- Si la IA falla, el usuario puede seguir cargando manualmente.
```

---

## Ola 6 - Validacion, documentacion y cierre
> Ejecutar SOLO despues de que Ola 5 este completa

### Agente A — QA tecnico y cierre de handoff
**Puede ejecutarse en paralelo con:** es el unico de esta ola.
**Depende de:** Ola 5 completa.

#### Objetivo
Validar el flujo completo, actualizar documentacion de proyecto y cerrar con commit/push.

#### Archivos a crear
- Opcional: `reports/006_PLAN_OCR_IA_EECC_RESULTADOS.md` si se necesita bitacora de ejecucion.

#### Archivos a modificar
- `reports/HANDOFF_ACTUAL.md` - registrar implementacion, validaciones y pendientes.
- `docs/MODULE_REGISTRY.md` o equivalente si existe en ese momento.

#### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/006_PLAN_OCR_IA_EECC.md`
Posicion:  Ola 6 — Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Contexto:
- Cierre obligatorio segun `CLAUDE.md`.
- Vercel despliega desde `master`.

Validar:
1. `pnpm type-check`
2. `pnpm check:security-shape`
3. Prueba manual local:
   - contador sube PDF/JPG/PNG mock.
   - contador sube Excel.
   - se crea import draft.
   - se ve preview editable.
   - se aplica a balance/resultados.
   - se refrescan tabs.
   - usuario sin permiso recibe 403.
4. Revisar que no queden secretos ni archivos temporales.
5. Actualizar `reports/HANDOFF_ACTUAL.md`.
6. `git status --short`
7. `git add` selectivo.
8. Commit y `git push origin master`.

No hacer:
- No hacer build pesado si la PC no lo soporta; si se omite, dejarlo documentado.
- No agregar archivos no relacionados que ya estaban sin trackear.

Criterio de exito:
- Flujo probado end-to-end con provider mock y parser Excel.
- Handoff actualizado.
- Commit pusheado.
```

---

## Checklist de cierre funcional

- El contador puede subir PDF/imagen/Excel desde la carpeta del productor.
- El sistema guarda el archivo fuente de forma privada.
- El sistema crea un borrador de importacion, no un balance final automatico.
- Balance muestra todos los rubros actuales, no solo titulares.
- Resultados mantiene lectura vertical: ventas, costos, resultado bruto, gastos, impuesto y resultado final.
- Cada campo prellenado muestra confianza o advertencia.
- El usuario puede corregir cualquier importe antes de aplicar.
- Al aplicar, se recalculan totales server-side.
- El documento fuente queda linkeado en `documentIds`.
- Hay audit log de extraccion y aplicacion.
- No hay acceso cross-tenant.
- `pnpm type-check` OK.
- `pnpm check:security-shape` OK.

---

## Riesgos y decisiones pendientes

- Provider IA real: definir proveedor y variables de entorno antes de produccion. El mock solo sirve para desarrollo.
- PDFs escaneados de baja calidad: requerir confianza baja y revision manual, no bloquear toda la carga.
- Comparativo Actual/Anterior: el PDF modelo trae dos columnas; el sistema actual guarda por periodo. Para dos columnas en una sola carga se necesita ampliar modelo con `previousDetails` o crear dos periodos/documentos.
- Costos IA: limitar tamano, paginas y reintentos por archivo.
- Seguridad: toda extraccion debe correr server-side; no exponer claves IA al browser.
