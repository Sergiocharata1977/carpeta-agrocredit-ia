# Estado Actual del Proyecto — Legajo

**Fecha de actualización:** 2026-06-02  
**Nombre comercial:** Legajo  
**Repositorio:** `Agro-Credit` (rama `master`)  
**Deploy:** Vercel — automático desde `master`  
**Stack:** Next.js App Router + Firebase + TypeScript + Tailwind

---

## Actualizacion 2026-06-03

Planes cerrados en v1:

- OCR/IA EECC: implementado flujo upload PDF/imagen/Excel, extraccion Claude/mock/Excel, borrador `financial_statement_imports`, preview editable con confianza y apply server-side a `balance_sheets` / `income_statements`.
- Invitaciones por link: implementado flujo con token hasheado, aprobacion, reemision segura de link, aceptacion publica, creacion de `access_grant`, revocacion y vista read-only server-side por scopes.
- `004_PLAN_ONBOARDING_Y_REGISTRO.md` Ola 3: `ScopeGuard`, `GrantStatusBanner`, `GrantExpiredBlocker` y carpeta read-only de entidad quedan operativos.

Pendientes reales:

- Configurar `ANTHROPIC_API_KEY` en produccion para usar Claude Vision; sin esa variable funciona el mock.
- Deploy de `firestore.rules` y `storage.rules`.
- Plan 005 Integration Core sigue pendiente.

---

## 1. Qué es el producto

**Carpeta crediticia agrofinanciera digital multi-tenant.**

El contador habilitado carga la información contable, fiscal y patrimonial del productor una sola vez. El productor autoriza accesos trazables. Las entidades financieras acceden solo con scope y tiempo definidos por el productor.

### Lo que resuelve

- El productor evita viajes de hasta 100 km para entregar documentación.
- El contador carga una vez; las entidades no repiten pedidos.
- Cada acceso tiene scope, fecha de vencimiento y registro de auditoría.
- Todo queda auditado: quién vio qué, por cuánto tiempo y con qué autorización.

### Lo que NO es

- No es un sistema contable ni reemplaza al contador.
- No liquida impuestos ni sueldos.
- No decide automáticamente un crédito.
- No entrega información sin autorización expresa del productor.

---

## 2. Reglas de negocio críticas

### Quién puede cargar información

**Solo los contadores habilitados por la plataforma.** Nadie más puede cargar información contable, fiscal o patrimonial de un cliente.

- `system_user` (cliente/productor): solo autoriza accesos y actualiza su perfil básico.
- `requesting_entity` (banco, financiera, empresa): solo lectura, solo con grant vigente.
- `admin_platform`: configura y habilita; no carga datos de clientes.

### Flujo de habilitación del contador

1. El estudio contable se registra (`/registro/contador`).
2. Su cuenta queda en estado `pending_approval`.
3. Un admin de la plataforma revisa y aprueba el estudio.
4. Solo al aprobarse el estudio queda activo y puede cargar información.

**Pendiente de implementar:** panel admin para aprobar estudios + estado `pending_approval` en onboarding.

### Acceso de entidades financieras — siempre acotado

- Solo acceden a la información que el cliente autorizó explícitamente (scopes).
- El acceso tiene fecha de vencimiento configurada por el cliente al aprobar.
- Cuando vence, el acceso se corta automáticamente.
- Distintos niveles: balance general, estados de resultados, impuestos, patrimonio — cada uno es un scope separado.

---

## 3. Actores del sistema

| Actor | `org.type` | Puede cargar datos | Acceso a carpeta |
|---|---|:---:|:---:|
| Cliente / Productor | `system_user` | No | Solo propios |
| Empresa hija | `system_user_entity` | No | Solo propios |
| Contador (habilitado) | `accounting_firm` | **Sí — único rol** | Clientes vinculados |
| Entidad financiera | `requesting_entity` | No | Solo con grant vigente |
| Admin plataforma | `platform` | No | Auditoría |

---

## 4. Índice de documentos vigentes

| Documento | Estado | Descripción |
|-----------|--------|-------------|
| `000_ESTADO_ACTUAL_PROYECTO.md` | Activo | Este documento — visión completa y reglas de negocio |
| `004_PLAN_ONBOARDING_Y_REGISTRO.md` | **Ola 3 pendiente** | ScopeGuard, GrantStatusBanner, GrantExpiredBlocker, vista carpeta entidad |
| `005_ROADMAP_INTEGRATION_CORE.md` | **Olas 4-9 pendientes** | API hub, webhooks, API keys, SDK, MCP Don Cándido IA |
| `HANDOFF_ACTUAL.md` | Activo | Estado por sesión, archivos modificados, pendientes inmediatos |

**Documentos eliminados (planes completados):**
- `001` Plan original del proyecto
- `002` Reorganización base de datos
- `003` Vistas por rol
- `007` Perfil extendido productor
- `008` ABM Clientes y Empresas

---

## 5. Pendientes por plan

### Plan 004 — Ola 3 (acceso temporizado, guard de carpeta)

- [ ] `components/access/ScopeGuard.tsx` — bloquea vistas según scopes del grant activo
- [ ] `components/access/GrantStatusBanner.tsx` — banner con estado y vencimiento del grant
- [ ] `components/access/GrantExpiredBlocker.tsx` — pantalla de bloqueo al vencer
- [ ] Vista carpeta para entidad solicitante con guard por scope
- [ ] `components/access/AuthorizationDecisionDialog.tsx` — mostrar días solicitados, `approvedDays` editable

### Invitaciones de acceso por link — implementado v1

- [x] Colección `access_invitations` con token hasheado, vencimiento, destinatario y scopes
- [x] APIs para crear, aprobar, aceptar, revocar y regenerar link
- [x] UI "Compartir carpeta" para cliente y contador
- [x] Pantalla pública `/invitar/acceso/[token]` con registro/login del receptor
- [x] Creación de `access_grant` al aceptar la invitación
- [x] Vista read-only de carpeta con `ScopeGuard` y auditoría de acceso

### Plan sin número — Habilitación de contadores (NUEVO — regla de negocio)

- [ ] Estado `pending_approval` en `accounting_firm` al registrarse
- [ ] Pantalla "Tu cuenta está siendo verificada" para contadores pendientes
- [ ] Panel admin: lista de estudios pendientes de aprobación
- [ ] Endpoint `POST /api/admin/accounting-firms/[orgId]/approve`
- [ ] Endpoint `POST /api/admin/accounting-firms/[orgId]/reject`
- [ ] Email de notificación al aprobar/rechazar (opcional v1)

### Plan 005 — Integration Core (Olas 4-9)

- [ ] Ola 4: API `/api/hub/*`, colecciones `integrations`, `api_keys`
- [ ] Ola 5: Webhooks y sistema de eventos
- [ ] Ola 6: API Keys + scopes + multi-tenant seguro
- [ ] Ola 7: SDK interno reutilizable
- [ ] Ola 8: MCP para Don Cándido IA
- [ ] Ola 9: Integración piloto externa (Agro Biciuffa o 9001app)

### OCR/IA para EECC — implementado v1

- [x] Storage path + endpoint upload + colección `financial_statement_imports`
- [x] Extracción Claude API/mock/Excel → mapper a rubros canónicos
- [x] Preview editable con confianza por campo
- [x] Aplicación final a Balance/Resultados con confirmación del contador
- [ ] Variable de entorno `ANTHROPIC_API_KEY` en producción

---

## 6. Módulos implementados (ga)

| Dominio | Módulos |
|---------|---------|
| Auth / Org | `auth_login` · `auth_session` · `auth_guards` |
| Clientes | `producers_abm` · `producer_accountant_links` · `accounting_firms` |
| Carpeta contable | `accounting_periods` · `balance_sheets` · `income_statements` · `tax_documents` · `documents_upload` |
| Patrimonio | `assets_real_estate` · `assets_movable` · `liabilities` |
| Autorizaciones | `access_requests` · `access_grants` |
| Financiación | `financing_requests` |
| Auditoría | `audit_logs` · `notifications` |
| ABM | `/contador/clientes` · `/contador/empresas` · empresa header/subnav |
| Onboarding | Wizards `/registro/usuario`, `/registro/contador`, `/registro/entidad` |

### beta (funcional, en refinamiento)

- `producer_profile_extended` — formulario extendido, checklist documental
- `system_user_entities` — EntitySelector en carpeta

---

## 7. Colecciones Firestore activas

```
users · organizations · organization_members · organization_profiles
producers · accounting_firms · producer_accountant_links
accounting_periods · balance_sheets · income_statements · tax_documents
assets · liabilities · documents
access_requests · access_grants · financing_requests
audit_logs · notifications
```

Colecciones planificadas (no creadas aún):
```
access_invitations · integrations · api_keys · sync_logs · financial_statement_imports
```

---

## 8. Rutas frontend activas

### Públicas
| Ruta | Descripción |
|------|-------------|
| `/` | Landing pública (Legajo) |
| `/login` | Autenticación |
| `/registro` | Selector de tipo de registro |
| `/registro/usuario` | Wizard cliente/productor |
| `/registro/contador` | Wizard estudio contable |
| `/registro/entidad` | Wizard entidad solicitante |

### Privadas — Contador
| Ruta | Descripción |
|------|-------------|
| `/app/contador` | Dashboard |
| `/app/contador/clientes` | Lista de clientes |
| `/app/contador/clientes/[id]` | Datos personales + empresas |
| `/app/contador/empresas` | Lista de empresas del estudio |
| `/app/contador/empresas/[id]/carpeta` | Balance + resultados |
| `/app/contador/empresas/[id]/impuestos` | TaxGridForm |
| `/app/contador/empresas/[id]/bienes` | Assets + pasivos |

### Privadas — Usuario/Productor
| Ruta | Descripción |
|------|-------------|
| `/app/productor` | Dashboard del productor |
| `/app/productor/autorizaciones` | Ver y gestionar grants |

### Privadas — Entidad
| Ruta | Descripción |
|------|-------------|
| `/app/entidad` | Dashboard |
| `/app/entidad/accesos` | Solicitar acceso a carpetas |
| `/app/entidad/financiacion` | Solicitudes de financiación |

---

## 9. Comandos de desarrollo

```bash
pnpm dev                                    # servidor local
pnpm build                                  # build producción
pnpm type-check                             # antes de cada commit
firebase deploy --only firestore:rules      # reglas Firestore
firebase deploy --only firestore:indexes    # índices Firestore
```

---

## 10. Deuda técnica conocida

- Rutas y servicios con nombre `productor` conservados por compatibilidad — no introducir nuevas superficies con ese nombre.
- Claims legacy `producer` y `bank_user` activos por compatibilidad hacia atrás.
- Reglas Firestore e índices pendientes de deploy tras los últimos cambios.
- No se implementó aún el estado `pending_approval` para contadores nuevos.

---

## Actualizacion 2026-06-16 - CreditoHub IA MVP

Plan 014 `reports/014_PLAN_CREDITO_HUB_IA.md` ejecutado completo en alcance MVP:

- Capa IA multiproveedor `lib/ai/*` con xAI/Anthropic/Mock.
- Cola documental asincronica `document_jobs` con lease, clasificacion, extraccion y perfil canonico con procedencia.
- APIs `app/api/credito-hub/*` para intake, worker, jobs, revision profesional, requisitos bancarios, credit applications y matching.
- UI inicial para contador: carga masiva/progreso y revision de campos.
- UI inicial para entidad: constructor de requisitos y matriz de cumplimiento.

Pendientes post-MVP: prueba con documentos reales tras cerrar cifrado V1, expediente bancario final, mas tipos documentales e integracion bancaria viva.
