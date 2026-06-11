# /audit-security

Auditá la API route o módulo indicado en los argumentos del comando, verificando cumplimiento del estándar de seguridad del proyecto.

## Argumentos

`$ARGUMENTS` — ruta relativa a la API route o módulo a auditar (ej: `src/app/api/crm/route.ts`)

## Checklist de auditoría

Para cada archivo auditado, verificá:

### 1. Autenticación y autorización
- [ ] La route usa `withAuth` (o similar wrapper) con rol mínimo especificado
- [ ] Se llama a `resolveAuthorizedOrganizationId` (NO usar org_id inline del body/query)
- [ ] El rol requerido está correcto para la operación (lectura vs escritura vs admin)
- [ ] Ningún dato de otra org puede ser accedido (multi-tenant isolation)

### 2. Validación de inputs
- [ ] Existe schema Zod en `src/lib/validations/` para los datos de entrada
- [ ] Se valida el body antes de procesarlo
- [ ] Los parámetros de URL/query son saneados

### 3. Errores y respuestas
- [ ] Usa `toOrganizationApiError` para errores de org scoping
- [ ] Respuestas de error no exponen información sensible
- [ ] Existe manejo de errores de Firebase/Firestore

### 4. Tests de seguridad
- [ ] Existe test que verifica que un usuario de otra org NO puede acceder
- [ ] Existe test para usuario sin autenticación
- [ ] Existe test para rol insuficiente

## Procedimiento

1. Leer el archivo $ARGUMENTS completo
2. Buscar el withAuth wrapper y los roles usados
3. Buscar llamadas a `resolveAuthorizedOrganizationId` vs uso inline de `organization_id`
4. Verificar validación de inputs (Zod)
5. Buscar archivos de test relacionados
6. Reportar hallazgos con el formato:

```
## Auditoría: [RUTA DEL ARCHIVO]

### Estado general: ✅ SEGURO / ⚠️ MEDIO / ❌ CRÍTICO

### Hallazgos
| # | Aspecto | Estado | Evidencia | Riesgo | Acción |
|---|---------|--------|-----------|--------|--------|

### Tests existentes
- Lista de archivos de test relacionados

### Recomendaciones inmediatas
1. [acción concreta]
```

## Patrones de referencia del proyecto

- `withAuth` wrapper: `src/lib/auth/withAuth.ts`
- Org scoping helper: buscar `resolveAuthorizedOrganizationId`
- Error helper: buscar `toOrganizationApiError`
- Tests de seguridad: buscar archivos `.test.ts` con `cross-org` o `unauthorized` en el nombre
