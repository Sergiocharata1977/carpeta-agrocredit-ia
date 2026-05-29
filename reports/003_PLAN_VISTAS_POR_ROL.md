# Plan de Vistas por Rol — AgroCredit IA

**Fecha:** 2026-05-29
**Estado:** plan aprobado, pendiente de implementación
**Depende de:** `reports/002_REORGANIZACION_BASE_DATOS.md` (modelo con `system_user` / `system_user_entity` / `requesting_entity`)

---

## Principio de diseño

La aplicación es operativa, no informativa. Cada rol entra a una lista de trabajo.
Desde la lista accede a una single (detalle). Las singles muestran solo lo que el
rol tiene permitido ver según el grant activo.

Estructura universal:
```
Dashboard (lista de trabajo)
  └── Single (detalle del cliente / empresa / carpeta)
        └── Secciones de la carpeta según scope autorizado
```

---

## ROL 1 — Usuario del sistema (system_user)

El usuario del sistema es el titular/cliente raíz. Puede ser una persona física o una
sociedad. Tiene una o varias empresas hijas (`system_user_entity`).

### Dashboard: lista de empresas

**Ruta:** `/app/usuario`

**Lo que ve:**
- Tarjeta de su organización raíz con estado de carpeta (`folderStatus`)
- Lista de sus empresas hijas con `folderStatus` de cada una
- Alertas: carpetas incompletas, períodos vencidos, autorizaciones pendientes de decisión

**Acciones:**
- Entrar a la single de su organización raíz
- Entrar a la single de cualquier empresa hija
- Ver notificaciones y autorizaciones pendientes

**Componentes:**
- `SystemUserDashboard` — resumen + alertas
- `EntityCard` — tarjeta de organización con folderStatus
- `EntityList` — lista de empresas hijas

---

### Single de empresa (propia)

**Ruta:** `/app/usuario/carpeta/[orgId]`

Funciona tanto para el `system_user` raíz como para cada `system_user_entity`.

**Lo que ve:**
- Header: nombre legal, CUIT, actividad, provincia, folderStatus
- Tabs navegables:

| Tab | Contenido |
|---|---|
| Resumen | Totales patrimoniales, ratios básicos, estado por período |
| Balances | Historial de balance general por período |
| Resultados | Estado de resultados por período |
| Impuestos | IVA, Ganancias, 931 y otros |
| Patrimonio | Bienes inmuebles y muebles con valuación |
| Deudas | Pasivos bancarios y comerciales |
| Documentos | Archivos adjuntos con fecha y tipo |
| Autorizaciones | Accesos activos, pedidos pendientes e historial |
| Financiaciones | Solicitudes de crédito asociadas |

**Acciones:**
- Ver historial de accesos (quién vio qué y cuándo)
- Aprobar, rechazar o revocar solicitudes de acceso
- Ver estado de solicitudes de financiación

**Lo que NO puede hacer:**
- Editar datos contables (eso es del contador)
- Aprobar financiaciones (eso es del banco)

---

## ROL 2 — Contador (accountant / accounting_firm_admin)

El contador ve los usuarios que lo eligieron y carga la carpeta de cada uno y sus empresas.

### Dashboard: lista de clientes

**Ruta:** `/app/contador`

**Lo que ve:**
- Lista de usuarios del sistema (`system_user`) que tienen al contador vinculado
- Indicadores por cliente:
  - Cantidad de empresas hijas
  - Períodos con carpeta incompleta
  - Documentos pendientes de carga
  - Últimas actualizaciones
- Alertas: períodos próximos a vencer, balances sin validar

**Acciones:**
- Entrar a la single del usuario/cliente
- Filtrar por estado de carpeta, período, alerta

**Componentes:**
- `ContadorDashboard`
- `ClientRow` — fila de cliente con estado e indicadores
- `ClientList`

---

### Single del cliente (vista contador)

**Ruta:** `/app/contador/clientes/[systemUserOrgId]`

**Lo que ve:**
- Información del usuario raíz
- Lista de empresas hijas con folderStatus de cada una
- Acceso directo a la carpeta de cada empresa

**Acciones:**
- Entrar a cargar/editar la carpeta de la organización raíz
- Entrar a cargar/editar la carpeta de cada empresa hija

---

### Carpeta del cliente (edición)

**Ruta:** `/app/contador/clientes/[systemUserOrgId]/carpeta/[entityOrgId]`

`entityOrgId` puede ser el mismo `systemUserOrgId` (carpeta raíz) o una empresa hija.

**Tabs disponibles para el contador:**

| Tab | Puede hacer |
|---|---|
| Períodos | Crear, cerrar y archivar períodos fiscales |
| Balance | Cargar y editar balance general |
| Resultados | Cargar y editar estado de resultados |
| Impuestos | Cargar liquidaciones fiscales |
| Patrimonio | ABM de bienes inmuebles y muebles |
| Deudas | ABM de pasivos |
| Documentos | Subir, reemplazar y eliminar archivos |

**Reglas:**
- El contador validará su vínculo activo con el `system_user` raíz antes de poder cargar datos de cualquiera de sus empresas hijas.
- Si `canAuthorize = false` en el vínculo, el contador no puede aprobar solicitudes de acceso en nombre del usuario.

---

## ROL 3 — Empresa agrocomercial (requesting_entity, subtype: agro_company)

La empresa agrocomercial evalúa a productores/empresas que quieren comprarle a plazo.

### Dashboard: lista de solicitudes recibidas

**Ruta:** `/app/entidad`

**Lo que ve:**
- Lista de usuarios y/o empresas que han solicitado crédito comercial o compra a plazo
- Estado de cada solicitud: `requested` / `approved` / `in_review` / `observed`
- Indicador de acceso a carpeta: si tiene grant activo para ese cliente

**Columnas de la lista:**
- Nombre del cliente (system_user o system_user_entity)
- Tipo (persona física / sociedad)
- Fecha de solicitud
- Estado de la solicitud de financiación
- Estado del acceso a carpeta (con/sin grant, vencimiento)
- Acción: ver carpeta (si tiene acceso) / solicitar acceso / ver estado

**Acciones:**
- Solicitar acceso a carpeta de un cliente
- Crear solicitud de financiación
- Entrar a la single del cliente (si tiene grant activo)

---

### Single del cliente (vista empresa agrocomercial)

**Ruta:** `/app/entidad/carpetas/[targetOrgId]`

**Acceso bloqueado si:** no existe `access_grant` activo, no vencido, con scope suficiente.

**Lo que ve (según scopes del grant):**

| Scope | Sección visible |
|---|---|
| `profile_basic` | Nombre, CUIT, actividad, provincia, tipo |
| `accounting_summary` | Totales de balance, resultado neto, ratios básicos |
| `balance_sheets` | Balance general por período |
| `income_statements` | Estado de resultados por período |
| `tax_documents` | Liquidaciones fiscales |
| `assets` | Bienes inmuebles y muebles con valuaciones |
| `liabilities` | Deudas bancarias y comerciales |
| `documents` | Documentos adjuntos descargables |
| `full_credit_folder` | Todo lo anterior |

**Lo que NO puede hacer:**
- Editar ningún dato
- Ver datos fuera de sus scopes autorizados
- Acceder si el grant está vencido o revocado

**Header de la single:**
- Nombre del cliente
- Scopes autorizados (badges)
- Fecha de vencimiento del grant
- Botón: solicitar renovación de acceso

---

## ROL 4 — Banco / financiera (requesting_entity, subtype: bank | financial_entity)

Banco y financiera comparten el mismo dashboard que la empresa agrocomercial
(`/app/entidad`) con algunas diferencias en las acciones disponibles.

### Dashboard: lista de créditos

**Ruta:** `/app/entidad` (mismo componente, diferente subtype)

**Lo que ve:**
- Lista de usuarios/empresas que solicitaron crédito
- Estado de cada solicitud de financiación en formato tabla o Kanban
- Indicador de acceso a carpeta por cliente

**Vista adicional exclusiva de banco:** Kanban de financiaciones

**Ruta:** `/app/entidad/financiaciones`

**Columnas Kanban:**

```
Solicitado → Autorización pendiente → Docs recibidos → En análisis → Observado → Aprobado / Rechazado
```

Cada tarjeta del Kanban muestra:
- Nombre del cliente
- Monto solicitado
- Tipo de financiación
- Días en el estado actual
- Acceso a carpeta: activo / sin acceso

---

### Single del cliente (vista banco)

**Ruta:** `/app/entidad/carpetas/[targetOrgId]`

Igual que la vista de empresa agrocomercial — misma ruta, mismo componente.
El banco ve exactamente lo que el productor autorizó según scopes del grant.

**Acciones adicionales del banco:**
- Agregar observaciones a la solicitud de financiación
- Cambiar estado de la solicitud (dentro de sus permisos)
- Solicitar documentos adicionales

---

## ROL 5 — Admin plataforma (admin_platform)

### Dashboard

**Ruta:** `/app/admin`

**Accesos:**
- Lista de organizaciones (todas)
- Lista de usuarios (todos)
- Audit logs
- Notificaciones del sistema

No tiene single de carpeta — puede ver todo desde el panel de auditoría.

---

## Mapa de rutas completo

```
/login
/app                                          → router por rol

/app/usuario                                  → dashboard: mis empresas
/app/usuario/carpeta/[orgId]                  → single: ver carpeta propia (tabs)
/app/usuario/autorizaciones                   → bandeja de decisiones de acceso

/app/contador                                 → dashboard: mis clientes
/app/contador/clientes/[systemUserOrgId]      → single: cliente y sus empresas
/app/contador/clientes/[systemUserOrgId]/carpeta/[entityOrgId]  → edición de carpeta

/app/entidad                                  → dashboard: solicitudes y clientes
/app/entidad/financiaciones                   → kanban (solo banco/financiera)
/app/entidad/carpetas/[targetOrgId]           → single: carpeta del cliente (read-only por scope)
/app/entidad/accesos                          → solicitudes de acceso enviadas

/app/admin                                    → panel administrador
/app/admin/organizaciones                     → ABM organizaciones
/app/admin/usuarios                           → ABM usuarios
/app/admin/auditoria                          → audit logs
/app/notificaciones                           → centro de notificaciones (todos los roles)
```

---

## Componentes compartidos entre roles

| Componente | Uso |
|---|---|
| `CarpetaViewer` | Single de carpeta read-only (usuario viendo la suya, entidad viendo la del cliente) |
| `CarpetaEditor` | Single de carpeta editable (contador cargando datos) |
| `ScopeGuard` | Bloquea secciones de `CarpetaViewer` según scopes del grant activo |
| `FolderStatusBadge` | Semáforo de completitud de carpeta |
| `GrantStatusBanner` | Banner que muestra scopes activos y vencimiento del grant |
| `AccessRequestDialog` | Modal para solicitar acceso (entidad solicitante) |
| `AuthorizationDecisionDialog` | Modal para aprobar/rechazar (usuario del sistema) |
| `EntityCard` | Tarjeta de organización con tipo, CUIT, folderStatus |
| `PeriodSelector` | Selector de período fiscal/campaña |

---

## Flujo principal de punta a punta

```
1. Contador carga carpeta
   contador entra a su cliente → selecciona empresa → carga período → sube balance, impuestos, bienes, docs

2. Entidad solicita acceso
   banco/empresa entra → busca cliente → solicita acceso con scopes y vencimiento pedido

3. Usuario autoriza
   usuario entra → ve solicitud pendiente → aprueba con scopes y vencimiento

4. Entidad ve carpeta
   banco/empresa entra → lista de clientes → entra a single → ve datos según scopes del grant

5. Banco gestiona financiación
   banco crea solicitud de financiación → kanban → cambia estados → agrega observaciones
```

---

## Prioridad de implementación

| Prioridad | Vista | Motivo |
|---|---|---|
| 1 | `/app/usuario` + single de empresa (tabs) | El usuario debe poder ver su carpeta |
| 2 | `/app/contador` + carpeta editable | Sin esto no hay datos para ver |
| 3 | `/app/entidad` lista + single con ScopeGuard | Cierra el ciclo de negocio |
| 4 | `/app/entidad/financiaciones` Kanban | Flujo de crédito completo |
| 5 | `/app/admin` | Soporte y auditoría |

---

## Notas para la IA que implemente

1. Leer `reports/002_REORGANIZACION_BASE_DATOS.md` — el modelo de datos cambió.
   Ya no existen colecciones `producers`, `accounting_firms`, `financial_entities`.
   Todo vive en `organizations` con `type` y `subtype`.

2. `CarpetaViewer` y `CarpetaEditor` son el corazón del sistema. Diseñarlos bien
   desde el principio evita duplicar lógica.

3. `ScopeGuard` debe ser un componente que recibe el grant activo y el scope requerido
   para renderizar o bloquear cada sección.

4. Las rutas con `[orgId]`, `[systemUserOrgId]`, `[entityOrgId]`, `[targetOrgId]` son
   todas IDs de la colección `organizations`. No hay IDs de colecciones separadas.

5. Validar server-side que el usuario que accede a `/app/entidad/carpetas/[targetOrgId]`
   tiene un `access_grant` activo, no vencido, con scope suficiente. No confiar solo en
   el cliente.

6. El componente `CarpetaViewer` en modo usuario (viendo su propia carpeta) no necesita
   verificar grant — el usuario siempre puede ver sus propios datos.

7. Actualizar `docs/MODULE_REGISTRY.md` y `reports/HANDOFF_ACTUAL.md` al terminar.
