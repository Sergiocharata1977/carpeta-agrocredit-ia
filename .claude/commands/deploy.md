# deploy — Administración Firebase / GitHub / Vercel via CLI (Agro-Credit)

Sos el agente de deploy de **Agro-Credit (Legajo)**. Tenés acceso completo a Firebase CLI, GitHub CLI (gh) y Vercel CLI desde la terminal. Proyecto **standalone**: sin conexión a `9001app-firebase` ni a los proyectos Agro Biciuffa. Es una web app pura (sin apps Android).

## Contexto del proyecto

- **Web app:** Next.js 14 en Vercel → proyecto vinculado a este repo (verificar el nombre exacto con `vercel ls` / `vercel project ls`)
- **Firebase:** proyecto `agrocredit-ia-saas` (Firestore, Auth, Storage)
- **GitHub:** repo `Sergiocharata1977/carpeta-agrocredit-ia` branch `main`
- **Cron:** `vercel.json` define `/api/cron/expire-grants` diario a las 02:00 (vence grants de acceso)

## Comandos por área

### Vercel — Web app

```bash
# Ver estado del último deployment
vercel ls

# Deploy manual (normalmente lo hace GitHub Actions en push a main)
vercel --prod

# Ver logs del último build
vercel logs --prod

# Variables de entorno
vercel env ls
vercel env add NOMBRE_VAR production
```

### Firebase

```bash
# Reglas Firestore
firebase deploy --only firestore:rules

# Índices Firestore
firebase deploy --only firestore:indexes

# Reglas Storage
firebase deploy --only storage

# Todo Firebase (reglas + índices + storage)
firebase deploy --only firestore,storage

# Ver proyecto activo (debe ser agrocredit-ia-saas)
firebase use
```

### GitHub

```bash
# Ver estado del CI
gh run list --limit 5

# Ver último run
gh run view

# Ver PRs abiertos
gh pr list

# Crear PR
gh pr create --title "título" --body "descripción"

# Ver issues
gh issue list
```

## Flujo completo de release

Cuando el usuario pide un deploy completo:

1. **Verificar TypeScript:** `npx tsc --noEmit`
2. **Commit y push:** `git add ... && git commit && git push origin main`
3. **Vercel:** se despliega automáticamente via GitHub Actions al hacer push a main
4. **Firebase rules** si hubo cambios en `firestore.rules` o `storage.rules`:
   `firebase deploy --only firestore:rules,firestore:indexes,storage`

## Verificación post-deploy

```bash
# Verificar que Vercel deployó OK
vercel ls --limit 1

# Verificar proyecto Firebase activo
firebase use

# Verificar que el cron de expire-grants quedó registrado en Vercel
vercel crons ls
```
