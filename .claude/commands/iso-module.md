# /iso-module

Scaffolding de un nuevo módulo ISO siguiendo los patrones establecidos del proyecto.

## Argumentos

`$ARGUMENTS` — descripción del módulo a crear. Incluir:
- Nombre del módulo (ej: `iso_audit_19011`, `iso_environment_14001`)
- Descripción breve (ej: "Programa de Auditorías ISO 19011")
- Plugin ID en snake_case (ej: `iso_audit_19011`)

Ejemplo: `nombre=iso-programa-auditoria descripcion="Programa de Auditorías" plugin_id=iso_audit_19011`

## Procedimiento

1. Verificar que el módulo NO exista ya (evitar duplicados)
2. Leer un módulo ISO existente como referencia (ej: `src/config/plugins/iso_sgsi_27001.manifest.ts`)
3. Crear los archivos en este orden:
   a. Manifest del plugin
   b. Tipos TypeScript
   c. API route con withAuth
   d. Página stub del módulo
   e. Agregar al catálogo de plugins
   f. Documento en content/docs/ con /add-doc

## Archivos a crear

```
src/
  config/plugins/
    {plugin_id}.manifest.ts      ← Manifest formal del plugin
  types/
    {nombre-modulo}.ts           ← Tipos TypeScript del módulo
  app/
    api/
      {nombre-modulo}/
        route.ts                 ← GET/POST con withAuth + org scoping
        [id]/
          route.ts               ← GET/PUT/DELETE por ID
    (dashboard)/
      {nombre-modulo}/
        page.tsx                 ← Página del módulo (puede ser stub inicial)
```

## Patrones obligatorios

### manifest del plugin
```typescript
// Referencia: src/config/plugins/iso_sgsi_27001.manifest.ts
import { pluginManifestSchema } from '@/lib/plugins/manifestSchema';

export const {plugin_id}Manifest = pluginManifestSchema.parse({
  plugin_id: '{plugin_id}',           // snake_case SIEMPRE
  name: 'ISO XXXX — Nombre',
  description: '...',
  version: '1.0.0',
  category: 'iso_quality',            // iso_quality | iso_hse | iso_sgsi | crm | accounting
  tier: 'optional',                   // core | optional | premium
  scopes: [
    '{scope}:read',
    '{scope}:write',
    '{scope}:admin',
  ],
  required_scopes: [],
  routes: ['/nombre-modulo', '/nombre-modulo/[id]'],
  api_routes: ['/api/nombre-modulo'],
  navigation_entries: [{
    label: 'Nombre Módulo',
    path: '/nombre-modulo',
    icon: 'Shield',
    section: 'compliance',
  }],
});
```

### types/{nombre}.ts
```typescript
export interface [NombreEntidad] {
  id: string;
  organization_id: string;   // SIEMPRE snake_case, SIEMPRE presente
  // ... campos del módulo
  created_at: string;
  updated_at: string;
  created_by: string;
}
```

### api/{nombre}/route.ts
```typescript
// CORRECTO: importar desde @/lib/api/withAuth (NO @/lib/auth/withAuth)
import { withAuth } from '@/lib/api/withAuth';
import { resolveAuthorizedOrganizationId } from '@/middleware/verifyOrganization';

export const GET = withAuth(async (req, context, auth) => {
  const orgId = await resolveAuthorizedOrganizationId(auth, undefined);
  // ... lógica con orgId
}, { roles: ['admin', 'gerente'] });
```

### Registrar en catálogo
```typescript
// src/config/plugins/index.ts — agregar al array PLATFORM_PLUGIN_MANIFESTS:
import { {plugin_id}Manifest } from './{plugin_id}.manifest';
// ...
export const PLATFORM_PLUGIN_MANIFESTS = [
  // ... otros manifests
  {plugin_id}Manifest,
];
```

### Firestore rules (describir el cambio a agregar)
```
// Agregar en firestore.rules:
match /{nombre_coleccion}/{docId} {
  allow read: if isAuthenticated() && resourceBelongsToUserOrg();
  allow create: if isAuthenticated() && isManager() && incomingResourceBelongsToUserOrg();
  allow update: if isAuthenticated() && isManager() && resourceBelongsToUserOrg();
  allow delete: if isAuthenticated() && isAdmin() && resourceBelongsToUserOrg();
}
```

## Checklist de completitud

- [ ] Manifest del plugin creado y válido (`pluginManifestSchema.parse()` sin errores)
- [ ] Plugin registrado en `PLATFORM_PLUGIN_MANIFESTS`
- [ ] Tipos TypeScript creados con `organization_id: string`
- [ ] API route GET (lista) con withAuth + org scoping
- [ ] API route GET/PUT/DELETE por ID
- [ ] Página del módulo (puede ser stub con mensaje "próximamente")
- [ ] Cambio de Firestore rules documentado
- [ ] Documento en content/docs/ creado (usar /add-doc)
- [ ] Si tiene eventos contables: llama `emitAccountingEvent()` y tiene reglas en `src/lib/accounting/rules/`
