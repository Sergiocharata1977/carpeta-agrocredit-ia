# Plan Lanzamiento Seguro AgroCredit - Legajo Seguro, Reglas, Testing y Cifrado V1

**Fecha:** 2026-06-11  
**Feature:** Preparar AgroCredit para lanzamiento con aislamiento multi-tenant, reglas Firestore/Storage, auditoria, validacion de permisos, legajo financiero seguro y cifrado pragmatico de archivos fuente/adjuntos sensibles.  
**Proyecto afectado:** `Agro-Credit` (Next.js + Firebase + TypeScript)

---

## Decision ejecutiva

No esperar a que el producto este mucho mas maduro para la seguridad base. AgroCredit ya maneja datos financieros, balances, CUIT, documentos contables, vinculos con contadores y carpetas de credito. Antes de usar datos reales o abrir pilotos externos, debe existir una base fuerte de:

- reglas deny-by-default;
- aislamiento multi-tenant;
- validacion server-side de permisos;
- grants vencibles;
- auditoria;
- tests de aislamiento.

Si conviene esperar para la parte sofisticada: cifrado end-to-end completo, recuperacion avanzada de claves, rotacion automatica, KMS/escrow enterprise y politicas finas por entidad. Eso queda como V2/Enterprise.

Este plan reemplaza el enfoque original "cifrado completo ya" por un plan mas seguro de ejecucion, alineado al estado real del repo:

1. Primero cerrar decisiones de arquitectura y contratos.
2. Despues endurecer reglas, APIs y tests.
3. Luego agregar cifrado V1 sobre archivos fuente/adjuntos sin redisenar el balance estructurado.
4. Dejar E2EE/rotacion/key recovery para una fase posterior.

---

## Modelo real del producto

AgroCredit no funciona principalmente como un repositorio de PDFs. El balance principal vive como **datos estructurados** en Firestore:

- `balance_sheets`: `details`, `assetsTotal`, `liabilitiesTotal`, `equityTotal`, `periodId`, `documentIds`.
- `income_statements`: `details`, `sales`, `grossResult`, `netResult`, `documentIds`.
- `assets`, `liabilities`, `tax_documents`: datos cargados o importados en formularios.
- `documents`: metadata de archivos fuente o adjuntos en Storage.
- `financial_statement_imports`: borrador de importacion con resultados extraidos desde PDF/Excel antes de aplicar al balance real.

Por eso, la estrategia correcta para V1 no es "un balance PDF encriptado que solo abre el software". La estrategia correcta es:

> **Legajo financiero seguro:** el balance, resultados, patrimonio, impuestos y documentos se renderizan dentro de AgroCredit segun permisos, scopes, grants y auditoria.

El archivo fuente PDF/Excel puede cifrarse, pero el producto central es la vista controlada del legajo. Terceros no deberian recibir el balance como archivo libre por defecto; deberian verlo en AgroCredit, con acceso vencible y auditable.

---

## Alcance V1 vs V2

### V1 - Obligatorio antes de lanzamiento con datos reales

- Firestore/Storage deny-by-default.
- Validacion multi-tenant en reglas y en API Routes.
- No confiar en `organizationId`, `producerId` o `folderOwnerOrganizationId` enviados por cliente sin verificar membresia/grant server-side.
- Grants con `status`, `startsAt`, `expiresAt`, scopes y revocacion.
- Auditoria de acciones sensibles.
- Auditoria por seccion del legajo: balance visto, resultados vistos, patrimonio visto, documentos listados/descargados.
- Tests de aislamiento entre productores, contadores y financistas.
- Cifrado de archivos fuente/adjuntos sensibles en Storage con metadata clara.
- Legajo seguro: terceros ven informacion financiera en vistas controladas dentro de AgroCredit, no como export libre por defecto.
- Mantener ruta canonica de Storage existente.

### V2 / Enterprise - No bloquear lanzamiento inicial

- Cifrado end-to-end real donde el servidor nunca pueda ver plaintext.
- Cifrado granular de campos estructurados (`balance_sheets.details`, `income_statements.details`, bienes, deudas) si un cliente enterprise lo exige.
- Key recovery/escrow con KMS.
- Rotacion automatica de claves.
- Politicas por entidad financiera.
- Alertas de acceso sospechoso.
- Watermarking o marcas por usuario en descargas.
- Exportaciones PDF firmadas/watermarked.
- Retencion legal avanzada y borrado criptografico.

---

## Principios tecnicos corregidos

### Modelo de cifrado recomendado para V1

Para V1 se recomienda **legajo seguro + cifrado de aplicacion para archivos fuente/adjuntos**, no E2EE completo ni cifrado masivo de todos los campos Firestore.

Motivo:

- permite OCR, soporte, vistas previas y APIs de lectura;
- mantiene consultables los totales y resumentes del legajo (`assetsTotal`, `liabilitiesTotal`, `netResult`, etc.);
- reduce riesgo de perdida irrecuperable de documentos;
- es mas simple de validar antes de lanzamiento;
- permite evolucionar luego a KMS/escrow.

El servidor puede desencriptar archivos fuente/adjuntos solo despues de validar permisos y debe registrar auditoria. Esto no es E2EE; debe documentarse con ese nombre para evitar promesas incorrectas.

### Datos estructurados vs archivos

Separar dos superficies:

1. **Datos estructurados:** balance, resultados, bienes, deudas e impuestos. V1 los protege con permisos, scopes, grants, API server-side y auditoria. No cifrarlos campo por campo en V1 salvo ADR especifico.
2. **Archivos fuente/adjuntos:** PDF/Excel usados para OCR/importacion y documentos adjuntos. V1 puede cifrarlos en Storage y servirlos solo mediante endpoints autenticados.

Si en el futuro se cifra informacion estructurada, hacerlo de forma selectiva:

- mantener totales e indices operativos consultables;
- cifrar `details` granulares o campos especialmente sensibles;
- documentar que busquedas/reportes sobre campos cifrados requieren desencriptacion server-side o indices derivados.

### Algoritmo

No afirmar que `libsodium.crypto_secretbox_easy` es AES-256-GCM. No lo es.

Opciones aceptables:

- Usar libsodium con AEAD XChaCha20-Poly1305 o secretbox, nombrando correctamente el algoritmo.
- O usar WebCrypto/Node crypto con AES-256-GCM si se quiere especificamente AES-GCM.

Decision recomendada para este repo: definir en la Ola 0 si se usa:

- `xchacha20-poly1305` via libsodium; o
- `aes-256-gcm` via WebCrypto/Node crypto.

No programar servicio crypto hasta cerrar esta decision.

### Storage

Mantener ruta canonica actual documentada:

```text
orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}
```

No cambiar a `/orgs/{organizationId}/documents/{documentId}` salvo ADR explicito. El control de acceso vive en Firestore, reglas Storage y API Routes, no en el nombre del archivo.

### Auditoria

Los eventos de seguridad deben agregarse en `AuditAction`, no en `NotificationType`.

Eventos sugeridos:

- `document.encrypted`
- `document.decrypted`
- `document.downloaded`
- `document.decryption_failed`
- `credit_folder.section_viewed`
- `credit_folder.document_listed`
- `encryption_key.created`
- `encryption_key.revoked`

`NotificationType` solo debe usarse si hay una notificacion visible para usuarios.

### Tests

El repo usa Vitest. Los prompts y criterios deben hablar de `vitest`, `pnpm test` y helpers del proyecto, no Jest.

---

## Resumen de olas actualizado

| Ola | Objetivo | Paralelismo | Depende de | Prioridad |
|-----|----------|-------------|------------|-----------|
| 0 | ADR y contrato de seguridad/cifrado | No | Nada | Critica |
| 1 | Hardening multi-tenant, reglas y auditoria | Parcial | Ola 0 | Critica |
| 2 | Tests de aislamiento y permisos | Parcial | Ola 1 | Critica |
| 3 | Cifrado V1 de archivos fuente/adjuntos y legajo seguro | Parcial | Ola 0 y 1 | Alta |
| 4 | Checklist, docs y staging | Parcial | Olas 1-3 | Critica |
| 5 | V2 Enterprise opcional | No bloquear | Uso real/pilotos | Media |

---

## Ola 0 - ADR de seguridad y contrato tecnico

> Ejecutar antes de tocar codigo sensible. Esta ola evita implementar crypto o reglas sobre supuestos incorrectos.

### Agente A - ADR de seguridad y cifrado

**Depende de:** nada  
**Puede ejecutarse en paralelo con:** nadie

#### Objetivo

Crear una decision tecnica breve que fije el modelo de seguridad de V1: como se protege el legajo estructurado, que archivos se cifran, quien puede desencriptar, donde viven las claves, que algoritmo se usa, que queda fuera de alcance y como evoluciona a V2.

#### Archivos a crear

- `docs/ADR_SECURITY_ENCRYPTION.md`

#### Archivos a revisar

- `docs/SEGURIDAD_FIRESTORE.md`
- `docs/MODELO_DATOS.md`
- `lib/services/documents.ts`
- `types/audit.ts`
- `firestore.rules`
- `storage.rules`

#### Prompt para agente

```text
Contexto: AgroCredit es SaaS financiero multi-tenant. Antes de implementar cifrado o tocar reglas, definir el contrato de seguridad V1.

Tarea:
1. Crear docs/ADR_SECURITY_ENCRYPTION.md con:
   - Decision: V1 protege el balance como legajo estructurado seguro, no como PDF principal.
   - Decision: V1 usa cifrado de aplicacion para archivos fuente/adjuntos, no E2EE completo.
   - Aclarar que el servidor puede desencriptar archivos solo tras validar permisos.
   - Aclarar que `balance_sheets`, `income_statements`, `assets`, `liabilities` e `tax_documents` se protegen con permisos/grants/auditoria en V1.
   - Definir si se cifra algun campo estructurado en V1; recomendacion inicial: no cifrar masivamente `details`.
   - Elegir algoritmo real: xchacha20-poly1305/libsodium o aes-256-gcm/WebCrypto-Node.
   - Definir metadata minima de cifrado.
   - Definir ciclo de vida de claves V1.
   - Definir riesgos aceptados.
   - Definir que queda para V2/Enterprise: KMS, recovery, rotacion, E2EE, cifrado granular de campos.

2. Confirmar que la ruta canonica de Storage se mantiene:
   orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}

3. Definir eventos AuditAction:
   - document.encrypted
   - document.decrypted
   - document.downloaded
   - document.decryption_failed
   - credit_folder.section_viewed
   - credit_folder.document_listed
   - encryption_key.created
   - encryption_key.revoked

Constraints:
- No implementar codigo.
- No prometer E2EE si el servidor puede desencriptar.
- No nombrar AES-GCM si se usa libsodium secretbox.

Exito:
- ADR creado, claro y accionable.
- El resto de las olas puede implementarse sin discutir supuestos criptograficos.
```

---

## Ola 1 - Hardening multi-tenant, reglas y auditoria

> Esta ola si debe hacerse antes del lanzamiento con datos reales.

### Agente A - Tipos, schemas y auditoria

**Depende de:** Ola 0  
**Puede ejecutarse en paralelo con:** Agente B, despues de que exista el ADR

#### Objetivo

Agregar contratos TypeScript/Zod para metadata de cifrado y corregir auditoria segun el modelo real del repo.

#### Archivos a crear

- `types/encryption.ts`
- `lib/schemas/encryption.ts`

#### Archivos a modificar

- `types/audit.ts`
- Si corresponde, `types/index.ts`

#### Prompt para agente

```text
Contexto: El repo usa AuditAction en types/audit.ts. No agregar eventos de cifrado a NotificationType salvo que haya notificacion visible.

Tarea:
1. Crear types/encryption.ts con tipos alineados al ADR:
   - EncryptionAlgorithm = valor decidido en ADR.
   - EncryptionMetadata {
       keyId: string;
       algorithm: EncryptionAlgorithm;
       nonce: string;
       salt?: string;
       encryptedAt: string;
       version: 1;
     }
   - EncryptedDocumentPayload
   - EncryptedField
   - EncryptionKeyRecord

2. Crear lib/schemas/encryption.ts con Zod:
   - encryptionMetadataSchema
   - encryptedDocumentPayloadSchema
   - createEncryptionKeySchema

3. Actualizar types/audit.ts agregando a AuditAction:
   - document.encrypted
   - document.decrypted
   - document.downloaded
   - document.decryption_failed
   - credit_folder.section_viewed
   - credit_folder.document_listed
   - encryption_key.created
   - encryption_key.revoked

Constraints:
- No implementar cifrado.
- No tocar endpoints.
- No agregar eventos de seguridad a NotificationType.
- Mantener estilo de nombres existente del repo: acciones con punto, no snake_case.

Exito:
- pnpm type-check pasa.
- Los tipos son importables sin dependencias circulares.
```

### Agente B - Reglas Firestore/Storage y forma de acceso

**Depende de:** Ola 0  
**Puede ejecutarse en paralelo con:** Agente A

#### Objetivo

Endurecer reglas respetando el modelo de datos actual y la ruta canonica de Storage.

#### Archivos a modificar

- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json` si las queries reales lo requieren
- `docs/SEGURIDAD_FIRESTORE.md`

#### Prompt para agente

```text
Contexto: AgroCredit tiene colecciones top-level y ruta canonica de Storage:
orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}

Tarea:
1. Revisar firestore.rules actual antes de editar.
2. Confirmar deny-by-default.
3. Validar lectura/escritura para:
   - organizations
   - organization_members
   - producers
   - accounting_periods
   - balance_sheets
   - income_statements
   - tax_documents
   - assets
   - liabilities
   - documents
   - access_requests
   - access_grants
   - financing_requests
   - audit_logs
   - notifications

4. Reglas esperadas:
   - Productor ve su propia carpeta.
   - Contador ve/escribe solo si tiene link activo y permiso correspondiente.
   - Financista ve solo con grant activo, no vencido y scope suficiente.
   - audit_logs no se escriben desde cliente.
   - notifications solo por destinatario.

5. Storage:
   - Mantener ruta canonica.
   - Lectura solo owner, contador vinculado o financista con grant activo.
   - Escritura solo owner o contador habilitado.
   - Borrado solo owner o server-side si aplica.
   - No public read.

6. Documentar indices requeridos reales, no inventados.

Constraints:
- No cambiar la arquitectura de Storage sin ADR.
- No tocar UI.
- No confiar en datos editables por cliente si se pueden validar desde documentos canonicos.

Exito:
- Reglas compilan.
- Docs actualizadas con limitaciones de Firestore Rules.
- Lista de indices clara.
```

### Agente C - Revision API server-side de permisos

**Depende de:** Ola 0  
**Puede ejecutarse en paralelo con:** Agente A/B, con cuidado sobre archivos compartidos

#### Objetivo

Auditar y corregir endpoints que aceptan `organizationId`, `producerId` o `targetOrgId` desde cliente para asegurar validacion server-side.

#### Archivos a revisar

- `app/api/producer-profile/[orgId]/route.ts`
- `app/api/hub/credit-folders/[producerId]/route.ts`
- `app/api/folders/[targetOrgId]/readonly/route.ts`
- `app/api/folders/[targetOrgId]/documents/[docId]/download/route.ts`
- `app/api/access-grants/**`
- `app/api/financing-requests/**`
- `lib/auth/server-access.ts`
- `lib/auth/memberships.ts`
- `lib/auth/accounting-access.ts`

#### Prompt para agente

```text
Contexto: Firestore Rules son primera defensa, pero las API Routes con Admin SDK deben validar permisos siempre porque Admin SDK saltea reglas.

Tarea:
1. Revisar endpoints sensibles.
2. Detectar donde se confia en organizationId/producerId enviado por cliente.
3. Asegurar validacion con sesion, membresia activa, link activo o grant vigente.
4. Asegurar auditoria para lecturas sensibles del legajo:
   - carpeta vista;
   - seccion balance/resultados/patrimonio/impuestos/documentos vista;
   - documento listado o descargado.
5. Confirmar que el endpoint readonly devuelve solo los scopes autorizados y no filtra `storagePath`.
6. Mantener cambios acotados.

Constraints:
- No refactor masivo.
- No romper flujos existentes.
- No mover rutas.

Exito:
- pnpm type-check pasa.
- Endpoints sensibles no dependen solo de parametros del cliente.
```

---

## Ola 2 - Tests de aislamiento y permisos

> Esta ola valida que el producto no cruce tenants antes de lanzar.

### Agente A - Tests de seguridad con Vitest

**Depende de:** Ola 1  
**Puede ejecutarse en paralelo con:** Agente B

#### Archivos a crear

- `__tests__/security/multi-tenant-isolation.test.ts`
- `__tests__/security/access-grants.test.ts`

#### Prompt para agente

```text
Contexto: El repo usa Vitest, no Jest. Crear tests de seguridad rapidos y mantenibles.

Tarea:
1. Crear tests para:
   - Productor A no puede leer datos de Productor B.
   - Contador sin link activo no puede leer cliente.
   - Contador con link activo y permiso puede leer/escribir lo permitido.
   - Financista con grant activo puede leer scopes permitidos.
   - Financista con grant vencido/revocado no puede leer.
   - Financista con scope `accounting_summary` no recibe detalles completos si el endpoint separa resumen y detalle.
   - Financista sin scope `documents` no recibe listado de documentos.
   - audit_logs no son escribibles desde cliente.

2. Reutilizar helpers existentes si hay.
3. Si el emulador no esta integrado, crear tests unitarios de funciones de autorizacion y dejar checklist manual para rules emulator.

Constraints:
- Usar Vitest.
- No depender de Firebase prod.
- No usar datos reales.

Exito:
- pnpm test corre.
- Los tests cubren allow y deny.
```

### Agente B - Security shape check

**Depende de:** Ola 1  
**Puede ejecutarse en paralelo con:** Agente A

#### Archivos a revisar/modificar

- `scripts/check-security-shape.ts`
- `package.json`

#### Prompt para agente

```text
Contexto: El repo ya tiene script check:security-shape. Extenderlo si aporta valor.

Tarea:
1. Revisar scripts/check-security-shape.ts.
2. Agregar verificaciones livianas:
   - firestore.rules contiene deny-by-default.
   - storage.rules no permite public read.
   - AuditAction contiene eventos de documentos/acceso requeridos.
   - rutas criticas usan helpers server-side de acceso.
3. Mantenerlo rapido y deterministico.

Exito:
- pnpm check:security-shape pasa.
- pnpm test:smoke ejecuta type-check + security-shape + tests.
```

---

## Ola 3 - Cifrado V1 de archivos fuente/adjuntos y legajo seguro

> Ejecutar despues de Ola 0 y con Ola 1 estable. No bloquear hardening por cifrado avanzado.

### Agente A - Servicio de cifrado V1

**Depende de:** Ola 0 y tipos de Ola 1  
**Puede ejecutarse en paralelo con:** Agente B si no toca los mismos archivos

#### Archivos a crear

- `lib/services/encryption.ts`

#### Archivos a modificar

- `package.json` solo si se agrega dependencia
- `pnpm-lock.yaml` si se instala dependencia

#### Prompt para agente

```text
Contexto: Implementar cifrado V1 segun docs/ADR_SECURITY_ENCRYPTION.md. En V1 el balance aplicado vive como dato estructurado; el cifrado se concentra en archivos fuente/adjuntos de Storage. No afirmar AES-GCM si el ADR eligio libsodium secretbox/XChaCha.

Tarea:
1. Crear lib/services/encryption.ts con:
   - generateDataKey()
   - encryptBytes()
   - decryptBytes()
   - validateEncryptionMetadata()
   - helpers base64/base64url si hacen falta

2. Usar el algoritmo decidido en ADR.
3. Exportar funciones testables y puras donde sea posible.
4. No manejar password de usuario ni recovery en esta ola.
5. No guardar claves en localStorage.

Constraints:
- No redisenar onboarding.
- No implementar E2EE.
- No cifrar masivamente `balance_sheets.details` ni otros campos estructurados salvo que el ADR lo indique.
- No exponer claves privadas al cliente.

Exito:
- pnpm type-check pasa.
- Tests unitarios de encrypt/decrypt pasan.
```

### Agente B - Integracion en archivos fuente/adjuntos sin cambiar Storage path

**Depende de:** Ola 0, Ola 1, servicio de cifrado  
**Puede ejecutarse en paralelo con:** cuidado, probablemente secuencial despues del servicio

#### Archivos a modificar

- `lib/services/documents.ts`
- `components/documents/DocumentUploader.tsx`
- `app/api/accounting/statements/extract/route.ts`
- Rutas API de documentos existentes o nuevas si el repo las necesita
- `docs/MODELO_DATOS.md`

#### Prompt para agente

```text
Contexto: El repo ya tiene lib/services/documents.ts, DocumentUploader y flujo de importacion contable. El balance aplicado vive en `balance_sheets`; el archivo fuente PDF/Excel se sube en `app/api/accounting/statements/extract/route.ts` como `financial_statement_source`. Integrar cifrado V1 sin cambiar la ruta Storage canonica.

Tarea:
1. Revisar flujo actual de upload de documentos y de importacion contable.
2. Agregar encryptionMetadata al documento Firestore:
   - keyId
   - algorithm
   - nonce
   - salt si aplica
   - encryptedAt
   - version
3. Para `financial_statement_source` y documentos marcados sensibles, subir ciphertext a Storage. No dejar plaintext persistido.
4. Mantener fileName, fileSize, mimeType, producerId, organizationId, periodId y documentType.
5. Generar audit log document.encrypted.
6. Para lectura/descarga de archivos, validar permisos server-side antes de desencriptar.
7. Generar audit log document.decrypted o document.downloaded segun corresponda.
8. Mantener balance/resultados aplicados como datos estructurados; no convertir el balance aplicado en PDF cifrado.
9. Confirmar que los endpoints readonly del legajo no devuelven `storagePath` ni URLs directas.

Constraints:
- No cambiar ruta Storage sin ADR.
- No devolver claves al cliente.
- No enviar plaintext por endpoints no autenticados.
- No romper OCR/importacion: si el archivo se cifra antes de guardar, el OCR debe usar el buffer original en memoria o desencriptar server-side bajo permiso.
- Si el flujo actual no tiene API server-side de documentos, crear una integracion minima y documentar pendiente.

Exito:
- Upload/importacion de archivo fuente sensible guarda ciphertext.
- Metadata de cifrado queda en Firestore.
- Descarga/lectura de archivo valida permiso y audita.
- Legajo estructurado sigue funcionando para balance, resultados, patrimonio e impuestos.
- pnpm type-check pasa.
```

### Agente C - Legajo seguro y auditoria por seccion

**Depende de:** Ola 1  
**Puede ejecutarse en paralelo con:** Agente A/B si no toca los mismos endpoints

#### Archivos a modificar

- `app/api/folders/[targetOrgId]/readonly/route.ts`
- `components/folders/ReadonlyFolderView.tsx`
- `types/audit.ts`
- `docs/SECURITY.md` si ya existe

#### Prompt para agente

```text
Contexto: El valor principal de AgroCredit es el legajo financiero seguro. Terceros no deberian recibir un PDF libre por defecto; deben ver secciones dentro del software segun scopes.

Tarea:
1. Confirmar que el endpoint readonly devuelve solo datos permitidos por scope.
2. Separar claramente:
   - resumen contable;
   - balance completo;
   - resultados;
   - impuestos;
   - patrimonio;
   - documentos.
3. Agregar audit log por seccion sensible vista:
   - credit_folder.section_viewed con metadata { section, grantId, scopes }.
4. Para documentos:
   - no devolver `storagePath`;
   - no devolver URL directa;
   - usar endpoint de descarga firmado/controlado;
   - auditar listado y descarga.
5. Evaluar si conviene bloquear export/descarga de datos estructurados en V1 o dejarlo solo como future work.

Constraints:
- No cifrar datos estructurados en esta tarea.
- No romper la vista actual del productor.
- No exponer mas datos que los scopes autorizados.

Exito:
- La carpeta se comporta como visor seguro.
- Cada lectura sensible queda auditable.
- No hay filtracion de rutas Storage ni links publicos.
```

---

## Ola 4 - Checklist, documentacion y staging

### Agente A - Checklist pre-lanzamiento

**Depende de:** Olas 1-3 segun alcance decidido  
**Puede ejecutarse en paralelo con:** Agente B

#### Archivos a crear

- `SECURITY_PRE_LAUNCH_CHECKLIST.md`
- `docs/SECURITY.md`

#### Archivos a modificar

- `docs/MODULE_REGISTRY.md`
- `docs/QA_CHECKLIST.md`
- `docs/SEGURIDAD_FIRESTORE.md`

#### Prompt para agente

```text
Contexto: Crear checklist ejecutable para humano o IA antes de lanzamiento.

Tarea:
1. Crear SECURITY_PRE_LAUNCH_CHECKLIST.md con:
   - pnpm type-check
   - pnpm check:security-shape
   - pnpm test
   - firebase deploy --dry-run --only firestore:rules
   - firebase deploy --dry-run --only storage
   - pruebas manuales con dos productores, contador y financista
   - pruebas de grant activo/vencido/revocado
   - pruebas de legajo seguro por scopes: resumen, balance, resultados, patrimonio, documentos
   - pruebas de descarga de documento sensible
   - verificacion de audit_logs

2. Crear docs/SECURITY.md:
   - modelo de permisos;
   - modelo de legajo financiero seguro;
   - que protege Firestore Rules;
   - que protege API server-side;
   - modelo de cifrado V1 para archivos fuente/adjuntos;
   - por que el balance aplicado se protege como dato estructurado, no como archivo principal;
   - limitaciones;
   - respuesta ante incidente.

3. Actualizar MODULE_REGISTRY y QA_CHECKLIST.

Constraints:
- No decir que el producto tiene E2EE si no lo tiene.
- Cada item debe ser verificable.

Exito:
- Checklist claro y ejecutable.
- Documentacion coherente con el ADR.
```

### Agente B - Validacion staging

**Depende de:** Olas 1-4  
**Puede ejecutarse en paralelo con:** no, requiere implementacion lista

#### Prompt para agente

```text
Tarea:
1. Ejecutar:
   - pnpm type-check
   - pnpm check:security-shape
   - pnpm test
   - pnpm build si la maquina lo soporta
2. Validar reglas con dry-run.
3. Desplegar primero a staging/preview.
4. Crear usuarios QA:
   - productor A
   - productor B
   - contador
   - financista
5. Ejecutar checklist completo.
6. Documentar hallazgos y pendientes.

Exito:
- No hay acceso cross-tenant.
- Grants vencidos/revocados bloquean acceso.
- Auditoria registra acciones sensibles.
- No se sube plaintext persistido para archivos fuente/adjuntos sensibles si Ola 3 entra en alcance.
- El legajo estructurado muestra solo scopes autorizados.
```

---

## Ola 5 - V2 / Enterprise posterior

No bloquear el lanzamiento inicial con estos puntos salvo que haya un cliente enterprise que lo exija contractualmente.

Backlog recomendado:

- Integracion con Google Cloud KMS o proveedor equivalente.
- Key recovery/escrow.
- Rotacion de claves.
- Re-encryption jobs.
- E2EE opcional por organizacion.
- Cifrado selectivo de `balance_sheets.details`, `income_statements.details`, bienes/deudas o impuestos.
- Politicas por entidad financiera.
- Alertas de acceso anomalo.
- Retencion legal y borrado criptografico.
- Watermarking en documentos descargados.
- Exportaciones PDF del legajo con watermark por entidad/usuario/fecha.

---

## Criterios de cierre para lanzamiento seguro V1

El producto esta listo para piloto con datos reales solo si:

1. `pnpm type-check` pasa.
2. `pnpm check:security-shape` pasa.
3. `pnpm test` pasa o quedan explicitados tests manuales equivalentes.
4. Firestore Rules y Storage Rules validan en dry-run.
5. Productor A no puede ver datos de Productor B.
6. Contador sin link activo no puede ver documentos del productor.
7. Financista sin grant activo no puede ver carpeta ni documentos.
8. Grant vencido o revocado bloquea acceso.
9. Las API Routes sensibles validan permisos server-side.
10. `audit_logs` registra vistas de carpeta, secciones y descargas sensibles.
11. El endpoint de legajo no devuelve `storagePath` ni URLs directas.
12. Los archivos fuente/adjuntos sensibles se guardan cifrados si Ola 3 entra en alcance del lanzamiento.
13. `docs/SECURITY.md` y `SECURITY_PRE_LAUNCH_CHECKLIST.md` existen y reflejan la implementacion real.

---

## Timeline recomendado

### Camino prudente antes de piloto

- **Ola 0:** 0.5-1 dia.
- **Ola 1:** 2-4 dias.
- **Ola 2:** 1-2 dias.
- **Ola 4 parcial:** 0.5-1 dia.

Total: **4-8 dias** para una base de seguridad seria sin cifrado avanzado.

### Camino con cifrado V1 de archivos fuente incluido

- **Ola 3:** +3-5 dias.
- **Ola 4 completa/staging:** +1-2 dias.

Total: **8-15 dias** segun estado real de APIs, emuladores y flujo de documentos.

---

## Recomendacion final

Hacer ya la seguridad base: Ola 0, Ola 1, Ola 2 y checklist minimo de Ola 4.

Incluir Ola 3 antes del lanzamiento solo si:

- van a subir archivos fuente reales de clientes desde el dia uno;
- bancos/financieras externas van a acceder a carpetas reales;
- hay compromiso comercial o legal de cifrado de documentos;
- el equipo puede validar bien key management y recuperacion operativa.

Si el primer lanzamiento es demo/piloto controlado con datos no reales, se puede lanzar con hardening fuerte, legajo seguro por scopes y dejar cifrado V1 de archivos fuente como siguiente hito inmediato.

La promesa comercial recomendada para V1 es:

> "El balance no se comparte como archivo libre: se publica como legajo financiero seguro dentro de AgroCredit, con permisos, vencimiento y auditoria."
