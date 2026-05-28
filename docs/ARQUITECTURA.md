# Arquitectura Tecnica

**Fecha:** 2026-05-28

Carpeta AgroCredit IA usa Next.js App Router con una separacion simple:

- UI privada en `app/app/**`, protegida por `AuthGuard` y `RoleGate`.
- Servicios cliente en `lib/services/**` para consultas Firestore y llamadas a APIs.
- Mutaciones sensibles en `app/api/**` con Firebase Admin SDK.
- Reglas Firestore y Storage deny-by-default para datos no declarados.

## Capas

| Capa | Archivos | Responsabilidad |
|---|---|---|
| Auth cliente | `lib/auth/session.ts`, `lib/firebase/auth-client.ts` | Leer usuario Firebase y custom claims |
| Auth server | `lib/auth/server-session.ts` | Verificar ID token y roles |
| Acceso server | `lib/auth/server-access.ts` | Validar productor, grants y notificaciones por org |
| Dominio cliente | `lib/services/*.ts` | Lecturas Firestore y llamadas a rutas privadas |
| API privada | `app/api/**` | Crear/decidir/revocar accesos y financiacion con auditoria |
| UI | `components/**`, `app/app/**` | Pantallas por rol |

## Invariantes

- `organizationId` operativo sale de custom claims o membership validado, no del body.
- `access_grants` se escriben solo server-side.
- `audit_logs` se escriben solo server-side.
- Notificaciones se crean server-side y cada usuario solo lee las propias.
- Entidades financieras no leen directamente carpeta sensible desde Firestore; el acceso se modela por grants y queda listo para endpoints de lectura controlada.

## Rutas privadas nuevas

| Ruta | Metodo | Uso |
|---|---|---|
| `/api/access-requests` | POST | Crear solicitud de acceso |
| `/api/access-requests/[requestId]/decision` | POST | Aprobar o rechazar solicitud |
| `/api/access-grants/[grantId]/revoke` | POST | Revocar grant |
| `/api/financing-requests` | POST | Crear solicitud de financiacion |
| `/api/financing-requests/[requestId]/status` | POST | Cambiar estado de financiacion |

## UI por rol

- Productor: `/app/productor/autorizaciones`, `/app/productor/financiacion`.
- Banco/empresa: `/app/entidad/accesos`, `/app/entidad/financiacion`.
- Admin: `/app/admin/auditoria`.
- Todos los roles privados: `/app/notificaciones`.
