# Reorganizacion Base de Datos - AgroCredit IA

**Fecha:** 2026-05-29  
**Estado:** plan de reorganizacion/refactor, no implementado en codigo  
**Decision solicitada:** cambiar el concepto de **Productor** por
**Usuario del sistema**.

---

## Decision ejecutiva

El cambio queda aprobado conceptualmente: el actor raiz ya no debe llamarse
"productor", sino **Usuario del sistema**.

Importante: no conviene usar simplemente `user` como nombre tecnico, porque ya
existe la coleccion `users`, que representa personas autenticadas por Firebase
Auth. Para evitar confusion:

| Concepto | Significado | Nombre tecnico recomendado |
|---|---|---|
| `users` | Personas que inician sesion: contador, admin, banco, usuario, etc. | Se mantiene `users` |
| Usuario del sistema | Titular/cliente raiz dentro de AgroCredit | `system_user` |
| Empresa del usuario | Empresa, establecimiento, SA, SRL u otra carpeta propia vinculada al usuario | `system_user_entity` |

Entonces, la raiz canonica sigue siendo `organizations`, pero el tipo que antes
era `producer` pasa a ser `system_user`.

---

## Modelo canonico nuevo

Todas las entidades vivas del sistema son organizaciones. Lo que cambia es el
`type` y, cuando corresponde, el `subtype`.

| type | Descripcion | Reemplaza o cubre |
|---|---|---|
| `platform` | Plataforma AgroCredit | Igual |
| `accounting_firm` | Estudio contable | `accounting_firms` legacy |
| `system_user` | Usuario del sistema, titular raiz | `producers` legacy |
| `system_user_entity` | Empresa/carpeta hija del usuario del sistema | Nuevo |
| `requesting_entity` | Banco, financiera o empresa agrocomercial | `financial_entities` + `agro_companies` legacy |

Subtipos de `requesting_entity`:

```ts
type RequestingEntitySubtype = "bank" | "financial_entity" | "agro_company"
```

Los roles de personas siguen viviendo en `organization_members`. La organizacion
define que es la entidad; la membresia define que puede hacer cada persona.

---

## Diferencia clave: `users` vs `system_user`

Esta separacion es obligatoria para no mezclar autenticacion con negocio.

- `users`: perfil de una persona autenticada. Ejemplo: Juan Perez entra al sistema.
- `organization_members`: dice en que organizacion trabaja o actua Juan Perez.
- `organizations/type=system_user`: representa al usuario/titular cliente de
  AgroCredit, con su carpeta y sus empresas vinculadas.

Ejemplo:

```text
users/{uidJuan}
  email: "juan@email.com"

organizations/{orgUsuarioJuan}
  type: "system_user"
  legalName: "Juan Perez"
  taxId: "20..."

organization_members/{memberId}
  uid: uidJuan
  organizationId: orgUsuarioJuan
  role: "producer" // rol legacy a revisar luego, o renombrar a "system_user"
```

Nota: el rol `producer` tambien deberia renombrarse mas adelante, pero no en la
misma ola si queremos bajar riesgo. La decision minima es renombrar el modelo de
organizacion primero.

---

## Schema base de `organizations`

```ts
type OrganizationType =
  | "platform"
  | "accounting_firm"
  | "system_user"
  | "system_user_entity"
  | "requesting_entity"

type OrganizationStatus = "active" | "inactive" | "suspended" | "pending"
type OrganizationPlan = "free" | "basic" | "pro" | "enterprise"

interface Organization {
  id: string
  type: OrganizationType
  subtype?: "bank" | "financial_entity" | "agro_company"
  legalName: string
  taxId: string
  status: OrganizationStatus
  plan?: OrganizationPlan
  parentOrganizationId?: string
  createdAt: string
  updatedAt: string
  createdBy: string
}
```

Reglas:

- `parentOrganizationId` solo aplica a `system_user_entity`.
- Si `type` es `system_user_entity`, el padre debe ser una organizacion
  `system_user`.
- Si `type` es `requesting_entity`, `subtype` es obligatorio.
- Si `type` no es `requesting_entity`, `subtype` no debe existir.

---

## Nueva coleccion `organization_profiles`

`organization_profiles` guarda datos extendidos por tipo sin inflar el documento
principal de `organizations`.

ID recomendado del documento: igual a `organizationId`.

```ts
interface OrganizationProfile {
  id: string
  organizationId: string
  type: OrganizationType
  systemUserProfile?: {
    personType: "physical" | "legal"
    activity?: "agriculture" | "livestock" | "mixed" | "horticulture" | "forestry" | "other"
    province?: string
    city?: string
    address?: string
    phone?: string
    email?: string
    folderStatus: "incomplete" | "in_progress" | "complete" | "under_review" | "outdated" | "archived"
  }
  accountingFirmProfile?: {
    contactName: string
    contactEmail: string
    contactPhone?: string
  }
  requestingEntityProfile?: {
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    sector?: string
  }
  createdAt: string
  updatedAt: string
}
```

---

## Usuario del sistema y empresas hijas

Un Usuario del sistema puede tener varias empresas hijas. Cada empresa hija tiene
su propia carpeta contable y patrimonial.

```text
organizations/{systemUserOrgId}
  type: "system_user"

organizations/{systemUserEntityOrgId}
  type: "system_user_entity"
  parentOrganizationId: systemUserOrgId
```

Decisiones:

- Cada `system_user` puede tener carpeta propia.
- Cada `system_user_entity` tiene carpeta propia e independiente.
- Los documentos contables y patrimoniales apuntan al ID de la organizacion con
  carpeta propia.
- El campo actual `producerId` debe dejar de ser el nombre canonico. El nombre
  correcto de destino es `folderOwnerOrganizationId`.

Transicion recomendada:

```text
producerId = alias legacy temporal
folderOwnerOrganizationId = nombre canonico nuevo
```

---

## Vinculo contador - Usuario del sistema

El contador se vincula al Usuario del sistema raiz. Desde ese vinculo se deriva
el acceso a las empresas hijas.

```text
producer_accountant_links/{linkId} // nombre legacy, renombrable despues
  systemUserOrganizationId: systemUserOrgId
  accountingFirmId: accountingFirmOrganizationId
  accountantUid: uid
```

Durante compatibilidad se puede mantener:

```text
producerId = systemUserOrganizationId
```

Reglas de implementacion:

- Para cargar datos de un `system_user`, validar link activo contra ese usuario.
- Para cargar datos de un `system_user_entity`, resolver primero su
  `parentOrganizationId` y validar link activo contra el Usuario del sistema raiz.
- `canUpload` se hereda a empresas hijas.
- `canAuthorize` exige auditoria explicita en cada decision.

---

## Autorizaciones y financiacion

El modelo actual usa `producerId` en `access_requests`, `access_grants` y
`financing_requests`. El modelo nuevo debe apuntar a una organizacion objetivo.

Campo canonico nuevo:

```ts
targetOrganizationId: string // system_user o system_user_entity
```

Campos recomendados:

```ts
targetOrganizationId: string
targetScope: "single_organization" | "group"
includedOrganizationIds?: string[]
```

Reglas:

- Si `targetScope` es `single_organization`, el grant habilita solo esa carpeta.
- Si `targetScope` es `group`, `targetOrganizationId` debe ser un `system_user`
  raiz.
- En grants de grupo, `includedOrganizationIds` guarda un snapshot de las
  organizaciones incluidas al aprobar.
- Durante compatibilidad, escribir tambien `producerId = targetOrganizationId`.
- Servicios nuevos deben leer `targetOrganizationId ?? producerId`.

---

## Colecciones canonicas finales

Quedan **17 colecciones**. Se parte de 20, se eliminan 4 legacy y se agrega
`organization_profiles`.

| # | Coleccion | Estado final | Notas |
|---|---|---|---|
| 1 | `users` | sin cambio | Personas autenticadas |
| 2 | `organizations` | redisenada | Raiz de todas las entidades |
| 3 | `organization_members` | sin cambio | Membresias y roles |
| 4 | `organization_profiles` | nueva | Datos extendidos por tipo |
| 5 | `producer_accountant_links` | se mantiene temporalmente | FKs apuntan a `organizations`; nombre legacy |
| 6 | `accounting_periods` | se mantiene | Usar `folderOwnerOrganizationId`; `producerId` queda como alias temporal |
| 7 | `balance_sheets` | se mantiene | Igual |
| 8 | `income_statements` | se mantiene | Igual |
| 9 | `tax_documents` | se mantiene | Igual |
| 10 | `assets` | se mantiene | Igual |
| 11 | `liabilities` | se mantiene | Igual |
| 12 | `documents` | se mantiene | Igual |
| 13 | `access_requests` | se mantiene | Agrega `targetOrganizationId` |
| 14 | `access_grants` | se mantiene | Agrega `targetOrganizationId` |
| 15 | `financing_requests` | se mantiene | Agrega `targetOrganizationId` |
| 16 | `notifications` | sin cambio | Notificaciones internas |
| 17 | `audit_logs` | sin cambio | Auditoria inmutable logica |

Colecciones legacy a eliminar al final:

```text
producers
accounting_firms
financial_entities
agro_companies
```

---

## Impacto en codigo existente

| Area | Archivos principales | Cambio requerido |
|---|---|---|
| Constantes Firestore | `lib/firebase/collections.ts` | Agregar `ORGANIZATION_PROFILES`; mantener legacy como deprecated hasta cleanup. |
| Tipos auth/org | `types/auth.ts` | Cambiar `OrganizationType`; agregar subtype y perfiles. |
| Productores legacy | `types/producer.ts`, `lib/schemas/producer.ts` | Renombrar conceptualmente a Usuario del sistema, manteniendo aliases temporales. |
| Servicios legacy | `lib/services/producers.ts` | Reapuntar a `organizations` + `organization_profiles`. |
| Estudios | `lib/services/accounting-firms.ts` | Reapuntar a `organizations` + `organization_profiles`. |
| Links contador | `lib/services/producer-accountant-links.ts` | Validar usuario raiz o empresa hija por `parentOrganizationId`. |
| Server access | `lib/auth/server-access.ts` | Reemplazar lectura directa de `producers` por helper de organizacion objetivo. |
| Accesos/grants | `types/access.ts`, `lib/schemas/access.ts`, `lib/services/access-*`, `app/api/access-*` | Agregar `targetOrganizationId`, dual-read y dual-write temporal. |
| Financiacion | `types/financing.ts`, `lib/schemas/financing.ts`, `lib/services/financing-requests.ts`, `app/api/financing-*` | Igual que accesos. |
| Firestore rules | `firestore.rules` | Reemplazar `producerOrgId()` por validacion contra `organizations/{id}`. |
| Indices | `firestore.indexes.json` | Agregar indices por `type`, `parentOrganizationId`, `targetOrganizationId`. |
| Docs | `docs/MODELO_DATOS.md`, `docs/MODULE_REGISTRY.md`, `docs/PERMISOS.md`, `docs/SEGURIDAD_FIRESTORE.md`, `reports/HANDOFF_ACTUAL.md` | Actualizar cuando se implemente. |

---

## Plan por olas

### Ola 1 - Contratos y nombres

- Agregar tipos `system_user` y `system_user_entity`.
- Agregar `organization_profiles`.
- Mantener `producer` y `producerId` como aliases legacy mientras compila todo.
- Validar con `pnpm type-check`.

### Ola 2 - Servicios de Usuario del sistema

- Reapuntar altas y lecturas a `organizations` + `organization_profiles`.
- Crear helpers:
  - `getSystemUserOrganizationById`
  - `assertSystemUserOrEntity`
  - `resolveSystemUserRootOrganizationId`
  - `getFolderOwnerOrganizationById`
- Mantener rutas actuales hasta terminar la conversion.

### Ola 3 - Datos existentes, si los hay

- Si no hay datos reales: no hay migracion, solo se cambia el esquema.
- Si hay datos reales: crear script idempotente para pasar datos legacy a
  `organizations` + `organization_profiles`.

### Ola 4 - Accesos y financiacion

- Agregar `targetOrganizationId`.
- Agregar `targetScope`.
- Mantener `producerId` como alias temporal.
- Validar que un acceso a Usuario del sistema no incluya empresas hijas salvo
  permiso de grupo explicito.

### Ola 5 - Reglas, indices y docs

- Actualizar Firestore rules.
- Actualizar indices.
- Actualizar docs y handoff.
- Recien despues retirar colecciones y nombres legacy.

---

## Recomendacion final

Me parece bien cambiar **Productor** por **Usuario del sistema**, pero yo lo haria
con nombre tecnico `system_user`, no `user`, para no chocar con la coleccion
`users`. Es un ajuste sano: separa mejor al cliente/titular del sistema de la
persona que inicia sesion.
