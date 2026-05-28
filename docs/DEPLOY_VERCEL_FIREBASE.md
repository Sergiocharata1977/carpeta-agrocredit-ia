# Deploy Vercel Y Firebase

**Fecha:** 2026-05-28

## Variables

Cliente:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_APP_URL`

Server:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

No commitear secretos reales.

## Firebase

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

Antes de probar flujos reales:

1. Habilitar Firestore Database.
2. Habilitar Firebase Storage.
3. Habilitar Auth email/password.
4. Crear usuarios reales y setear custom claims:
   - `roles`
   - `defaultOrganizationId`
5. Confirmar membresia activa en `organization_members`.

## Vercel

1. Linkear proyecto.
2. Cargar variables de entorno en Production/Preview.
3. Ejecutar deploy.
4. Confirmar que `pnpm type-check` y build pasan.

## Validacion liviana

```bash
pnpm type-check
pnpm check:security-shape
pnpm test:smoke
```

## Demo data

```bash
$env:SEED_DEMO_DATA_CONFIRM="YES"
pnpm seed:demo
```

El seed no crea usuarios Auth ni custom claims; solo deja datos Firestore para demo/control.
