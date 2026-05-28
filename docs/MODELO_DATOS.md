# Modelo De Datos

**Fecha:** 2026-05-28

Las colecciones son top-level para simplificar indices, auditoria y futuras integraciones.

| Coleccion | Proposito | Estado |
|---|---|---|
| `users` | Perfil extendido del usuario autenticado | Implementada |
| `organizations` | Tenants: productor, estudio, banco, empresa, plataforma | Implementada |
| `organization_members` | Membresias usuario-organizacion | Implementada |
| `producers` | Productores agropecuarios | Implementada |
| `accounting_firms` | Estudios contables | Implementada |
| `producer_accountant_links` | Vinculos productor-contador | Implementada |
| `financial_entities` | Bancos/financieras | Registrada |
| `agro_companies` | Empresas agrocomerciales | Registrada |
| `accounting_periods` | Periodos fiscales/campanas | Implementada |
| `balance_sheets` | Balances | Implementada |
| `income_statements` | Estados de resultados | Implementada |
| `tax_documents` | IVA, Ganancias/Rentas, 931 y otros | Implementada |
| `assets` | Bienes muebles e inmuebles | Implementada |
| `liabilities` | Deudas bancarias/comerciales | Implementada |
| `documents` | Metadatos de archivos Storage | Implementada |
| `access_requests` | Pedidos de acceso de entidades | Implementada |
| `access_grants` | Autorizaciones vigentes o historicas | Implementada |
| `financing_requests` | Solicitudes de financiacion | Implementada |
| `audit_logs` | Auditoria inmutable logica | Implementada |
| `notifications` | Notificaciones internas | Implementada |

## Access requests

Campos principales:

- `producerId`
- `requesterOrganizationId`
- `requestedScopes`
- `purpose`
- `requestedExpirationDays`
- `status`
- `decidedBy`, `decidedAt`, `rejectionReason`
- `createdBy`, `createdAt`, `updatedAt`

## Access grants

Campos principales:

- `producerId`
- `accessRequestId`
- `grantedToOrganizationId`
- `allowedScopes`
- `purpose`
- `startsAt`, `expiresAt`
- `status`
- `grantedBy`, `revokedBy`, `revokedAt`

## Financing requests

Campos principales:

- `producerId`
- `requesterOrganizationId`
- `grantId`
- `financingType`
- `amount`, `currency`, `termMonths`
- `purpose`
- `status`
- `observations`
- `requiredDocuments`, `receivedDocuments`
- `statusHistory`

## Storage

Ruta canonica:

```text
orgs/{producerOrganizationId}/producers/{producerId}/periods/{periodId}/{documentType}/{documentId}-{filename}
```

El control de acceso vive en Firestore y reglas Storage, no en nombres de archivo.
