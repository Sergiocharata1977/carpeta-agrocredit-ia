# Handoff Actual - AgroCredit IA

**Fecha:** 2026-05-29  
**Proyecto:** `Agro-Credit` / `carpeta-agrocredit-ia`  
**Stack:** Next.js App Router + Firebase + TypeScript  
**Estado real:** OCR/IA EECC e invitaciones por link implementados v1. Los planes MD 006 y 009 fueron eliminados a pedido del usuario.

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

- Se agrego un menu de usuario arriba a la derecha del shell privado, similar al patron de `9001app-firebase`: avatar circular con iniciales, dropdown de identidad, accesos rapidos y cierre de sesion.
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

- Se analizo el flujo OCR existente en `9001app-firebase`: provider intercambiable, endpoint de extraccion de facturas, upload a Storage, borrador intermedio, preview editable y confirmacion separada.
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

## Cierre obligatorio para proximas sesiones

1. Ejecutar `pnpm type-check`.
2. Actualizar este handoff y `docs/MODULE_REGISTRY.md` si cambia una ruta, API, coleccion o modulo.
3. Hacer `git status --short` y `git diff --stat`.
4. Git add selectivo + commit.
