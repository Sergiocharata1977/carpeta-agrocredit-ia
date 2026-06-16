# CreditoHub — Ola 0: Decisiones de endurecimiento

**Fecha:** 2026-06-16
**Estado:** Cerrado salvo 2 ítems marcados "pendiente del dueño".
**Propósito:** Cerrar nombres, cifrado, costos y los dos riesgos técnicos (modelos xAI + rasterización PDF) antes de crear `lib/ai/` y colecciones nuevas. Gate obligatorio previo a la Ola 1.

---

## 1. Nombres canónicos de organización (DECIDIDO)

Verificado contra `lib/auth/accounting-access.ts` (`assertCanManageAccountingFolder` devuelve `{ folderOwnerOrganizationId, accountingFirmId }`) y `types/statement-imports.ts`.

**Regla:** colecciones nuevas NO usan `producerId` ni `clientId`. Partition key del legajo = `folderOwnerOrganizationId`.

| Canónico (usar) | Significado | Legacy a evitar en datos nuevos |
|---|---|---|
| `folderOwnerOrganizationId` | Org dueña del legajo (`system_user` / `system_user_entity`) | `producerId`, `clientId` |
| `accountingFirmId` | Org del estudio contable | `accountantId` |
| `requestingEntityOrganizationId` | Org del banco / entidad solicitante | `bankId` |
| `targetOrganizationId` | Org destino en access/financing/grants | — |
| `createdBy` / `createdByOrganizationId` | UID y org del actor | — |

> **Aclaración a la crítica:** se mantiene `accountingFirmId` (no `accountingFirmOrganizationId`) porque ese nombre **ya existe** en `statement-imports` y `accounting-access`. Introducir un tercer nombre crearía justo la divergencia que se quiere evitar.

**Flujo de derivación:** el cliente envía `targetOrganizationId`; el server llama `assertCanManageAccountingFolder(session, targetOrganizationId)` → obtiene `folderOwnerOrganizationId` + `accountingFirmId`. Nunca se confía en `folderOwnerOrganizationId` del body.

**Excepción documentada:** la ruta de UI del contador conserva el segmento `[producerId]` por compatibilidad de routing de Next; ese id se transporta como `targetOrganizationId` hacia las APIs. El nombre legacy no entra en colecciones nuevas.

---

## 2. `CreditApplication` (DECIDIDO)

Entidad que une cliente, banco, template y matches. Sin ella el matching flota.

```ts
interface CreditApplication {
  id: string
  folderOwnerOrganizationId: string         // legajo del cliente
  requestingEntityOrganizationId: string     // banco / entidad
  requirementTemplateId: string              // template publicado a evaluar
  status:
    | "draft" | "submitted" | "in_review"
    | "awaiting_documents" | "approved" | "rejected" | "expired"
  requestedAmount?: number
  productName?: string
  createdBy: string
  createdByOrganizationId: string
  createdAt: string
  updatedAt: string
}
```

`RequirementMatch.creditApplicationId` referencia esta entidad. Colección: `credit_applications`. Audit: `credit_application.created`.

---

## 3. Compatibilidad con cifrado V1 — Plan 012 (DECIDIDO con default reversible)

**Contradicción detectada:** el Plan 012 exige cifrar archivos fuente en V1, pero CreditoHub agrega carga masiva de los documentos más sensibles (balances, IVA, F931).

**Decisión (default seguro, reversible por el dueño):**
1. **Forward-compatible desde el día uno:** cada documento fuente nuevo guarda `encryptionStatus: "plaintext" | "encrypted"` y reserva `encryptionMetadata?` (alineado al futuro `types/encryption.ts` del Plan 012 Ola 1). Así no hay migración cuando se active el cifrado.
2. **Datos reales bloqueados:** flag `CREDITO_HUB_ALLOW_REAL_DATA` (default `false`). Con `false`, el intake solo acepta datos de staging/demo. El MVP IA **no corre sobre legajos reales** hasta cerrar Plan 012 Ola 3 (cifrado V1 de archivos fuente).
3. **Ruta de Storage:** se mantiene la canónica de `extract/route.ts`, sin cambios.

> ✅ **CONFIRMADO POR EL DUEÑO (2026-06-16):** el MVP arranca en **staging/demo** con `CREDITO_HUB_ALLOW_REAL_DATA=false`. Datos reales recién al cerrar Plan 012 Ola 3.

---

## 4. Costos y límites por job (DECIDIDO)

A implementar en `lib/credito-hub/limits.ts` (Ola 2 Agente A):

| Constante | Valor | Razón |
|---|---|---|
| `MAX_FILE_SIZE_PDF_IMG` | 10 MB | Igual que `extract/route.ts` |
| `MAX_FILE_SIZE_EXCEL` | 5 MB | Igual que `extract/route.ts` |
| `MAX_ZIP_SIZE` | 50 MB | Límite total de carga masiva |
| `MAX_PDF_PAGES` | 8 | Controla costo de IA/visión por documento |
| `MAX_JOBS_PER_RUN` | 5 | Por invocación del worker (evita timeouts Vercel) |
| `MAX_ATTEMPTS` | 3 | Reintentos antes de `failed` |
| `LEASE_MS` | 120000 (2 min) | Lease del worker sobre un job |
| `JOB_TIMEOUT_MS` | 90000 | Corte de procesamiento por job |

**Lease anti-stalled:** todo job activo lleva `claimedBy`, `claimedAt`, `leaseExpiresAt`. `reclaimStalledJobs()` devuelve a `queued` (si `attempts < maxAttempts`) o marca `failed`. Sin esto, un worker caído deja jobs eternamente en `preprocessing`.

---

## 5. Resolución del modelo xAI (DECIDIDO — verificación pendiente de key)

**Regla:** NO hardcodear `grok-2-vision-1212`. xAI rota nombres y no todos los modelos soportan visión.

**Enfoque:**
- `XAI_BASE_URL = https://api.x.ai/v1`, SDK `openai` con `baseURL` override.
- Si `XAI_MODEL` está seteado, usarlo. Si no, `GET /v1/models` al boot/config, filtrar uno con capacidad de visión, cachear el id.
- Fallback a Anthropic (`AI_PROVIDER=anthropic`) si xAI no está disponible.

> ⚠️ **PENDIENTE DEL DUEÑO:** no hay `.env.local` ni `XAI_API_KEY` en el repo. Para verificar el modelo real disponible hay que: (1) copiar la key de 9001app a `.env.local`; (2) correr `curl -s https://api.x.ai/v1/models -H "Authorization: Bearer $XAI_API_KEY"`. Hasta entonces el código resuelve a runtime y cae a Mock en dev.

---

## 6. Estrategia PDF → texto / imagen (DECIDIDO)

Riesgo más subestimado: rasterizar PDFs en Vercel (memoria, binarios nativos, tiempos). Decisión:

1. **Texto-primero:** para PDF digital, extraer texto nativo con `pdfjs-dist` (`getTextContent`) — **no requiere canvas**, liviano. Si hay densidad de texto suficiente, mandar texto al modelo (más barato y exacto que visión).
2. **Rasterización solo si hace falta:** PDF escaneado (poco/nulo texto nativo) → rasterizar **solo las primeras `MAX_PDF_PAGES`** con `pdf-to-img` (usa `@napi-rs/canvas`, binarios prebuilt, compatible con Vercel/serverless). Mandar imágenes a un modelo de visión.
3. **Fallback de proveedor:** si la rasterización falla o el provider no soporta imágenes, usar Anthropic (acepta bloque `document` PDF nativo) como ruta alternativa.
4. **Nunca romper el pipeline:** si todo falla, el job NO queda `failed` por esto solo — el documento se marca `needsReview` y queda para revisión manual del contador.

Todo esto vive detrás de `lib/ai/pdf-to-images.ts`, así el código de providers no depende de la implementación. **Spike real recomendado** al inicio de Ola 1 Agente A: validar `pdf-to-img` en el entorno antes de fijar la dependencia en `package.json`.

---

## 7. Cumplimiento P1 del Plan 013 (CONFIRMADO)

Todas las rutas nuevas de CreditoHub usan **APIs server-side con Admin SDK** y validación (`verifyRequestSession` + `assertCanManageAccountingFolder` / grants). **No** abren lecturas/escrituras directas de Firestore/Storage desde el cliente para datos de legajo. Esto respeta la regla anti-recaída de `CLAUDE.md` y el pendiente P1 de `reports/013`.

---

## 8. Gate de salida de Ola 0

- [x] Nombres canónicos fijados (sin `producerId`/`clientId` en datos nuevos).
- [x] `CreditApplication` definida.
- [x] Cifrado V1: metadata forward-compatible + flag `CREDITO_HUB_ALLOW_REAL_DATA=false` (default).
- [x] Límites y lease de jobs fijados.
- [x] Estrategia de modelo xAI (runtime, no hardcode) — **verificación de modelo pendiente de key**.
- [x] Estrategia PDF (texto-primero + rasterización fallback + needsReview) decidida.
- [x] P1 Plan 013 confirmado.

**Estado de los 2 ítems del dueño:**
1. ✅ Arranque en **staging/demo** — CONFIRMADO (2026-06-16).
2. ⏳ Poner `XAI_API_KEY` en `.env.local` para verificar el modelo de visión real — **PENDIENTE. Ola 1 en espera de esto.**
