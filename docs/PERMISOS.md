# Roles, Permisos Y Grants

**Fecha:** 2026-05-28

## Roles canonicos

| Rol | Acceso |
|---|---|
| `admin_platform` | Administracion, auditoria y soporte |
| `producer` | Carpeta propia, autorizaciones y financiacion asociada |
| `accountant` | Carga de productores vinculados |
| `accounting_firm_admin` | Gestion del estudio contable |
| `bank_user` | Solicitudes de acceso y financiacion |
| `agro_company_user` | Solicitudes de acceso y financiacion comercial |

## Regla central

El productor es duenio de la informacion y decide quien puede verla. El contador carga datos, pero no autoriza en nombre del productor salvo delegacion explicita `canAuthorize=true` en `producer_accountant_links`.

## Scopes

- `profile_basic`
- `accounting_summary`
- `balance_sheets`
- `income_statements`
- `tax_documents`
- `assets`
- `liabilities`
- `documents`
- `full_credit_folder`

## Estados de acceso

- `draft`
- `requested`
- `approved`
- `rejected`
- `revoked`
- `expired`

## Seguridad implementada

- Mutaciones sensibles pasan por `/api/**` y verifican Firebase ID token.
- Las APIs fuerzan `requesterOrganizationId` desde custom claims.
- Aprobacion y revocacion validan productor propio, admin o delegacion contable.
- `access_grants` y `audit_logs` tienen escritura Firestore bloqueada al cliente.
- Firestore restringe lecturas de carpeta sensible a productor propio, contador o admin.

## Riesgo pendiente

Para que bancos/empresas consulten datos sensibles de carpeta, falta crear endpoints de lectura por scope que revisen `access_grants` antes de devolver balances, impuestos, bienes, deudas o documentos.
