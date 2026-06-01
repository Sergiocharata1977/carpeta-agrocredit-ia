# Plan 007 — Single del Productor / Contribuyente + Perfil Extendido

**Fecha:** 2026-06-01
**Feature:** Reestructurar la vista del productor para soportar múltiples empresas, balance por año, y perfil extendido con datos fiscales, productivos, financieros, patrimoniales y documentación.

---

## Diagnóstico del estado actual

### Lo que ya existe y está bien
- `organizations` con `type: "system_user"` = declaración personal del productor
- `organizations` con `type: "system_user_entity"` + `parentOrganizationId` = empresas hijas
- `accounting_periods` tiene campo `year` → balance por año ya funciona, el selector de período lo maneja
- API `/api/organizations/{orgId}/entities` devuelve las empresas de un productor
- `ORGANIZATION_PROFILES` ya está en `COLLECTIONS` (no usado todavía)

### Problemas actuales
1. La carpeta muestra solo el org raíz — no hay forma de cambiar a una empresa hija
2. El perfil del productor es solo `legalName`, `taxId`, `activity`, `province`, `city` — faltan todos los campos del brief
3. Bienes/maquinaria e inmuebles se cargan en la carpeta contable (por período) cuando en realidad son registros patrimoniales permanentes (no cambian de año en año salvo bajas)
4. No hay "ficha completa" del productor como punto de entrada antes de entrar a la carpeta

---

## Modelo conceptual corregido

```
Productor (system_user)
├── Perfil extendido (organization_profiles)
│   ├── Datos fiscales: condición, antigüedad, actividades
│   ├── Datos productivos: hectáreas, cultivos, campaña
│   ├── Datos financieros estimados: ventas, deudas bancarias, cheques
│   └── Datos patrimoniales resumen (campos, maquinaria, ganado)
│
├── Empresa 1 (system_user_entity)
│   ├── Período 2023 (accounting_period)
│   │   ├── Balance 2023
│   │   └── Resultados 2023
│   └── Período 2024 (accounting_period)
│       ├── Balance 2024
│       └── Resultados 2024
│
├── Empresa 2 (system_user_entity)
│   └── Período 2024...
│
├── Bienes patrimoniales (assets) ← NO van en períodos, son del productor
│   ├── Inmuebles rurales y urbanos
│   ├── Maquinaria y vehículos
│   └── Ganado, silo bolsa, otros
│
├── Pasivos (liabilities) ← ídem
│
└── Impuestos anuales (tax_documents, por período de la declaración personal)
```

### Aclaración sobre bienes y maquinaria
Los activos fijos (campos, tractores, ganado) son del productor, **no de un período contable**. 
Solo las bajas y altas significativas se registran. El valor puede actualizarse anualmente pero 
no se crea un nuevo registro cada año. Por eso van fuera de los tabs de la carpeta contable 
y son parte del "patrimonial" del productor, independiente de qué período se esté mirando.

---

## Estructura de pantallas propuesta

### Pantalla raíz: `/app/contador/productores/[producerId]`

**Antes:** no existía (iba directo a /carpeta)  
**Ahora:** ficha completa del productor con sub-navegación

```
[ Ramirez Hector ]                          [ Estado: Incompleto ]
CUIT: 23450454589 | Persona Física | Mixta

─── Sub-nav ──────────────────────────────────────────────────
  Perfil    Carpeta contable    Patrimonio    Impuestos    Documentos
──────────────────────────────────────────────────────────────
```

#### Sub-sección: Perfil
Ficha con todos los datos extendidos del productor (ver schema abajo).
Editable por el contador.

#### Sub-sección: Carpeta contable
Selector de entidad (quién) + selector de período (cuándo):

```
  Ver carpeta de:  [ Declaración personal ▾ ]  |  [ Empresa XYZ ▾ ]  |  [ + Agregar empresa ]
  Período:         [ 2024 ▾ ]  [ + Nuevo período ]

  Tabs: Balance | Resultados | Impuestos (solo en declaración personal)
```

Los impuestos mensuales (IVA, Rentas, 931) van **solo** en la declaración personal, no en las empresas.
Cada empresa tiene su propio balance y resultados por año.

#### Sub-sección: Patrimonio
Bienes y pasivos del productor (independientes del período):
- Inmuebles rurales
- Inmuebles urbanos  
- Maquinaria agrícola
- Vehículos
- Ganado / hacienda
- Silo bolsa / stock
- Pasivos / deudas

#### Sub-sección: Documentos
Checklist de documentos con estado (presentado / pendiente / vencido):
- Constancia AFIP
- Inscripción rentas
- DDJJ IVA (últimas 12 mensual o la anual)
- DDJJ Ganancias
- Formulario 931 (si tiene empleados)
- Resumen bancario
- Certificación de ingresos

---

## Schema del perfil extendido (`organization_profiles`)

```typescript
interface OrganizationProfile {
  id: string                          // mismo ID que la organization
  organizationId: string

  // ── DATOS FISCALES ──
  taxCondition: "responsable_inscripto" | "monotributista" | "exento" | "consumidor_final" | "otro"
  taxCategory?: string                // categoría monotributo si aplica: A, B, C... K
  activitiesAfip?: string[]           // lista de actividades AFIP (código + descripción)
  registrationYear?: number           // año de inicio de actividad
  hasEmployees?: boolean
  employeesCount?: number

  // ── DATOS PRODUCTIVOS ──
  ownHectares?: number
  rentedHectares?: number
  mainCrops?: string[]                // soja, maíz, trigo, girasol, etc.
  estimatedProduction?: string        // ej: "3500 tn soja / campaña"
  currentCampaign?: string            // ej: "2024/2025"
  mainMachinery?: string              // descripción libre de maquinaria principal

  // ── DATOS FINANCIEROS ESTIMADOS ──
  estimatedAnnualSales?: number
  estimatedAnnualSalesCurrency?: "ARS" | "USD"
  bankDebts?: number
  bankDebtsCurrency?: "ARS" | "USD"
  issuedChecks?: number               // monto estimado de cheques emitidos
  rejectedChecks?: number             // monto o cantidad de rechazados
  activeLoans?: string                // descripción libre: "2 préstamos BICA + 1 BCRP"
  ruralCards?: string                 // tarjetas rurales activas
  commercialQuotas?: string           // cupos con acopios/cooperativas

  // ── DATOS PATRIMONIALES RESUMEN ──
  // (complementa los assets, es un resumen rápido para la ficha)
  summaryOwnFields?: string           // "3 campos, 850 ha totales"
  summaryMachinery?: string           // "tractor JD + cosechadora CII"
  summaryVehicles?: string
  summarySiloBolsa?: string           // "stock estimado 500 tn"
  summaryLivestock?: string           // "120 novillos angus"

  // ── METADATA ──
  updatedBy: string
  updatedAt: string
  createdAt: string
}
```

---

## Resumen de olas

| Ola | Contenido |
|-----|-----------|
| **1** | Schema `organization_profiles` + tipos + servicio cliente + API GET/PATCH |
| **2** | Pantalla raíz del productor + sub-navegación (Perfil / Carpeta / Patrimonio / Documentos) |
| **3** | Carpeta contable con selector de entidad (empresa hija) |
| **4** | Formulario de perfil extendido completo |
| **5** | Checklist de documentación + migrar bienes/maquinaria al patrimonial |

---

## Ola 1 — Schema, tipos y API de perfil

### Objetivo
Crear el contrato de datos para el perfil extendido sin tocar UI.

### Archivos a crear
- `types/producer-profile.ts` — tipo `OrganizationProfile` completo.
- `lib/schemas/producer-profile.ts` — schema Zod para crear/actualizar el perfil.
- `lib/services/producer-profile.ts` — `getProducerProfile(orgId)` y `upsertProducerProfile(orgId, data)` vía Firestore cliente (accountant puede escribir).
- `app/api/producer-profile/[orgId]/route.ts` — GET y PATCH server-side (para validar acceso).

### Archivos a modificar
- `firestore.rules` — permitir lectura y escritura de `organization_profiles` para contadores y admin.

### Prompt para el agente
```text
--- DOCUMENTO FUENTE ---
Documento: `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`
Posición: Ola 1

Lee el plan completo antes de implementar.

Contexto:
- `ORGANIZATION_PROFILES` ya está en `lib/firebase/collections.ts`.
- El perfil tiene el mismo ID que la organización (producerId).
- Firestore rules actuales deniegan escritura de `organization_profiles` desde el cliente.
- Contador (accountant/accounting_firm_admin) debe poder leer y actualizar el perfil.

Implementar:
1. Crear `types/producer-profile.ts` con el tipo `OrganizationProfile` del plan.
2. Crear `lib/schemas/producer-profile.ts` con schema Zod (todos los campos opcionales excepto organizationId).
3. Crear `lib/services/producer-profile.ts`:
   - `getProducerProfile(orgId)`: lee `organization_profiles/{orgId}`.
   - `upsertProducerProfile(orgId, data)`: crea o actualiza con merge.
4. Actualizar `firestore.rules` para `organization_profiles`:
   - read: `canReadFolderData` o `isMemberOf` o `isAccountant`.
   - write: `isAccountant() || isAdminPlatform()`.
5. `pnpm type-check` OK.

No hacer: No crear UI todavía.
```

---

## Ola 2 — Pantalla raíz del productor + sub-navegación

### Objetivo
Crear la ficha del productor como punto de entrada, con sub-nav que reemplaza la navegación actual.

### Archivos a crear
- `app/app/contador/productores/[producerId]/page.tsx` — ficha del productor (actualmente no existe, va directo a /carpeta).
- `components/producers/ProducerSubNav.tsx` — sub-navegación: Perfil / Carpeta / Patrimonio / Documentos.
- `components/producers/ProducerHeader.tsx` — encabezado con nombre, CUIT, estado, rol.

### Archivos a modificar
- `app/app/contador/productores/[producerId]/carpeta/page.tsx` — reducir encabezado (lo hereda del layout padre).
- `app/app/contador/productores/[producerId]/bienes/page.tsx` — ídem.

### Prompt para el agente
```text
--- DOCUMENTO FUENTE ---
Documento: `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`
Posición: Ola 2

Lee el plan completo antes de implementar.

Contexto:
- Actualmente `/app/contador/productores/[producerId]` no tiene page.tsx.
- La carpeta en `/carpeta` y bienes en `/bienes` son rutas hijas del mismo segmento.
- El sub-nav permite cambiar de sección sin perder el contexto del productor.

Implementar:
1. Crear `app/app/contador/productores/[producerId]/page.tsx`:
   - Mostrar `ProducerHeader` con datos básicos.
   - Mostrar `ProducerSubNav` con tabs: Perfil | Carpeta contable | Patrimonio | Documentos.
   - Por defecto aterrizá en la sección Perfil con los datos básicos actuales.
   - Si el perfil extendido existe, mostrar resumen de datos productivos y fiscales.

2. Crear `ProducerHeader`:
   - Nombre, CUIT, tipo de persona, actividad, estado de carpeta.
   - Badge de condición fiscal si está en el perfil.

3. Crear `ProducerSubNav`:
   - Links: `/app/contador/productores/[id]` | `/app/contador/productores/[id]/carpeta` | `/app/contador/productores/[id]/bienes` | `/app/contador/productores/[id]/documentos`
   - Resaltar el activo según la ruta actual.

4. `pnpm type-check` OK. Commit y push.
```

---

## Ola 3 — Selector de entidad en carpeta contable

### Objetivo
Agregar el selector "Ver carpeta de: [Declaración personal | Empresa X | + Agregar empresa]" 
encima del selector de período.

### Archivos a modificar
- `app/app/contador/productores/[producerId]/carpeta/page.tsx`

### Archivos a crear
- `components/producers/EntitySelector.tsx` — chips/dropdown de entidades del productor.

### Prompt para el agente
```text
--- DOCUMENTO FUENTE ---
Documento: `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`
Posición: Ola 3

Lee el plan completo antes de implementar.

Contexto:
- API disponible: `GET /api/organizations/{orgId}/entities` devuelve las empresas hijas.
- La carpeta contable usa `producerId` para cargar períodos, balance, resultados.
- Cuando se selecciona una empresa hija, el `producerId` interno cambia al ID de la entidad.
- La URL no cambia (sigue siendo el producerId raíz). El estado es local a la página.

Implementar:
1. Al cargar la página, llamar `GET /api/organizations/{producerId}/entities` para obtener empresas.
2. Crear `EntitySelector`:
   - Primer chip: "Declaración personal" (usa el producerId raíz).
   - Un chip por cada empresa hija.
   - Botón "+ Empresa" que abre un mini-form modal para agregar (POST a la misma API).
   - Al seleccionar: cambiar el `activeEntityId` en state local.
3. Cuando `activeEntityId` cambia: recargar períodos, balance, resultados con ese ID.
4. Impuestos (grilla IVA/Rentas/931) solo se muestran cuando `activeEntityId === producerId` raíz.
5. `pnpm type-check` OK. Commit y push.
```

---

## Ola 4 — Formulario de perfil extendido

### Objetivo
Formulario completo para que el contador cargue todos los datos del perfil del productor.

### Archivos a crear
- `components/producers/ProducerProfileForm.tsx` — form dividido en secciones (acordeones o pestañas internas).

### Archivos a modificar
- `app/app/contador/productores/[producerId]/page.tsx` — integrar el form.

### Prompt para el agente
```text
--- DOCUMENTO FUENTE ---
Documento: `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`
Posición: Ola 4

Lee el plan completo antes de implementar.

Contexto:
- Schema Zod en `lib/schemas/producer-profile.ts` (Ola 1).
- Servicio en `lib/services/producer-profile.ts` (Ola 1).
- El form carga datos existentes si los hay y guarda con upsert.
- El formato visual debe mantener columna vertical, secciones colapsables.

Secciones del formulario:
1. Datos fiscales: condición fiscal (select), categoría monotributo (text), actividades AFIP (tags), año de inicio, tiene empleados (switch), cantidad empleados.
2. Datos productivos: hectáreas propias, hectáreas alquiladas, cultivos principales (chips editables), producción estimada, campaña actual, maquinaria principal.
3. Datos financieros: ventas estimadas + moneda, deudas bancarias + moneda, cheques emitidos, cheques rechazados, préstamos vigentes (texto libre), tarjetas rurales, cupos comerciales.
4. Datos patrimoniales resumen: campos propios, maquinaria, vehículos, silo bolsa/stock, ganado.

Implementar:
- Un solo botón "Guardar perfil" al final.
- Usar `react-hook-form` + `zodResolver`.
- Toast de éxito/error.
- `pnpm type-check` OK. Commit y push.
```

---

## Ola 5 — Checklist de documentación

### Objetivo
Una sección de documentación que muestra qué documentos debe tener el productor, 
con estado (presentado / pendiente / vencido) y posibilidad de subir el archivo.

### Archivos a crear
- `app/app/contador/productores/[producerId]/documentos/page.tsx`
- `components/producers/DocumentChecklist.tsx`

### Tipos de documentos del checklist
```typescript
type ChecklistDocType =
  | "constancia_afip"
  | "inscripcion_rentas"
  | "ddjj_iva_anual"        // o últimas 12 mensuales
  | "ddjj_ganancias"
  | "formulario_931"         // solo si hasEmployees
  | "resumen_bancario"
  | "certificacion_ingresos"
```

### Prompt para el agente
```text
--- DOCUMENTO FUENTE ---
Documento: `reports/007_PLAN_SINGLE_PRODUCTOR_PERFIL.md`
Posición: Ola 5

Lee el plan completo antes de implementar.

Contexto:
- DocumentUploader ya existe en `components/documents/DocumentUploader.tsx`.
- Los documentos se guardan en la colección `documents` con `documentType`.
- El checklist usa los documentos existentes para determinar el estado.

Implementar:
1. Crear `DocumentChecklist`:
   - Lista fija de tipos de documentos del plan.
   - Para cada tipo: mostrar si hay un archivo subido, fecha de carga, badge de estado.
   - Si no hay archivo: botón "Subir" que abre el DocumentUploader.
   - "Formulario 931" solo aparece si `hasEmployees === true` en el perfil.
2. Crear página `/documentos`.
3. Incluir en el sub-nav del productor.
4. `pnpm type-check` OK. Commit y push.
```

---

## Decisiones de diseño

| Tema | Decisión |
|------|----------|
| Bienes (inmuebles, maquinaria) | Son patrimoniales del productor, no de un período. Ya están en la página `/bienes`. Mover a sub-nav de "Patrimonio". |
| Impuestos mensuales | Solo en la declaración personal (org raíz), no en empresas hijas. |
| Balance por año | Ya funciona via `accounting_periods`. Cada empresa hija tiene sus propios períodos. |
| Perfil extendido | En `organization_profiles` con el mismo ID que la org. Singleton por productor. |
| URL con selector de empresa | El producerId en la URL siempre es el raíz. El selector de empresa es estado local. |
| Datos financieros estimados | Son soft-data para la ficha crediticia, no datos contables duros. Van en el perfil, no en balance. |
