# Plan Carpeta AgroCredit IA - Ejecucion multi-agente

**Fecha:** 2026-05-28
**Feature:** Nueva plataforma SaaS de carpeta crediticia agrofinanciera para productores, contadores, bancos y empresas agrocomerciales.
**Proyectos afectados:**
- Nuevo proyecto: `carpeta-agrocredit-ia`
- Proyecto fuente de referencia tecnica: `../Web Site transparencia`
- Integraciones futuras: `../9001app-firebase`, SIG-Agro y Don Candido IA

---

## 0. Decision ejecutiva

Recomendacion: crear un proyecto nuevo y reutilizar la base tecnica de `Web Site transparencia` de forma selectiva. No conviene clonar toda la web y borrar encima, porque el proyecto de transparencia es publico, municipal y editorial, mientras que AgroCredit es privado, financiero, multi-tenant y con datos sensibles.

La mejor estrategia es:

1. Crear repo/carpeta nueva: `carpeta-agrocredit-ia`.
2. Copiar patrones, no dominio:
   - `package.json` como base de dependencias.
   - `components/ui`.
   - helpers de Firebase cliente/admin.
   - estructura App Router.
   - patron de panel privado/admin.
   - configuracion Firebase/Vercel como plantilla.
3. No copiar rutas publicas municipales, colecciones de transparencia, reglas Firestore permisivas ni contenido visual de campana.
4. Construir el producto como SaaS privado desde el dia 1, con roles, autorizaciones, auditoria y reglas multi-tenant estrictas.

Clasificacion de producto: **producto satelite premium/enterprise** conectado en el futuro con Don Candido IA, SIG-Agro, CRM agro y cobranzas.

Nombre tecnico sugerido: `carpeta-agrocredit-ia`.
Nombre comercial posible: `Carpeta AgroCredit IA` o `Don Candido AgroFinanzas`.

---

## 1. Contexto tecnico detectado en el proyecto fuente

Repositorio revisado: `../Web Site transparencia`.

Estado observado:
- Rama: `main`.
- Ultimos commits relevantes:
  - `1992550` - fix: restore homepage hero image
  - `e2b52b2` - docs: update HANDOFF session complete, add pending features
  - `1ebf6e0` - feat: Ola 2+3 frontend
- Handoff existente: `reports/HANDOFF_ACTUAL.md`.
- No se encontro `CLAUDE.md`.
- No se encontro `docs/PLUGIN_REGISTRY.md`.

Stack real del repo fuente:
- Next.js App Router.
- Version actual detectada: `next@16.0.10`, `react@19.2.0`.
- TypeScript.
- Firebase cliente `firebase@12.13.0`.
- Firebase Admin `firebase-admin@13.10.0`.
- Firestore.
- Firebase Storage rules existentes.
- Vercel preparado.
- Zod.
- React Hook Form.
- Radix/shadcn-style UI.
- Lucide icons.
- Recharts.

Nota de decision tecnica: el prompt inicial menciona Next.js 14. Si se busca "mismo stack de siempre" y se parte del repo actual, conviene usar Next.js App Router con la version actualmente estable del repo fuente. Si por compatibilidad se quiere Next.js 14, se debe fijar esa version al crear el proyecto. El documento de olas usa "Next.js App Router" como criterio principal y deja la version final como decision al scaffolding.

---

## 2. Problema real y objetivo del producto

Problema: el productor agropecuario, su contador, bancos y empresas agrocomerciales repiten una y otra vez el intercambio de balances, DDJJ, bienes, deudas y respaldos para acceder a credito o vender a plazo. La informacion queda dispersa en mails, WhatsApp, carpetas locales y planillas, sin control claro de quien vio que, por cuanto tiempo y con que autorizacion.

Objetivo: crear una carpeta digital agrofinanciera donde el contador cargue una sola vez la informacion contable, fiscal y patrimonial del productor, y el productor pueda autorizar accesos controlados a bancos, financieras y empresas agrocomerciales.

Lo que el sistema es:
- Archivo digital privado.
- Carpeta financiera y crediticia.
- Gestor de autorizaciones.
- Trazabilidad de accesos.
- Base para solicitudes de financiacion.
- Futuro insumo para IA y scoring preliminar.

Lo que el sistema no es:
- No es un sistema contable.
- No reemplaza al contador.
- No liquida IVA, Ganancias/Rentas ni sueldos.
- No decide automaticamente un credito.
- No entrega informacion financiera sin autorizacion expresa del productor.

Resultado medible:
- Menos recarga documental por productor.
- Menos pedidos manuales al contador.
- Mayor velocidad de analisis para bancos/empresas.
- Historial auditable de autorizaciones.
- Carpeta actualizada por periodo fiscal/campana.

---

## 3. Actores, organizaciones y roles

Actores funcionales:

| Actor | Rol principal | Puede cargar datos | Puede autorizar acceso | Puede consultar datos |
|---|---|---:|---:|---:|
| Productor agropecuario | Duenio de la informacion | Limitado a datos basicos | Si | Si, propios |
| Contador / estudio contable | Carga y mantenimiento de carpeta | Si | No, salvo poder delegado explicito | Si, de productores vinculados |
| Banco / financiera | Evaluacion crediticia | No | No | Si, solo con grant vigente |
| Empresa agrocomercial | Financiamiento comercial / venta a plazo | No | No | Si, solo con grant vigente |
| Admin plataforma | Soporte y configuracion | Segun soporte | No en nombre del productor, salvo proceso auditado | Segun politica interna |

Roles iniciales:
- `admin_platform`
- `producer`
- `accountant`
- `accounting_firm_admin`
- `bank_user`
- `agro_company_user`

Tipos de organizacion:
- `platform`
- `producer`
- `accounting_firm`
- `bank`
- `financial_entity`
- `agro_company`

---

## 4. Regla central de permisos

El contador carga la informacion una sola vez. El productor es el duenio de la informacion y decide quien puede verla, que alcance tiene el acceso, para que finalidad y hasta que fecha.

Cada autorizacion debe registrar:
- productor
- entidad solicitante
- tipo de entidad
- scopes autorizados
- finalidad
- fecha de inicio
- fecha de vencimiento
- estado
- usuario que autorizo
- historial de cambios
- evidencia de auditoria

Scopes iniciales:
- `profile_basic`
- `accounting_summary`
- `balance_sheets`
- `income_statements`
- `tax_documents`
- `assets`
- `liabilities`
- `documents`
- `full_credit_folder`

Estados de solicitud de acceso:
- `draft`
- `requested`
- `approved`
- `rejected`
- `revoked`
- `expired`

---

## 5. Modelo de datos Firestore propuesto

Principio: usar colecciones top-level con ids y campos de referencia, mas `organizationId`, `producerId` y `createdBy` cuando corresponda. Evitar depender de rutas anidadas profundas para permisos complejos. Toda accion sensible debe generar `audit_logs`.

| Coleccion | Proposito | Campos clave |
|---|---|---|
| `users` | Perfil extendido del usuario autenticado | `uid`, `email`, `displayName`, `defaultOrganizationId`, `roles`, `status` |
| `organizations` | Tenants/entidades | `type`, `legalName`, `taxId`, `status`, `plan`, `createdAt` |
| `organization_members` | Relacion usuario-organizacion | `organizationId`, `uid`, `role`, `status`, `invitedBy` |
| `producers` | Productores agropecuarios | `organizationId`, `taxId`, `legalName`, `personType`, `activity`, `province`, `city`, `folderStatus` |
| `accounting_firms` | Estudios contables | `organizationId`, `legalName`, `taxId`, `contact` |
| `producer_accountant_links` | Vinculo formal productor-contador | `producerId`, `accountingFirmId`, `accountantUid`, `status`, `main`, `canUpload`, `canAuthorize` |
| `financial_entities` | Bancos/financieras | `organizationId`, `type`, `legalName`, `taxId`, `status` |
| `agro_companies` | Empresas agrocomerciales | `organizationId`, `sector`, `legalName`, `taxId`, `status` |
| `accounting_periods` | Periodos fiscales/campanas del productor | `producerId`, `year`, `periodType`, `status`, `closedAt` |
| `balance_sheets` | Balance general | `producerId`, `periodId`, `assetsTotal`, `liabilitiesTotal`, `equityTotal`, `validationStatus` |
| `income_statements` | Estado de resultados | `producerId`, `periodId`, `sales`, `grossResult`, `netResult`, `validationStatus` |
| `tax_documents` | IVA, Ganancias/Rentas, 931 y otros | `producerId`, `periodId`, `taxType`, `fiscalPeriod`, `amount`, `documentIds` |
| `assets` | Bienes muebles e inmuebles | `producerId`, `assetType`, `category`, `estimatedValue`, `lienStatus`, `documentIds` |
| `liabilities` | Deudas bancarias/comerciales | `producerId`, `creditor`, `liabilityType`, `amount`, `currency`, `dueDate` |
| `documents` | Metadatos de archivos en Storage | `producerId`, `periodId`, `documentType`, `storagePath`, `hash`, `visibility`, `uploadedBy` |
| `access_requests` | Pedidos de acceso | `producerId`, `requesterOrganizationId`, `requestedScopes`, `purpose`, `status` |
| `access_grants` | Autorizaciones vigentes o historicas | `producerId`, `grantedToOrganizationId`, `allowedScopes`, `startsAt`, `expiresAt`, `status` |
| `financing_requests` | Solicitudes de financiacion | `producerId`, `requesterOrganizationId`, `grantId`, `financingType`, `amount`, `currency`, `status` |
| `audit_logs` | Auditoria inmutable logica | `actorUid`, `actorOrganizationId`, `action`, `targetType`, `targetId`, `metadata`, `createdAt` |
| `notifications` | Notificaciones internas | `recipientUid`, `organizationId`, `type`, `status`, `payload`, `createdAt` |

Rutas Storage sugeridas:

```text
orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}
```

Regla: nunca guardar informacion sensible solo en el nombre de archivo. El control de acceso vive en Firestore y Storage rules.

---

## 6. Pantallas necesarias

Rutas sugeridas:

| Ruta | Actor | Objetivo |
|---|---|---|
| `/login` | Todos | Ingreso Firebase Auth |
| `/app` | Todos | Router de dashboard segun rol |
| `/app/productor` | Productor | Resumen de carpeta, contador, autorizaciones y solicitudes |
| `/app/productor/autorizaciones` | Productor | Aprobar, rechazar, revocar y ver historial |
| `/app/productor/carpeta` | Productor | Ver balances, impuestos, bienes, deudas y documentos |
| `/app/contador` | Contador | Productores asignados, pendientes y vencimientos |
| `/app/contador/productores` | Contador | ABM/vinculos de productores |
| `/app/contador/productores/[producerId]/carpeta` | Contador | Carga de carpeta contable/fiscal |
| `/app/contador/productores/[producerId]/bienes` | Contador | Bienes muebles/inmuebles |
| `/app/entidad` | Banco/empresa | Productores autorizados y solicitudes |
| `/app/entidad/accesos` | Banco/empresa | Solicitar y seguir accesos |
| `/app/entidad/financiacion` | Banco/empresa | Kanban de solicitudes |
| `/app/admin` | Admin plataforma | Organizaciones, usuarios, auditoria y soporte |

UX recomendada: aplicacion operativa, no landing. Primera pantalla luego del login debe resolver tareas: autorizaciones pendientes, carpetas incompletas, vencimientos y solicitudes en analisis.

---

## 7. Seguridad, auditoria y cumplimiento

Invariantes:

1. Multi-tenant: todo dato sensible debe estar filtrado por membresia o grant vigente.
2. Nunca confiar en `organizationId` enviado desde el cliente sin validar contra Auth/membership.
3. Productor autoriza acceso; contador solo carga y mantiene, salvo delegacion explicita auditada.
4. Banco/empresa nunca edita datos contables del productor.
5. Todo upload, aprobacion, rechazo, revocacion, descarga y cambio de estado financiero genera `audit_logs`.
6. Los grants vencidos no habilitan lectura.
7. Los documentos privados nunca son lectura publica.
8. Las reglas actuales del repo de transparencia son demasiado abiertas para este producto y deben rehacerse.

Politica de auditoria minima:

| Accion | Audit log obligatorio |
|---|---|
| Crear productor | Si |
| Vincular contador-productor | Si |
| Subir documento | Si |
| Editar balance o impuesto | Si |
| Solicitar acceso | Si |
| Aprobar/rechazar/revocar acceso | Si |
| Crear solicitud de financiacion | Si |
| Cambiar estado de financiacion | Si |
| Descargar/ver documento sensible | Recomendado en fase 2 |

---

## 8. Alcance por fases de producto

Fase 1 - Base privada y carpeta minima:
- Autenticacion.
- Roles.
- Organizaciones.
- Productores.
- Estudios contables.
- Relacion productor-contador.
- Carpeta contable basica.
- Carga de documentos.

Fase 2 - Autorizaciones y paneles:
- Solicitudes de acceso.
- Aprobacion/rechazo/revocacion por productor.
- Panel productor.
- Panel contador.
- Audit logs.
- Notificaciones internas.

Fase 3 - Financiacion:
- Solicitudes de financiacion.
- Panel banco/empresa.
- Kanban.
- Observaciones.
- Documentacion requerida/faltante.
- Vencimientos.

Fase 4 - Inteligencia y ecosistema:
- Ratios financieros.
- Resumen IA de carpeta.
- Scoring preliminar no vinculante.
- Integracion con Don Candido IA.
- Integracion CRM agro/cobranzas.
- Export PDF de carpeta autorizada.

---

## 9. Resumen de olas

| Ola | Agentes | Paralelos entre si | Dependen de |
|-----|---------|--------------------|-------------|
| 1 | A | No aplica | Nada |
| 2 | A, B, C | Si | Ola 1 completa |
| 3 | A, B, C, D | Si | Ola 2 completa |
| 4 | A, B, C | Si | Ola 3 completa |
| 5 | A, B | Si | Ola 4 completa |

---

## Ola 1 - Base del proyecto

> Ejecutar solo Agente A. Esta ola crea la base sobre la que trabajan todos los demas.

## Agente A - Scaffolding del SaaS privado
**Puede ejecutarse en paralelo con:** es el unico de esta ola
**Depende de:** nada - es la primera ola

### Objetivo
Crear el proyecto Next.js App Router con TypeScript, Firebase, UI base, estructura de carpetas y configuracion inicial para Vercel.

### Archivos a crear
- `package.json` - dependencias y scripts base.
- `next.config.mjs` - configuracion Next.
- `tsconfig.json` - TypeScript.
- `.env.example` - variables publicas y privadas requeridas.
- `.gitignore` - exclusiones seguras.
- `app/layout.tsx` - layout raiz.
- `app/page.tsx` - redirect o pantalla minima a `/login`.
- `app/login/page.tsx` - login inicial.
- `app/app/page.tsx` - router de dashboard segun rol.
- `components/ui/*` - copiar base UI desde `../Web Site transparencia/components/ui`.
- `lib/firebase/config.ts` - Firebase cliente.
- `lib/firebase/admin-sdk.ts` - Firebase Admin.
- `lib/utils.ts` - helpers base.
- `styles/globals.css` - estilos globales.
- `firebase.json` - configuracion Firebase.
- `firestore.rules` - reglas placeholder cerradas.
- `storage.rules` - reglas placeholder cerradas.

### Archivos a modificar
- Ninguno, porque es la creacion inicial.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 1 - Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Crea la base del proyecto `carpeta-agrocredit-ia` como una app Next.js App Router con TypeScript, Firebase/Firestore, Firebase Auth, Firebase Storage y deploy preparado para Vercel.

Referencia tecnica:
- Usa `../Web Site transparencia/package.json` como referencia de stack.
- Reutiliza `components/ui`, `lib/firebase/config.ts`, `lib/firebase/admin-sdk.ts`, `lib/utils.ts` y estilos globales como modelo.
- No copies rutas publicas, contenido municipal, colecciones de transparencia ni reglas Firestore permisivas.

Decisiones:
- Usa Next.js App Router.
- Mantene scripts: `dev`, `build`, `start`, `type-check`.
- Crea `.env.example`; no copies `.env.local` ni secretos.
- Deja Firestore y Storage cerrados por defecto hasta que Ola 2 defina permisos.

Criterio de exito:
- `pnpm install` puede instalar dependencias.
- `pnpm type-check` no falla en el scaffold.
- `/login` y `/app` existen.
- No hay referencias a Observatorio Transparencia en textos visibles, nombres de colecciones ni rutas.
```

---

## Ola 2 - Dominio, seguridad y contratos

> Ejecutar Agente A + Agente B + Agente C en paralelo despues de completar Ola 1.

## Agente A - Tipos y schemas de dominio
**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 1 completa

### Objetivo
Crear los tipos TypeScript y schemas Zod canonicos del dominio agrofinanciero.

### Archivos a crear
- `types/auth.ts` - roles, tipos de organizacion y membresias.
- `types/producer.ts` - productor, vinculos y estados de carpeta.
- `types/accounting.ts` - periodos, balances, resultados, impuestos.
- `types/assets.ts` - bienes muebles, inmuebles y deudas.
- `types/access.ts` - solicitudes de acceso, grants y scopes.
- `types/financing.ts` - solicitudes de financiacion y estados Kanban.
- `types/audit.ts` - audit logs y eventos.
- `lib/schemas/auth.ts` - Zod auth/organizaciones.
- `lib/schemas/producer.ts` - Zod productores/vinculos.
- `lib/schemas/accounting.ts` - Zod carpeta contable/fiscal.
- `lib/schemas/assets.ts` - Zod bienes/deudas.
- `lib/schemas/access.ts` - Zod accesos/grants.
- `lib/schemas/financing.ts` - Zod financiacion.

### Archivos a modificar
- Ninguno fuera de su scope.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 2 - Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa los tipos TypeScript y schemas Zod para el dominio AgroCredit.

Stack:
Next.js App Router, TypeScript, Firebase/Firestore, Zod.

Reglas:
- No implementes UI.
- No implementes servicios Firestore.
- No modifiques reglas de seguridad.
- Usa enums string literales para roles, estados y scopes.
- Inclui `createdAt`, `updatedAt`, `createdBy`, `organizationId`, `producerId` cuando aplique.

Tipos obligatorios:
- Roles: `admin_platform`, `producer`, `accountant`, `accounting_firm_admin`, `bank_user`, `agro_company_user`.
- OrganizationType: `platform`, `producer`, `accounting_firm`, `bank`, `financial_entity`, `agro_company`.
- Access scopes: los definidos en el documento fuente.
- Financing statuses: `draft`, `requested`, `pending_authorization`, `documents_received`, `in_review`, `observed`, `approved`, `rejected`, `expired`.

Criterio de exito:
- Los tipos compilan.
- Los schemas Zod validan datos de formularios futuros.
- No hay duplicacion de enums entre archivos sin export centralizado cuando convenga.
```

## Agente B - Auth, memberships y guardas de rol
**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 1 completa

### Objetivo
Implementar la capa de autenticacion, sesion, membresias y guardas de rol para dashboards privados.

### Archivos a crear
- `lib/auth/roles.ts` - helpers de roles y permisos.
- `lib/auth/session.ts` - lectura de usuario y claims.
- `lib/auth/memberships.ts` - helpers para memberships.
- `components/auth/AuthGuard.tsx` - guard cliente.
- `components/auth/RoleGate.tsx` - render por rol.
- `app/app/layout.tsx` - layout privado base.

### Archivos a modificar
- `app/login/page.tsx` - conectar login real con Firebase Auth.
- `app/app/page.tsx` - redirigir segun rol/membership.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 2 - Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa la capa de autenticacion y autorizacion inicial.

Referencia:
- Lee `../Web Site transparencia/lib/firebase/auth-client.ts` y `../Web Site transparencia/app/admin/page.tsx` como patron de login.
- Adapta el patron a roles y memberships, sin mantener textos de Observatorio Transparencia.

Reglas:
- No modifiques schemas de dominio, eso corresponde a Ola 2 - Agente A.
- No modifiques Firestore rules, eso corresponde a Ola 2 - Agente C.
- No implementes dashboards completos.
- El usuario puede pertenecer a mas de una organizacion.
- La UI debe bloquear mientras verifica sesion.

Criterio de exito:
- Login/logout funcionan contra Firebase Auth.
- `/app` redirige a dashboard segun rol principal.
- Los componentes `AuthGuard` y `RoleGate` pueden reutilizarse en modulos posteriores.
```

## Agente C - Reglas Firestore, Storage y auditoria base
**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 1 completa

### Objetivo
Crear reglas de seguridad cerradas por defecto, helpers de auditoria y estructura base de servicios Firestore.

### Archivos a crear
- `lib/firebase/collections.ts` - nombres canonicos de colecciones.
- `lib/firebase/audit.ts` - helper server-side para audit logs.
- `lib/firebase/firestore-converters.ts` - converters base si se usan.
- `docs/SEGURIDAD_FIRESTORE.md` - notas de seguridad y supuestos de claims/membership.

### Archivos a modificar
- `firestore.rules` - reglas multi-tenant iniciales.
- `storage.rules` - reglas privadas por organizacion/productor.
- `firestore.indexes.json` - indices iniciales para consultas previstas.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 2 - Agente C

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa reglas iniciales de Firestore y Storage para un SaaS privado multi-tenant.

Referencia:
- Lee `../Web Site transparencia/firestore.rules` solo como ejemplo de formato.
- No copies su politica de lectura publica, porque este producto maneja datos financieros privados.

Reglas obligatorias:
- Denegar todo por defecto.
- Permitir lectura/escritura solo a usuarios autenticados con membership o grant valido.
- Productor lee sus datos y gestiona autorizaciones propias.
- Contador escribe datos de productores vinculados por `producer_accountant_links` activo.
- Banco/empresa lee solo datos cubiertos por `access_grants` activo, no vencido y con scope suficiente.
- `audit_logs` no deben ser editables desde cliente comun.

Criterio de exito:
- Las reglas expresan claramente las invariantes, aunque algunas validaciones finas queden para API/server.
- Storage queda privado por productor/organizacion.
- `docs/SEGURIDAD_FIRESTORE.md` documenta limitaciones y validaciones que deben hacerse server-side.
```

---

## Ola 3 - Modulos core de carpeta

> Ejecutar Agente A + Agente B + Agente C + Agente D en paralelo despues de completar Ola 2.

## Agente A - Productores, estudios y vinculos
**Puede ejecutarse en paralelo con:** Agente B, Agente C, Agente D
**Depende de:** Ola 2 completa

### Objetivo
Implementar ABM de productores, estudios contables y relacion productor-contador.

### Archivos a crear
- `lib/services/producers.ts` - CRUD productores.
- `lib/services/accounting-firms.ts` - CRUD estudios contables.
- `lib/services/producer-accountant-links.ts` - vinculos.
- `app/app/contador/productores/page.tsx` - listado de productores asignados.
- `app/app/contador/productores/new/page.tsx` - alta de productor.
- `app/app/admin/organizaciones/page.tsx` - gestion basica de organizaciones.
- `components/producers/ProducerForm.tsx` - formulario productor.
- `components/producers/ProducerTable.tsx` - tabla/listado.
- `components/accounting/AccountantLinkPanel.tsx` - panel de vinculacion.

### Archivos a modificar
- `app/app/layout.tsx` - agregar item de navegacion a productores, sin tocar items de otros agentes.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 3 - Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa el modulo de productores, estudios contables y vinculos productor-contador.

Reglas:
- Usa schemas de Ola 2 - Agente A.
- Usa guardas de Ola 2 - Agente B.
- Registra audit logs usando helper de Ola 2 - Agente C cuando se creen o cambien vinculos.
- No implementes balances, documentos, bienes, accesos ni financiacion.
- Un contador puede tener varios productores.
- Un productor debe tener un contador principal activo para carpeta contable.

Criterio de exito:
- Contador ve sus productores asignados.
- Admin plataforma puede crear organizaciones iniciales.
- Se puede crear/vincular productor con CUIT, razon social, actividad, provincia, localidad y contacto.
```

## Agente B - Carpeta contable/fiscal y documentos
**Puede ejecutarse en paralelo con:** Agente A, Agente C, Agente D
**Depende de:** Ola 2 completa

### Objetivo
Implementar carga de periodos, balances, estados de resultados, impuestos y archivos adjuntos.

### Archivos a crear
- `lib/services/accounting-periods.ts` - CRUD periodos.
- `lib/services/balance-sheets.ts` - CRUD balances.
- `lib/services/income-statements.ts` - CRUD resultados.
- `lib/services/tax-documents.ts` - CRUD impuestos.
- `lib/services/documents.ts` - metadatos y upload de documentos.
- `app/app/contador/productores/[producerId]/carpeta/page.tsx` - carpeta contable.
- `components/accounting/AccountingPeriodSelector.tsx` - selector de periodo.
- `components/accounting/BalanceSheetForm.tsx` - formulario balance.
- `components/accounting/IncomeStatementForm.tsx` - formulario resultados.
- `components/accounting/TaxDocumentsForm.tsx` - formulario impuestos.
- `components/documents/DocumentUploader.tsx` - upload.
- `components/documents/DocumentList.tsx` - listado de documentos.

### Archivos a modificar
- Ninguno compartido, salvo imports necesarios.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 3 - Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa la carpeta contable/fiscal basica.

Reglas:
- El contador vinculado puede cargar y editar informacion.
- El productor puede ver, pero no editar informacion contable sensible.
- Cada carga debe incluir periodo, estado de validacion, observaciones y archivos asociados cuando aplique.
- Subir archivos a Firebase Storage usando la ruta definida en el documento.
- Registrar audit logs en cargas, ediciones y uploads.
- No implementes bienes ni deudas, eso corresponde a Ola 3 - Agente C.
- No implementes autorizaciones, eso corresponde a Ola 4.

Criterio de exito:
- Para un productor se puede crear periodo fiscal/campana.
- Se puede cargar balance general, estado de resultados e impuestos.
- Se pueden subir PDF/Excel y ver sus metadatos.
```

## Agente C - Bienes, inmuebles, muebles y deudas
**Puede ejecutarse en paralelo con:** Agente A, Agente B, Agente D
**Depende de:** Ola 2 completa

### Objetivo
Implementar el modulo patrimonial de bienes muebles, inmuebles y pasivos.

### Archivos a crear
- `lib/services/assets.ts` - CRUD bienes.
- `lib/services/liabilities.ts` - CRUD deudas.
- `app/app/contador/productores/[producerId]/bienes/page.tsx` - gestion patrimonial.
- `components/assets/RealEstateAssetForm.tsx` - inmuebles.
- `components/assets/MovableAssetForm.tsx` - muebles.
- `components/assets/AssetsTable.tsx` - listado de bienes.
- `components/liabilities/LiabilityForm.tsx` - deuda.
- `components/liabilities/LiabilitiesTable.tsx` - listado de deudas.

### Archivos a modificar
- Ninguno compartido, salvo imports necesarios.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 3 - Agente C

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa bienes muebles, inmuebles y deudas del productor.

Reglas:
- Bien inmueble: tipo, ubicacion, hectareas, matricula, valuacion fiscal, valuacion estimada, titularidad, gravamenes y documentos.
- Bien mueble: tipo, marca, modelo, anio, dominio/identificacion, valor estimado, prenda/gravamen y documentos.
- Deuda: acreedor, tipo, monto, moneda, vencimiento, garantia y observaciones.
- Contador vinculado puede cargar/editar.
- Productor puede ver.
- Banco/empresa no accede hasta Ola 4 con grants.

Criterio de exito:
- Se pueden listar y editar bienes/deudas por productor.
- Los totales patrimoniales quedan listos para dashboards y resumen financiero.
```

## Agente D - Shell privado y dashboards iniciales
**Puede ejecutarse en paralelo con:** Agente A, Agente B, Agente C
**Depende de:** Ola 2 completa

### Objetivo
Crear layout privado, navegacion por rol y dashboards iniciales de productor, contador y entidad.

### Archivos a crear
- `components/layout/AppSidebar.tsx` - navegacion por rol.
- `components/layout/AppHeader.tsx` - header privado.
- `components/dashboard/SummaryCard.tsx` - card reutilizable.
- `app/app/productor/page.tsx` - dashboard productor.
- `app/app/contador/page.tsx` - dashboard contador.
- `app/app/entidad/page.tsx` - dashboard banco/empresa.
- `app/app/admin/page.tsx` - dashboard admin plataforma.

### Archivos a modificar
- `app/app/layout.tsx` - conectar sidebar/header.
- `app/app/page.tsx` - redireccion final por rol.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 3 - Agente D

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa el shell privado y dashboards iniciales.

Reglas de UX:
- App operativa, no landing.
- Usar UI sobria y densa, orientada a trabajo.
- No explicar en pantalla como usar el sistema con textos largos.
- Mostrar tareas, alertas, pendientes y accesos.
- Usar iconos Lucide en botones/nav.

No hacer:
- No implementar formularios de ABM que pertenecen a otros agentes.
- No tocar reglas de seguridad.

Criterio de exito:
- Cada rol entra a un dashboard correcto.
- La navegacion muestra solo modulos permitidos.
- La UI queda lista para conectar contadores, productores, autorizaciones y financiacion.
```

---

## Ola 4 - Autorizaciones y financiacion

> Ejecutar Agente A + Agente B + Agente C en paralelo despues de completar Ola 3.

## Agente A - Solicitudes y grants de acceso
**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 3 completa

### Objetivo
Implementar solicitud, aprobacion, rechazo, revocacion y vencimiento de accesos.

### Archivos a crear
- `lib/services/access-requests.ts` - solicitudes de acceso.
- `lib/services/access-grants.ts` - grants.
- `app/app/productor/autorizaciones/page.tsx` - bandeja productor.
- `app/app/entidad/accesos/page.tsx` - solicitudes de banco/empresa.
- `components/access/AccessRequestForm.tsx` - solicitar acceso.
- `components/access/AccessRequestTable.tsx` - listado.
- `components/access/GrantScopePicker.tsx` - seleccion de scopes.
- `components/access/AuthorizationDecisionDialog.tsx` - aprobar/rechazar.

### Archivos a modificar
- `app/app/layout.tsx` - agregar items de autorizaciones/accesos.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 4 - Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa el sistema de autorizaciones.

Reglas:
- Banco/empresa solicita acceso por productor, finalidad, scopes y vencimiento pedido.
- Productor aprueba, rechaza o revoca.
- Grant aprobado debe tener scopes, inicio, vencimiento, usuario autorizante y estado.
- Contador no autoriza por el productor salvo `canAuthorize=true` en vinculo y con audit log explicito.
- Todo cambio genera audit log.
- Entidades solo ven datos si existe grant activo y no vencido.

Criterio de exito:
- Una entidad puede solicitar acceso.
- El productor ve la solicitud y decide.
- La entidad ve el acceso aprobado y sus limites.
- Revocar corta el acceso.
```

## Agente B - Solicitudes de financiacion y Kanban
**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 3 completa

### Objetivo
Implementar solicitudes de financiacion con tablero Kanban para bancos/empresas.

### Archivos a crear
- `lib/services/financing-requests.ts` - CRUD financiacion.
- `app/app/entidad/financiacion/page.tsx` - Kanban entidad.
- `app/app/productor/financiacion/page.tsx` - solicitudes del productor.
- `components/financing/FinancingRequestForm.tsx` - formulario.
- `components/financing/FinancingKanban.tsx` - tablero.
- `components/financing/FinancingRequestCard.tsx` - tarjeta.
- `components/financing/FinancingStatusBadge.tsx` - estado.

### Archivos a modificar
- `app/app/layout.tsx` - agregar item de financiacion.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 4 - Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa solicitudes de financiacion con estados tipo Kanban.

Estados:
- `draft`
- `requested`
- `pending_authorization`
- `documents_received`
- `in_review`
- `observed`
- `approved`
- `rejected`
- `expired`

Campos:
- productor
- entidad solicitante
- tipo de financiacion
- monto solicitado
- moneda
- plazo
- destino
- documentacion requerida
- estado
- observaciones
- fechas de creacion/actualizacion

Reglas:
- Banco/empresa crea y actualiza estados de sus solicitudes.
- Productor puede ver solicitudes asociadas.
- Para ver documentacion sensible, la solicitud debe estar asociada a grant vigente.
- Todo cambio de estado genera audit log.

Criterio de exito:
- Entidad gestiona solicitudes en tablero.
- Productor ve sus solicitudes.
- Estados y observaciones persisten.
```

## Agente C - Notificaciones, vencimientos y auditoria visible
**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 3 completa

### Objetivo
Implementar notificaciones internas, alertas de vencimiento y vista basica de auditoria.

### Archivos a crear
- `lib/services/notifications.ts` - CRUD notificaciones.
- `lib/services/expirations.ts` - consultas de vencimientos.
- `app/app/notificaciones/page.tsx` - centro de notificaciones.
- `app/app/admin/auditoria/page.tsx` - vista audit logs.
- `components/notifications/NotificationBell.tsx` - campana.
- `components/notifications/NotificationList.tsx` - listado.
- `components/audit/AuditLogTable.tsx` - tabla auditoria.

### Archivos a modificar
- `components/layout/AppHeader.tsx` - agregar campana de notificaciones.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 4 - Agente C

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa notificaciones internas, vencimientos y una vista basica de auditoria.

Alertas iniciales:
- Acceso solicitado pendiente.
- Acceso por vencer.
- Grant vencido.
- Balance pendiente de actualizacion.
- Documento observado.
- Solicitud de financiacion observada.

Reglas:
- No enviar emails todavia, solo notificaciones internas.
- Admin plataforma puede ver auditoria.
- Usuarios comunes ven sus propias notificaciones.
- No modificar servicios de accesos ni financiacion de otros agentes; crear helpers que puedan ser llamados luego.

Criterio de exito:
- Header muestra notificaciones pendientes.
- Existe pagina de notificaciones.
- Admin puede revisar audit logs filtrados.
```

---

## Ola 5 - Verificacion, documentacion y deploy

> Ejecutar Agente A + Agente B en paralelo despues de completar Ola 4.

## Agente A - Pruebas funcionales y datos semilla
**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 4 completa

### Objetivo
Crear validaciones, pruebas funcionales livianas y datos semilla para demo.

### Archivos a crear
- `scripts/seed-demo-data.ts` - datos semilla.
- `scripts/check-security-shape.ts` - chequeo liviano de reglas/colecciones.
- `tests/smoke/auth-flow.test.ts` - smoke test auth/dashboard si hay framework de tests.
- `tests/smoke/access-flow.test.ts` - smoke test acceso si hay framework de tests.
- `docs/QA_CHECKLIST.md` - checklist manual.

### Archivos a modificar
- `package.json` - agregar scripts `seed:demo`, `check:security-shape`, `test:smoke` si aplica.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 5 - Agente A

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Implementa datos semilla y validaciones livianas.

Escenario demo minimo:
- Productor demo.
- Estudio contable demo.
- Contador vinculado.
- Banco demo.
- Empresa agrocomercial demo.
- Periodo fiscal.
- Balance.
- Bien inmueble.
- Bien mueble.
- Documento simulado.
- Solicitud de acceso aprobada.
- Solicitud de financiacion en analisis.

Criterio de exito:
- `pnpm type-check` pasa.
- Se puede generar dataset demo en entorno local/controlado.
- Checklist QA cubre auth, permisos, carga, autorizacion y financiacion.
```

## Agente B - Documentacion operativa y Vercel/Firebase
**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 4 completa

### Objetivo
Documentar instalacion, variables, deploy, seguridad y handoff del proyecto.

### Archivos a crear
- `README.md` - vision del producto y setup.
- `docs/ARQUITECTURA.md` - arquitectura tecnica.
- `docs/MODELO_DATOS.md` - colecciones Firestore.
- `docs/PERMISOS.md` - roles, grants y reglas.
- `docs/DEPLOY_VERCEL_FIREBASE.md` - deploy.
- `reports/HANDOFF_ACTUAL.md` - estado actual para continuidad.

### Archivos a modificar
- `.env.example` - completar variables documentadas.

### Prompt completo para el agente
```text
--- DOCUMENTO FUENTE DE ESTE PLAN ---
Documento: `reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`
Posicion: Ola 5 - Agente B

Lee el documento antes de implementar. Contiene el diseno completo, modelo de datos,
decisiones arquitectonicas y lo que hacen los otros agentes para no duplicar trabajo.

Tarea:
Documenta el proyecto para que otro agente o desarrollador pueda continuar sin preguntar.

Incluir:
- Vision del producto.
- Stack tecnico.
- Como crear proyecto Firebase nuevo.
- Variables necesarias para local y Vercel.
- Como desplegar reglas Firestore/Storage.
- Roles y permisos.
- Modelo de datos.
- Checklist de salida a demo.
- Riesgos pendientes.

Reglas:
- No documentar secretos reales.
- No mencionar que el proyecto usa Firebase de transparencia.
- Dejar claro que los datos financieros son privados por defecto.

Criterio de exito:
- Un desarrollador puede levantar local con README + `.env.example`.
- Vercel/Firebase quedan documentados.
- `reports/HANDOFF_ACTUAL.md` resume que esta hecho, que falta y como validar.
```

---

## 10. Checklist de cierre por fase

Fase 1 queda cerrada cuando:
- Login funciona.
- Roles y memberships existen.
- Productor y contador pueden vincularse.
- Contador carga carpeta basica y documentos.
- Productor ve su informacion.
- Reglas no permiten lectura publica de datos sensibles.

Fase 2 queda cerrada cuando:
- Banco/empresa solicita acceso.
- Productor aprueba/rechaza/revoca.
- Grant vencido corta acceso.
- Audit logs registran acciones sensibles.
- Productor y contador tienen panel operativo.

Fase 3 queda cerrada cuando:
- Banco/empresa crea solicitudes de financiacion.
- Kanban funciona.
- Productor ve estados.
- Observaciones y documentacion requerida quedan trazadas.

Fase 4 queda cerrada cuando:
- Hay ratios preliminares.
- IA resume carpeta solo con autorizacion y logs.
- Se documenta integracion con Don Candido IA.

---

## 11. Riesgos principales

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Reglas Firestore demasiado abiertas | Exposicion de datos financieros | Deny by default, grants y memberships |
| Contador autorizando sin permiso | Riesgo legal/comercial | Solo productor, o delegacion explicita auditada |
| Clonar web publica completa | Deuda tecnica y rutas irrelevantes | Copia selectiva de stack y UI |
| Archivos sensibles en Storage sin control | Filtracion documental | Storage privado + metadata + grants |
| Scoring interpretado como decision bancaria | Riesgo legal | Fase 4 no vinculante, explicabilidad y disclaimers |
| Multiples organizaciones por usuario | Bugs de permisos | Memberships explicitos y seleccion de organizacion |
| Datos fiscales desactualizados | Mala evaluacion | Alertas por periodo/vencimiento |

---

## 12. Primer prompt recomendado para programar

```text
Vamos a implementar la Ola 1 del proyecto Carpeta AgroCredit IA.

Documento fuente:
`reports/001_PLAN_PROYECTO_AGROCREDIT_HUB.md`

Usar como referencia tecnica el proyecto:
`../Web Site transparencia`

Objetivo:
Crear el scaffold inicial de una app Next.js App Router + TypeScript + Firebase/Firestore + Firebase Auth + Firebase Storage + Vercel, reutilizando solo patrones y componentes base del proyecto de transparencia.

No copiar:
- rutas publicas municipales
- contenido editorial
- colecciones de transparencia
- reglas Firestore de lectura publica
- `.env.local` ni secretos

Crear:
- package.json
- app/layout.tsx
- app/login/page.tsx
- app/app/page.tsx
- lib/firebase/config.ts
- lib/firebase/admin-sdk.ts
- components/ui
- styles/globals.css
- firestore.rules cerrado por defecto
- storage.rules cerrado por defecto
- .env.example

Criterio de cierre:
- pnpm install funciona
- pnpm type-check pasa
- /login existe
- /app existe
- no quedan textos ni rutas del Observatorio Transparencia
```

