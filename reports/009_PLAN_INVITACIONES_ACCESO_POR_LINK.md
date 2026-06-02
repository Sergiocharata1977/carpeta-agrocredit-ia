# Plan 009 - Invitaciones de acceso por link

**Fecha:** 2026-06-02  
**Feature:** Cliente o contador envia un link a un financista, banco, proveedor u otro tercero autorizado para que cree su clave, ingrese y vea solo la informacion permitida.  
**Clasificacion:** core del producto, integrado al dominio de `access_requests` / `access_grants`.  
**Estado:** draft listo para implementar.

---

## 1. Decision ejecutiva

Implementar un flujo de **invitacion por link con acceso restringido por scopes y vencimiento**.

El link no debe exponer informacion por si mismo. El link solo abre una invitacion pendiente. El receptor tiene que crear cuenta o iniciar sesion, quedar asociado a una organizacion solicitante o perfil invitado, y recien ahi el sistema crea o activa un `access_grant`.

Este plan completa y amplia la Ola 3 del Plan 004:

- `ScopeGuard`
- `GrantStatusBanner`
- `GrantExpiredBlocker`
- Vista read-only de carpeta para entidad/invitado
- Nuevo flujo push: el cliente o contador envia el link, en vez de esperar que la entidad solicite acceso.

---

## 2. Problema y objetivo

### Problema

Hoy el sistema contempla que una entidad solicitante pida acceso a una carpeta. Falta el camino comercial mas directo: que el cliente o el contador puedan compartir la informacion con un financista especifico mediante un link controlado.

### Objetivo

Permitir que:

1. El cliente o contador elija que carpeta compartir.
2. Defina quien la recibe.
3. Defina que secciones puede ver.
4. Defina por cuanto tiempo.
5. Envie un link.
6. El receptor cree su propia clave o inicie sesion.
7. El receptor vea solo lo autorizado.
8. Todo quede auditado.

---

## 3. Principio de seguridad

La invitacion debe cumplir estas reglas:

- El link no es acceso publico.
- El token de invitacion debe ser opaco, largo, hasheado en base de datos y con vencimiento.
- La invitacion queda ligada a un email receptor.
- Si el receptor se registra con otro email, no puede aceptar la invitacion.
- La lectura de datos se valida server-side contra `access_grants`, no solo en UI.
- El contador puede enviar invitacion solo si tiene vinculo activo con el cliente y permiso delegado `canAuthorize=true`, o si el cliente confirma la invitacion.
- El cliente puede revocar el acceso en cualquier momento.
- Cada vista, descarga o acceso sensible debe registrar auditoria.

---

## 4. Usuarios y permisos

| Actor | Puede crear invitacion | Puede definir scopes | Puede revocar | Observaciones |
|---|---:|---:|---:|---|
| Cliente / Usuario | Si | Si | Si | Dueño natural de la informacion |
| Contador | Si, condicionado | Si, si tiene delegacion | Si, si tiene delegacion | Debe validarse por vinculo activo contador-cliente |
| Admin plataforma | Si | Si | Si | Solo soporte/auditoria |
| Financista invitado | No | No | No | Solo lectura autorizada |
| Entidad registrada | No desde este flujo | No | No | Puede aceptar o usar flujo existente de solicitud |

Decision v1 recomendada:

- El cliente siempre puede enviar.
- El contador puede enviar solo si existe `producer_accountant_links.status === "active"` y `canAuthorize === true`.
- Si `canAuthorize` no existe o esta en falso, el contador prepara la invitacion y el cliente la aprueba antes del envio.

---

## 5. Modelo funcional

### Flujo A - Cliente envia link

1. Cliente entra a `/app/productor/autorizaciones`.
2. Clic en "Compartir carpeta".
3. Selecciona carpeta:
   - organizacion raiz
   - empresa hija puntual
   - grupo completo
4. Carga destinatario:
   - nombre
   - email
   - tipo: financista, banco, proveedor, maquinaria, insumos, otro
   - organizacion o empresa receptora opcional
5. Define scopes:
   - perfil basico
   - resumen contable
   - balances
   - resultados
   - impuestos
   - patrimonio
   - deudas
   - documentos
6. Define plazo:
   - 15, 30, 60, 90, 180 o 365 dias
7. Confirma y envia.
8. El sistema crea `access_invitations`.
9. El receptor recibe link por email o el usuario copia el link.

### Flujo B - Contador envia link

1. Contador entra al cliente o empresa.
2. Clic en "Compartir con financista".
3. Define destinatario, scopes y plazo.
4. Backend valida vinculo activo contador-cliente.
5. Si tiene `canAuthorize=true`, se envia directo.
6. Si no tiene `canAuthorize`, queda `pending_owner_approval` y el cliente debe aprobar.

### Flujo C - Receptor acepta link

1. Abre `/invitar/acceso/[token]`.
2. El sistema valida:
   - token existe
   - no vencio
   - no fue usado o revocado
3. Si no tiene cuenta, crea usuario con email de la invitacion.
4. Si ya tiene cuenta, inicia sesion.
5. Backend verifica que el email autenticado coincide con la invitacion.
6. Si el receptor no tiene organizacion solicitante:
   - v1 crea una organizacion `requesting_entity` con estado `invited`
   - subtipo segun la invitacion
7. Se crea `access_grant` aprobado con:
   - `targetOrganizationId`
   - `targetScope`
   - `includedOrganizationIds` si corresponde
   - `grantedToOrganizationId`
   - `allowedScopes`
   - `expiresAt`
8. Receptor entra a `/app/entidad/carpetas/[targetOrgId]`.
9. La carpeta es read-only y cada seccion se bloquea por scope.

---

## 6. Datos y colecciones

### Coleccion nueva propuesta: `access_invitations`

Campos:

```ts
interface AccessInvitation {
  id: string
  tokenHash: string
  status:
    | "draft"
    | "pending_owner_approval"
    | "sent"
    | "accepted"
    | "revoked"
    | "expired"

  targetOrganizationId: string
  targetScope: "single_organization" | "group"
  includedOrganizationIds?: string[]

  senderUid: string
  senderOrganizationId: string
  senderRole: "producer" | "accountant" | "admin_platform"

  ownerOrganizationId: string
  accountantLinkId?: string
  requiresOwnerApproval: boolean
  approvedByOwnerUid?: string
  approvedByOwnerAt?: string

  recipientEmail: string
  recipientName?: string
  recipientOrganizationName?: string
  recipientSubtype:
    | "bank"
    | "financial_entity"
    | "agro_company"
    | "maquinaria_agricola"
    | "insumos_agricolas"
    | "other_authorized_viewer"

  requestedScopes: AccessScope[]
  approvedDays: number
  purpose: string

  acceptedByUid?: string
  acceptedByOrganizationId?: string
  accessGrantId?: string

  tokenExpiresAt: string
  accessExpiresAt?: string
  createdAt: string
  updatedAt: string
}
```

### Ajuste de tipos

Agregar `other_authorized_viewer` como subtipo de `requesting_entity`, o definir si en v1 se limita el receptor solo a los subtipos ya existentes.

Recomendacion: agregar `other_authorized_viewer` para cubrir "a quien quiera" sin forzar datos falsos de banco/financiera.

### Colecciones existentes reutilizadas

- `users`
- `organizations`
- `organization_members`
- `producer_accountant_links`
- `access_grants`
- `audit_logs`
- `notifications`

---

## 7. APIs necesarias

### `POST /api/access-invitations`

Crea una invitacion.

Valida:

- sesion autenticada
- `targetOrganizationId` existe y es `system_user` o `system_user_entity`
- sender puede invitar sobre esa carpeta
- scopes validos
- plazo entre 1 y 365 dias
- email valido

Resultado:

- si cliente/admin o contador con delegacion: `status = "sent"`
- si contador sin delegacion: `status = "pending_owner_approval"`

### `POST /api/access-invitations/[invitationId]/approve`

Solo cliente dueño o admin.

Pasa una invitacion de `pending_owner_approval` a `sent`.

### `GET /api/access-invitations/accept/[token]`

Devuelve informacion minima para pantalla publica:

- nombre del cliente o empresa
- nombre del remitente
- email receptor parcialmente visible
- scopes solicitados
- vencimiento del link

No devuelve datos de carpeta.

### `POST /api/access-invitations/accept/[token]`

Requiere sesion autenticada.

Valida:

- token vigente
- email autenticado coincide
- invitacion no aceptada/revocada
- crea o vincula organizacion receptora
- crea `access_grant`
- marca invitacion como `accepted`
- escribe auditoria

### `POST /api/access-invitations/[invitationId]/revoke`

Revoca invitacion si no fue aceptada, o revoca tambien el grant si ya fue aceptada.

### `GET /api/access-grants/active?targetOrganizationId=...`

Endpoint server-side para que la vista de entidad resuelva el grant activo sin leer directo Firestore desde cliente.

---

## 8. Pantallas y componentes

### Productor / cliente

- `/app/productor/autorizaciones`
  - boton "Compartir carpeta"
  - tabla de invitaciones enviadas
  - estado: enviada, aceptada, vencida, revocada
  - accion revocar

Componentes:

- `components/access/CreateAccessInvitationDialog.tsx`
- `components/access/InvitationRecipientForm.tsx`
- `components/access/InvitationScopeAndDurationForm.tsx`
- `components/access/AccessInvitationTable.tsx`

### Contador

- En cliente o empresa:
  - boton "Compartir con financista"
  - si necesita aprobacion del cliente, mostrar estado pendiente

Rutas sugeridas:

- `/app/contador/clientes/[clientId]`
- `/app/contador/empresas/[empresaId]/carpeta`

### Publica

- `/invitar/acceso/[token]`
  - pantalla de aceptacion
  - si no hay sesion: crear cuenta o iniciar sesion
  - si email no coincide: bloquear

### Entidad / invitado

- `/app/entidad/carpetas/[targetOrgId]`
  - read-only
  - `GrantStatusBanner`
  - `ScopeGuard` por seccion
  - `GrantExpiredBlocker` si no hay grant o vencio

---

## 9. Olas de implementacion

### Ola 1 - Modelo, schemas y APIs base

Archivos a tocar:

- `types/access.ts`
- `types/auth.ts`
- `lib/schemas/access.ts`
- `lib/firebase/collections.ts`
- `docs/MODULE_REGISTRY.md`
- `app/api/access-invitations/route.ts`
- `app/api/access-invitations/[invitationId]/approve/route.ts`
- `app/api/access-invitations/[invitationId]/revoke/route.ts`
- `app/api/access-invitations/accept/[token]/route.ts`

Cierre:

- Crear coleccion `access_invitations`.
- Token hasheado, no guardar token plano.
- Auditoria: `access_invitation.created`, `sent`, `approved`, `accepted`, `revoked`, `expired`.

### Ola 2 - UI para crear y administrar invitaciones

Archivos a tocar:

- `components/access/CreateAccessInvitationDialog.tsx`
- `components/access/InvitationRecipientForm.tsx`
- `components/access/InvitationScopeAndDurationForm.tsx`
- `components/access/AccessInvitationTable.tsx`
- `app/app/productor/autorizaciones/page.tsx`
- `app/app/contador/clientes/[clientId]/page.tsx`
- `app/app/contador/empresas/[empresaId]/carpeta/page.tsx`

Cierre:

- Cliente puede enviar link.
- Contador puede enviar si tiene permiso o dejar pendiente de aprobacion.
- Se puede copiar link aunque el email todavia no este configurado.

### Ola 3 - Aceptacion publica y registro del receptor

Archivos a crear/tocar:

- `app/invitar/acceso/[token]/page.tsx`
- `components/access/AcceptAccessInvitation.tsx`
- `app/api/onboarding/requesting-entity/route.ts`
- `lib/firebase/auth-client.ts`

Cierre:

- Receptor sin cuenta puede crear clave.
- Receptor con cuenta puede iniciar sesion.
- Email autenticado debe coincidir con invitacion.
- Al aceptar, se crea `access_grant`.

### Ola 4 - Vista read-only con guard real

Archivos a crear/tocar:

- `components/access/ScopeGuard.tsx`
- `components/access/GrantStatusBanner.tsx`
- `components/access/GrantExpiredBlocker.tsx`
- `app/app/entidad/carpetas/[targetOrgId]/page.tsx`
- servicios server-side de carpeta read-only

Cierre:

- No cargar datos de secciones no autorizadas.
- Cada tab usa scope propio.
- Grant vencido bloquea la carpeta completa.

### Ola 5 - Endurecimiento, auditoria y reglas

Archivos a tocar:

- `firestore.rules`
- `firestore.indexes.json`
- `scripts/check-security-shape.ts`
- `docs/MODULE_REGISTRY.md`
- `reports/HANDOFF_ACTUAL.md`

Cierre:

- Firestore sigue deny-by-default.
- Lecturas sensibles pasan por API server-side o rules verificadas.
- Indices para invitaciones por estado, destinatario, target y vencimiento.
- Validacion `pnpm type-check` y `pnpm check:security-shape`.

---

## 10. Criterios de aceptacion

- Un cliente puede enviar un link a un financista con scopes y plazo.
- Un contador puede enviar link solo si esta autorizado.
- El link no muestra datos de carpeta sin login.
- El receptor crea su propia clave.
- El receptor queda asociado a una organizacion solicitante o invitada.
- El receptor ve solo las secciones autorizadas.
- Si el grant vence, la carpeta queda bloqueada.
- Si el cliente revoca, el receptor pierde acceso inmediatamente.
- El sistema registra auditoria de creacion, envio, aceptacion, visualizacion y revocacion.
- No existe lectura cruzada entre organizaciones.

---

## 11. Riesgos y decisiones abiertas

### Decision 1 - Receptor individual vs organizacion

Recomendacion: mantener acceso por organizacion (`grantedToOrganizationId`) para no romper el modelo actual. Si una persona fisica recibe el link, crear una organizacion tipo `requesting_entity` con subtipo `other_authorized_viewer`.

### Decision 2 - Contador puede autorizar sin cliente

Recomendacion: solo si hay delegacion explicita `canAuthorize=true`. Si no, el contador prepara la invitacion y el cliente aprueba.

### Decision 3 - Email real

V1 puede permitir "copiar link" y registrar la invitacion. Produccion deberia sumar envio por email para trazabilidad completa.

### Decision 4 - Descarga de documentos

Recomendacion: separar scope `documents` de permiso de descarga. Ver documentos en pantalla no necesariamente debe permitir descargar archivos.

---

## 12. Requerimiento listo para programar

Implementar el modulo `access_invitations` como extension core del sistema de autorizaciones.

No reemplazar `access_requests`: mantener el flujo pull existente para entidades que piden acceso. Agregar el flujo push donde cliente o contador invitan a un receptor externo por link. Ambos flujos deben terminar en el mismo objeto canonico `access_grants`.

Prioridad recomendada:

1. Completar guard real de carpeta del Plan 004 Ola 3.
2. Implementar `access_invitations`.
3. Integrar UI de compartir link en productor y contador.
4. Implementar aceptacion publica con registro/login.
5. Auditar y endurecer reglas.

