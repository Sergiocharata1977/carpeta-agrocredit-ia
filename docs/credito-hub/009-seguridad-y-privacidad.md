# CreditoHub — 009 · Seguridad y privacidad

**Fecha:** 2026-06-16
**Estado:** Diseño (Ola 1 / Agente C). Sin código.
**Fuente de verdad de decisiones:** `docs/credito-hub/000-ola0-decisiones.md`.

> No se promete E2EE. El cifrado de CreditoHub es **forward-compatible** con el cifrado V1 del Plan 012 (archivos fuente), no cifrado end-to-end ni cifrado de campos estructurados.

---

## Objetivo

Garantizar que CreditoHub respete el modelo de seguridad existente de Agro-Credit (deny-by-default, multi-tenant, grants/scopes vencibles, auditoría) y prepare el terreno para el cifrado V1 sin migración posterior.

## Alcance
- Reuso de grants/scopes/`access_grants`/`audit_logs`.
- Acceso server-side validado; sin lecturas/escrituras directas de cliente.
- Compatibilidad con cifrado V1 y flag de datos reales.
- No incluye E2EE, KMS, rotación de claves (V2/Enterprise, Plan 012).

## Decisiones

### 1. Todo server-side (P1 Plan 013)
Las rutas de CreditoHub usan Admin SDK + `verifyRequestSession` + `assertCanManageAccountingFolder(session, targetOrganizationId)` o validación de grant. **El cliente nunca lee/escribe Firestore o Storage de legajo directamente.** Firestore y Storage siguen deny-by-default para estos datos.

### 2. `organizationId` nunca del cliente
El body manda `targetOrganizationId`; el server deriva `folderOwnerOrganizationId` + `accountingFirmId`. Nunca se confía en `folderOwnerOrganizationId` del body.

### 3. Quién accede a qué
| Actor | Acceso |
|---|---|
| Contador vinculado (`producer_accountant_links`) | Carga, ve y revisa el legajo de sus clientes. |
| Titular (`producer`) | Su propio legajo; autoriza/revoca grants. |
| Banco / entidad | Solo lee vía **grant activo, no vencido, con scope suficiente** (`ScopeGuard`). |
| `admin_platform` | Supervisión + auditoría. |

### 4. Reuso de grants/scopes existentes
La matriz de cumplimiento y la vista de la entidad respetan los scopes ya definidos (`profile_basic`, `accounting_summary`, `balance_sheets`, `income_statements`, `tax_documents`, `assets`, `liabilities`, `documents`, `full_credit_folder`) y los estados de grant (`draft` … `revoked`/`expired`). **Grants vencidos no habilitan lectura.**

### 5. Auditoría obligatoria
Toda acción sensible llama `lib/firebase/audit.ts` (`writeAuditLog`), que captura IP y user-agent automáticamente. Acciones nuevas: `document.uploaded`, `document.classified`, `document.job_queued`, `document.job_failed`, `field.extracted`, `field.confirmed`, `field.corrected`, `field.rejected`, `canonical_profile.updated`, `bank_requirement.created`, `bank_requirement.parsed`, `requirement.matched`, `credit_application.created`. `audit_logs` no es editable desde el cliente.

### 6. Compatibilidad con cifrado V1 (Plan 012) + flag de datos reales
- Cada documento fuente nuevo guarda `encryptionStatus: "plaintext" | "encrypted"` y reserva `encryptionMetadata?` (alineado al futuro `types/encryption.ts`). **Sin migración cuando se active el cifrado.**
- Flag `CREDITO_HUB_ALLOW_REAL_DATA` (default `false`): con `false`, el intake solo acepta datos staging/demo. **El MVP no corre sobre legajos reales hasta cerrar Plan 012 Ola 3.**
- Ruta de Storage canónica sin cambios: `orgs/{folderOwnerOrganizationId}/producers/{producerId}/periods/{periodId}/...`.

### 7. Regla standalone (anti-recaída)
Agro-Credit es independiente de 9001app y Don Cándido. **El único cruce permitido con 9001app es copiar credenciales LLM (`XAI_API_KEY`/`ANTHROPIC_API_KEY`) a `.env.local`.** Sin conexión de datos ni de código.

## Alternativas
- **E2EE en el MVP:** descartado (Plan 012 lo deja para V2; impediría OCR/IA y soporte).
- **Cifrado de campos estructurados:** descartado para V1.
- **Permitir datos reales ya:** descartado hasta cerrar cifrado V1 (flag en `false`).

## Riesgos
- Datos sensibles reales en staging por error. Mitigación: flag + validación de header staging en intake.
- Worker (cron) sin sesión de usuario para auditar. Mitigación: `writeAuditLog` tolera IP/UA null; el actor es el sistema/worker.
- Filtrado por scope insuficiente en la matriz de la entidad. Mitigación: `ScopeGuard` + tests de aislamiento (Ola 5).

## Criterios de aceptación
- Productor A no ve jobs/fields/perfil/aplicaciones de B; contador sin link no accede; entidad sin grant no ve la matriz.
- Ninguna ruta nueva abre acceso directo de cliente a Firestore/Storage de legajo.
- Toda acción sensible queda en `audit_logs`.
- Con `CREDITO_HUB_ALLOW_REAL_DATA=false`, el intake rechaza datos de producción.

## Dependencias
- `lib/firebase/audit.ts`, `lib/auth/accounting-access.ts`, `access_grants` + `ScopeGuard` existentes.
- Plan 012 (cifrado V1) y Plan 013 (P1 server-side).

## Preguntas abiertas
- ¿Cómo se marca un dato como "staging" en el intake? (header `x-staging-data` vs. flag por organización).
- ¿Fecha objetivo de cierre de Plan 012 Ola 3 para habilitar datos reales?
- Verificación final del modelo xAI pendiente de `XAI_API_KEY`.
