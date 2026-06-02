# Plan 008 — ABM Clientes y ABM Empresas

**Fecha:** 2026-06-02  
**Feature:** Separar el módulo del contador en dos ABMs independientes: Clientes (personas) y Empresas (entidades fiscales). Toda la carpeta contable (balance, resultados, impuestos, bienes) pasa a vivir a nivel de Empresa.  
**Proyectos afectados:** `Agro-Credit`

---

## Motivación y decisiones de dominio

### Modelo de negocio

| Entidad | Tipo Firestore | Descripción |
|---|---|---|
| **Cliente** | `organizations.type = "system_user"` | La persona física: datos personales, CUIT, contacto |
| **Empresa** | `organizations.type = "system_user_entity"` con `parentOrganizationId` | Entidad fiscal con carpeta contable propia |

Un cliente puede tener **cero o más empresas** relacionadas.  
La persona física actúa como su propia "empresa" para la carpeta contable: el contador puede acceder a la carpeta de la persona física yendo a `/app/contador/empresas/[clientId]` (donde `clientId` es el mismo ID que la org `system_user`).  
La relación M:N completa (`entity_ownership`) queda para un plan futuro; en v1 cada empresa tiene un `parentOrganizationId` = cliente principal.

### Qué cambia vs el estado actual

| Antes | Después |
|---|---|
| `/app/contador/productores` — lista única | `/app/contador/clientes` — lista de personas |
| `/app/contador/productores/[id]` — single con sub-nav Perfil / Carpeta / Patrimonio | `/app/contador/clientes/[id]` — Datos personales + Lista de empresas |
| Carpeta con EntitySelector para cambiar empresa | `/app/contador/empresas/[id]` — cada empresa tiene su propia carpeta directa |
| Bienes al nivel del productor raíz | Bienes al nivel de cada empresa |
| Sidebar: "Productores" + botón "Nueva Carpeta" | Sidebar: "Clientes" + "Empresas" + botón "Nuevo Cliente" |

### Qué NO cambia
- Colecciones Firestore (`organizations`, `accounting_periods`, `balance_sheets`, `income_statements`, `tax_documents`, `assets`, `liabilities`) — no hay migración de datos
- APIs existentes: `/api/contador/productores`, `/api/organizations/[orgId]/entities`, `/api/producer-profile`
- Las rutas `/app/contador/productores/*` siguen existiendo; la Ola 3 agrega redirect
- El perfil extendido (`ProducerProfileForm`) sigue cargando desde el cliente (no de la empresa)

---

## Resumen de olas

| Ola | Agentes | Paralelos entre sí | Dependen de |
|-----|---------|---------------------|-------------|
| 1 | A | Único | Nada |
| 2 | A, B | Sí | Ola 1 completa |
| 3 | A | Único | Ola 2 completa |

---

## Ola 1 — Backend: servicios per-organización + API de empresas

> Ejecutar Agente A solo — es el único de esta ola

### Agente A — Servicios por organización + API GET /api/contador/empresas

**Puede ejecutarse en paralelo con:** es el único de esta ola  
**Depende de:** nada — es la primera ola

#### Objetivo

Agregar funciones de consulta de bienes y pasivos por `organizationId` (no solo `producerId`), y crear el endpoint de listado de empresas del estudio contable.

#### Archivos a modificar

- `lib/services/assets.ts` — agregar `getAssetsForOrganization` y `getAssetsByTypeForOrganization`
- `lib/services/liabilities.ts` — agregar `getLiabilitiesForOrganization`

#### Archivos a crear

- `app/api/contador/empresas/route.ts` — `GET` lista todas las `system_user_entity` cuyos `parentOrganizationId` son clientes del estudio

#### Prompt completo para el agente

```
Stack: Next.js App Router + Firebase 12 + TypeScript + Admin SDK (server) + Firestore SDK (cliente).
Directorio raíz: Agro-Credit/

CONTEXTO
========

En `lib/services/assets.ts` existe `getAssetsForProducer(producerId)` que hace:
  query(collection(db, COLLECTIONS.ASSETS), where("producerId", "==", producerId))

El tipo `Asset` en `types/assets.ts` ya tiene AMBOS campos:
  producerId: string
  organizationId: string

En `lib/services/liabilities.ts` existe `getLiabilitiesForProducer(producerId)` con el mismo patrón.

En `app/api/contador/productores/route.ts` hay un endpoint GET que usa Admin SDK,
autentica con `verifyRequestSession`, valida que el usuario sea contador, y retorna
la lista de productores del estudio usando producer_accountant_links.

Colecciones (de `lib/firebase/collections.ts`):
  ORGANIZATIONS = "organizations"
  ORGANIZATION_MEMBERS = "organization_members"
  PRODUCER_ACCOUNTANT_LINKS = "producer_accountant_links"
  ASSETS = "assets"
  LIABILITIES = "liabilities"

Helpers de autenticación server-side (importar de `lib/auth/server-session`):
  verifyRequestSession, isAccountantRole, requireDefaultOrganization, getAuthErrorResponse

Admin SDK: importar de `lib/firebase/admin-sdk` → `getAdminDb()`

TAREA 1 — lib/services/assets.ts
=================================
Agregar estas dos funciones al final del archivo (no modificar las existentes):

  export async function getAssetsForOrganization(organizationId: string): Promise<Asset[]>
  // query: where("organizationId", "==", organizationId)

  export async function getAssetsByTypeForOrganization(
    organizationId: string,
    assetType: Asset["assetType"]
  ): Promise<Asset[]>
  // query: where("organizationId", "==", organizationId) + where("assetType", "==", assetType)

TAREA 2 — lib/services/liabilities.ts
=======================================
Agregar al final del archivo:

  export async function getLiabilitiesForOrganization(organizationId: string): Promise<Liability[]>
  // query: where("organizationId", "==", organizationId)

TAREA 3 — app/api/contador/empresas/route.ts
=============================================
Crear un Route Handler GET que:

1. Autentique con verifyRequestSession — si falla, retornar getAuthErrorResponse(error)
2. Verifique que el usuario tenga rol contador (isAccountantRole) — si no, retornar 403
3. Obtenga el org del contador con requireDefaultOrganization(session)
4. Use getAdminDb() para:
   a. Leer todos los producer_accountant_links donde:
      - accountingFirmOrganizationId == contadorOrgId
      - status == "active"
   b. Extraer la lista de producerOrganizationIds (máximo 30 para evitar límite de Firestore IN)
   c. Si la lista está vacía, retornar { empresas: [] }
   d. Consultar organizations donde:
      - parentOrganizationId IN [lista de IDs]
      - type == "system_user_entity"
   e. Para cada empresa encontrada, buscar el org padre en la lista de clientes (ya la tenemos en memoria del paso b, o hacer una consulta por lotes a organizations para obtener legalName del padre)
5. Retornar JSON:
   {
     empresas: Array<{
       id: string
       legalName: string
       taxId: string
       activity: string
       province: string
       city: string
       entityOwnersText?: string
       parentOrganizationId: string
       parentLegalName: string   // nombre del cliente padre
       createdAt: string
     }>
   }

Para el paso (e), dado que ya tienes los IDs de los clientes, puedes obtener sus docs
con getAdminDb().collection("organizations").where(FieldPath.documentId(), "in", [...]).get()

Exportar: export async function GET(request: NextRequest) { ... }
No crear POST ni DELETE en este archivo.

CRITERIO DE ÉXITO
=================
- pnpm type-check sin errores
- Las nuevas funciones compilan
- El endpoint retorna 401 sin token, 403 si no es contador, 200 con array si es correcto
```

---

## Ola 2 — Frontend páginas Clientes y Empresas

> Ejecutar Agente A + Agente B en PARALELO — son completamente independientes

---

### Agente A — Páginas ABM Clientes (lista + single)

**Puede ejecutarse en paralelo con:** Agente B  
**Depende de:** Ola 1 completa

#### Objetivo

Crear las páginas `/app/contador/clientes` (lista) y `/app/contador/clientes/[clientId]` (datos personales del cliente + grid de empresas relacionadas).

#### Archivos a crear

- `app/app/contador/clientes/page.tsx` — lista de clientes del estudio
- `app/app/contador/clientes/[clientId]/page.tsx` — single: datos personales + empresas

#### Prompt completo para el agente

```
Stack: Next.js App Router + Firebase + TypeScript + Tailwind + shadcn/Radix UI.
Directorio raíz: Agro-Credit/

CONTEXTO
========

El archivo `app/app/contador/productores/page.tsx` es el modelo base para la lista.
Ya existe `GET /api/contador/productores` que retorna { producers: Producer[] }.
Ya existe `GET /api/organizations/[orgId]/entities` que retorna { entities: Organization[] }
  — requiere Bearer token, retorna las empresas hijas de un cliente.

El tipo Producer está en `types/producer.ts`.
El tipo Organization está en `types/auth.ts`.
El helper de token: `getFreshIdToken()` de `lib/firebase/auth-client`.
El hook de sesión: `useSession()` de `lib/auth/session`.

Componentes UI disponibles: Card, CardContent, CardHeader, CardTitle, Button, Input,
Badge, Skeleton — todos en `@/components/ui/...`.

Iconos Lucide que puedes usar: Users, Building2, Plus, PlusCircle, Search,
LayoutList, LayoutGrid, ChevronRight, MapPin, Phone.

El diseño del single del cliente (confirmado por el usuario):
  - Encabezado: nombre del cliente (grande), CUIT, actividad, localidad — sin sub-nav
  - Sección 1: "Datos personales" — card con campos: Razón social, CUIT, Actividad,
    Condición fiscal (si está en el perfil), Provincia, Ciudad, Teléfono, Email.
  - Sección 2: "Empresas relacionadas" — grid de cards, una por empresa + card de "Persona Física"
    + botón "+ Nueva Empresa"
  - Cada card de empresa muestra: nombre, CUIT, actividad, y un link
    href="/app/contador/empresas/[entityId]"
  - La card "Persona Física" linkea a href="/app/contador/empresas/[clientId]"
    (el mismo ID del cliente actúa como empresa para la carpeta de persona física)
  - El botón "+ Nueva Empresa" abre un Dialog con el formulario de EntitySelector
    (reusa la lógica de POST a /api/organizations/[clientId]/entities)

TAREA 1 — app/app/contador/clientes/page.tsx
=============================================
Crear una página "use client" similar a productores/page.tsx:

- Título: "Clientes"
- Subtítulo: "Carpetas asignadas a tu estudio contable"
- Fetch: GET /api/contador/productores (misma API — solo cambia el label)
- Botón: "+ Nuevo Cliente" — abre NuevoProductorDialog importado de
  `@/components/producers/NuevoProductorDialog`
  (el diálogo existente sirve; no crear uno nuevo)
- Vista lista/grid con toggle (igual que en productores)
- Buscador por nombre o CUIT
- Al hacer click en una fila → navegar a `/app/contador/clientes/${producer.id}`
  (ya no a /productores)
- Importar ProducerTable de `@/components/producers/ProducerTable` si existe,
  o hacer tabla inline

No tocar productores/page.tsx — solo crear la nueva ruta.

TAREA 2 — app/app/contador/clientes/[clientId]/page.tsx
========================================================
Crear una página "use client":

Estado local:
  - client: Organization | null
  - profile: OrganizationProfile | null
  - entities: ChildEntity[]
  - loading: boolean
  - showNewEmpresaDialog: boolean
  - savingEntity: boolean
  - entityForm: { legalName, taxId, activity, province, city, entityOwnersText }

type ChildEntity = Pick<Organization, "id" | "legalName" | "taxId" | "activity" | "province" | "city" | "entityOwnersText">

Al montar:
  1. Fetch GET /api/contador/productores para encontrar el cliente — O bien,
     llamar directo a Firestore cliente:
       getDoc(doc(db, "organizations", clientId)) 
     usando getFirebaseDb() de lib/firebase/config.ts
  2. Fetch GET /api/organizations/[clientId]/entities con Bearer token
     para obtener las empresas hijas
  3. getProducerProfile(clientId) de lib/services/producer-profile

Render:
  ┌─ Encabezado ─────────────────────────────────────────────────────────┐
  │  [nombre del cliente — text-2xl font-bold]                           │
  │  CUIT: xxxx | Actividad | Ciudad, Provincia                          │
  └──────────────────────────────────────────────────────────────────────┘

  ┌─ Card "Datos personales" ────────────────────────────────────────────┐
  │  Grid 2 columnas:                                                    │
  │  Razón social | CUIT | Actividad | Condición fiscal                  │
  │  Provincia | Ciudad | (teléfono si lo tiene) | (email si lo tiene)   │
  └──────────────────────────────────────────────────────────────────────┘

  ┌─ Sección "Empresas relacionadas" ────────────────────────────────────┐
  │  Título + botón "+ Nueva Empresa" (abre Dialog inline)               │
  │                                                                      │
  │  Grid 3 columnas (sm:2, lg:3):                                       │
  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
  │  │ 👤 Persona Física│  │ 🏢 Empresa 1     │  │ + Nueva Empresa  │  │
  │  │ [nombre cliente] │  │ [nombre entidad] │  │                  │  │
  │  │ CUIT: ...        │  │ CUIT: ...        │  │                  │  │
  │  │ [→ Ver carpeta]  │  │ [→ Ver carpeta]  │  │                  │  │
  │  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
  └──────────────────────────────────────────────────────────────────────┘

- Card "Persona Física": href="/app/contador/empresas/[clientId]"
- Card de empresa hija: href="/app/contador/empresas/[entity.id]"
- Card "+ Nueva Empresa": onClick={() => setShowNewEmpresaDialog(true)}

Dialog "+ Nueva Empresa":
  Formulario con: legalName (required), taxId 11 dígitos (required),
  activity (select), province, city, entityOwnersText (textarea)
  POST a /api/organizations/[clientId]/entities con Bearer token
  Al guardar: reload entities, cerrar dialog

No crear layout.tsx para la ruta clientes/[clientId] — es una página plana.

CRITERIO DE ÉXITO
=================
- pnpm type-check sin errores
- Las dos páginas compilan y renderizan sin errors de consola
- Navegación desde /clientes → /clientes/[id] funciona
- Las empresas hijas aparecen en el grid
```

---

### Agente B — Páginas ABM Empresas (lista + single con carpeta completa)

**Puede ejecutarse en paralelo con:** Agente A  
**Depende de:** Ola 1 completa

#### Objetivo

Crear las páginas `/app/contador/empresas` (lista) y el single de empresa con sub-nav propio (Carpeta | Impuestos | Bienes), donde toda la carpeta contable vive a nivel de empresa.

#### Archivos a crear

- `app/app/contador/empresas/page.tsx` — lista de empresas con cliente asociado
- `app/app/contador/empresas/[empresaId]/layout.tsx` — header empresa + sub-nav
- `app/app/contador/empresas/[empresaId]/page.tsx` — redirect a /carpeta
- `app/app/contador/empresas/[empresaId]/carpeta/page.tsx` — balance + resultados por período
- `app/app/contador/empresas/[empresaId]/impuestos/page.tsx` — impuestos de la empresa
- `app/app/contador/empresas/[empresaId]/bienes/page.tsx` — assets + pasivos de la empresa
- `components/empresas/EmpresaHeader.tsx`
- `components/empresas/EmpresaSubNav.tsx`

#### Prompt completo para el agente

```
Stack: Next.js App Router + Firebase + TypeScript + Tailwind + shadcn/Radix UI.
Directorio raíz: Agro-Credit/

CONTEXTO
========

Colecciones y tipos relevantes:
- organizations: tipo Organization en types/auth.ts
  campos: id, legalName, taxId, activity, province, city, type, parentOrganizationId
- accounting_periods: tipo AccountingPeriod en types/accounting.ts
- balance_sheets, income_statements, tax_documents, assets, liabilities

Servicios cliente disponibles:
- lib/services/balance-sheets.ts → getBalanceSheetsForPeriod(orgId, periodId)
- lib/services/income-statements.ts → getIncomeStatementsForPeriod(orgId, periodId)
- lib/services/tax-documents.ts → getTaxDocumentsForPeriod(orgId, periodId)
- lib/services/assets.ts → getAssetsForOrganization(orgId) [NUEVA — creada en Ola 1]
- lib/services/liabilities.ts → getLiabilitiesForOrganization(orgId) [NUEVA — Ola 1]

Componentes contables existentes (usar sin modificar):
- components/accounting/AccountingPeriodSelector
- components/accounting/BalanceSheetForm
- components/accounting/IncomeStatementForm
- components/accounting/TaxGridForm

Componentes de bienes existentes (usar sin modificar):
- components/assets/AssetsTable
- components/assets/AssetsSummary
- components/assets/RealEstateAssetForm
- components/assets/MovableAssetForm
- components/liabilities/LiabilitiesTable
- components/liabilities/LiabilityForm

El patrón de la página de carpeta existente está en:
  app/app/contador/productores/[producerId]/carpeta/page.tsx  ← leer como modelo

El patrón de la página de bienes existente está en:
  app/app/contador/productores/[producerId]/bienes/page.tsx  ← leer como modelo

La API GET /api/contador/empresas (creada en Ola 1) retorna:
  { empresas: Array<{ id, legalName, taxId, activity, province, city,
    parentOrganizationId, parentLegalName, entityOwnersText, createdAt }> }
Requiere Bearer token.

getFreshIdToken() de lib/firebase/auth-client.
useSession() de lib/auth/session.
getFirebaseDb() de lib/firebase/config.

TAREA 1 — components/empresas/EmpresaHeader.tsx
===============================================
Componente "use client" que recibe:
  interface EmpresaHeaderProps {
    legalName: string
    taxId: string
    activity?: string
    province?: string
    city?: string
    parentLegalName?: string   // nombre del cliente asociado
    parentClientId?: string    // para el link
    isPersonaFisica?: boolean  // true si la empresa es en realidad la org raíz del cliente
  }

Render:
  [nombre grande — text-xl font-bold]
  CUIT: xxx | [Persona Física / Empresa] | [actividad]
  [ciudad, provincia]
  Cliente: [parentLegalName — link a /app/contador/clientes/[parentClientId]]

TAREA 2 — components/empresas/EmpresaSubNav.tsx
===============================================
Componente "use client" similar a ProducerSubNav (leer components/producers/ProducerSubNav.tsx).

Props: { empresaId: string }
Base href: /app/contador/empresas/[empresaId]

Nav items:
  { label: "Carpeta contable", href: "/carpeta", icon: FolderOpen }
  { label: "Impuestos",        href: "/impuestos", icon: Receipt }
  { label: "Bienes y Pasivos", href: "/bienes",    icon: Landmark }

Usar Lucide icons: FolderOpen, Receipt, Landmark.
La lógica de "active" es igual a ProducerSubNav (startsWith para subrutas).

TAREA 3 — app/app/contador/empresas/[empresaId]/layout.tsx
===========================================================
Server Component (no "use client"):
  interface LayoutProps { params: Promise<{ empresaId: string }>; children: React.ReactNode }

Al renderizar:
  - Importar EmpresaHeader y EmpresaSubNav como client components
  - Cargar la org de la empresa: getDoc del Admin SDK o simplemente pasar empresaId
    a los componentes hijo que harán la carga (recomendado para evitar complejidad server)
  - Render:
      <div className="space-y-0">
        <EmpresaHeaderLoader empresaId={empresaId} />  ← wrapper client que carga y muestra el header
        <EmpresaSubNav empresaId={empresaId} />
        <div className="p-6">{children}</div>
      </div>

Crear también EmpresaHeaderLoader como componente "use client" en components/empresas/:
  - Carga la org de Firestore cliente usando getDoc
  - Determina isPersonaFisica: org.type === "system_user"
  - Si tiene parentOrganizationId: carga el org padre para parentLegalName
  - Renderiza <EmpresaHeader ... />

TAREA 4 — app/app/contador/empresas/[empresaId]/page.tsx
=========================================================
"use client", importa redirect de next/navigation:
  import { redirect } from "next/navigation"
  import { use } from "react"
  export default function EmpresaPage({ params }: { params: Promise<{ empresaId: string }> }) {
    const { empresaId } = use(params)
    redirect(`/app/contador/empresas/${empresaId}/carpeta`)
  }

TAREA 5 — app/app/contador/empresas/[empresaId]/carpeta/page.tsx
=================================================================
"use client" — Adaptar desde app/app/contador/productores/[producerId]/carpeta/page.tsx

DIFERENCIAS vs el original:
- NO incluir EntitySelector (ya estamos en la empresa, no hay que elegir)
- El organizationId = empresaId (de params)
- Tabs: Balance | Resultados (sin tab de Impuestos — tiene su propia página)
- La lógica de períodos, balance y resultados es idéntica al original pero sin EntitySelector

Props de params: Promise<{ empresaId: string }>

Estado local:
  selectedPeriodId, selectedPeriod, balanceSheets, incomeStatements, loadingPeriodData

Al cargar período:
  const [bs, income] = await Promise.all([
    getBalanceSheetsForPeriod(empresaId, selectedPeriodId),
    getIncomeStatementsForPeriod(empresaId, selectedPeriodId),
  ])

No cargar taxDocuments en esta página — están en /impuestos.

TAREA 6 — app/app/contador/empresas/[empresaId]/impuestos/page.tsx
===================================================================
"use client"

Props: params: Promise<{ empresaId: string }>
Estado: selectedPeriodId, selectedPeriod, taxDocuments, loadingPeriodData
createdBy = user?.uid ?? ""

Render:
  <Card>
    <CardHeader><CardTitle>Impuestos</CardTitle></CardHeader>
    <CardContent className="space-y-5">
      <AccountingPeriodSelector
        key={empresaId}
        producerId={empresaId}
        organizationId={empresaId}
        createdBy={createdBy}
        selectedPeriodId={selectedPeriodId}
        onPeriodChange={setSelectedPeriodId}
      />
      {selectedPeriodId && (
        <TaxGridForm
          producerId={empresaId}
          organizationId={empresaId}
          periodId={selectedPeriodId}
          year={selectedPeriod?.year ?? new Date().getFullYear()}
          createdBy={createdBy}
          onSuccess={() => getTaxDocumentsForPeriod(empresaId, selectedPeriodId).then(setTaxDocuments)}
        />
      )}
      {taxDocuments.length > 0 && (
        // tabla de taxDocuments — igual que en productores/[id]/carpeta/page.tsx
      )}
    </CardContent>
  </Card>

TAREA 7 — app/app/contador/empresas/[empresaId]/bienes/page.tsx
===============================================================
"use client" — Adaptar desde app/app/contador/productores/[producerId]/bienes/page.tsx

DIFERENCIAS vs el original:
- Importar getAssetsForOrganization (no getAssetsForProducer)
- Importar getLiabilitiesForOrganization (no getLiabilitiesForProducer)
- organizationId = empresaId (de params)
- Al llamar createAsset: pasar { ...data, organizationId: empresaId }
  (el campo producerId puede quedar vacío string "" — no rompe tipos, queda para migración futura)
- El resto de la UI es idéntico: tabs Inmuebles / Maquinaria y Vehículos / Pasivos,
  AssetsTable, AssetsForm, LiabilitiesTable, etc.

TAREA 8 — app/app/contador/empresas/page.tsx
============================================
"use client"

Fetch GET /api/contador/empresas con Bearer token.
Estado: empresas: EmpresaItem[], loading, search

type EmpresaItem = {
  id: string; legalName: string; taxId: string; activity: string
  province: string; city: string; parentLegalName: string; parentOrganizationId: string
}

Render:
  Título: "Empresas"
  Subtítulo: "Entidades fiscales de tus clientes"
  Buscador por razón social, CUIT o cliente

  Tabla con columnas:
    Razón Social | CUIT | Actividad | Cliente asociado | Localidad | —
  Cada fila: al click → router.push("/app/contador/empresas/" + empresa.id)

  Si loading: skeleton rows
  Si vacío: empty state con texto "Aún no hay empresas registradas.
    Creá la primera desde el perfil de un cliente."

No incluir botón "Nueva Empresa" en esta página — las empresas se crean desde
el single del cliente (Agente A Ola 2).

CRITERIO DE ÉXITO
=================
- pnpm type-check sin errores
- Todas las páginas compilan
- Navegar a /app/contador/empresas muestra la lista
- Navegar a /app/contador/empresas/[id] redirige a /carpeta
- La carpeta carga períodos y balance usando el empresaId
- Bienes usa getLiabilitiesForOrganization y getAssetsForOrganization
```

---

## Ola 3 — Integración: sidebar, redirect y cierre

> Ejecutar SOLO después de que Ola 2 esté completa  
> Único agente

### Agente A — Sidebar + redirect + type-check + commit

**Puede ejecutarse en paralelo con:** es el único de esta ola  
**Depende de:** Ola 2 completa

#### Objetivo

Actualizar el sidebar del contador para mostrar "Clientes" y "Empresas" en lugar de "Productores". Cambiar el botón de acción a "Nuevo Cliente". Agregar redirect desde la ruta vieja.

#### Archivos a modificar

- `components/layout/AppSidebar.tsx` — reemplazar nav item + botón acción
- `app/app/contador/productores/page.tsx` — agregar redirect a /clientes

#### Prompt completo para el agente

```
Stack: Next.js App Router + TypeScript + Tailwind.
Directorio raíz: Agro-Credit/

CONTEXTO
========

Leer el archivo components/layout/AppSidebar.tsx completo antes de modificar.

Actualmente tiene en NAV_ITEMS para el rol contador:
  { label: "Dashboard",    href: "/app/contador",            roles: ["accountant", "accounting_firm_admin"] },
  { label: "Productores",  href: "/app/contador/productores", roles: ["accountant", "accounting_firm_admin"] },

Y en ROLE_META:
  accountant: { actionLabel: "Nueva Carpeta" },
  accounting_firm_admin: { actionLabel: "Nueva Carpeta" },

TAREA 1 — components/layout/AppSidebar.tsx
==========================================
En NAV_ITEMS, reemplazar la entrada "Productores" por DOS entradas:

  { label: "Clientes",  href: "/app/contador/clientes",  icon: Users,     roles: ["accountant", "accounting_firm_admin"] },
  { label: "Empresas",  href: "/app/contador/empresas",  icon: Building2, roles: ["accountant", "accounting_firm_admin"] },

Nota: Users y Building2 ya están importados desde lucide-react.

En ROLE_META, cambiar para ambos roles contadores:
  accountant: { actionLabel: "Nuevo Cliente" },
  accounting_firm_admin: { actionLabel: "Nuevo Cliente" },

No cambiar nada más del sidebar.

TAREA 2 — app/app/contador/productores/page.tsx
================================================
Al inicio de la función del componente (ANTES de cualquier otro código),
agregar un redirect server-side. Como es "use client", usar el hook useRouter
de next/navigation y llamar router.replace en un useEffect que corra solo al montar:

  useEffect(() => {
    router.replace("/app/contador/clientes")
  }, [router])

Y mientras tanto renderizar null o un Skeleton para que no haya flash.

Alternativamente, si es más limpio, convertir el archivo en un Server Component
sin "use client" y usar redirect() de next/navigation directamente.
Elegí la opción más limpia según lo que ya tiene el archivo.

TAREA 3 — Validación y cierre
==============================
1. Ejecutar pnpm type-check — resolver cualquier error antes de commitear
2. git status --short para ver todos los archivos cambiados
3. git add selectivo (NUNCA git add -A)
4. git commit -m "feat: ABM Clientes y Empresas — separación de módulos plan 008"
5. git push origin master

CRITERIO DE ÉXITO
=================
- pnpm type-check: OK
- El sidebar del contador muestra "Clientes" y "Empresas" (no "Productores")
- El botón inferior dice "Nuevo Cliente"
- Navegar a /app/contador/productores redirige a /app/contador/clientes
- git push exitoso
```

---

## Verificación final (manual)

- [ ] Sidebar contador: "Clientes" + "Empresas" visibles, "Productores" eliminado
- [ ] `/app/contador/clientes` — lista de personas carga correctamente
- [ ] `/app/contador/clientes/[id]` — muestra datos personales + grid de empresas
- [ ] Grid de empresa: card "Persona Física" linkea a `/app/contador/empresas/[clientId]`
- [ ] Grid de empresa: card de empresa hija linkea a `/app/contador/empresas/[entityId]`
- [ ] `/app/contador/empresas` — lista con cliente asociado visible
- [ ] `/app/contador/empresas/[id]` — redirige a /carpeta
- [ ] `/app/contador/empresas/[id]/carpeta` — selector de período + balance + resultados
- [ ] `/app/contador/empresas/[id]/impuestos` — TaxGridForm funciona
- [ ] `/app/contador/empresas/[id]/bienes` — bienes y pasivos usando organizationId
- [ ] `/app/contador/productores` — redirige a /clientes
- [ ] pnpm type-check: OK

---

## Estado de ejecución

| Ola | Estado | Nota |
|-----|--------|------|
| **1** | Pendiente | |
| **2** | Pendiente | |
| **3** | Pendiente | |
