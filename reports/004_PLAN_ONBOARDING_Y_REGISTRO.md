# Plan Onboarding y Registro — AgroCredit IA

**Fecha:** 2026-05-29
**Feature:** Flujos de registro self-service para usuarios, contadores y entidades solicitantes. Acceso temporizado a carpetas.
**Proyectos afectados:** `Agro-Credit` (único repo)
**Documentos de referencia:**
- `reports/002_REORGANIZACION_BASE_DATOS.md` — modelo de datos canónico
- `reports/003_PLAN_VISTAS_POR_ROL.md` — vistas y rutas por rol

---

## Contexto de negocio

Actualmente el sistema no tiene forma de que un usuario nuevo se registre solo.
Este plan agrega tres flujos de onboarding independientes y el sistema de acceso
temporizado a carpetas (grant con vencimiento configurable en días).

### Flujo 1 — Usuario del sistema (system_user)
Se registra con email/contraseña → crea su organización raíz → crea una o más empresas
hijas (system_user_entity) → elige su contador de una lista de estudios registrados.

### Flujo 2 — Contador (accounting_firm)
Se da de alta → crea su estudio contable → desde su panel puede crear clientes
(system_user + empresas) y cargar carpetas.

### Flujo 3 — Entidad solicitante (requesting_entity)
Se registra → elige el tipo de entidad (banco, financiera, agrocomercial, maquinaria
agrícola, insumos agrícolas) → accede a solicitar carpetas a clientes.

### Acceso temporizado
El grant de acceso tiene una duración en días elegida por la entidad solicitante
al hacer el pedido. El usuario la ve y puede aprobarla o modificarla.
Los grants vencidos se marcan automáticamente y bloquean el acceso.

---

## Nuevos subtypes de requesting_entity

```ts
type RequestingEntitySubtype =
  | "bank"
  | "financial_entity"
  | "agro_company"
  | "maquinaria_agricola"   // venta de maquinaria, accede a carpeta para evaluar venta a plazo
  | "insumos_agricolas"     // semillas, agroquímicos, fertilizantes — venta a plazo
```

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A, B, C | Sí | Nada — base del feature |
| 2 | A, B, C | Sí | Ola 1 completa |
| 3 | A, B | Sí | Ola 2 completa |

---

## Ola 1 — Base: tipos, schemas, API y reglas

> Ejecutar Agente A + Agente B + Agente C en PARALELO

---

### Agente A — Tipos TypeScript y schemas Zod de onboarding

**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** nada — es la primera ola

#### Objetivo
Actualizar los tipos y schemas del dominio para soportar los nuevos subtypes de entidad,
el wizard de onboarding y el grant temporizado.

#### Archivos a crear
- `types/onboarding.ts` — tipos del wizard de registro para cada rol
- `lib/schemas/onboarding.ts` — schemas Zod para los formularios de registro

#### Archivos a modificar
- `types/auth.ts` — agregar `system_user_entity` a OrganizationType, ampliar subtypes de requesting_entity, agregar campos a Organization
- `types/access.ts` — agregar `requestedDays: number` a AccessRequest, `expiresAt` calculado, `targetScope` y `targetOrganizationId`

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Next.js App Router + TypeScript + Firebase/Firestore + Zod
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. reports/002_REORGANIZACION_BASE_DATOS.md — modelo de datos, tipos de organización
2. types/auth.ts — tipos actuales a modificar
3. types/access.ts — tipos actuales a modificar

TAREA 1 — Actualizar types/auth.ts

OrganizationType actual:
  "platform" | "producer" | "accounting_firm" | "bank" | "financial_entity" | "agro_company"

OrganizationType nuevo (reemplazar completamente):
  "platform" | "accounting_firm" | "system_user" | "system_user_entity" | "requesting_entity"

RequestingEntitySubtype (tipo nuevo a agregar):
  "bank" | "financial_entity" | "agro_company" | "maquinaria_agricola" | "insumos_agricolas"

Campos a agregar en la interfaz Organization:
  subtype?: RequestingEntitySubtype          // solo requesting_entity
  parentOrganizationId?: string              // solo system_user_entity, apunta al system_user raíz
  activity?: "agriculture" | "livestock" | "mixed" | "horticulture" | "forestry" | "other"
  province?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  folderStatus?: "incomplete" | "in_progress" | "complete" | "under_review" | "outdated" | "archived"

Reglas de validación que deben quedar documentadas como comentarios:
  - subtype es obligatorio si type === "requesting_entity"
  - parentOrganizationId es obligatorio si type === "system_user_entity"
  - parentOrganizationId no debe existir en ningún otro type

TAREA 2 — Actualizar types/access.ts

AccessRequest — campos a agregar:
  targetOrganizationId: string              // ID de organizations (system_user o system_user_entity)
  targetScope: "single_organization" | "group"  // group = system_user raíz y todas sus hijas
  requestedDays: number                     // días de acceso solicitados por la entidad
  approvedDays?: number                     // días aprobados por el usuario (puede diferir)

AccessGrant — campos a agregar:
  targetOrganizationId: string
  targetScope: "single_organization" | "group"
  includedOrganizationIds?: string[]        // snapshot de orgs incluidas si targetScope === "group"

TAREA 3 — Crear types/onboarding.ts

Tipos necesarios:

// Paso 1 del wizard: datos de registro comunes
interface RegistrationStep {
  email: string
  password: string
  displayName: string
}

// Paso 2 del wizard de system_user: crear organización raíz
interface SystemUserOrgStep {
  legalName: string
  taxId: string          // CUIT
  personType: "physical" | "legal"
  activity: string
  province: string
  city: string
  phone?: string
  email?: string
}

// Paso 3 del wizard de system_user: empresa(s) hija(s)
interface SystemUserEntityStep {
  legalName: string
  taxId: string
  activity: string
  province: string
  city: string
}

// Paso 4 del wizard de system_user: selección de contador
interface AccountantSelectionStep {
  accountingFirmId: string    // ID de organizations donde type === "accounting_firm"
  accountantUid?: string      // si elige una persona específica dentro del estudio
}

// Wizard completo del system_user
interface SystemUserOnboardingData {
  registration: RegistrationStep
  organization: SystemUserOrgStep
  entities: SystemUserEntityStep[]    // mínimo 0, pueden agregar después
  accountant?: AccountantSelectionStep
}

// Wizard del contador/estudio contable
interface AccountingFirmOnboardingData {
  registration: RegistrationStep
  firm: {
    legalName: string
    taxId: string
    contactName: string
    contactPhone?: string
  }
}

// Wizard de entidad solicitante
interface RequestingEntityOnboardingData {
  registration: RegistrationStep
  entity: {
    legalName: string
    taxId: string
    subtype: RequestingEntitySubtype
    contactName: string
    contactEmail: string
    contactPhone?: string
    sector?: string
  }
}

TAREA 4 — Crear lib/schemas/onboarding.ts

Schemas Zod para validar los formularios del wizard.
Importar tipos de types/onboarding.ts.
Reglas:
  - taxId: string de exactamente 11 dígitos (CUIT argentino sin guiones)
  - email: z.string().email()
  - password: mínimo 8 caracteres
  - legalName: mínimo 3 caracteres, máximo 120
  - requestedDays en access_request: entre 1 y 365

No implementes UI ni servicios. Solo tipos y schemas.
Ejecutar pnpm type-check al terminar y corregir errores de compilación.
```

---

### Agente B — API routes de registro y onboarding

**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** nada — es la primera ola

#### Objetivo
Crear los endpoints server-side que manejan el registro, creación de organización,
setup de custom claims y vínculo contador-cliente.

#### Archivos a crear
- `app/api/auth/register/route.ts` — registro Firebase Auth + creación de perfil en users
- `app/api/auth/setup-claims/route.ts` — setear custom claims (role + defaultOrganizationId) con Admin SDK
- `app/api/onboarding/system-user/route.ts` — crear org system_user + opcionalmente system_user_entity(s) + vínculo contador
- `app/api/onboarding/accounting-firm/route.ts` — crear org accounting_firm + perfil del estudio
- `app/api/onboarding/requesting-entity/route.ts` — crear org requesting_entity con subtype
- `app/api/organizations/[orgId]/entities/route.ts` — GET lista de system_user_entity hijas, POST crear nueva

#### Archivos a modificar
- ninguno

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Next.js App Router + TypeScript + Firebase Admin SDK 13+ + Zod
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. reports/002_REORGANIZACION_BASE_DATOS.md — modelo de datos y reglas de seguridad
2. lib/firebase/admin-sdk.ts — cómo se inicializa Firebase Admin
3. lib/firebase/audit.ts — cómo registrar audit_logs
4. lib/auth/server-session.ts — cómo leer la sesión server-side
5. lib/firebase/collections.ts — nombres de colecciones

REGLAS DE SEGURIDAD OBLIGATORIAS (nunca omitir):
  - Nunca tomar organizationId del body — siempre del token de auth o calcularlo server-side
  - Toda acción sensible debe escribir en audit_logs usando lib/firebase/audit.ts
  - Los custom claims solo se setean con Admin SDK, nunca desde el cliente
  - Validar con Zod antes de escribir en Firestore
  - Usar transacciones de Firestore cuando se crean múltiples documentos relacionados

ENDPOINT 1 — POST /api/auth/register
Body: { email, password, displayName, role: "system_user" | "accountant" | "requesting_entity_user" }
Lógica:
  1. Validar con Zod
  2. Crear usuario en Firebase Auth con Admin SDK (createUser)
  3. Crear documento en users/{uid} con status: "pending_onboarding"
  4. NO setear custom claims todavía (se setean después del onboarding)
  5. Retornar { uid, email }
  6. Escribir audit_log: action: "user.registered"
No crear la organización aquí — eso va en el siguiente paso del wizard.

ENDPOINT 2 — POST /api/auth/setup-claims
Requiere: usuario autenticado con uid propio o admin_platform
Body: { uid, role, defaultOrganizationId }
Lógica:
  1. Verificar que el uid del token coincide con el uid del body, O que es admin_platform
  2. Verificar que la organización existe y el uid es member activo
  3. Setear custom claims con Admin SDK: { roles: [role], defaultOrganizationId }
  4. Actualizar users/{uid}.status: "active"
  5. Retornar { success: true }
  6. Audit log: action: "user.claims_set"

ENDPOINT 3 — POST /api/onboarding/system-user
Requiere: usuario autenticado, status: "pending_onboarding"
Body:
  organization: { legalName, taxId, personType, activity, province, city, phone?, email? }
  entities?: Array<{ legalName, taxId, activity, province, city }>
  accountingFirmId?: string
Lógica:
  1. Validar con Zod
  2. En una transacción Firestore:
     a. Crear organizations/{autoId} con type: "system_user", createdBy: uid
     b. Crear organization_members/{orgId}_{uid} con role: "producer", status: "active"
     c. Si entities[] viene: crear cada organization como system_user_entity con parentOrganizationId
     d. Si accountingFirmId viene: crear producer_accountant_links con status: "pending" (el contador confirma)
  3. Llamar a setup-claims internamente para setear role: "producer", defaultOrganizationId
  4. Audit log por cada entidad creada y por el vínculo
  5. Retornar { organizationId, entityIds[], linkId? }

ENDPOINT 4 — POST /api/onboarding/accounting-firm
Requiere: usuario autenticado, status: "pending_onboarding"
Body: { legalName, taxId, contactName, contactPhone? }
Lógica:
  1. Validar con Zod
  2. Transacción Firestore:
     a. Crear organizations/{autoId} con type: "accounting_firm"
     b. Crear organization_members
  3. Setup claims: role: "accountant", defaultOrganizationId
  4. Audit log
  5. Retornar { organizationId }

ENDPOINT 5 — POST /api/onboarding/requesting-entity
Requiere: usuario autenticado, status: "pending_onboarding"
Body: { legalName, taxId, subtype, contactName, contactEmail, contactPhone?, sector? }
  subtype: "bank" | "financial_entity" | "agro_company" | "maquinaria_agricola" | "insumos_agricolas"
Lógica:
  1. Validar subtype contra enum
  2. Transacción Firestore:
     a. Crear organizations con type: "requesting_entity", subtype
     b. Crear organization_members con role: "bank_user" (rol genérico para entidades)
  3. Setup claims
  4. Audit log
  5. Retornar { organizationId }

ENDPOINT 6 — GET /api/organizations/[orgId]/entities
Requiere: usuario autenticado y member de orgId o admin_platform
Lógica: query organizations donde parentOrganizationId == orgId y type == "system_user_entity"
Retornar lista de organizaciones.

POST /api/organizations/[orgId]/entities
Requiere: system_user dueño del orgId (member activo con role producer)
Body: { legalName, taxId, activity, province, city }
Crea una nueva system_user_entity con parentOrganizationId = orgId.
Audit log.

No implementes UI. No implementes componentes React.
Ejecutar pnpm type-check al terminar.
```

---

### Agente C — Colecciones y reglas Firestore actualizadas

**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** nada — es la primera ola

#### Objetivo
Actualizar collections.ts con las nuevas constantes, actualizar firestore.rules para
reflejar el nuevo modelo de organizations sin colecciones legacy, y ajustar los índices.

#### Archivos a modificar
- `lib/firebase/collections.ts` — eliminar PRODUCERS, ACCOUNTING_FIRMS, FINANCIAL_ENTITIES, AGRO_COMPANIES; agregar ORGANIZATION_PROFILES
- `firestore.rules` — eliminar rules de producers/accounting_firms/financial_entities/agro_companies; actualizar canReadFolderData para usar organizations; agregar regla organization_profiles
- `firestore.indexes.json` — agregar índices compuestos para queries de onboarding

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Firebase Firestore + reglas de seguridad
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. reports/002_REORGANIZACION_BASE_DATOS.md — modelo de datos nuevo
2. lib/firebase/collections.ts — estado actual
3. firestore.rules — reglas actuales
4. firestore.indexes.json — índices actuales

TAREA 1 — Actualizar lib/firebase/collections.ts

Eliminar estas constantes (ya no existen como colecciones separadas):
  PRODUCERS, ACCOUNTING_FIRMS, FINANCIAL_ENTITIES, AGRO_COMPANIES

Agregar:
  ORGANIZATION_PROFILES: "organization_profiles"

El archivo resultante debe tener exactamente estas constantes:
  USERS, ORGANIZATIONS, ORGANIZATION_MEMBERS, ORGANIZATION_PROFILES,
  PRODUCER_ACCOUNTANT_LINKS,
  ACCOUNTING_PERIODS, BALANCE_SHEETS, INCOME_STATEMENTS, TAX_DOCUMENTS,
  ASSETS, LIABILITIES, DOCUMENTS,
  ACCESS_REQUESTS, ACCESS_GRANTS, FINANCING_REQUESTS,
  AUDIT_LOGS, NOTIFICATIONS

TAREA 2 — Actualizar firestore.rules

Eliminar completamente los bloques:
  match /producers/{producerId} { ... }
  match /accounting_firms/{firmId} { ... }
  match /financial_entities/{entityId} { ... }
  match /agro_companies/{companyId} { ... }

Reemplazar la función producerOrgId() — ya no existe la colección producers.
El nuevo helper debe:
  - Para datos de carpeta (accounting_periods, balance_sheets, etc.),
    verificar que el documento pertenece a una organización donde el usuario es member
    O que existe un access_grant activo y no vencido para la organización del solicitante.

Nueva función helper canReadFolderData(folderOwnerOrgId):
  return isAuthenticated() && (
    isAdminPlatform() ||
    isAccountant() ||
    isMemberOf(folderOwnerOrgId) ||
    hasActiveGrant(folderOwnerOrgId)
  );

Funciones auxiliares a definir:
  function isMemberOf(orgId) {
    // Verificar en organization_members que el uid del token es member activo de orgId
    return exists(/databases/$(database)/documents/organization_members/$(orgId + "_" + request.auth.uid))
      && get(/databases/$(database)/documents/organization_members/$(orgId + "_" + request.auth.uid)).data.status == "active";
  }

  function hasActiveGrant(targetOrgId) {
    // Esta validación fina se hace server-side — en reglas solo verificamos que es entidad solicitante autenticada
    // Las reglas no pueden verificar grants complejos, eso va en API routes
    return isFinancialEntity();
  }

Regla para organization_profiles:
  match /organization_profiles/{orgId} {
    allow read: if isAuthenticated() && (isMemberOf(orgId) || isAdminPlatform());
    allow write: if isAdminPlatform();
  }

Regla para organizations — expandir para que system_user pueda leer su propia:
  match /organizations/{orgId} {
    allow read: if isAuthenticated();
    allow create: if false; // solo via API (Admin SDK)
    allow update: if isAdminPlatform();
    allow delete: if false;
  }

Actualizar los bloques de carpeta contable para usar el nuevo campo folderOwnerOrganizationId:
  En lugar de canReadProducerData(resource.data.producerId), usar:
  canReadFolderData(resource.data.folderOwnerOrganizationId)

TAREA 3 — Actualizar firestore.indexes.json

Agregar índices compuestos para:
  1. organizations: [type ASC, status ASC] — para filtrar por tipo en onboarding
  2. organizations: [type ASC, parentOrganizationId ASC] — para listar hijas
  3. organizations: [parentOrganizationId ASC, status ASC] — para hijas activas
  4. producer_accountant_links: [accountingFirmId ASC, status ASC] — para contador viendo sus clientes
  5. access_grants: [targetOrganizationId ASC, status ASC, expiresAt ASC] — para verificar grants vigentes

No implementes UI. No implementes servicios TypeScript.
Verificar que las reglas compilan con firebase emulators si es posible.
```

---

## Ola 2 — Wizards de registro (frontend)

> Ejecutar SOLO después de que Ola 1 esté completa
> Ejecutar Agente A + Agente B + Agente C en PARALELO

---

### Agente A — Wizard de registro para Usuario del Sistema

**Puede ejecutarse en paralelo con:** Agente B, Agente C
**Depende de:** Ola 1 completa (tipos, schemas y API de onboarding)

#### Objetivo
Crear el wizard multi-paso de registro para el rol Usuario del Sistema:
registro → organización raíz → empresas hijas → selección de contador.

#### Archivos a crear
- `app/registro/usuario/page.tsx` — página contenedora del wizard
- `components/onboarding/usuario/WizardUsuario.tsx` — wizard con stepper
- `components/onboarding/usuario/Step1Registro.tsx` — email, contraseña, nombre
- `components/onboarding/usuario/Step2Organizacion.tsx` — datos del system_user raíz
- `components/onboarding/usuario/Step3Empresas.tsx` — agregar empresas hijas (lista + form)
- `components/onboarding/usuario/Step4Contador.tsx` — buscar y seleccionar estudio contable
- `components/onboarding/usuario/WizardSuccess.tsx` — pantalla de éxito con acceso al dashboard

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Next.js App Router + TypeScript + React 19 + Zod + React Hook Form + shadcn/ui + Tailwind + Lucide icons
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. types/onboarding.ts — tipos del wizard (creado en Ola 1 Agente A)
2. lib/schemas/onboarding.ts — schemas Zod (creado en Ola 1 Agente A)
3. components/ui/ — componentes UI disponibles (Button, Input, Card, etc.)
4. app/login/page.tsx — como modelo de estilo de autenticación

TAREA — Crear wizard de 4 pasos para el Usuario del Sistema

Flujo:
  Paso 1 — Cuenta: email, contraseña, nombre completo
    Llama a POST /api/auth/register con role: "system_user"
    Si éxito, hace login automático con Firebase Auth cliente

  Paso 2 — Tu organización: datos del system_user raíz
    Campos: nombre legal, CUIT (11 dígitos sin guiones), tipo de persona (física/jurídica),
    actividad principal, provincia, ciudad, teléfono (opcional), email de contacto (opcional)
    Validar con schema Zod de SystemUserOrgStep

  Paso 3 — Tus empresas (opcional, puede saltar):
    Lista de empresas ya agregadas (inicia vacía)
    Formulario inline para agregar: nombre legal, CUIT, actividad, provincia, ciudad
    Botón "Agregar empresa" — agrega a lista local
    Botón "Omitir por ahora" — avanza sin empresas
    El usuario puede agregar más empresas desde su dashboard después

  Paso 4 — Tu contador (opcional, puede saltar):
    Campo de búsqueda que llama a GET /api/organizations?type=accounting_firm&search=
    Muestra lista de estudios contables con nombre y CUIT
    El usuario selecciona uno — esto crea un producer_accountant_link con status: "pending"
    El contador deberá aceptar el vínculo desde su dashboard
    Botón "Omitir por ahora" — puede vincular contador después

  Al completar todos los pasos:
    POST /api/onboarding/system-user con todos los datos
    Mostrar WizardSuccess con botón a /app/usuario

UX obligatoria:
  - Stepper visual en la parte superior mostrando en qué paso está
  - Botón "Atrás" en todos los pasos excepto el primero
  - Mostrar errores de validación inline
  - Loading state mientras llama a la API
  - El stepper no debe navegar a un paso anterior si el paso actual tiene errores

Estilo: usar componentes de components/ui/. No crear estilos custom innecesarios.
No implementes lógica de autorizaciones ni carpeta contable — eso es otro módulo.
Ejecutar pnpm type-check al terminar.
```

---

### Agente B — Wizard de registro para Contador

**Puede ejecutarse en paralelo con:** Agente A, Agente C
**Depende de:** Ola 1 completa

#### Objetivo
Crear el wizard de registro para contadores/estudios contables y el panel de gestión
de clientes donde el contador crea y vincula usuarios del sistema.

#### Archivos a crear
- `app/registro/contador/page.tsx` — wizard de registro del contador
- `components/onboarding/contador/WizardContador.tsx` — wizard 2 pasos
- `components/onboarding/contador/Step1RegistroContador.tsx` — cuenta
- `components/onboarding/contador/Step2Estudio.tsx` — datos del estudio
- `components/onboarding/contador/WizardSuccessContador.tsx` — éxito
- `components/contador/ClienteNuevoDialog.tsx` — dialog para crear cliente desde panel del contador
- `components/contador/VinculoPendienteCard.tsx` — card para aceptar/rechazar vínculo pendiente

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Next.js App Router + TypeScript + React 19 + Zod + React Hook Form + shadcn/ui + Tailwind + Lucide icons
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. types/onboarding.ts — tipos del wizard
2. lib/schemas/onboarding.ts — schemas Zod
3. components/ui/ — componentes disponibles
4. app/login/page.tsx — modelo de estilo

TAREA 1 — Wizard de registro del contador (2 pasos)

Paso 1 — Cuenta:
  email, contraseña, nombre completo del contador
  Llama a POST /api/auth/register con role: "accountant"

Paso 2 — Estudio contable:
  nombre legal del estudio, CUIT, nombre de contacto, teléfono de contacto (opcional)
  Llama a POST /api/onboarding/accounting-firm
  Al éxito llama a WizardSuccessContador → botón a /app/contador

TAREA 2 — ClienteNuevoDialog

El contador puede crear clientes desde su dashboard.
Este dialog tiene un mini-wizard de 2 pasos:

  Paso 1 — Datos del cliente (system_user):
    nombre legal, CUIT, tipo (física/jurídica), actividad, provincia, ciudad

  Paso 2 — Primera empresa hija (opcional):
    igual que Step3Empresas del wizard de usuario pero opcional

Al guardar:
  POST /api/onboarding/system-user con los datos
  Pero usando la sesión del contador — el backend debe aceptar que un contador
  cree un system_user y quedarse como su contador vinculado (canUpload: true, status: "active")
  Nota: en este caso el vínculo queda activo directamente (el contador lo creó él mismo)

Nota para el backend: este caso de uso requiere que el endpoint /api/onboarding/system-user
acepte un query param ?createdByAccountant=true que setea el vínculo como activo
en lugar de pending.

TAREA 3 — VinculoPendienteCard

Cuando un usuario del sistema elige al contador desde su wizard, el contador ve
una tarjeta con el vínculo pendiente de aceptar.

Card muestra:
  Nombre del sistema_user que solicita el vínculo
  CUIT del sistema_user
  Botón "Aceptar" → PATCH /api/producer-accountant-links/{linkId} { status: "active" }
  Botón "Rechazar" → PATCH { status: "rejected" }

Ubicación: este componente se usa en /app/contador (dashboard del contador).
No implementes la página del dashboard — solo el componente.
Ejecutar pnpm type-check al terminar.
```

---

### Agente C — Wizard de registro para Entidad Solicitante

**Puede ejecutarse en paralelo con:** Agente A, Agente B
**Depende de:** Ola 1 completa

#### Objetivo
Crear el wizard de registro para entidades solicitantes (bancos, financieras,
agrocomerciales, maquinaria agrícola, insumos agrícolas).

#### Archivos a crear
- `app/registro/entidad/page.tsx` — wizard de registro de entidad
- `components/onboarding/entidad/WizardEntidad.tsx` — wizard 2 pasos
- `components/onboarding/entidad/Step1RegistroEntidad.tsx` — cuenta
- `components/onboarding/entidad/Step2DatosEntidad.tsx` — tipo + datos
- `components/onboarding/entidad/SubtypeSelector.tsx` — selector visual de tipo de entidad
- `components/onboarding/entidad/WizardSuccessEntidad.tsx` — éxito

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Next.js App Router + TypeScript + React 19 + Zod + React Hook Form + shadcn/ui + Tailwind + Lucide icons
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. types/onboarding.ts — tipos del wizard
2. lib/schemas/onboarding.ts — schemas Zod
3. types/auth.ts — RequestingEntitySubtype (los 5 valores posibles)
4. components/ui/ — componentes disponibles

TAREA — Wizard de registro de entidad solicitante (2 pasos)

Paso 1 — Cuenta:
  email, contraseña, nombre completo del representante
  POST /api/auth/register con role: "requesting_entity_user"

Paso 2 — Datos de la entidad:
  2a) SubtypeSelector — selector visual de tipo de entidad con cards:
    - 🏦 Banco
    - 🏢 Financiera
    - 🌾 Empresa agrocomercial
    - 🚜 Maquinaria agrícola
    - 🌱 Insumos agrícolas (semillas, agroquímicos, fertilizantes)
  
  Según el subtipo seleccionado, mostrar campos adicionales relevantes:
    - Todos: nombre legal, CUIT, nombre de contacto, email de contacto, teléfono (opcional)
    - bank/financial_entity: sin campos extra
    - agro_company/maquinaria_agricola/insumos_agricolas: sector (campo libre, ej: "Semillas", "Fertilizantes")

  POST /api/onboarding/requesting-entity con todos los datos
  Al éxito: WizardSuccessEntidad → botón a /app/entidad

SubtypeSelector:
  Grid de 2 o 3 columnas con cards clicables
  Card activa se resalta (border coloreado)
  Cada card tiene: icono Lucide relevante, nombre, descripción en 1 línea
  Iconos sugeridos: Building2 (banco), Landmark (financiera), Wheat (agrocomercial), Tractor (maquinaria), Sprout (insumos)

Página /registro:
  Crear también app/registro/page.tsx — página de selección de tipo:
  "¿Cómo querés usar AgroCredit?"
  3 cards grandes: Usuario del sistema | Contador | Entidad solicitante
  Cada card lleva a su wizard correspondiente.
  Link a /login para quienes ya tienen cuenta.

Ejecutar pnpm type-check al terminar.
```

---

## Ola 3 — Acceso temporizado y guard de carpeta

> Ejecutar SOLO después de que Ola 2 esté completa
> Ejecutar Agente A + Agente B en PARALELO

---

### Agente A — AccessRequestDialog con duración configurable

**Puede ejecutarse en paralelo con:** Agente B
**Depende de:** Ola 2 completa

#### Objetivo
Actualizar el flujo de solicitud de acceso para que la entidad elija cuántos días
necesita, y el usuario vea esa duración al aprobar o modificarla antes de aceptar.

#### Archivos a crear
- `components/access/DurationPicker.tsx` — selector de días (preset + custom)
- `components/access/GrantScopeAndDurationForm.tsx` — scopes + duración en un form

#### Archivos a modificar
- `components/access/AccessRequestForm.tsx` — agregar campo requestedDays con DurationPicker
- `components/access/AuthorizationDecisionDialog.tsx` — mostrar días solicitados, permitir modificar antes de aprobar

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Next.js App Router + TypeScript + React 19 + shadcn/ui + Tailwind + Lucide icons
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. types/access.ts — campo requestedDays y approvedDays (agregados en Ola 1)
2. components/access/AccessRequestForm.tsx — formulario actual a modificar
3. components/access/AuthorizationDecisionDialog.tsx — dialog actual a modificar
4. components/ui/ — componentes disponibles

TAREA 1 — DurationPicker

Componente: selector de duración en días con opciones preset + campo custom.

Props: value: number, onChange: (days: number) => void

Presets (buttons toggle):
  15 días | 30 días | 60 días | 90 días | 180 días | 1 año (365 días)

Campo personalizado:
  Input numérico entre 1 y 365 días
  Si el usuario escribe un valor, deselecciona el preset

Mostrar fecha calculada de vencimiento:
  "Acceso hasta el [fecha calculada]" en texto secundario

TAREA 2 — Modificar AccessRequestForm

Agregar al final del formulario, antes de enviar:
  1. GrantScopeAndDurationForm que combina:
     - Selector de scopes (ya existe, mantenerlo)
     - DurationPicker para requestedDays
     - targetScope: radio "Solo esta empresa" vs "Todo el grupo del cliente" (si el target es system_user)
  2. Campo "Finalidad" (purpose) ya existe, mantenerlo

Al enviar, incluir en el body de POST /api/access-requests:
  requestedScopes, requestedDays, purpose, targetOrganizationId, targetScope

TAREA 3 — Modificar AuthorizationDecisionDialog

Cuando el usuario (system_user) ve una solicitud pendiente, mostrar:
  - Quién solicita (nombre de la entidad)
  - Para qué organización (la suya raíz o una empresa hija específica)
  - Scopes solicitados (lista de badges)
  - Días solicitados + fecha de vencimiento calculada
  - Input editable "Días aprobados" (preseleccionado con los días solicitados, modificable)
  - Dos botones: "Aprobar" y "Rechazar"
  - Si rechaza: mostrar campo "Motivo (opcional)"

Al aprobar:
  PATCH /api/access-requests/{requestId}/decision
  Body: { decision: "approved", approvedDays: number }
  El backend calcula expiresAt = now + approvedDays días y crea el access_grant

Ejecutar pnpm type-check al terminar.
```

---

### Agente B — ScopeGuard y banner de grant en CarpetaViewer

**Puede ejecutarse en paralelo con:** Agente A
**Depende de:** Ola 2 completa

#### Objetivo
Crear el componente ScopeGuard que bloquea secciones de la carpeta según el grant
activo, y el banner que muestra el vencimiento del acceso a las entidades solicitantes.

#### Archivos a crear
- `components/access/ScopeGuard.tsx` — wrapper que bloquea contenido según scope del grant
- `components/access/GrantStatusBanner.tsx` — banner de acceso activo con vencimiento
- `components/access/GrantExpiredBlocker.tsx` — pantalla de bloqueo si el grant venció
- `app/entidad/carpetas/[targetOrgId]/page.tsx` — single de carpeta con ScopeGuard integrado

#### Prompt completo para el agente

```text
Proyecto: AgroCredit IA — SaaS agrofinanciero privado
Stack: Next.js App Router + TypeScript + React 19 + shadcn/ui + Tailwind + Lucide icons
Directorio de trabajo: raíz del proyecto

Lee antes de implementar:
1. types/access.ts — AccessGrant y AccessScope (actualizado en Ola 1)
2. reports/003_PLAN_VISTAS_POR_ROL.md — sección de la vista de entidad y ScopeGuard
3. components/ui/ — componentes disponibles
4. lib/auth/server-access.ts — helpers de validación de acceso server-side

TAREA 1 — ScopeGuard

Componente cliente que recibe el grant activo y el scope requerido.
Si el scope no está en el grant, muestra un bloqueo. Si está, renderiza children.

Props:
  grant: AccessGrant | null
  requiredScope: AccessScope
  children: React.ReactNode

Comportamiento:
  - Si grant es null: mostrar GrantExpiredBlocker con mensaje "Sin acceso autorizado"
  - Si grant.status !== "approved": igual
  - Si grant.expiresAt < now: mostrar GrantExpiredBlocker con mensaje "Acceso vencido"
  - Si requiredScope no está en grant.allowedScopes: mostrar sección bloqueada con candado
  - Si todo ok: renderizar children normalmente

Sección bloqueada (scope no incluido):
  Fondo gris claro, icono Lock de Lucide, texto "Sección no incluida en el acceso autorizado"
  Sin botón de acción — solo informativo

TAREA 2 — GrantStatusBanner

Banner sticky en la parte superior de la carpeta del cliente (vista entidad).
Muestra: nombre del cliente, scopes activos (badges), días restantes de acceso, fecha de vencimiento.

Props: grant: AccessGrant, organizationName: string

Si quedan menos de 7 días: banner amarillo con advertencia
Si venció: banner rojo
Si activo y ok: banner verde/neutro

Incluir botón "Solicitar renovación" que abre AccessRequestForm precompletado.

TAREA 3 — Página /app/entidad/carpetas/[targetOrgId]

Server component que:
  1. Lee targetOrgId de los params
  2. Verifica la sesión server-side (lib/auth/server-session.ts)
  3. Busca el access_grant activo para (requesterOrganizationId del usuario, targetOrgId)
     usando lib/auth/server-access.ts
  4. Si no hay grant o venció: renderiza GrantExpiredBlocker a pantalla completa
  5. Si hay grant activo: renderiza GrantStatusBanner + tabs de la carpeta con ScopeGuard en cada sección

Tabs de la carpeta (igual que en /app/usuario/carpeta/[orgId] pero read-only):
  - Resumen (scope: accounting_summary)
  - Balances (scope: balance_sheets)
  - Resultados (scope: income_statements)
  - Impuestos (scope: tax_documents)
  - Patrimonio (scope: assets)
  - Deudas (scope: liabilities)
  - Documentos (scope: documents)

Cada tab está envuelto en ScopeGuard con el scope correspondiente.
Los datos de cada tab se cargan solo si ScopeGuard los deja pasar
(no cargar datos de secciones bloqueadas — no hacer fetch innecesario).

No implementes los formularios de edición. Esta vista es 100% read-only.
Ejecutar pnpm type-check al terminar.
```

---

## Verificación final

Al completar las 3 olas, verificar manualmente:

### Registro y onboarding
- [ ] `/registro` muestra las 3 opciones de rol
- [ ] Wizard de usuario completa los 4 pasos y crea organization + entities + link en Firestore
- [ ] Wizard de contador completa 2 pasos y crea accounting_firm en Firestore
- [ ] Wizard de entidad muestra SubtypeSelector con los 5 tipos y crea requesting_entity
- [ ] `pnpm type-check` pasa sin errores

### Vínculo contador-cliente
- [ ] Cuando un usuario elige su contador, el vínculo aparece en el dashboard del contador como "pendiente"
- [ ] El contador puede aceptar o rechazar el vínculo desde VinculoPendienteCard
- [ ] Cuando el contador crea un cliente, el vínculo queda activo directamente

### Acceso temporizado
- [ ] AccessRequestForm incluye DurationPicker con presets y campo custom
- [ ] AuthorizationDecisionDialog muestra los días solicitados y permite modificarlos
- [ ] El grant aprobado tiene expiresAt calculado correctamente
- [ ] ScopeGuard bloquea secciones no incluidas en el grant
- [ ] GrantStatusBanner muestra advertencia cuando quedan menos de 7 días
- [ ] GrantExpiredBlocker bloquea la carpeta completa si el grant venció

### Tipos de entidad
- [ ] Los 5 subtypes aparecen en el SubtypeSelector con iconos y descripciones
- [ ] Un usuario registrado como "maquinaria_agricola" accede a /app/entidad correctamente

---

## Notas para implementación

1. **Firestore está vacío** — no hay datos legacy que migrar. Implementar clean desde el inicio.
2. **Custom claims** — el endpoint /api/auth/setup-claims es el que desbloquea el acceso al dashboard.
   Sin él, el usuario queda con status: "pending_onboarding" y no puede usar la app.
3. **Vínculo contador-cliente en dos sentidos** — el usuario elige al contador (pending),
   el contador acepta (active). O el contador crea al cliente (active directo).
4. **ExpiresAt** — siempre calculado server-side: `new Date(Date.now() + approvedDays * 86400000).toISOString()`
5. **ScopeGuard** — no hace fetch de datos si el scope está bloqueado. Esto es importante para no
   exponer datos en la respuesta HTTP aunque la UI los bloquee visualmente.
