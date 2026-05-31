# Handoff Actual - AgroCredit IA

**Fecha:** 2026-05-29  
**Proyecto:** `Agro-Credit` / `carpeta-agrocredit-ia`  
**Stack:** Next.js App Router + Firebase + TypeScript  
**Estado real:** Plan 004 con Ola 1 completa y Ola 2 implementada. Ola 3 pendiente con una parte adelantada.

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

### Ola 3 - Acceso temporizado y guard de carpeta

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

## Riesgos y notas

- El proyecto aun conserva rutas y servicios con nombre `productor` por compatibilidad. En UI nueva usar "Usuario del sistema" o "Usuario"; no introducir nuevas superficies con el nombre funcional viejo.
- `/api/auth/setup-claims` todavia mantiene roles legacy en su schema. Los wizards no lo llaman directamente; las APIs de onboarding setean claims y el cliente refresca token.
- `ClienteNuevoDialog` usa `/api/onboarding/system-user?createdByAccountant=true`; revisar en Ola 3 si conviene ajustar el backend para que el contador no quede como miembro `producer` del cliente.
- Desplegar reglas e indices Firestore cuando se cierre la reorganizacion completa.

---

## Cierre obligatorio para proximas sesiones

1. Ejecutar `pnpm type-check`.
2. Actualizar este handoff y `docs/MODULE_REGISTRY.md` si cambia una ruta, API, coleccion o modulo.
3. Hacer `git status --short` y `git diff --stat`.
4. Git add selectivo + commit.
