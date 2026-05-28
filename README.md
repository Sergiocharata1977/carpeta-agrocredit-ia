# Carpeta AgroCredit IA

SaaS privado multi-tenant para carpeta crediticia agrofinanciera. El contador carga la informacion contable, fiscal, patrimonial y documental del productor; el productor autoriza accesos acotados a bancos, financieras y empresas agrocomerciales.

## Stack

- Next.js App Router + React 19 + TypeScript
- Firebase Auth, Firestore, Storage y Admin SDK
- shadcn/Radix UI + Tailwind + Lucide
- Vercel para deploy

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Validaciones:

```bash
pnpm type-check
pnpm check:security-shape
pnpm test:smoke
```

## Firebase

1. Crear proyecto Firebase.
2. Habilitar Auth con email/password.
3. Habilitar Firestore Database y Storage.
4. Cargar variables `NEXT_PUBLIC_FIREBASE_*` y `FIREBASE_*`.
5. Desplegar reglas:

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

## Dataset demo

El seed crea perfiles y datos Firestore demo; no crea usuarios reales de Firebase Auth.

```bash
$env:SEED_DEMO_DATA_CONFIRM="YES"
pnpm seed:demo
```

## Modulos principales

- Productores y vinculo con contador.
- Carpeta contable: periodos, balances, resultados, impuestos y documentos.
- Patrimonio: bienes y deudas.
- Autorizaciones: solicitudes, aprobacion, grants y revocacion.
- Financiacion: solicitudes y tablero Kanban.
- Notificaciones internas.
- Auditoria visible para admin plataforma.

Los datos financieros son privados por defecto. Las acciones sensibles se ejecutan por rutas server-side con Firebase Admin y generan `audit_logs`.
