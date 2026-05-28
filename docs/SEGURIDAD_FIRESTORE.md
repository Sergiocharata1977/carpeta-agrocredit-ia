# Seguridad Firestore — Carpeta AgroCredit IA

## Principio base
Deny by default. Ningún dato es público. Todo acceso requiere autenticación y membresía o grant válido.

## Modelo de validación en dos capas

### Capa 1: Reglas Firestore (primera defensa)
Validan autenticación, membresía activa y grants vigentes.
Limitaciones conocidas:
- No pueden verificar que `organizationId` en el documento coincida con la membresía del usuario sin hacer lecturas adicionales (costosas).
- No pueden validar lógica de negocio compleja (ej: si un grant cubre el scope específico de lo que se solicita).
- No pueden verificar la firma de tokens de admin en operaciones de delegación.

### Capa 2: Server Actions / API Routes (segunda defensa, obligatoria para operaciones sensibles)
Deben validar:
- Que el `organizationId` enviado coincide con la membresía real del usuario autenticado (via Admin SDK).
- Que un grant es vigente Y cubre el scope exacto de la operación.
- Que el contador tiene `canAuthorize=true` antes de ejecutar una autorización delegada.
- Que `audit_logs` se escriben mediante Admin SDK, no desde cliente.

## Claims del token de Firebase Auth
El Admin SDK debe setear custom claims al crear/actualizar usuarios:
- `roles: string[]` — roles del usuario
- `defaultOrganizationId: string` — organización por defecto

Estos claims se leen en el cliente en `lib/auth/session.ts` y en las reglas Firestore via `request.auth.token`.

## Colecciones sensibles y su política

| Colección | Lectura permitida a | Escritura permitida a |
|---|---|---|
| `users` | El propio usuario | Admin SDK server-side |
| `organizations` | Miembros autenticados | Admin SDK server-side |
| `organization_members` | El propio usuario | Admin SDK server-side |
| `producers` | Contador vinculado activo, productor propio, entidad con grant activo | Contador vinculado con `canUpload=true` |
| `accounting_periods` | Ídem producers | Contador vinculado con `canUpload=true` |
| `balance_sheets` | Ídem producers | Contador vinculado con `canUpload=true` |
| `income_statements` | Ídem producers | Contador vinculado con `canUpload=true` |
| `tax_documents` | Ídem producers | Contador vinculado con `canUpload=true` |
| `assets` | Ídem producers | Contador vinculado con `canUpload=true` |
| `liabilities` | Ídem producers | Contador vinculado con `canUpload=true` |
| `documents` | Ídem producers (según scope del grant) | Contador vinculado con `canUpload=true` |
| `access_requests` | Productor afectado, entidad solicitante | Entidad solicitante (crear), productor (actualizar estado) |
| `access_grants` | Productor, entidad beneficiaria | Admin SDK server-side (producción) |
| `financing_requests` | Productor afectado, entidad solicitante | Entidad solicitante |
| `audit_logs` | admin_platform | Admin SDK server-side únicamente |
| `notifications` | El propio usuario destinatario | Admin SDK server-side |

## Storage
Ruta: `orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}`
- Solo usuarios autenticados con membresía activa en `producerOrganizationId` pueden subir.
- Solo el productor, su contador vinculado activo, o entidad con grant activo pueden descargar.
- Archivos nunca son públicos.

## Validaciones que SIEMPRE deben hacerse server-side
1. Crear/modificar grants: nunca desde cliente.
2. Escritura de audit_logs: solo Admin SDK.
3. Autorización delegada por contador: validar `canAuthorize=true` + escribir audit log.
4. Desactivar grants vencidos: background job o Cloud Function (no depender de cliente).
5. Cambio de roles de usuario: solo Admin SDK.
