# Handoff Actual - AgroCredit IA

**Fecha:** 2026-05-29  
**Proyecto:** `Agro-Credit` / `carpeta-agrocredit-ia`  
**Ruta local vigente:** `C:\Users\Usuario\Documents\Proyectos\carpeta-agrocredit-ia`  
**Repo remoto:** `https://github.com/Sergiocharata1977/carpeta-agrocredit-ia`  
**Vercel:** proyecto `agrocredit-hub`, dominio `carpeta-agrocredit-ia.vercel.app`  
**Stack:** Next.js App Router + Firebase + TypeScript  
**Estado real:** OCR/IA EECC e invitaciones por link implementados v1. Los planes MD 006 y 009 fueron eliminados a pedido del usuario.

---

## Actualizacion local Codex 2026-07-01

- Repo clonado en `C:\Users\Usuario\Documents\Proyectos\carpeta-agrocredit-ia` desde `https://github.com/Sergiocharata1977/carpeta-agrocredit-ia`.
- Proyecto Vercel identificado: `agrocredit-hub`; dominio publico: `carpeta-agrocredit-ia.vercel.app`.
- Dependencias instaladas con `pnpm install`.
- Validacion local: `pnpm type-check` OK.
- Nota de riesgo: Vercel aparece configurado con Node 24.x, pero `package.json` declara `node >=20 <23`; revisar antes del proximo deploy si vuelve a fallar build.

## Asistente lateral operativo Codex 2026-07-01

- Plan creado: `reports/018_PLAN_ASISTENTE_LATERAL_OPERATIVO.md`.
- Se reemplazo el modal `LegajoAssistantChat` por `components/credito-hub/LegajoAssistantPanel.tsx`, un panel lateral integrado estilo Platform 12 que empuja/contrae la pantalla del legajo.
- La pagina `app/app/contador/clientes/[clientId]/legajo/page.tsx` ya no muestra el bloque central viejo de carga IA; el chat concentra consulta, adjuntos, procesamiento y documentos sin asignar.
- El panel puede adjuntar PDF, imagen, Excel, Word y ZIP usando el intake existente (`app/api/credito-hub/intake`) y deja los archivos en `document_jobs` para procesamiento/revision.
- Se eliminaron los componentes sin uso `components/credito-hub/LegajoAssistantChat.tsx` y `components/credito-hub/CarpetaUploadSection.tsx`.
- Limite de seguridad vigente: el chat no aplica datos finales sin revision; la insercion en base contable/perfil sigue pasando por los flujos de revision/aplicacion con auditoria.
- Validacion: `pnpm type-check` OK.

---

## Fix deploy Vercel 2026-06-17 - pdf-to-img/canvas

Problema:
- Deploys en Vercel fallaban con `Module not found: Can't resolve '../build/Release/canvas.node'`.
- Import trace: `pdf-to-img` -> `canvas` -> `lib/ai/pdf-to-images.ts` -> providers IA -> rutas `credito-hub`.

Solucion:
- Se removio `pdf-to-img` de `package.json`/`pnpm-lock.yaml`.
- `lib/ai/pdf-to-images.ts` queda sin dependencias `canvas`: solo extrae texto nativo con `pdfjs-dist`.
- `XaiProvider` y `GroqProvider` ya no intentan rasterizar PDFs escaneados; devuelven advertencia y fuerzan revision manual/provider con PDF nativo.

Validacion:
- `pnpm type-check`: OK.
- `pnpm build`: OK, 72 paginas generadas, sin error `canvas`.

Pendiente funcional:
- Si se necesita vision sobre PDFs escaneados, usar Anthropic con bloque `document` nativo o mover rasterizacion a un worker externo compatible.

---

## Cierre 2026-06-03 - OCR/IA EECC e invitaciones por link

Implementado:

- OCR/IA EECC: upload PDF/imagen/Excel, provider Claude/mock/Excel, borrador `financial_statement_imports`, preview editable y apply server-side a `balance_sheets` / `income_statements`.
- Invitaciones por link: token hasheado, aprobacion, reemision segura de link, aceptacion publica, creacion/revocacion de `access_grant` y vista read-only server-side por scopes.
- Entidades solicitantes ya no leen colecciones contables directo por Firestore rules; pasan por `GET /api/folders/[targetOrgId]/readonly`.

Planes MD borrados:

- `reports/006_PLAN_OCR_IA_EECC.md`
- `reports/009_PLAN_INVITACIONES_ACCESO_POR_LINK.md`

Validacion:

- `npm run type-check`: OK.
- `npm run check:security-shape`: OK.

Pendientes operativos:

- Configurar `ANTHROPIC_API_KEY` en produccion.
- Desplegar `firestore.rules` y `storage.rules`.

---

## Lectura obligatoria al retomar

1. `reports/HANDOFF_ACTUAL.md`
2. `docs/MODULE_REGISTRY.md`
3. `reports/002_REORGANIZACION_BASE_DATOS.md`
4. `reports/003_PLAN_VISTAS_POR_ROL.md`
5. `reports/004_PLAN_ONBOARDING_Y_REGISTRO.md`
6. `CLAUDE.md` solo como referencia historica si contradice al codigo o a los planes nuevos.

Regla de continuidad: si hay conflicto entre documentacion vieja y codigo actual, confiar en el codigo y actualizar la documentacion.

---

## Modelo vigente

La arquitectura nueva unifica todo en `organizations`.

Tipos canonicos:

| Type | Uso |
|---|---|
| `system_user` | Usuario del sistema / cliente raiz. Reemplaza el nombre funcional "productor". |
| `system_user_entity` | Empresa hija del Usuario, con `parentOrganizationId`. |
| `accounting_firm` | Estudio contable. |
| `requesting_entity` | Banco, financiera, agro, maquinaria o insumos. |
| `platform` | Administracion de plataforma. |

Subtypes de `requesting_entity`:

- `bank`
- `financial_entity`
- `agro_company`
- `maquinaria_agricola`
- `insumos_agricolas`

Campos canonicos ya migrados en Ola 1:

- `producerId` -> `targetOrganizationId` en access/financing.
- `requestedExpirationDays` -> `requestedDays`.
- `expirationDays` -> `approvedDays`.
- `folderOwnerOrganizationId` como FK canonica de carpeta.

Claims legacy vigentes por compatibilidad:

- `producer` para Usuario del sistema.
- `bank_user` para cualquier `requesting_entity`.

---

## Estado del plan 004

### Ola 1 - Base de datos, tipos, schemas, APIs

Completada por agente anterior. No reimplementar.

Incluye:

- `types/auth.ts`, `types/access.ts`, `types/financing.ts`, `types/onboarding.ts`.
- `lib/schemas/access.ts`, `lib/schemas/financing.ts`, `lib/schemas/onboarding.ts`.
- `lib/firebase/collections.ts`.
- `lib/auth/server-access.ts`.
- `firestore.rules`, `firestore.indexes.json`.
- APIs de registro, onboarding, organizaciones hijas, access requests, grants y financing requests.
- Formularios base de access y financing usando `targetOrganizationId`.

### Ola 2 - Wizards de registro frontend

Implementada en esta sesion.

Rutas nuevas:

- `/registro`
- `/registro/usuario`
- `/registro/contador`
- `/registro/entidad`
- `/app/usuario` como alias temporal hacia `/app/productor` para no romper el acceso post-registro.

Componentes nuevos:

- `components/onboarding/RegistrationAccountStep.tsx`
- `components/onboarding/shared.tsx`
- `components/onboarding/usuario/SystemUserOnboardingWizard.tsx`
- `components/onboarding/usuario/SystemUserOrganizationForm.tsx`
- `components/onboarding/usuario/SystemUserEntitiesStep.tsx`
- `components/onboarding/usuario/AccountantSelectionStep.tsx`
- `components/onboarding/usuario/WizardSuccessUsuario.tsx`
- `components/onboarding/contador/AccountingFirmOnboardingWizard.tsx`
- `components/onboarding/contador/AccountingFirmForm.tsx`
- `components/onboarding/contador/WizardSuccessContador.tsx`
- `components/onboarding/entidad/RequestingEntityOnboardingWizard.tsx`
- `components/onboarding/entidad/RequestingEntityForm.tsx`
- `components/onboarding/entidad/SubtypeSelector.tsx`
- `components/onboarding/entidad/WizardSuccessEntidad.tsx`
- `components/contador/ClienteNuevoDialog.tsx`
- `components/contador/VinculoPendienteCard.tsx`
- `components/access/DurationPicker.tsx`

APIs nuevas/agregadas:

- `GET /api/organizations` para busqueda autenticada de organizaciones activas.
- `PATCH /api/producer-accountant-links/[linkId]` para aceptar/rechazar vinculos pendientes.

Otros cambios:

- `lib/firebase/auth-client.ts` agrega `getFreshIdToken()` para refrescar claims despues del onboarding.
- `types/producer.ts` acepta `systemUserOrganizationId` y status `rejected` en links.
- `components/access/AccessRequestForm.tsx` usa `DurationPicker`.
- `app/app/contador/productores/page.tsx` soporta `systemUserOrganizationId ?? producerId` y cambia textos visibles a Usuario.

### Ola 3 - Acceso temporizado y guard de carpeta (plan 004)

Pendiente. Se adelanto `DurationPicker` y su uso en `AccessRequestForm`, pero falta cerrar el resto.

Pendientes principales:

- `components/access/GrantScopeAndDurationForm.tsx`
- Ajustar `components/access/AuthorizationDecisionDialog.tsx` para mostrar dias solicitados, permitir `approvedDays` editable y fecha de vencimiento.
- `components/access/ScopeGuard.tsx`
- `components/access/GrantStatusBanner.tsx`
- `components/access/GrantExpiredBlocker.tsx`
- Vista de carpeta para entidad con guard por scope.
- Integrar `ClienteNuevoDialog` y `VinculoPendienteCard` en el dashboard real del contador.

---

## Cambios de esta sesion - Plan 007 Olas 3, 4 y 5

**Fecha:** 2026-06-01  
**Plan de referencia:** `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`  
**pnpm type-check:** OK

### Archivos modificados

- `app/api/organizations/[orgId]/entities/route.ts` — validacion de vinculo activo contador-cliente antes de listar/crear empresas hijas; campo `entityOwnersText` (titulares en texto libre) en GET y POST.
- `app/app/contador/productores/[producerId]/carpeta/page.tsx` — selector de entidad activa integrado; impuestos solo visibles cuando `activeEntityId === producerId` raiz; recarga de periodos, balance y resultados al cambiar entidad.
- `app/app/contador/productores/[producerId]/page.tsx` — formulario completo de perfil extendido (Ola 4).
- `app/app/contador/productores/[producerId]/documentos/page.tsx` — pagina de checklist documental (Ola 5).
- `lib/schemas/onboarding.ts` — ajustes de tipos para soportar `entityOwnersText`.
- `types/auth.ts` — campo `entityOwnersText` agregado al tipo `Organization`.
- `docs/MODULE_REGISTRY.md` — modulos `entity_selector`, `producer_profile_form` y `document_checklist` registrados como `ga`.
- `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md` — olas 3, 4 y 5 marcadas como implementadas.

### Archivos nuevos

- `components/producers/EntitySelector.tsx` — chips de entidad (declaracion personal / empresas hijas / + Empresa) con modal de alta y campo titulares.
- `components/producers/ProducerProfileForm.tsx` — formulario extendido en 4 secciones: fiscal, productivo, financiero estimado, patrimonial resumen. react-hook-form + zod.
- `components/producers/DocumentChecklist.tsx` — tabla de 7 tipos de documentos con estado presentado/pendiente/vencido, suba puntual via `DocumentUploader`. El formulario 931 solo aparece si `hasEmployees === true`.

### Estado del plan 007

| Ola | Estado |
|-----|--------|
| 1 | Implementada (sesion anterior) |
| 2 | Implementada (sesion anterior) |
| 3 | Implementada |
| 4 | Implementada |
| 5 | Implementada |

**Plan 007 completo.**

## Cambios de esta sesion — Plan 008 ABM Clientes y Empresas

**Fecha:** 2026-06-02  
**Plan de referencia:** `reports/008_PLAN_ABM_CLIENTES_EMPRESAS.md`  
**pnpm type-check:** OK — Commit: `50fbe87`

### Archivos nuevos

- `app/api/contador/empresas/route.ts` — GET empresas del estudio con batching Firestore.
- `app/app/contador/clientes/page.tsx` — lista de clientes.
- `app/app/contador/clientes/[clientId]/page.tsx` — datos personales + grid de empresas + dialog alta empresa.
- `app/app/contador/empresas/page.tsx` — lista de empresas con columna Cliente.
- `app/app/contador/empresas/[empresaId]/layout.tsx` — header + sub-nav empresa.
- `app/app/contador/empresas/[empresaId]/page.tsx` — redirect a /carpeta.
- `app/app/contador/empresas/[empresaId]/carpeta/page.tsx` — balance + resultados por período.
- `app/app/contador/empresas/[empresaId]/impuestos/page.tsx` — TaxGridForm por empresa.
- `app/app/contador/empresas/[empresaId]/bienes/page.tsx` — assets + pasivos por empresa.
- `components/empresas/EmpresaHeader.tsx` y `EmpresaSubNav.tsx`.
- `reports/008_PLAN_ABM_CLIENTES_EMPRESAS.md`.

### Archivos modificados

- `lib/services/assets.ts` — `getAssetsForOrganization`, `getAssetsByTypeForOrganization`.
- `lib/services/liabilities.ts` — `getLiabilitiesForOrganization`.
- `components/layout/AppSidebar.tsx` — "Clientes" + "Empresas" en lugar de "Productores"; "Nuevo Cliente".
- `app/app/contador/productores/page.tsx` — redirect a `/app/contador/clientes`.

### Estado del plan 008

| Ola | Estado |
|-----|--------|
| 1 (Backend) | Implementada |
| 2 (Frontend) | Implementada |
| 3 (Integración) | Implementada |

**Plan 008 completo.**

## Cambios de esta sesion - Fix deploy Vercel

**Fecha:** 2026-06-02  
**Motivo:** 5 deployments consecutivos en Vercel quedaban en `Error` antes de iniciar build.

Evidencia:

- `vercel inspect` mostraba el build `.` en `0ms`, sin logs de clone/install/build.
- La API de Vercel para el deployment `dpl_78DyvbauCMLNjhgM31f9Y7YThnkK` devolvio: `The vercel.json schema validation failed with the following message: should NOT have additional property toolbar`.
- Commit afectado: `58944e65790b0dea55b313b62f52833e7eb5474b`.

Cambios realizados:

- Se elimino `vercel.json`, que solo contenia la propiedad invalida `{ "toolbar": false }`.
- No se tocaron rutas, APIs, permisos, Firebase ni logica del ABM.

Validacion:

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `pnpm test`: OK (6 archivos, 93 tests).
- `pnpm build`: OK, 35 paginas generadas.

Pendiente:

- Luego del push, verificar en Vercel que el nuevo deployment pase de `Error` a `Building/Ready`.

## Cambios de esta sesion - Registro alineado a landing Motion

**Fecha:** 2026-06-02  
**Motivo:** La pantalla `/registro` no tenia el mismo lenguaje visual que la landing publica.

Cambios realizados:

- `app/registro/page.tsx` redisenada con el mismo sistema visual de `app/page.tsx`: header de marca, fondo radial claro, tipografia Inter, paleta verde/azul/dorado, cards limpias por rol y bloque de flujo conectado.
- Se agrego Motion en `/registro` para entrada escalonada del hero, cards por rol y hover animado.
- Las cards ahora linkean a los flujos reales `/registro/usuario`, `/registro/contador` y `/registro/entidad`, en vez de abrir un modal duplicado.

Validacion:

- `pnpm type-check`: OK.
- `pnpm build`: OK, 35 paginas generadas.

### Proximos pendientes

- Plan 004 Ola 3 (acceso temporizado): `ScopeGuard`, `GrantStatusBanner`, `GrantExpiredBlocker`, vista carpeta entidad con guard.
- Plan 005 Ola 4 (API de integracion): endpoint `/api/hub/*`, colecciones `integrations`, `api_keys`, `sync_logs`.
- Archivos sin trackear previos: `reports/005_ROADMAP_INTEGRATION_CORE.md`, `reports/stitch_agro_financial_credit_hub/`, `vercel.json`.

---

## Validacion de esta sesion

- `pnpm type-check` ejecutado el 2026-05-29: OK.
- `pnpm type-check` ejecutado el 2026-05-29 tras redisenar landing publica: OK.
- Verificacion visual con `agent-browser` en desktop y mobile sobre `http://127.0.0.1:3000`: pagina carga, contenido visible, sin overlay de Next ni errores de consola.

## Cambios de esta sesion - Landing publica

Archivo principal:

- `app/page.tsx`

Cambios realizados:

- Landing alineada al diseno provisto por el usuario con hero agricola, navegacion superior, propuesta de valor, flujo operativo, cards de ingreso, bloque de metricas y footer.
- Mensaje comercial actualizado para explicar que clientes y contadores cargan/envian la informacion a financistas con permisos trazables.
- Hero y propuesta de valor enfocados en evitar viajes de hasta 100 kilometros para entregar o actualizar documentacion.
- Accesos principales conectados a rutas existentes: `/registro`, `/registro/usuario`, `/registro/contador`, `/registro/entidad`, `/login` y `/app`.

Pendientes/riesgos:

- No se tocaron APIs, colecciones, permisos ni modulos privados.
- El dev server quedo levantado para prueba local en `http://127.0.0.1:3000`.

## Cambios de esta sesion - Menu de usuario tipo 9001

Archivos principales:

- `components/layout/AppUserMenu.tsx`
- `components/layout/AppHeader.tsx`
- `components/layout/AppSidebar.tsx`

Cambios realizados:

- Se agrego un menu de usuario arriba a la derecha del shell privado, similar al patron de `9001app-firebase` (solo referencia de diseno; Agro-Credit es standalone, sin conexion a ese proyecto): avatar circular con iniciales, dropdown de identidad, accesos rapidos y cierre de sesion.
- Se movio el cierre de sesion y la tarjeta de identidad fuera del sidebar para que todo lo relativo al usuario quede en el header.
- Se mantuvo el boton operativo del sidebar (`Nueva Solicitud`, `Nueva Carpeta`, etc.) y se cambio el chip superior a `Sesion activa`.

Validacion:

- `pnpm type-check`: OK.
- Browser sobre `/app`: redirecciona a `/login` sin overlay de Next ni errores de navegador cuando no hay sesion activa.

Pendientes/riesgos:

- No se tocaron APIs, permisos, roles ni colecciones Firestore.

---

## Cambios de esta sesion - Alta de Usuario desde Contador y paletas por rol

Archivos principales:

- `app/api/onboarding/system-user/route.ts`
- `app/api/contador/productores/route.ts`
- `app/app/contador/productores/page.tsx`
- `components/producers/NuevoProductorDialog.tsx`
- `components/layout/AppShell.tsx`
- `styles/globals.css`

Cambios realizados:

- El alta de un cliente desde el perfil Contador sigue usando `/api/onboarding/system-user?createdByAccountant=true`, pero ahora el backend deriva `accountingFirmId` desde la sesion validada y verifica membership activa del estudio contable.
- Para clientes creados por contador ya no se crea membership `producer` para el contador dentro de la organizacion del cliente.
- Se agrego `GET /api/contador/productores` con Admin SDK para listar/refrescar usuarios vinculados al estudio sin depender de lecturas Firestore desde el browser.
- `/app/contador/productores` ahora refresca contra esa API y captura errores en UI, evitando `FirebaseError: Missing or insufficient permissions` durante el refresh posterior al guardado.
- Se persiste `address` en el alta de system_user.
- Se agregaron paletas reales por rol en el shell privado: Productor, Contador/Estudio, Entidad solicitante y Admin. El tema se aplica tambien al `body` para cubrir dialogs/portals.
- `scripts/check-security-shape.ts` actualiza el marcador legacy `producerOrgId(resource.data.producerId)` al modelo vigente `targetOrganizationId` / `folderOwnerOrganizationId`.

Validacion:

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.

Pendientes/riesgos:

- No se ejecuto build completo local.
- Quedan archivos sin trackear previos a esta sesion: `reports/005_ROADMAP_INTEGRATION_CORE.md`, `reports/stitch_agro_financial_credit_hub/` y `vercel.json`.

---

## Cambios de esta sesion - Rubros de EECC en Balance y Resultados

Archivos principales:

- `lib/accounting/statement-fields.ts`
- `lib/schemas/accounting.ts`
- `types/accounting.ts`
- `components/accounting/BalanceSheetForm.tsx`
- `components/accounting/IncomeStatementForm.tsx`

Cambios realizados:

- `balance_sheets` mantiene los totales historicos (`assetsTotal`, `liabilitiesTotal`, `equityTotal`) y agrega `details` con rubros de Estado de Situacion Patrimonial.
- El formulario de Balance ahora permite cargar Activo corriente, Activo no corriente, Pasivo corriente, Pasivo no corriente y Patrimonio neto. Total activo y total pasivo se calculan automaticamente.
- Se conserva validacion visual de cuadre: Activo = Pasivo + Patrimonio neto.
- `income_statements` mantiene `sales`, `grossResult` y `netResult`, y agrega `details` con conceptos del Estado de Resultados.
- El formulario de Resultados calcula resultado bruto, resultado antes de impuesto, resultado ordinario, operaciones discontinuadas y ganancia/perdida del ejercicio.
- Queda respondida como proxima etapa posible la carga de PDF/imagen/Excel con IA/OCR para prellenar esos campos y revisar antes de guardar.

Validacion:

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `curl -I http://127.0.0.1:3000/app/contador/productores/test/carpeta`: 200 OK.

Pendientes/riesgos:

- No se implemento aun extraccion automatica desde archivos; requiere endpoint de upload + OCR/IA + pantalla de previsualizacion editable.
- El modelo comparativo `Actual/Anterior` del PDF queda representado por periodo seleccionado; si se quiere dos columnas en una misma carga, hay que agregar columna comparativa `previousDetails`.
- No se ejecuto build completo local.

---

## Cambios de esta sesion - Plan OCR/IA para carga de EECC por archivo

Archivos principales:

- Plan historico eliminado el 2026-06-03 a pedido del usuario.

Cambios realizados:

- Se analizo el flujo OCR existente en `9001app-firebase` (solo referencia historica de patron; Agro-Credit es standalone, sin conexion a ese proyecto): provider intercambiable, endpoint de extraccion de facturas, upload a Storage, borrador intermedio, preview editable y confirmacion separada.
- Se documento que el provider actual de 9001 es `MockOCRProvider`; la arquitectura es reutilizable, pero no hay motor OCR/IA productivo copiable tal cual.
- Se creo un plan multi-agente por olas para Agro-Credit con upload PDF/imagen/Excel, extraccion OCR/IA, mapper a rubros contables, previsualizacion editable y aplicacion manual a Balance/Resultados.
- El plan define la coleccion propuesta `financial_statement_imports`, endpoints server-side, validacion contador-cliente, reglas Firestore/Storage, componentes UI y cierre con validacion.

Validacion:

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.

Pendientes/riesgos:

- No se implemento aun el flujo OCR/IA; queda como plan ejecutable.
- Antes de produccion hay que definir provider IA real y variables de entorno. El mock solo sirve para desarrollo.
- La carga comparativa `Actual/Anterior` sigue como decision futura: el sistema actual guarda por periodo seleccionado.

---

## Cambios de esta sesion - Plan 007 Olas 1 y 2 perfil productor

Archivos principales:

- `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`
- `types/producer-profile.ts`
- `lib/schemas/producer-profile.ts`
- `lib/services/producer-profile.ts`
- `app/api/producer-profile/[orgId]/route.ts`
- `components/producers/ProducerHeader.tsx`
- `components/producers/ProducerSubNav.tsx`
- `app/app/contador/productores/[producerId]/layout.tsx`
- `app/app/contador/productores/[producerId]/page.tsx`
- `app/app/contador/productores/[producerId]/documentos/page.tsx`
- `app/app/contador/productores/[producerId]/carpeta/page.tsx`
- `app/app/contador/productores/[producerId]/bienes/page.tsx`
- `app/app/contador/productores/page.tsx`
- `docs/MODULE_REGISTRY.md`

Cambios realizados:

- Se ajusto el Plan 007 antes de implementar: el perfil extendido se opera via API server-side, no con escritura directa desde Firestore cliente.
- Se mantuvo la aclaracion de dominio M:N empresa-contribuyente: v1 usa `parentOrganizationId` como titular gestor principal y Ola 3 debe incluir campo libre "Titulares"; v2 queda para `entity_ownership`.
- Ola 1 implementada: tipos, schema Zod, servicio cliente via API y endpoint `GET/PATCH /api/producer-profile/[orgId]` con validacion de sesion, membership del estudio contable y link activo al usuario/productor raiz.
- Ola 2 implementada: layout compartido del productor, header, sub-navegacion, pagina raiz de perfil, ruta base de documentos y redireccion desde la lista de usuarios hacia el nuevo single.
- Se quitaron encabezados duplicados de Carpeta y Patrimonio para que usen el layout compartido.
- Se registro `producer_profile_extended` en `docs/MODULE_REGISTRY.md`.

Validacion:

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- Dev server local en `http://localhost:3000`: rutas `/app/contador/productores/test`, `/app/contador/productores/test/carpeta` y `/app/contador/productores/test/documentos` responden 200; `/api/producer-profile/test` sin token responde 401 esperado.

Pendientes/riesgos:

- Ola 3 pendiente: selector de entidad en carpeta, respetando empresas con varios titulares y contribuyentes externos.
- Ola 4 pendiente: formulario editable completo del perfil extendido.
- Ola 5 pendiente: checklist documental completo; la ruta base existe para que la sub-navegacion no rompa.
- Quedan archivos sin trackear previos: `reports/005_ROADMAP_INTEGRATION_CORE.md`, `reports/stitch_agro_financial_credit_hub/` y `vercel.json`.

---

## Cambios de esta sesion — Experiencia Productor + Dashboard Contador (Plan 011)

**Fecha:** 2026-06-10  
**Plan de referencia:** `reports/011_PENDIENTES_PRODUCTOR_CONTADOR.md`

### Archivos nuevos

- `app/api/producer-accountant-links/route.ts` — GET (productor consulta sus vinculos) + POST (solicita vinculo con estudio).
- `app/api/contador/vinculos-pendientes/route.ts` — GET de links pendientes para el estudio contable.
- `app/api/organizations/[orgId]/route.ts` — PATCH para que el titular actualice datos basicos de su organizacion.
- `app/app/productor/perfil/page.tsx` — formulario de completar perfil basico (legalName, CUIT, actividad, domicilio).
- `app/app/productor/contador/page.tsx` — busqueda de estudios y solicitud de vinculo.
- `reports/011_PENDIENTES_PRODUCTOR_CONTADOR.md` — este plan con pendientes documentados.

### Archivos modificados

- `app/app/productor/page.tsx` — cards corregidos hacia `/productor/perfil` y `/productor/contador`, tres pasos en orden, botones de accion rapida.
- `components/layout/AppSidebar.tsx` — productor ve: Mi Perfil + Mi Contador + Habilitaciones + Autorizaciones.
- `app/app/contador/page.tsx` — conteo real de clientes, seccion `VinculoPendienteCard` para solicitudes pendientes de productores.

### Reconciliacion Plan 004 Ola 3

Todos los items pendientes de la Ola 3 ya estan implementados (ver tabla en `reports/011_PENDIENTES_PRODUCTOR_CONTADOR.md`). Plan 004 completo.

### Pendientes operativos de esta sesion

- Perfil page lee el estado inicial via `/api/producer-profile/[orgId]`; conviene agregar `organization` basica en esa respuesta (ver pendiente #1 del plan 011).
- Notificacion al estudio cuando llega solicitud de vinculo (pendiente #3).
- `pnpm type-check` ejecutar al retomar.

---

## Riesgos y notas

- Cambio 2026-06-04: se reoriento el panel de Productor desde "solicitudes/financiacion" hacia "Habilitaciones de legajo". La accion central ahora es habilitar la visualizacion del legajo por cuenta del sistema, alcance y tiempo; link queda como via excepcional y QR queda pendiente. Archivos principales: `app/app/productor/page.tsx`, `app/app/productor/financiacion/page.tsx`, `components/access/ProducerLegajoHabilitationsPanel.tsx`, `app/api/access-grants/direct/route.ts`, `components/layout/AppSidebar.tsx`, `lib/services/access-grants.ts`. Validacion: `pnpm type-check` OK.
- Cambio 2026-06-04: se creo `reports/010_FUNCIONALIDADES_ROLES_ACTUALES.md`, documento solo texto con funcionalidades actuales e interacciones de Cliente/Productor, Contador, Financista/Entidad y Super Admin. Validacion: existencia del archivo y revision de estado Git; no se corrio build por ser cambio documental.
- Cambio 2026-06-04: `/api/auth/register` ahora, cuando recibe `role: "system_user"`, crea una organizacion minima `organizations.type = system_user`, membership activa, claims `roles: ["producer"]` y `defaultOrganizationId`. `/registro/usuario` inicia sesion al terminar y redirige a `/app`. Validacion: `pnpm type-check` OK. Riesgo operativo: cuentas de productor creadas antes de este cambio pueden haber quedado con `roles: []` y requieren reparacion/manual reset si ya existen en Firebase Auth.
- El proyecto aun conserva rutas y servicios con nombre `productor` por compatibilidad. En UI nueva usar "Usuario del sistema" o "Usuario"; no introducir nuevas superficies con el nombre funcional viejo.
- `/api/auth/setup-claims` todavia mantiene roles legacy en su schema. Los wizards no lo llaman directamente; las APIs de onboarding setean claims y el cliente refresca token.
- `ClienteNuevoDialog` usa `/api/onboarding/system-user?createdByAccountant=true`; revisar en Ola 3 si conviene ajustar el backend para que el contador no quede como miembro `producer` del cliente.
- Desplegar reglas e indices Firestore cuando se cierre la reorganizacion completa.

---

---

## Cambios de esta sesion — Plan 011 (fixes) + Plan 005 Ola 4 y 6 (Integration Core)

**Fecha:** 2026-06-10  
**pnpm type-check:** pendiente (ejecutar antes de retomar)

### Plan 011 — Fixes menores

**Plan 011-1 completado:** `GET /api/producer-profile/[orgId]` ahora retorna también `organization: { legalName, taxId, type, status }` junto al `profile`. Así el formulario de perfil puede precargar el nombre del productor sin una query adicional.

**Plan 011-2 completado:** cuando un productor hace `POST /api/producer-accountant-links` y el estudio existe y está activo, se crean notificaciones en `COLLECTIONS.NOTIFICATIONS` para cada miembro activo del estudio (query por `organizationId + status=active`). Tipo de notificación nuevo: `link_request_received` — agregado al tipo `NotificationType` en `types/audit.ts`.

### Plan 005 Ola 6 — API Keys

Archivos nuevos:
- `types/api-keys.ts` — tipos `ApiKey`, `ApiKeyPublic`, `ApiKeyScope`, constante `API_KEY_SCOPES`.
- `lib/schemas/api-keys.ts` — schema Zod `createApiKeySchema`.
- `lib/services/api-keys.ts` — generación de plaintext (`agro_` + 32 bytes hex), hash SHA-256, `createApiKey`, `validateApiKeyFromHeader`, `listApiKeys`, `revokeApiKey`, `toPublicApiKey`.

Colección nueva: `api_keys` agregada a `lib/firebase/collections.ts`.

### Plan 005 Ola 4 — Endpoints hub y admin

Archivos nuevos:
- `app/api/api-keys/route.ts` — `GET` (listar keys de la org) + `POST` (crear, devuelve plaintext una sola vez).
- `app/api/api-keys/[keyId]/route.ts` — `DELETE` (revocar). Valida que la key pertenezca a la org del caller, excepto admin_platform.
- `app/api/hub/producers/route.ts` — `GET`, autenticado por API key header `Bearer`. Para `accounting_firm`: lista productores con link activo; para otros: lista productores con grant activo no vencido. Genera audit log.
- `app/api/hub/credit-folders/[producerId]/route.ts` — `GET`, autenticado por API key. Verifica acceso (link activo o grant activo), devuelve datos básicos del productor + campos seleccionados del perfil. Genera audit log.
- `app/app/admin/api-keys/page.tsx` — panel admin para listar / crear / revocar API keys. Usa `RoleGate allowedRoles=["admin_platform"]`, `fetch` con `getIdToken()`, muestra plaintext en alerta amarilla una sola vez, formulario de selección de scopes.

### Archivos modificados

- `app/api/producer-profile/[orgId]/route.ts` — GET retorna `organization` básico.
- `app/api/producer-accountant-links/route.ts` — POST crea notificaciones batch para miembros del estudio.
- `types/audit.ts` — agrega `"link_request_received"` a `NotificationType`.
- `lib/firebase/collections.ts` — agrega `API_KEYS: "api_keys"`.
- `docs/MODULE_REGISTRY.md` — nuevos dominios `INTEGRATION CORE`, colección `api_keys` registrada.

### Pendientes operativos

- Ejecutar `pnpm type-check` y resolver si hay errores.
- Deploy de Firestore rules para habilitar lectura/escritura de `api_keys` solo por admin_platform server-side (las reglas actuales usan deny-by-default; los endpoints hub usan Admin SDK, no les afecta).
- Plan 005 Ola 5 (webhooks/eventos): pendiente.
- Plan 005 Ola 7 (SDK interno): pendiente.

---

## Cambios de esta sesion — Fix dashboard admin: listas vacias de clientes/entidades/organizaciones

**Fecha:** 2026-06-11  
**pnpm type-check:** OK (`npx tsc --noEmit` sin errores)

### Problema

Las pantallas del superadmin (Clientes, Entidades/Financistas, Organizaciones) leian `organizations` directo desde Firestore en el browser. Con reglas deny-by-default e indices compuestos faltantes, las queries fallaban en silencio y las listas quedaban con skeletons/"..." eternos.

### Cambios

- **Nuevo:** `app/api/admin/organizations/route.ts` — GET unico para superadmin via Admin SDK. Requiere rol `admin_platform`. Filtros por query params: `type`, `status`, `subtype`. Normaliza timestamps a ISO y ordena por `createdAt` desc en servidor (sin depender de indices compuestos).
- `app/app/admin/clientes/page.tsx` — migrada a `fetch /api/admin/organizations?type=system_user` con token; errores visibles en UI en lugar de falla silenciosa.
- `app/app/admin/entidades/page.tsx` — migrada a `fetch ?type=requesting_entity`; contadores por subtipo calculados client-side sobre la respuesta.
- `app/app/admin/organizaciones/page.tsx` — migrada al mismo endpoint sin filtro (vista consolidada).
- `app/api/admin/accounting-firms/route.ts` — ya no usa query compuesta `type + status + createdAt` (filtra/ordena en memoria) para no depender de indices; tipado del map corregido.
- `app/app/admin/estudios/page.tsx` — filtro inicial cambiado de `pending_approval` a `all` para que el superadmin vea la lista completa al entrar.

### Resultado

Todo el panel superadmin lee via API server-side con Admin SDK y validacion de rol; ninguna pantalla admin depende de lecturas Firestore del browser.

---

## Cambios de esta sesion — Carpeta vacia no habilita legajo + vista Mi Carpeta del titular

**Fecha:** 2026-06-11  
**pnpm type-check:** OK

### Regla de negocio nueva: no se puede habilitar un legajo vacio

- **Nuevo:** `lib/firebase/folder-data.ts` — `getFolderDataStatus(db, orgId)` verifica si hay datos en balance_sheets, income_statements, tax_documents, assets, liabilities y documents (queries `limit(1)` sin orderBy, sin depender de indices).
- `POST /api/access-grants/direct` — rechaza con 409 si la carpeta no tiene informacion cargada.
- `POST /api/access-invitations` — mismo bloqueo para links excepcionales.
- **Nuevo:** `GET /api/folders/[targetOrgId]/status` — estado liviano `{ hasData, sections }` para titular, contador o admin.
- `ProducerLegajoHabilitationsPanel` — deshabilita el boton "Habilitar legajo" y muestra aviso ambar cuando la carpeta esta vacia.

### El titular ve su propia carpeta

- `GET /api/folders/[targetOrgId]/readonly` — ahora el productor titular (defaultOrganizationId == targetOrgId) accede con grant sintetico full-scope, igual que admin. Tambien habilitado el download de documentos propio (audit log `document.downloaded_by_owner`).
- **Nuevo:** `components/folders/ReadonlyFolderView.tsx` — vista de carpeta extraida de la pagina de entidad, con prop `ownerView` (sin banner de grant, con aviso "asi ven tu legajo las cuentas habilitadas" y empty-state si no hay datos).
- **Nuevo:** `app/app/productor/carpeta/page.tsx` — pagina "Mi Carpeta" del productor usando la vista compartida.
- `app/app/entidad/carpetas/[targetOrgId]/page.tsx` — reducida a wrapper de `ReadonlyFolderView` (sin cambio funcional).
- `components/layout/AppSidebar.tsx` — item "Mi Carpeta" en el menu del productor.

---

## Plan 012: Lanzamiento Seguro con Aislamiento Multi-Tenant y Cifrado V1

**Fecha creación:** 2026-06-11  
**Archivo:** `reports/012_PLAN_LANZAMIENTO_SEGURO_ENCRIPTACION.md`  
**Estado:** Documento de arquitectura + olas ejecutables  
**Bloqueante:** Ola 0 (ADR de seguridad) debe cerrarse antes de codificar Ola 1

### Decisiones clave establecidas

1. **V1 es "Legajo Seguro", no "E2EE Puro"**
   - Balance sheet vive como dato estructurado en Firestore (`balance_sheets.details`) — NO se cifra masivamente
   - Archivos fuente (PDF, Excel) en Storage SÍ se cifran (son los candidatos reales)
   - AgroCredit puede desencriptar tras validar permisos, pero queda auditado
   - Promesa comercial: "tus datos están privados dentro del legajo, acceso auditado a nivel sección"

2. **Alcance V1 vs V2**
   - **V1 (Obligatorio para lanzamiento):** deny-by-default, aislamiento multi-tenant, grants con vencimiento, auditoría por sección, cifrado de archivos fuente
   - **V2 (Post-lanzamiento/Enterprise):** E2EE completo, KMS, key recovery, rotación automatizada

3. **Auditoría granular por sección del legajo**
   - No solo "document_encrypted/decrypted"; también "balance_sheet.viewed", "income_statement.viewed by scope"
   - Productor ve: "Contador X vio Balance el [fecha], Financista Y vio solo Ingresos el [fecha]"
   - Validación de scopes server-side: financista con `income_statements` no puede leer `assets`

4. **Storage y API**
   - Mantener ruta canónica: `orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}`
   - API NO devuelve `storagePath` (encriptación queda oculta en metadata)
   - Endpoint valida scope + no devuelve campos fuera del scope autorizado

### Olas del Plan 012

| Ola | Objetivo | Tiempo | Bloqueante |
|-----|----------|--------|-----------|
| 0 | ADR: elegir algoritmo (libsodium vs WebCrypto), definir ciclo de claves V1 | 2-3 días | Sí — antes de cualquier código |
| 1 | Tipos, schemas, reglas Firestore/Storage, auditoría | 3-4 días | Ola 0 |
| 2 | Tests de aislamiento multi-tenant y permisos | 3-4 días | Ola 1 |
| 3 | Cifrado V1 de archivos fuente + validación scopes en APIs | 4-5 días | Ola 1 |
| 4 | Checklist pre-deploy, docs, staging validation | 2-3 días | Ola 3 |
| **Total** | | **14-19 días** | |

### Cambios respecto al enfoque original

- ✅ **Más realista:** V1 ahora cabe en 2-3 sprints (antes era 10-12 semanas)
- ✅ **Menos cifraje indiscriminado:** solo archivos fuente, no todos los datos estructurados
- ✅ **Promesa honesta:** "auditable" en lugar de "nadie nos ve"
- ✅ **Auditoría útil:** por sección, no solo por evento cripto
- ✅ **OCR/IA sigue funcionando:** no necesita desencriptar en cliente

### Pendientes operativos antes de Ola 1

- [ ] Cerrar ADR (Ola 0): ¿libsodium.js (XChaCha20-Poly1305) o WebCrypto (AES-256-GCM)?
- [ ] Crear `docs/ADR_SECURITY_ENCRYPTION.md` con el modelo de claves V1
- [ ] Crear `docs/PRIVACY_MODEL.md` para explicar a contadores/financistas qué ven y qué no
- [ ] Verificar que `types/audit.ts` tiene `AuditAction` actualizado con eventos por sección

---

## Cambios de esta sesion - Lista de contadores en dos formatos + single del estudio

**Fecha:** 2026-06-11
**pnpm type-check:** OK

### Lista de Estudios Contables (admin)

- `app/app/admin/estudios/page.tsx` - toggle de vista Lista / Tarjetas; ambos formatos 100% clickeables (toda la fila/tarjeta navega al single); avatar con foto o iniciales; muestra ciudad/provincia y matricula. Botones Habilitar/Rechazar con stopPropagation.

### Single del estudio contable

- **Nuevo:** `app/app/admin/estudios/[firmId]/page.tsx` - header con foto/iniciales, estado y acciones habilitar/rechazar/reactivar; cards de datos (contacto, telefono, direccion, ciudad/provincia, matricula, consejo profesional); formulario de edicion inline para admin.
- **Nuevo:** `GET/PATCH /api/admin/accounting-firms/[orgId]` - detalle y edicion del estudio (solo admin_platform). Valida server-side que el consejo profesional coincida con la provincia.

### Campos nuevos del contador

- `types/auth.ts` - `Organization` agrega `photoUrl`, `licenseNumber`, `professionalCouncil` (solo accounting_firm).
- **Nuevo:** `lib/constants/provinces.ts` - `AR_PROVINCES` (24 jurisdicciones) y `councilLabel()`. El consejo profesional se autocompleta al elegir provincia y siempre debe coincidir.

### Pendientes de este modulo

- Foto: v1 es URL de imagen; falta upload real a Storage.
- Capturar matricula/consejo/direccion en el wizard de registro del contador (hoy solo se editan desde el single admin).

---

## Cambios de esta sesion - Reset total de datos + auditoria rigurosa

**Fecha:** 2026-06-11
**pnpm type-check:** OK

### Reset de datos (confirmado por el usuario)

El usuario habia borrado `organizations` desde la consola pero quedaron restos. Con su confirmacion explicita se completo el reset:

- Firestore: borradas todas las colecciones restantes (`users`, `organization_members`, `producer_accountant_links`, `accounting_periods`, `audit_logs`, `notifications`) via `firebase firestore:delete --all-collections`.
- Firebase Auth: borrados los 8 usuarios via `accounts:batchDelete`. **Verificado: Auth 0 usuarios, Firestore 0 docs, Storage 0 archivos.**
- Para volver a operar: recrear el super admin via `/admin-setup` (bootstrap con clave de configuracion) y re-registrar cuentas de prueba.

### Auditoria mas rigurosa

- `lib/firebase/audit.ts` - `writeAuditLog` ahora captura **IP y user-agent automaticamente** desde los headers del request (`x-forwarded-for` / `x-real-ip` / `user-agent`) sin tocar las 41 llamadas existentes. Fuera de un request quedan en null.
- `types/audit.ts` - `AuditLog` agrega `ip` y `userAgent`.
- **Nuevo:** `GET /api/admin/audit-logs` - lista real via Admin SDK (solo admin_platform), limit configurable hasta 500, filtros `action`/`actorUid`, y enriquecimiento con email/nombre del actor desde `users`.
- `app/app/admin/auditoria/page.tsx` - ya no lee Firestore desde el browser; usa la API admin. Columna IP muestra el dato real capturado (user-agent en tooltip).

### Pendientes de auditoria (proxima iteracion)

- Filtros funcionales en la UI (boton Filtrar es decorativo) y export CSV real.
- Metricas de "Alertas criticas" y "Estado del sistema" siguen estaticas.
- `lib/services/audit-logs.ts` (lectura client-side) queda solo para la vista de productor; migrarla a API tambien.

---

## Cambios de esta sesion - Alta de empresas desde perfil contador

**Fecha:** 2026-06-12
**pnpm type-check:** OK

### Fix aplicado

- `app/app/contador/clientes/[clientId]/page.tsx` - el modal "Nueva empresa" ahora normaliza CUIT a solo numeros, limita a 11 digitos y muestra ayuda inline si se ingreso un DNI/incompleto.
- `components/producers/EntitySelector.tsx` - mismo ajuste para el alta de empresas desde la carpeta del cliente.
- Ambos flujos muestran el primer mensaje real de validacion Zod de la API si el backend rechaza el POST.

### Validacion

- `pnpm type-check`: OK.
- Dev server local sobre `/login` y `/app/contador/clientes/test`: HTTP 200.
- `agent-browser snapshot -i` en `/login`: renderiza campos de email/contrasena y boton de ingreso; `agent-browser errors`: sin errores.

### Nota operativa

- Para guardar empresas hijas el CUIT debe tener 11 digitos sin guiones. Un DNI de 8 digitos no pasa la validacion.

---

## Cierre obligatorio para proximas sesiones

## Cambios de esta sesion - CreditoHub IA Ola 0, 1 y 2

**Fecha:** 2026-06-16
**Commits locales previos al cierre:**
- `cb69e88` - `feat(credito-hub): Ola 0+1 - plan v2, capa IA multiproveedor, modelo de datos canonico y docs`
- `fdb64b2` - `feat(credito-hub): Ola 2 - cola con lease, clasificador IA y extractores con procedencia`

### Implementado

- Ola 0/1: plan v2 en `reports/014_PLAN_CREDITO_HUB_IA.md`, docs en `docs/credito-hub/`, capa IA multiproveedor `lib/ai/*`, schemas y tipos de CreditoHub, variables xAI en `.env.example`, colecciones nuevas en `lib/firebase/collections.ts` y acciones de auditoria.
- Ola 2: cola documental con lease e idempotencia (`lib/services/document-jobs.ts`), clasificador IA (`lib/ai/classification/document-classifier.ts`), servicios de clasificacion/campos/perfil canonico y extractores con procedencia (`lib/ai/extraction/extractors.ts`).
- Tests agregados para provider, schemas, cola, clasificador y extractores bajo `__tests__/credito-hub/`.
- `docs/MODULE_REGISTRY.md` actualizado con dominio `CREDITO HUB IA` y colecciones canonicas nuevas.

### Pendientes

- Ejecutar Ola 3: APIs de intake masivo, worker `/api/credito-hub/jobs/process`, API de jobs, motor de requisitos bancarios, matching y endpoints de revision profesional.
- Mantener regla de seguridad: ninguna API nueva debe tomar `organizationId` desde body editable; derivar siempre desde sesion, membership, link o grant.
- Antes de usar documentos reales sensibles, coordinar con Plan 012 de cifrado V1 de archivos fuente.

### Validacion de cierre

- Control simple: tests puntuales de CreditoHub a ejecutar antes del push.

## Cambios de esta sesion - Auditoria limpieza control tecnico Legajo

Se aplico el prompt de auditoria de seguridad, deuda tecnica y limpieza segura a Agro-Credit con nombre comercial **Legajo**.

Archivos modificados:
- `app/api/auth/setup-claims/route.ts` — se bloqueo la reasignacion de claims por usuarios no-admin y se exige coincidencia entre rol solicitado y membership activa.
- `app/api/hub/producers/route.ts` — se corrigieron campos canonicos de grants (`grantedToOrganizationId`, `targetOrganizationId`).
- `app/api/hub/credit-folders/[producerId]/route.ts` — se corrigieron campos canonicos de grants para validar acceso a carpeta.
- `CLAUDE.md` — se agrego regla anti-recaida para no abrir datos de legajo por rol en Firestore/Storage.
- `reports/013_AUDITORIA_LIMPIEZA_CONTROL_TECNICO_LEGAJO.md` — entregable de auditoria, metricas y pendientes.

Validacion:
- `pnpm exec tsx scripts/check-security-shape.ts` OK.
- `pnpm exec tsc --noEmit --pretty false` quedo sin resultado por timeout a 5 minutos.

Pendientes P1:
- Migrar CRUD cliente de carpeta/documentos a APIs server-side antes de endurecer `firestore.rules` y `storage.rules`.
- Agregar tests negativos para `/api/auth/setup-claims` y tests de hub con grant vigente/vencido.

1. Ejecutar `pnpm type-check`.
2. Actualizar este handoff y `docs/MODULE_REGISTRY.md` si cambia una ruta, API, coleccion o modulo.
3. Hacer `git status --short` y `git diff --stat`.
4. Git add selectivo + commit.

---

## Cambios de esta sesion - Cierre completo Plan 014 CreditoHub IA

**Fecha:** 2026-06-16

### Implementado en esta pasada

- Ola 3: APIs `app/api/credito-hub/intake`, `jobs`, `jobs/process`, `review/*`, `canonical-profile/*`, `bank-requirements/*`, `credit-applications`.
- Ola 3: servicios `lib/services/bank-requirements.ts`, `credit-applications.ts`, `requirement-matching.ts` y parser `lib/ai/bank-requirements/parser.ts`.
- Ola 4: componentes `components/credito-hub/MassUploadDropzone.tsx`, `JobProgressList.tsx`, `ReviewWorkbench.tsx`, `FieldReviewRow.tsx`, `RequirementBuilder.tsx`, `ComplianceMatrix.tsx`.
- Ola 4: rutas UI `/app/contador/productores/[producerId]/legajo`, `/revision`, `/app/entidad/requisitos`, `/app/entidad/carpetas/[targetOrgId]/cumplimiento`.
- Navegacion: `ProducerSubNav` agrega Legajo IA/Revision y `AppSidebar` agrega Requisitos para entidad.
- Ola 5: `docs/MODULE_REGISTRY.md` y `reports/014_PLAN_CREDITO_HUB_IA.md` actualizados con cierre completo.

### Validacion

- `pnpm type-check`: OK.

### Pendientes post-MVP

- Prueba funcional con Firebase/Storage reales y `CREDITO_HUB_ALLOW_REAL_DATA=true` solo luego de cerrar cifrado V1 real de archivos fuente.
- Generacion de expediente bancario final y tipos documentales adicionales.

---

## Revision de seguridad post-cierre (2026-06-17)

Revision manual de las rutas de CreditoHub (los tests de aislamiento de Ola 5 no se habian escrito). Se detectaron y corrigieron 3 brechas de autorizacion:

1. **`bank-requirements/[templateId]/match` — sin autorizacion (ALTA).** Cualquier sesion activa podia correr el matching de una `creditApplicationId` ajena y leer evidencias del legajo del cliente. Fix: la ruta carga la solicitud y exige admin / entidad solicitante con grant vigente / gestor del legajo.
2. **`bank-requirements` (GET/POST) — solo chequeaba rol (MEDIA).** Una entidad podia leer/crear/publicar templates de otra org pasando otro `requestingEntityOrganizationId`. Fix: para no-admin la org se liga a la sesion (`resolveEntityOrg`) y `publish` verifica pertenencia del template.
3. **`credit-applications` POST — `requestingEntityOrganizationId` desde el body (MEDIA).** Una entidad financiera podia atribuir la solicitud a otra entidad. Fix: para entidad no-admin se fuerza la org de la sesion.

Adicional: se extrajo `assertEntityGrant` a `lib/auth/entity-grant.ts` (compartido por match y credit-applications) y se agregaron tests de aislamiento `__tests__/security/credito-hub-isolation.test.ts` (12 casos allow/deny).

### Validacion post-fix

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `pnpm test`: OK — 7 archivos, 105 tests.

---

## Alta de carpeta con IA + checklist de frontend (2026-06-17)

### Alta desde constancia AFIP (commit `e95f1b4`)

El alta de carpeta (`NuevoProductorDialog`) ahora ofrece DOS opciones: cargar a mano o subir la constancia de AFIP para que la IA prellene el formulario. El humano revisa y confirma al Guardar.

- `lib/ai/extraction/afip-prefill.ts`: lee la constancia y propone campos (deriva `personType` del prefijo de CUIT, mapea actividad al enum agro). Avisa si corre en modo mock.
- `app/api/credito-hub/afip-prefill/route.ts`: parse-only (no persiste), auth `accountant`/`accounting_firm_admin`/`admin_platform`.
- `ProducerForm`: prop `prefillValues` repuebla sin pisar lo tipeado.

### Checklist de verificación

`reports/015_CHECKLIST_VERIFICACION_FRONTEND.md` — verificación pantalla por pantalla de todos los flujos. Bloqueantes detectados: (1) falta cron del worker `jobs/process` en `vercel.json`; (2) falta link de navegación a "Cumplimiento". Mejoras UX pendientes: visor de documento en Revisión, requisitos editables, selector de template en la matriz.

---

## Selector de proveedor IA (Groq + Anthropic) en super admin (2026-06-17)

Pedido del dueño: dos IA opcionales seleccionables y comparables desde config de super admin (Groq para probar primero, Anthropic después). Plan Vercel Hobby.

### Implementado

- **GroqProvider** (`lib/ai/GroqProvider.ts`): clon OpenAI-compatible de XaiProvider con baseURL Groq, resolución de modelo con visión (default `meta-llama/llama-4-scout-17b-16e-instruct`) y `__resetGroqModelCache` para tests.
- **Factory** (`lib/ai/index.ts`): `AI_PROVIDER_NAMES`, `hasProviderKey`, `createProvider(name)`. `getAIProvider()` sigue sync por env (compat tests). Soporta `groq | anthropic | xai`.
- **Config en runtime** (`lib/ai/provider-config.ts`): doc `platform_settings/ai` vía Admin SDK con cache ~15s. `resolveAIProvider()` usa la config y cae al env `AI_PROVIDER`; si falta la key, Mock. Los 4 callers del pipeline (extractors, classifier, parser, afip-prefill) ahora usan `await resolveAIProvider()`.
- **API admin**: `GET/PATCH /api/admin/ai-config` (estado + cambiar proveedor activo, audita `ai_provider.changed`) y `POST /api/admin/ai-config/test` (ping `complete()` por proveedor con key, mide latencia → comparar).
- **UI**: `/app/admin/ia` (RoleGate admin_platform): cards por proveedor con disponibilidad de key, activar con click, "Probar y comparar". Sidebar admin: items **IA** y **API Keys**.
- Colección `platform_settings` en `collections.ts`; acción `ai_provider.changed` en `types/audit.ts`; `.env.example` con `GROQ_*` y `AI_PROVIDER=groq`.
- Tests nuevos: `__tests__/credito-hub/groq-provider.test.ts` (8 casos). Mocks de extractors/classifier migrados a `@/lib/ai/provider-config`.

### Validación

- `pnpm type-check`: OK.
- `pnpm test`: OK — 8 archivos, 113 tests.

### PENDIENTE — decisión del dueño (bloquea correr en local)

- `.env.local` creado con las keys de IA (Groq + Anthropic) y `AI_PROVIDER=groq`, pero el **bloque Firebase quedó como placeholder**. Usar el Firebase de `agro-biciuffa` contradice la regla STANDALONE de `CLAUDE.md` (acopla auth+datos de las dos apps); además el clasificador del harness bloqueó leer los `.env.local` de los proyectos vecinos por la misma razón. Falta que el dueño confirme: (A) reusar agro-biciuffa solo en local, o (B) proyecto Firebase dedicado a Agro-Credit. Recién con eso el `pnpm dev` arranca.
- En prod (Vercel): cargar `GROQ_API_KEY` / `ANTHROPIC_API_KEY` en env vars. Sin key, el proveedor cae a Mock (modo demo).
- `platform_settings` queda deny-by-default en Firestore (se opera solo por Admin SDK); no requiere regla nueva.

### Firebase dedicado conectado (2026-06-17)

- Resuelto: Agro-Credit usa su **proyecto Firebase propio y aislado `agrocredit-ia-saas`** (no agro-biciuffa). `.firebaserc` ya apuntaba ahí. Config cliente obtenida por `firebase apps:sdkconfig WEB` y Admin SDK cableado con service account del dueño. **Verificado**: Admin SDK conecta (lee `organizations` y Auth). `.gitignore` endurecido para bloquear `*adminsdk*.json` / `*service-account*.json`.
- Vercel (`agrocredit-hub`): `AI_PROVIDER=groq` y `GROQ_API_KEY` agregadas a Production y Development por CLI (la `ANTHROPIC_API_KEY` y las 9 de Firebase ya estaban). **Preview pendiente** (bug del CLI 50.23.2 con ramas; queda para dashboard o por rama). Falta redeploy para que tomen efecto.

---

## Alta de entidades por admin + sistema documental en reports (2026-06-17)

### Alta de entidades financieras desde el super admin

El dueño necesita administrar entidades (bancos/financieras/agro) desde el panel. Antes `/app/admin/entidades` solo listaba.

- **Nuevo** `app/api/admin/entities/route.ts` (POST): crea una `requesting_entity` (status `active`) sin crear usuario, sin membership y **sin tocar los claims del admin** (a diferencia de `/api/onboarding/requesting-entity`, que convierte al caller en `bank_user`). Solo `admin_platform`. Audita `organization.requesting_entity_created`.
- **Nuevo** `components/admin/NuevaEntidadDialog.tsx`: formulario (tipo, razón social, CUIT normalizado a 11 dígitos, contacto, email, teléfono).
- `app/app/admin/entidades/page.tsx`: botón "Nueva entidad" en el header + CTA en el empty-state; refresca la lista al crear.
- `lib/schemas/onboarding.ts`: `adminCreateRequestingEntitySchema`. `types/audit.ts`: acción agregada al enum canónico.
- `docs/MODULE_REGISTRY.md`: módulo `admin_requesting_entity_create`.

### Sistema documental en reports

- **Nuevo** `reports/README.md`: índice único del sistema documental — orden de lectura obligatorio, catálogo completo (000–015 + HANDOFF con estado), referencia a `docs/`, convenciones de numeración, números retirados (001/002/003/006/007/008/009) y cómo agregar un doc. Próximo número libre: `016`.
- `reports/000_ESTADO_ACTUAL_PROYECTO.md`: índice de la sección 4 reconciliado (estaba desactualizado, no listaba 010–015) y apunta al README como canónico.

### Validación

- `pnpm type-check`: OK.

---

## Decisión de producto — Carga y certificación por el contador (2026-06-17)

**Decisión del dueño:** por el momento, **toda la información del legajo la carga el contador habilitado y él es el autorizado a validarla**. El cliente no carga datos directamente en esta etapa.

**Por qué:** que un profesional matriculado cargue y valide la información le da más seguridad al financista de que los datos son ciertos — queda "certificada" por el contador. Es un diferencial de confianza del producto.

**Implicancia:** no se abren (por ahora) pantallas de carga al cliente. El cliente mantiene su rol de autorizar accesos (grants) y, a lo sumo, completar perfil básico. El foco de UX de carga es el del contador. Ver diseño del formulario único de cliente operado por el contador (próximo: `reports/017_*`).

---

## Próximo — Formulario único de cliente operado por el contador (en diseño)

**Pedido del dueño:** un formulario único que el **contador** use para cargar toda la info de un cliente, **organizado por carpeta** (datos personales / datos de cada empresa), donde se **suban carpetas/documentos directamente** y la **IA busque y extraiga** para prellenar. Primero diseño y aprobación; recién después se implementa. (Diseño presentado en chat 2026-06-17; pendiente de aprobación para volcarlo a `reports/017`.)

---

## Legajo único — Olas 1 y 2 implementadas (2026-06-17)

Plan: `reports/017_PLAN_LEGAJO_UNICO_CONTADOR.md` (ajustado con recomendaciones de 2ª IA: asistente movido a Ola 2, endpoint con `targetOrganizationId`, colecciones `folder_certifications` y `document_routing_decisions`, modelo mixto de perfil por empresa, ruta canónica).

### Ola 1 — Shell del legajo único

- **Nuevo** `app/app/contador/clientes/[clientId]/legajo/page.tsx`: ruta canónica con **pestañas por carpeta** (Titular + empresas), **completitud por sección** (Identidad/Perfil/Contable/Patrimonio/Documentos) leída de `/api/folders/[orgId]/status`, % por carpeta, y links a las pantallas existentes. Botón "Validar y certificar" deshabilitado (Ola 5).
- `app/app/contador/clientes/[clientId]/page.tsx`: botón "Abrir Legajo".

### Ola 2 — Asistente IA contextual (read-only)

- **Nuevo** `app/api/credito-hub/assistant/[targetOrganizationId]/route.ts`: POST `{ message, history? }`. Auth `assertCanManageAccountingFolder` (nada sensible en body). Rate limit en memoria (20/5min por uid+carpeta), límite de chars/history. Guardrails: responde solo con evidencias del legajo, dice "no consta" si falta, no recomienda aprobar/rechazar crédito, no modifica datos. Audita `assistant.queried`.
- **Nuevo** `lib/credito-hub/assistant-context.ts`: arma contexto server-side (identidad, perfil extendido, totales de balance/resultados, secciones con/sin datos).
- **Nuevo** `components/credito-hub/LegajoAssistantChat.tsx`: modal con preguntas sugeridas, historial e input; aviso de modo demo si el provider es mock. Reusa la capa IA (`resolveAIProvider().complete`).
- `types/audit.ts`: acción `assistant.queried`. `docs/MODULE_REGISTRY.md`: módulos `legajo_unico_contador` y `legajo_assistant`.

### Validación

- `pnpm type-check`: OK · `pnpm check:security-shape`: OK · `pnpm test`: OK (113).

## Legajo único — Olas 3 a 6 implementadas (2026-06-17, agentes en paralelo por ola)

Ejecutadas wave-by-wave con agentes paralelos de archivos disjuntos; integración/validación/commit por el orquestador entre olas.

- **Ola 3 — carga única + auto-routing** (commit `0579555`): `lib/credito-hub/folder-routing.ts` (`resolveFolderByCuit`), `lib/services/document-routing.ts` + `types/document-routing.ts`, pipeline `process-jobs.ts` reasigna `folderOwnerOrganizationId` por CUIT o marca `needs_manual_assignment`, API `routing/[rootOrganizationId]` (GET) y `/[decisionId]` (PATCH), componentes `CarpetaUploadSection` + `UnassignedDocsTray` integrados. Colección `document_routing_decisions`.
- **Ola 4 — revisión embebida** (commit `d3d1c0d`): `components/credito-hub/CarpetaReviewSection.tsx` (reusa `ReviewWorkbench`), integrada por carpeta activa.
- **Ola 5 — certificación** (commit `299f900`): `types/folder-certification.ts`, `lib/services/folder-certification.ts` (invalidación PEREZOSA a `outdated` por huella `folder-fingerprint.ts`), API `certification/[targetOrganizationId]` GET/POST (solo contador/admin), `CertificationBadge` + `CertifyFolderButton` en el legajo. Colección `folder_certifications`.
- **Ola 6 — tests de aislamiento**: `__tests__/security/legajo-isolation.test.ts` (25 casos: canCertify, operator gate, assignedFolderBelongsToGroup, rateLimited, pickTarget, visibilidad readonly de certificación). Suite total **138 tests**.

### Ajuste de cierre Codex (2026-06-17)

- Se endureció `assistant/[targetOrganizationId]` y `routing/[rootOrganizationId]/*`: además de `assertCanManageAccountingFolder`, ahora exigen rol operador (`accountant`, `accounting_firm_admin` o `admin_platform`). El productor titular conserva lectura, pero no usa asistente del contador ni reasigna documentos.
- Se expone `certification` en `GET /api/folders/[targetOrgId]/readonly` después de validar titular/admin/grant activo, y `ReadonlyFolderView` muestra badge vigente/desactualizado/sin certificación para financistas.
- Se corrigió auditoría de `assistant.queried` y `document.routing_reassigned` para registrar la organización activa del contador/admin como actor.

### Validación

- `pnpm type-check`: OK · `pnpm check:security-shape`: OK · `pnpm test`: OK (138) · `pnpm build`: OK.

### Refinamientos pendientes (no bloqueantes)

- Visor de documento real en revisión (hoy placeholder en `ReviewWorkbench`).
- Indicador de completitud global por cliente (hoy es por carpeta activa).
- Auto-routing: el intake del legajo sube al titular como inbox; afinar UX cuando el documento corresponde directamente a una empresa.
---

## Cierre UX CreditoHub / Entidad / Revision (2026-06-18)

Pedido del dueño antes de cargar documentacion real con un contador amigo: cerrar la UX demostrable para cumplimiento bancario, revision documental y requisitos.

### Implementado

- **Navegacion a Cumplimiento:** `app/app/entidad/carpetas/[targetOrgId]/page.tsx` agrega boton "Ver cumplimiento" hacia `/app/entidad/carpetas/[targetOrgId]/cumplimiento`.
- **Visor real en Revision:** `ReviewWorkbench` reemplaza el placeholder por preview de PDF/imagen y fallback abrir/descargar para otros tipos. Nuevo endpoint `GET /api/credito-hub/review/documents/[docId]/preview?targetOrganizationId=...` emite URL firmada de 5 minutos despues de validar `assertCanManageAccountingFolder` y pertenencia del documento.
- **Campos de revision:** `FieldReviewRow` permite seleccionar el campo/documento origen y muestra doc/pagina.
- **Requisitos editables:** `RequirementBuilder` permite corregir requisitos IA antes de publicar (codigo, nombre, descripcion, categoria, obligatorio, periodos, vigencia, responsable, formatos y reglas), guardar borrador y publicar.
- **Selector de template:** `ComplianceMatrix` carga templates publicados de la entidad y elimina el input manual de `requirementTemplateId`.
- **Backend requisitos:** `bank-requirements` agrega action `update` para drafts y servicio `updateRequirementTemplate`; templates publicados no se editan desde este flujo.
- Docs actualizados: `reports/000_ESTADO_ACTUAL_PROYECTO.md`, `reports/015_CHECKLIST_VERIFICACION_FRONTEND.md`, `reports/017_PLAN_LEGAJO_UNICO_CONTADOR.md`.

### Validacion

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `pnpm test`: OK (9 archivos, 138 tests).
- `pnpm build`: OK (72 paginas generadas; incluye `/api/credito-hub/review/documents/[docId]/preview`).
- Browser local `http://localhost:3000`: home carga, contenido visible, sin overlay de Next.

### Pendientes / cuidado operativo

- Antes de cargar documentos reales de varios clientes, decidir si se habilita temporalmente `CREDITO_HUB_ALLOW_REAL_DATA=true` y bajo que excepcion documentada, o cerrar primero cifrado V1 (Plan 012).
- Validar claves IA en Vercel (`AI_PROVIDER`, `GROQ_API_KEY` y/o `ANTHROPIC_API_KEY`). Sin key, el flujo sigue en mock/demo.
- Prueba funcional pendiente en navegador con usuario contador + entidad + documentos demo/reales autorizados.

---

## Cierre seguridad escrituras/uploads de legajo (2026-06-21)

Pedido: implementar los pendientes marcados del analisis del proyecto, priorizando seguridad/lanzamiento.

### Implementado

- Mutaciones de carpeta contable/documental migradas a APIs server-side con Admin SDK:
  - `app/api/accounting/periods/*`
  - `app/api/accounting/balance-sheets/*`
  - `app/api/accounting/income-statements/*`
  - `app/api/accounting/tax-documents/*`
  - `app/api/folders/assets/*`
  - `app/api/folders/liabilities/*`
  - `app/api/folders/documents/upload`
- `lib/services/*` mantiene interfaz de cliente pero crea/actualiza/borra/sube mediante `authFetch`.
- Nuevo helper server-side `lib/services/server-folder-writes.ts` valida `assertCanManageAccountingFolder`, escribe `folderOwnerOrganizationId`, audita y opera Storage con Admin SDK.
- `DocumentList` descarga documentos por endpoint firmado `/api/folders/[targetOrgId]/documents/[docId]/download`.
- `firestore.rules`: escrituras directas bloqueadas para `accounting_periods`, `balance_sheets`, `income_statements`, `tax_documents`, `assets`, `liabilities`, `documents`.
- `storage.rules`: legajo y statement-imports quedan `read/write=false`; acceso por APIs.
- `.env.example` y Admin SDK agregan `FIREBASE_STORAGE_BUCKET`.

### Validacion

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `pnpm test`: OK (9 archivos, 138 tests).

### Continuacion 2026-06-21 - Lecturas sensibles por API

- Se agregaron `GET` a APIs server-side de `periods`, `balance-sheets`, `income-statements`, `tax-documents`, `assets`, `liabilities` y `documents`.
- Los servicios cliente leen por `authFetch` y ya no consultan Firestore directo para colecciones sensibles de legajo.
- Las paginas de carpeta/impuestos usan `getPeriodById` en lugar de `getDoc` directo para `accounting_periods`.
- `firestore.rules` quedo `read/write=false` para colecciones sensibles de legajo.
- `server-folder-writes.ts` separa lectura y escritura: productor puede leer su carpeta; solo contador/admin modifica.

### Validacion continuacion

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `pnpm test`: OK (9 archivos, 138 tests).

### Pendientes reales

- Ejecutar Plan 012 cifrado V1 real antes de datos reales masivos.
- Prueba funcional en navegador con usuario contador + entidad + documentos autorizados.

### Deploy reglas Firebase 2026-06-21

- `firebase deploy --only firestore:rules`: OK en `agrocredit-ia-saas`.
- Ruleset Firestore: `1ca1043b-fc25-4c25-b195-3a43a3ab29ac`.
- `firebase deploy --only storage`: OK en `agrocredit-ia-saas`.
- Ruleset Storage: `d08a89d2-7ae9-4150-b751-6bef0999f214`.
- Storage compilo con warnings por funciones no usadas (`isAuthenticated`, `hasRole`) porque las reglas quedaron deny-by-default; no bloquea.

### Pendientes actualizados

- Prueba funcional en navegador con contador + entidad + documentos autorizados.
- Validar variables de entorno en Vercel: `FIREBASE_STORAGE_BUCKET`, Firebase Admin vars, `AI_PROVIDER`, `GROQ_API_KEY` y/o `ANTHROPIC_API_KEY`.
- Mantener `CREDITO_HUB_ALLOW_REAL_DATA=false` salvo prueba controlada; para datos reales masivos cerrar primero Plan 012.
- Ejecutar Plan 012 cifrado V1 real antes de datos reales masivos.
- Post-MVP: expediente bancario final PDF/ZIP/JSON, mas tipos documentales, integracion bancaria viva, webhooks/SDK/MCP del Integration Core.

---

## Fix procesamiento Legajo IA - documentos sin extractor (2026-06-23)

Pedido: revisar por que en produccion la carga masiva IA del legajo de Hector Gramaio quedaba `failed`.

Diagnostico:

- Job afectado: `mPCNmxZv6nWOQmlnXwrR`, documentId `168baeea-0e8a-494f-b66c-ca65b91f9642`.
- Archivo: `Balance_Los_Senores_del_Agro.pdf`.
- Groq clasifico el documento como `desconocido` con confianza `0.5`.
- El worker guardo la clasificacion, pero al no tener extractor para `desconocido` intentaba transicionar `classifying -> validating`, transicion invalida en la maquina de estados, y marcaba el job como `failed`.

Implementado:

- `lib/credito-hub/process-jobs.ts`: si el documento no tiene extractor soportado, el job pasa de `classifying` a `awaiting_review` y queda para revision humana, en vez de fallar.
- `components/credito-hub/JobProgressList.tsx`: muestra `job.error` cuando un job falla y agrega boton `Reintentar`.
- `app/api/credito-hub/jobs/[jobId]/retry/route.ts`: endpoint server-side para reencolar solo jobs `failed`, validando `assertCanManageAccountingFolder` contra el legajo del job.
- `docs/MODULE_REGISTRY.md`: ruta de retry registrada en `document_jobs`.

Validacion:

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `pnpm test __tests__/credito-hub/document-jobs.test.ts`: OK (22 tests).
- `pnpm test`: OK (9 archivos, 138 tests).

---

## Fix UX carga/procesamiento Legajo IA - estados, duplicados y borrado (2026-06-25)

Pedido: al cargar el balance `Balance_Los_Senores_del_Agro.pdf`, el usuario no entendia si el proceso estaba activo, fallido o esperando revision; ademas no podia eliminar el documento/job anterior.

Diagnostico:

- El fix anterior ya evitaba que documentos sin extractor pasen a `failed`, pero la UI seguia mostrando estados tecnicos (`awaiting_review`, `failed`) sin explicacion operativa.
- El job viejo fallido seguia visible y solo permitia reintentar, no eliminar.
- Si se subia el mismo archivo otra vez, `enqueueJob` reutilizaba el job existente por `fileHash`, pero el intake ya habia guardado otra copia del documento antes de detectar el duplicado.

Implementado:

- `JobProgressList` ahora muestra estado legible por paso: En cola, Preparando, Clasificando, Extrayendo, Validando, Revisar, Fallido, Pausado, Parcial y Completo.
- Cada job muestra nombre de archivo cuando existe, intentos, proveedor, documentId y mensaje explicativo.
- Los jobs fallidos muestran error humanizado para la transicion vieja invalida.
- Se agrego accion de eliminar job/documento desde la UI con confirmacion. Bloquea eliminacion mientras el job esta activo.
- Nuevo `DELETE /api/credito-hub/jobs/[jobId]`: valida `assertCanManageAccountingFolder`, borra job, documento fuente, archivo Storage y derivados (`extracted_fields`, `document_classifications`, `document_routing_decisions`), y audita `document.job_deleted`.
- `intake` detecta duplicados por `fileHash + folderOwnerOrganizationId` antes de guardar en Storage/Firestore, evitando documentos fuente huerfanos.
- `MassUploadDropzone` informa cuando el archivo ya estaba cargado y se reutilizo el procesamiento existente.
- `process-jobs` deja `statusMessage` claro cuando no hay extractor automatico o cuando hay campos listos para revision.
- `docs/MODULE_REGISTRY.md` registra la ruta `app/api/credito-hub/jobs/[jobId]`.

Archivos principales:

- `components/credito-hub/JobProgressList.tsx`
- `components/credito-hub/MassUploadDropzone.tsx`
- `app/api/credito-hub/intake/route.ts`
- `app/api/credito-hub/jobs/[jobId]/route.ts`
- `lib/services/document-jobs.ts`
- `lib/credito-hub/process-jobs.ts`
- `types/credito-hub.ts`
- `types/audit.ts`
- `docs/MODULE_REGISTRY.md`

Validacion:

- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.
- `pnpm test __tests__/credito-hub/document-jobs.test.ts`: OK (22 tests).

Pendientes/riesgos:

- El balance del ejemplo puede quedar en `Revisar` si Groq/IA lo clasifica como `desconocido` o como tipo sin extractor automatico. Eso ya no es fallo tecnico; requiere revision manual o ampliar clasificadores/extractores para ese formato concreto.

### Continuacion 2026-06-25 - alias de clasificador y reproceso desde revision

Motivo:

- El usuario volvio a subir `Balance_Los_Senores_del_Agro.pdf` y quedo en `Revisar` con el mensaje "La IA leyo el archivo, pero no reconocio un tipo con extractor automatico".
- Causa probable confirmada en codigo: los providers devuelven alias como `balance_sheet`, `income_statement`, `f931`, `iva`, pero `normalizeDocumentType` solo aceptaba tipos canonicos (`estado_situacion_patrimonial`, etc.). Esos alias caian a `desconocido`, por eso no se ejecutaba extractor.

Implementado:

- `lib/ai/classification/document-classifier.ts`: normaliza aliases de providers a tipos canonicos con extractor:
  - `balance_sheet`, `balance_general`, etc. -> `estado_situacion_patrimonial`
  - `income_statement`, `estado_de_resultados` -> `estado_resultados`
  - `iva`, `tax_document`, `declaracion_jurada_iva` -> `ddjj_iva`
  - `f931`, `form_931` -> `formulario_931`
- `app/api/credito-hub/jobs/[jobId]/retry/route.ts`: permite reprocesar jobs en `awaiting_review`, no solo `failed`.
- `lib/services/document-jobs.ts`: permite transicion `awaiting_review -> queued` y limpia `statusMessage`.
- `JobProgressList`: muestra boton `Reprocesar` para jobs en `Revisar`.
- Tests agregados en `classifier.test.ts` y `document-jobs.test.ts`.

Validacion:

- `pnpm test __tests__/credito-hub/classifier.test.ts __tests__/credito-hub/document-jobs.test.ts`: OK (33 tests).
- `pnpm type-check`: OK.
- `pnpm check:security-shape`: OK.

Nota operativa:

- Para el job que ya quedo en `Revisar`, luego del deploy no hace falta volver a subir el PDF: tocar `Reprocesar` y luego `Procesar con IA`.

### Ajuste UX 2026-06-25 - reproceso en una sola accion

- `JobProgressList`: los jobs en `queued/stalled` muestran `Procesar ahora` en la propia fila.
- Los jobs en `awaiting_review/failed` muestran `Reprocesar con IA`, que reencola y dispara el procesamiento en una sola accion.
- `intake` y `retry` guardan en el job el proveedor activo real de `platform_settings/ai` o `AI_PROVIDER`, para que el texto `Proveedor` no quede desfasado al cambiar de Groq a Claude.
- Validacion: `pnpm type-check` OK y `pnpm test __tests__/credito-hub/document-jobs.test.ts` OK (23 tests).

### Continuacion 2026-06-25 - fallback por contenido/nombre para balances

- Se verifico localmente `Balance_Los_Senores_del_Agro.pdf`: PDF digital legible, 11 paginas, ~14.900 caracteres, incluye "ESTADO DE SITUACION PATRIMONIAL" y rubros contables.
- Se verifico localmente `Manual_Visual_Sistema_Interno_Agro_Biciuffa.pdf`: PDF digital legible, 8 paginas.
- `document-classifier` ahora, si el provider devuelve `unknown/desconocido`, infiere tipo por nombre de archivo y texto PDF:
  - `Balance_*`, `estados contables`, `estado de situacion patrimonial`, `activo corriente`, `pasivo corriente`, `patrimonio neto` -> `estado_situacion_patrimonial`.
  - Tambien infiere resultados, IVA y F.931 por patrones basicos.
- El mensaje para documentos sin extractor automatico se cambio para no sugerir falso bloqueo de lectura.
- Validacion: `pnpm test __tests__/credito-hub/classifier.test.ts __tests__/credito-hub/document-jobs.test.ts` OK (35 tests), `pnpm type-check` OK, `pnpm check:security-shape` OK.
