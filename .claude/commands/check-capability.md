# /check-capability

Verifica que un plugin/capability del sistema está correctamente implementado, gateado y registrado.

## Argumentos

`$ARGUMENTS` — ID canónico del plugin a verificar (snake_case). Ej: `crm`, `iso_sgsi_27001`, `contabilidad_central`

Ver catálogo completo en `src/config/plugins/index.ts` → `PLATFORM_PLUGIN_MANIFESTS`

## Procedimiento

1. Leer `src/config/plugins/index.ts` para confirmar que el plugin está en `PLATFORM_PLUGIN_MANIFESTS`
2. Leer el manifest del plugin: `src/config/plugins/{plugin_id}.manifest.ts`
3. Buscar las rutas y APIs declaradas en el manifest y verificar que existen
4. Verificar el gating en esas rutas/páginas
5. Verificar la navegación dinámica
6. Reportar estado

## Checklist

### 1. Manifest formal
- [ ] Existe `src/config/plugins/{plugin_id}.manifest.ts`
- [ ] Está importado y registrado en `PLATFORM_PLUGIN_MANIFESTS` (src/config/plugins/index.ts)
- [ ] Tiene `plugin_id` en snake_case (NO kebab-case)
- [ ] Tiene `scopes` definidos con al menos `read`
- [ ] Pasa `pluginManifestSchema.parse()` sin errores
- [ ] Si es bundle: tiene `type: 'bundle'` y `bundle_plugins: [...]`

### 2. Gating en rutas y APIs
- [ ] Las páginas en `routes` del manifest existen en `src/app/(dashboard)/`
- [ ] Las APIs en `api_routes` del manifest existen en `src/app/api/`
- [ ] Las páginas verifican `hasCapability(plugin_id)` antes de renderizar
- [ ] Las APIs usan `withAuth` con verificación de scope del plugin
- [ ] Usuario sin plugin activo recibe 403 o página de "instalar plugin"

### 3. Navegación dinámica
- [ ] Las `navigation_entries` del manifest aparecen en el sidebar cuando el plugin está activo
- [ ] El nav item está oculto cuando el plugin no está instalado
- [ ] `src/config/navigation.ts` refleja el plugin (si usa nav estático)

### 4. Firestore rules
- [ ] Las colecciones del plugin están en `firestore.rules`
- [ ] No hay acceso cross-org a datos del plugin

### 5. Si el plugin tiene eventos contables
- [ ] Llama `emitAccountingEvent()` al guardar operaciones
- [ ] Tiene reglas en `src/lib/accounting/rules/{plugin}Rules.ts`

## Formato de reporte

```
## Verificación plugin: [plugin_id]

### Estado general: ✅ COMPLETO / ⚠️ PARCIAL / ❌ INCOMPLETO

### Manifest
- Archivo: src/config/plugins/{plugin_id}.manifest.ts — [EXISTE / FALTA]
- Registrado en index.ts: [SÍ / NO]
- Scopes definidos: [lista]
- Tipo: plugin / bundle

### Rutas y APIs
| Ruta declarada | ¿Existe el archivo? | ¿Tiene gating? |
|---|---|---|

### Navegación
- Nav entries declaradas: [lista]
- Aparece en sidebar: [SÍ / NO / NO VERIFICADO]

### Hallazgos y recomendaciones
1. [acción concreta con archivo específico]
```

## Archivos de referencia del proyecto

- Catálogo de plugins: `src/config/plugins/index.ts`
- Schema de manifest: `src/lib/plugins/manifestSchema.ts`
- Hook de gating: buscar `hasCapability` en `src/lib/plugins/`
- Plugin model: `src/types/plugins.ts`
- Lifecycle service: `src/lib/plugins/PluginLifecycleService.ts`
