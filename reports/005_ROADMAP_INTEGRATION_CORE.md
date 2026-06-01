# AgroCredit Hub — Roadmap: De formularios a Integration Core

**Fecha:** 2026-05-31  
**Autor:** Sergio (visión estratégica) + Claude Code (arquitectura técnica)  
**Estado:** Visión aprobada — pendiente de implementación por olas

---

## 1. El problema que resuelve este roadmap

Hoy AgroCredit Hub funciona como una web con formularios: los datos entran cuando alguien los carga manualmente. Eso es correcto para la fase inicial, pero crea un techo:

- Sistemas externos (web de Agro Biciuffa, 9001app, portales de contadores) no pueden conectarse.
- La misma información se carga dos veces en distintos sistemas.
- No hay avisos automáticos cuando algo cambia.
- Don Cándido IA no puede actuar directamente sobre carpetas ni documentos.

**La solución:** convertir AgroCredit Hub en el cerebro documental y crediticio del ecosistema, donde los formularios son una interfaz más — no el único canal de entrada.

---

## 2. Visión objetivo

```
Agro Biciuffa Web  ─┐
Portal Contador     ─┤
Portal Banco        ─┤──► AgroCredit Hub (Integration Core) ──► Don Cándido IA
9001app-firebase    ─┤         │
Futuras apps        ─┘    auditLogs · events · syncLogs
                               │
                          Firestore (fuente de verdad)
```

**Principio rector:**  
Los formularios pasan a ser una interfaz más, no el centro del sistema.

---

## 3. Estado actual (base de partida)

| Ola | Estado | Contenido |
|-----|--------|-----------|
| Ola 1 | ✅ Completa | Modelo de datos, tipos, schemas, APIs base, roles, permisos Firestore |
| Ola 2 | ✅ Completa | Wizards de registro (usuario, contador, entidad), onboarding, vínculos |
| Ola 3 | 🔄 En curso | Acceso temporizado, guard de carpeta, ScopeGuard, GrantStatusBanner |
| Ola 4 | ⬜ Pendiente | **API de integración** ← este roadmap comienza aquí |
| Ola 5 | ⬜ Pendiente | **Webhooks / sistema de eventos** |
| Ola 6 | ⬜ Pendiente | **API Keys + scopes + multi-tenant seguro** |
| Ola 7 | ⬜ Pendiente | **SDK interno reutilizable** |
| Ola 8 | ⬜ Pendiente | **MCP para Don Cándido IA** |
| Ola 9 | ⬜ Pendiente | **Integración piloto externa** (Agro Biciuffa o 9001app) |

---

## 4. Arquitectura en 5 capas

### Capa 1 — Core de datos (ya existe, ampliar)

El modelo actual en Firestore ya cubre la base. Agregar estas colecciones nuevas:

| Colección nueva | Propósito |
|-----------------|-----------|
| `integrations` | Registro de sistemas externos conectados |
| `api_keys` | Claves de API por integración (hash SHA-256, nunca plaintext) |
| `events` | Cola de eventos internos del hub |
| `webhook_subscriptions` | Endpoints registrados para recibir eventos |
| `sync_logs` | Historial de sincronizaciones externas |

### Capa 2 — API de integración (Ola 4)

Endpoints REST bajo `/api/hub/` autenticados por API Key o JWT:

```
# Productores (system_users)
POST   /api/hub/producers               → crear productor
GET    /api/hub/producers/:id           → consultar productor
PATCH  /api/hub/producers/:id           → actualizar datos

# Carpetas crediticias
POST   /api/hub/credit-folders          → crear carpeta
GET    /api/hub/credit-folders/:id      → consultar carpeta completa
PATCH  /api/hub/credit-folders/:id/status → cambiar estado

# Documentos
POST   /api/hub/documents               → registrar metadatos de documento
GET    /api/hub/documents/:id           → consultar documento
POST   /api/hub/document-requests       → solicitar documento faltante

# Financieros
POST   /api/hub/financial-statements    → cargar balance o estado de resultados
GET    /api/hub/financial-statements/:producerId → listar por productor
POST   /api/hub/tax-declarations        → cargar declaración impositiva

# Permisos
POST   /api/hub/permissions/grant       → otorgar acceso
POST   /api/hub/permissions/revoke      → revocar acceso
GET    /api/hub/permissions/:producerId → listar permisos vigentes

# Eventos y sincronización
GET    /api/hub/events                  → consultar eventos recientes
POST   /api/hub/sync                    → registrar sincronización externa
```

**Reglas de seguridad de la API:**
- Nunca aceptar `organizationId` del body → derivar de API Key o JWT claims.
- Validar scope de la API Key antes de cada operación.
- Registrar toda operación en `audit_logs` y `sync_logs`.
- Control multi-tenant: una API Key solo puede operar sobre su `organizationId`.

### Capa 3 — Webhooks / sistema de eventos (Ola 5)

**Eventos canónicos:**

| Evento | Disparador |
|--------|-----------|
| `credit_folder.created` | Nueva carpeta crediticia |
| `credit_folder.updated` | Cambio de datos en carpeta |
| `credit_folder.approved` | Carpeta aprobada |
| `credit_folder.rejected` | Carpeta rechazada |
| `credit_folder.pending_documents` | Documentos faltantes detectados |
| `document.uploaded` | Documento subido |
| `document.requested` | Solicitud de documento enviada |
| `document.expired` | Documento con vencimiento superado |
| `financial_statement.created` | Balance o EERR cargado |
| `financial_statement.updated` | Balance actualizado |
| `producer.created` | Nuevo productor registrado |
| `producer.permission.granted` | Acceso otorgado |
| `producer.permission.revoked` | Acceso revocado |
| `sync.completed` | Sincronización externa completada |
| `sync.failed` | Sincronización externa fallida |

**Estructura de cada evento:**
```typescript
interface HubEvent {
  eventId: string;
  eventType: string;           // credit_folder.created, etc.
  organizationId: string;      // tenant owner del evento
  actorId: string;             // userId o integrationId que disparó
  resourceType: string;        // producer | credit_folder | document | ...
  resourceId: string;
  payload: Record<string, unknown>;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  status: 'pending' | 'delivered' | 'failed';
}
```

**Webhook subscriptions:**
```typescript
interface WebhookSubscription {
  subscriptionId: string;
  integrationId: string;
  organizationId: string;
  eventTypes: string[];        // qué eventos recibir
  endpointUrl: string;         // donde enviar
  secret: string;              // HMAC para verificar origen
  status: 'active' | 'paused' | 'disabled';
  createdAt: Timestamp;
  lastDeliveryAt?: Timestamp;
  failureCount: number;
}
```

### Capa 4 — API Keys e integraciones (Ola 6)

Cada sistema externo se registra como `integration`:

```typescript
interface Integration {
  integrationId: string;
  organizationId: string;
  systemName: string;           // 'agro_biciuffa_web' | '9001app' | ...
  apiKeyHash: string;           // SHA-256 del key real — nunca plaintext
  allowedScopes: ApiScope[];
  allowedOrigins: string[];     // CORS whitelist
  webhookUrl?: string;
  status: 'active' | 'suspended' | 'revoked';
  createdAt: Timestamp;
  lastUsedAt?: Timestamp;
}
```

**Scopes disponibles:**
```
producers:read         producers:write
credit_folders:read    credit_folders:write
documents:read         documents:write
financial_statements:read   financial_statements:write
tax_declarations:read  tax_declarations:write
permissions:read       permissions:write
events:read
webhooks:manage
sync:write
```

**Sistemas externos previstos:**

| Sistema | Scopes mínimos |
|---------|---------------|
| Web Agro Biciuffa | `producers:write`, `credit_folders:write`, `documents:read` |
| 9001app-firebase | `credit_folders:read`, `financial_statements:read`, `events:read` |
| Portal Contadores | `financial_statements:write`, `documents:write`, `tax_declarations:write` |
| Portal Bancos | `credit_folders:read`, `documents:read`, `permissions:read` |
| Portal Productores | `permissions:write`, `credit_folders:read` |

### Capa 5 — MCP para Don Cándido IA (Ola 8)

El MCP **no reemplaza la API** — la complementa para que agentes IA puedan operar con lenguaje natural sobre el Hub.

**Herramientas MCP previstas:**

```typescript
// Búsqueda y consulta
searchProducer(query: string): Producer[]
getProducerProfile(producerId: string): ProducerProfile
getCreditFolder(folderId: string): CreditFolderComplete
getFolderTimeline(folderId: string): AuditEvent[]

// Documentación
getMissingDocuments(folderId: string): DocumentRequest[]
requestMissingDocuments(folderId: string, documents: string[]): void
uploadDocumentMetadata(data: DocumentMetadata): void

// Análisis financiero
summarizeFinancialStatement(statementId: string): string
evaluateCreditRisk(folderId: string): CreditRiskSummary

// Permisos
grantAccess(producerId: string, actorId: string, scopes: string[]): void
revokeAccess(grantId: string): void

// Integración
syncExternalSystem(integrationId: string, data: SyncPayload): SyncLog
```

**Ejemplo de uso con Don Cándido:**
> "Buscame la carpeta de Juan Pérez, revisá si tiene balance 2025, IVA actualizado y bienes de uso. Si falta algo, generá solicitud al contador."
→ Don Cándido llama: `searchProducer` → `getCreditFolder` → `getMissingDocuments` → `requestMissingDocuments`

---

## 5. SDK interno reutilizable (Ola 7)

**Nombre:** `agrocredit-hub-client`  
**Ubicación sugerida:** `packages/hub-client/` (monorepo) o NPM privado

```typescript
// API de surface del SDK
import { AgroCreditHubClient } from 'agrocredit-hub-client';

const hub = new AgroCreditHubClient({ apiKey: process.env.AGROCREDIT_API_KEY });

// Productores
await hub.producers.create(data);
await hub.producers.get(producerId);
await hub.producers.update(producerId, data);

// Carpetas
await hub.creditFolders.create(data);
await hub.creditFolders.get(folderId);
await hub.creditFolders.updateStatus(folderId, 'approved');

// Documentos
await hub.documents.upload(data);
await hub.documents.get(documentId);
await hub.documents.request(data);

// Financiero
await hub.financialStatements.create(data);
await hub.financialStatements.listByProducer(producerId);

// Permisos
await hub.permissions.grant(data);
await hub.permissions.revoke(grantId);

// Eventos
await hub.events.list({ since, eventType });
await hub.sync.register(syncData);
```

El SDK maneja internamente: autenticación, rate limiting, retry con backoff, logs de sincronización y errores tipados.

---

## 6. Flujo completo de ejemplo

**Escenario:** Cliente solicita financiación en web de Agro Biciuffa para una cosechadora.

```
1. Cliente llena formulario en web Agro Biciuffa
   ↓
2. Web Agro Biciuffa llama: hub.producers.create({ cuit, nombre, ... })
   → AgroCredit crea/actualiza el productor
   ↓
3. Web llama: hub.creditFolders.create({ producerId, type: 'maquinaria_agricola', amount })
   → Se crea carpeta crediticia en estado 'draft'
   ↓
4. AgroCredit detecta documentos faltantes (balance 2024, IVA últimos 12 meses, bienes de uso)
   → Dispara evento: credit_folder.pending_documents
   ↓
5. Portal Contador recibe webhook → muestra alerta al contador
   ↓
6. Contador sube desde su portal:
   hub.financialStatements.create(balance2024)
   hub.taxDeclarations.create(iva)
   hub.documents.upload(bienesDeUso)
   ↓
7. AgroCredit actualiza carpeta → dispara: financial_statement.created, document.uploaded
   ↓
8. Web Agro Biciuffa recibe webhook → actualiza estado visible al cliente
   ↓
9. Banco recibe notificación (si tiene permiso vigente)
   → Consulta: hub.creditFolders.get(folderId)
   ↓
10. Don Cándido IA resume carpeta y sugiere próximos pasos
    → Llama: summarizeFinancialStatement → evaluateCreditRisk → getFolderTimeline
    ↓
11. Todo queda en: audit_logs · sync_logs · events
```

---

## 7. Seguridad y trazabilidad

| Capa | Control |
|------|---------|
| API Keys | Hash SHA-256, nunca plaintext; scopes mínimos por sistema |
| JWT tokens | Firmados, con exp y organizationId en claims |
| Multi-tenant | Toda operación valida `organizationId` contra el token/key |
| Firestore rules | Deny-by-default; reglas permisivas documentadas |
| CORS | `allowedOrigins` por integración |
| Rate limiting | Por API Key y por endpoint |
| Audit logs | Toda acción sensible registrada |
| Sync logs | Toda operación externa trazada |
| Webhooks | HMAC signature para verificar origen |
| Documentos | Nunca acceso público; URLs firmadas con TTL |

---

## 8. Plan de implementación por olas

### Ola 3 (actual) — Cerrar primero
- `ScopeGuard`, `GrantStatusBanner`, `GrantExpiredBlocker`
- Vista carpeta para entidad con guard por scope
- Integrar `ClienteNuevoDialog` en dashboard contador

### Ola 4 — API de integración (estimado: 3-5 días)
**Prioridad: ALTA — habilita todo lo demás**
- Colecciones: `integrations`, `api_keys`, `sync_logs`
- Middleware de autenticación por API Key
- Endpoints mínimos: producers, credit-folders, documents, financial-statements, permissions
- Validación de scopes
- Registro en audit_logs y sync_logs
- Tests con Postman/Thunder Client

### Ola 5 — Webhooks y eventos (estimado: 3-4 días)
- Colecciones: `events`, `webhook_subscriptions`
- Job de despacho de eventos (Cloud Function o cron)
- Firma HMAC por webhook
- UI de administración de webhooks (panel admin)
- Gestión de reintentos y fallos

### Ola 6 — API Keys + admin de integraciones (estimado: 2-3 días)
- Generación segura de API Keys (mostrar una sola vez)
- Panel admin: crear/revocar/listar integraciones
- Control de `allowedOrigins`
- Rate limiting por key
- Dashboard de uso (lastUsedAt, failureCount)

### Ola 7 — SDK interno (estimado: 2-3 días)
- `packages/hub-client/` con TypeScript
- Funciones para todos los recursos del Hub
- Manejo de errores tipados
- Documentación inline (JSDoc)
- Publicar como paquete interno o NPM privado

### Ola 8 — MCP Don Cándido (estimado: 4-6 días)
- Servidor MCP en `mcp/agrocredit-hub/`
- Herramientas: search, get, create, summarize, evaluate, grant, revoke
- Integración con Don Cándido IA
- Tests de flujos completos

### Ola 9 — Integración piloto (estimado: 3-5 días)
- Elegir sistema piloto: web Agro Biciuffa o 9001app-firebase
- Instalar SDK, configurar API Key, registrar webhooks
- Flujo completo de creación de carpeta desde sistema externo
- Monitoreo de sync_logs y events

---

## 9. Decisiones técnicas clave

| Decisión | Elección | Por qué |
|----------|----------|---------|
| API style | REST sobre Next.js API routes | Consistente con stack existente; fácil de consumir desde cualquier lenguaje |
| Auth API | API Key + HMAC; JWT para usuarios | Keys para sistemas, JWT para personas |
| Almacenamiento keys | Hash SHA-256 en Firestore | Nunca guardar plaintext |
| Webhooks | Push async con retry | Menos acoplamiento que polling |
| SDK | TypeScript, NPM privado o monorepo | Tipado compartido con el Hub |
| MCP | Capa separada sobre la API | No mezclar acceso humano con acceso IA |
| Eventos | Colección `events` + Cloud Function | Simple, auditable, sin dependencia externa |

---

## 10. Nombre del sistema

**AgroCredit Integration Core**

Comunica que no es solo una pantalla — es la capa central que conecta todo el ecosistema agro-financiero.

---

## Referencias internas

- [Module Registry](../docs/MODULE_REGISTRY.md)
- [Handoff actual](./HANDOFF_ACTUAL.md)
- [Plan 001 - Proyecto completo](./001_PLAN_PROYECTO_AGROCREDIT_HUB.md)
- [Plan 004 - Onboarding y registro](./004_PLAN_ONBOARDING_Y_REGISTRO.md)
