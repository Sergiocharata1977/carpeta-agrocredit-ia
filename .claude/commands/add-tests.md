# /add-tests

Crea tests para una API route o módulo siguiendo los patrones del proyecto.

## Argumentos

`$ARGUMENTS` — ruta del archivo a testear. Ej: `src/app/api/crm/facturas/route.ts`

## Tipos de tests a crear

Para cada API route, crear SIEMPRE los 3 tipos:

### 1. Test de seguridad (OBLIGATORIO)
```typescript
describe('Security', () => {
  it('should reject unauthenticated request', async () => { ... });
  it('should reject cross-org access', async () => { ... });
  it('should reject insufficient role', async () => { ... });
});
```

### 2. Test del happy path
```typescript
describe('Happy path', () => {
  it('GET returns list filtered by org', async () => { ... });
  it('POST creates document in correct org', async () => { ... });
});
```

### 3. Test de validación
```typescript
describe('Validation', () => {
  it('should reject missing required fields', async () => { ... });
  it('should reject invalid field types', async () => { ... });
});
```

## Procedimiento

1. Leer el archivo `$ARGUMENTS` completo para entender la lógica
2. Buscar tests similares en `src/__tests__/` como referencia
3. Identificar: ¿qué roles puede usar la route? ¿qué campos valida? ¿qué retorna?
4. Crear el archivo de test en `src/__tests__/{módulo}/api/{nombre}.test.ts`
5. Verificar que el test compila: `npx tsc --noEmit`

## Ubicación de los tests

```
src/__tests__/
  crm/api/facturas.test.ts     ← para src/app/api/crm/facturas/route.ts
  lib/accounting/              ← para src/lib/accounting/
  services/                    ← para src/services/
```

## Patrones de mocking del proyecto

```typescript
// Mock de Firebase Admin
jest.mock('@/lib/firebase/admin', () => ({
  getAdminFirestore: () => mockDb,
}));

// Mock de withAuth para simular usuarios
const mockAuth = (role: string, orgId: string) => ({
  uid: 'test-uid',
  organizationId: orgId,
  role,
});

// Cross-org test — usuario de org A intenta acceder a datos de org B
it('should reject cross-org access', async () => {
  // Arrange: usuario de org-A, pero request pide datos de org-B
  const request = createMockRequest({ orgId: 'org-B' });
  const auth = mockAuth('admin', 'org-A');
  // Act
  const response = await GET(request, { params: { orgId: 'org-B' } }, auth);
  // Assert
  expect(response.status).toBe(403);
});
```

## Checklist de cobertura

- [ ] Unauthenticated → 401
- [ ] Cross-org access → 403
- [ ] Rol insuficiente → 403
- [ ] Campo requerido faltante → 400
- [ ] Datos de otra org no aparecen en GET → 200 con array vacío o 404
- [ ] POST crea con organization_id correcto
- [ ] Idempotency (si aplica) → segunda llamada no duplica

## Referencias

- Tests existentes: `src/__tests__/crm/api/facturas.test.ts`, `src/__tests__/crm/api/cobros.test.ts`
- Tests de seguridad modelo: buscar `cross-org` en `src/__tests__/`
- Patrón de mocking: ver `src/__tests__/lib/accounting/crmRules.test.ts`
