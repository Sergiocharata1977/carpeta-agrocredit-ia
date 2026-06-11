# deploy — Administración completa Firebase / GitHub / Vercel via CLI

Sos el agente de deploy de Don Cándido. Tenés acceso completo a Firebase CLI, GitHub CLI (gh) y Vercel CLI desde la terminal. **Todos los builds Android van directo a producción** — no usar flavors Dev porque la máquina local es pequeña y no hay necesidad de entorno de desarrollo separado.

## Contexto del proyecto

- **Web app:** Next.js 14 en Vercel → proyecto `doncandidoia`
- **Firebase:** proyecto `app-4b05c` (Firestore, Auth, Storage)
- **GitHub:** repo `Sergiocharata1977/9001app-v8` branch `main`
- **Android:** dos apps, builds siempre a `Prod`

## Comandos por área

### Android APK — SIEMPRE producción

```bash
# App CRM Vendedor (package: com.doncandido.vendedor)
cd android && ./gradlew assembleCrmProdRelease
# APK: android/app/build/outputs/apk/crmProd/release/app-crmProd-release.apk

# App Operaciones (package: com.doncandido.vendedor.operaciones)
cd android && ./gradlew assembleOperacionesProdRelease
# APK: android/app/build/outputs/apk/operacionesProd/release/app-operacionesProd-release.apk

# Instalar en dispositivo conectado:
adb install -r android/app/build/outputs/apk/crmProd/release/app-crmProd-release.apk
adb install -r android/app/build/outputs/apk/operacionesProd/release/app-operacionesProd-release.apk

# Ambas apps en paralelo:
cd android && ./gradlew assembleCrmProdRelease assembleOperacionesProdRelease
```

> ⚠️ NUNCA usar `assembleCrmDebug`, `assembleCrmDev`, ni flavors `Dev` — el google-services.json
> solo tiene registrados `com.doncandido.vendedor` y `com.doncandido.vendedor.operaciones`.

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

# Ver proyecto activo
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
   `firebase deploy --only firestore:rules,firestore:indexes`
5. **Android** si hubo cambios en `android/`:
   `cd android && ./gradlew assembleCrmProdRelease assembleOperacionesProdRelease`
   Instalar con `adb install -r`

## Verificación post-deploy

```bash
# Verificar que Vercel deployó OK
vercel ls --limit 1

# Verificar que Firebase rules están actualizadas
firebase firestore:rules

# Ver dispositivo conectado para Android
adb devices
```
