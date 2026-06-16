# CreditoHub — 013 · Riesgos y decisiones pendientes

**Fecha:** 2026-06-16
**Estado:** Diseño (Ola 1 / Agente C). Sin código.
**Fuente de verdad de decisiones:** `docs/credito-hub/000-ola0-decisiones.md`.

---

## Objetivo

Consolidar los riesgos técnicos y de producto de CreditoHub y las decisiones aún abiertas, para que ninguna recaída ni supuesto quede implícito al entrar a implementación.

## Alcance
- Riesgos transversales del MVP y sus mitigaciones.
- Decisiones pendientes del dueño y técnicas.
- No re-documenta decisiones ya cerradas (ver 000).

## Riesgos

| # | Riesgo | Impacto | Mitigación | Estado |
|---|---|---|---|---|
| R1 | Modelo de visión xAI no verificado (sin key) | IA real no confirmada | Resolución a runtime (`GET /v1/models`) + fallback Mock/Anthropic | Abierto (pend. key) |
| R2 | Rasterización PDF en Vercel (`pdf-to-img`/`@napi-rs/canvas`) | Worker rompe | Texto-primero; spike previo; fallo → `needsReview` | Mitigado por diseño |
| R3 | Datos sensibles reales antes de cifrado V1 | Exposición | Flag `CREDITO_HUB_ALLOW_REAL_DATA=false` + staging | Cerrado |
| R4 | Usuario cree que la IA certifica | Riesgo legal/confianza | UI marca "propuesto"; nada `CONFIRMED` sin contador; auditoría | Mitigado por diseño |
| R5 | Reintroducir `producerId`/`clientId` | Divergencia de modelo | Nombres canónicos + criterio "cero legacy" | Mitigado por convención |
| R6 | Worker caído deja jobs colgados | Pipeline trabado | Lease + `reclaimStalledJobs` | Cerrado |
| R7 | Timeout de Vercel en worker | Jobs incompletos | `MAX_JOBS_PER_RUN` + `JOB_TIMEOUT_MS` | Cerrado |
| R8 | Costo de IA por documento | Gasto | `MAX_PDF_PAGES`, texto-primero, idempotencia por hash | Cerrado |
| R9 | Clasificación/extracción de baja confianza | Datos malos | Umbral 0.7 → `needsReview`; revisión humana | Mitigado por diseño |
| R10 | Matriz expone datos fuera de scope | Privacidad | Grants/scopes + `ScopeGuard` + tests aislamiento | Mitigado por diseño |
| R11 | Recaída de standalone (reconectar a 9001app/Don Cándido) | Acoplamiento prohibido | Único cruce: copiar credenciales LLM a `.env.local` | Cerrado |
| R12 | Alcance creep (scoring, expediente final, más tipos) | Retraso del MVP | Lista "fuera de alcance" explícita en 001/011 | Mitigado |

## Decisiones pendientes

### Del dueño
1. **`XAI_API_KEY` en `.env.local`** para verificar el modelo de visión real (Ola 1 en espera de esto — ver 000 §5 y §8).
2. **Identidad y formato del banco piloto** (define el primer template de requisitos).
3. **Fecha de cierre de Plan 012 Ola 3** (cifrado V1) para habilitar datos reales.

### Técnicas
4. ¿Disparo del worker en MVP: Vercel Cron, manual, o ambos?
5. ¿Cómo se marca un documento como "staging" en el intake (header `x-staging-data` vs. flag por organización)?
6. ¿`canonical_credit_profile` único por owner o por aplicación/período? (recomendado: por owner, versionado).
7. ¿Índices Firestore compuestos requeridos (por `folderOwnerOrganizationId` + `status`/`reviewStatus`)?
8. ¿Volcado del perfil canónico a `balance_sheets`/`income_statements`: manual confirmado o automático tras certificación? (recomendado: manual).
9. ¿`responsibleRole` por requisito asignado por IA o por el banco?

## Criterios de aceptación
- Cada riesgo abierto tiene dueño y mitigación registrada.
- Las decisiones del dueño quedan resueltas antes de la fase que dependa de ellas (R1/key → antes de probar IA real; banco piloto → antes de Ola 3 B).

## Dependencias
- `docs/credito-hub/000-ola0-decisiones.md` (decisiones cerradas).
- Plan 012 y Plan 013.

## Preguntas abiertas
- Las listadas en "Decisiones pendientes" 1–9.
