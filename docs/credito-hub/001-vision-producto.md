# CreditoHub — 001 · Visión de producto

**Fecha:** 2026-06-16
**Estado:** Diseño (Ola 1 / Agente C). Sin código.
**Fuente de verdad de decisiones:** `docs/credito-hub/000-ola0-decisiones.md`.

---

## Objetivo

Evolucionar Agro-Credit (Legajo) de un repositorio contable manual hacia un **legajo crediticio inteligente** donde la IA es un actor del pipeline: clasifica documentos, extrae datos estructurados y cruza la información contra los requisitos de cada banco. **La IA propone; el contador confirma y certifica. La IA nunca aprueba ni certifica crédito.**

El resultado es bajar el tiempo de armado de una carpeta crediticia (hoy carga manual campo por campo) a una carga masiva de documentos que la IA pre-procesa, dejando al contador solo la tarea de revisar y firmar.

## Alcance

### Dentro (MVP — Fases 1 a 4, un banco piloto)
- Carga masiva de documentos (multi-archivo / ZIP) por el contador.
- Clasificación automática de **4 tipos documentales**: Balance (Estado de Situación Patrimonial), Estado de Resultados, DDJJ IVA y Formulario 931.
- Extracción de campos con **procedencia obligatoria** (documento, página, confianza, método).
- Bandeja de revisión profesional (visor documento + campos lado a lado) con confirmar / corregir / rechazar.
- Perfil canónico del legajo (`CanonicalCreditProfile`) que referencia los campos extraídos confirmados.
- Motor de requisitos bancarios: parsear el listado de requisitos de un banco y matchear contra el legajo (matriz de cumplimiento).
- Reuso de grants/scopes/`access_grants`/`audit_logs` ya existentes para el acceso de la entidad.

### Fuera (post-MVP)
- Generación del expediente bancario final (PDF/ZIP/JSON por banco) — próximo hito inmediato tras el MVP.
- Tipos documentales más allá de los 4.
- Scoring crediticio, antifraude avanzado, firma digital propia, integración bancaria viva, WhatsApp.
- Cifrado V1 real de archivos fuente (Plan 012 Ola 3). El MVP queda forward-compatible pero **limitado a staging/demo**.
- Verificación automática de matrícula vía API de Consejos Profesionales.

## Actores

| Actor | Rol canónico | Qué hace en CreditoHub |
|---|---|---|
| Productor / Cliente | `producer` | Titular del legajo. Autoriza acceso de terceros (grants). |
| Contador / Estudio | `accountant`, `accounting_firm_admin` | Carga documentos, **revisa y certifica** lo que la IA propuso. |
| Banco / Entidad | `bank_user`, `agro_company_user` | Publica sus requisitos; ve la matriz de cumplimiento del legajo autorizado (read-only por grant/scope). |
| Admin plataforma | `admin_platform` | Supervisión y auditoría. |
| **IA (sistema)** | — | Clasifica, extrae y cruza. **Propone, no decide.** Toda salida queda en estado `PENDING` hasta que el contador la confirme. |

## Decisiones clave (heredadas de Ola 0)
- IA como actor pero sin autoridad: ningún dato pasa a `CONFIRMED` sin acción humana del contador.
- Provider IA multiproveedor (`xai` | `anthropic` | `mock`) bajo `lib/ai/`.
- Nombres canónicos de organización: `folderOwnerOrganizationId`, `accountingFirmId`, `requestingEntityOrganizationId`. **Sin `producerId`/`clientId` en datos nuevos.**
- Datos reales bloqueados con `CREDITO_HUB_ALLOW_REAL_DATA=false` hasta cerrar Plan 012 Ola 3.

## Alternativas consideradas
- **Aplicar la IA directo sobre `balance_sheets`/`income_statements`:** descartado. Rompe la procedencia y deja al contador sin punto de revisión. CreditoHub escribe en su propio perfil canónico; el contador decide si vuelca a las colecciones contables.
- **Single-provider (solo Claude):** descartado. El plan exige Grok primario intercambiable por costo/disponibilidad.
- **Procesamiento síncrono en la subida:** descartado por límites de tiempo de Vercel y costo de IA. Se usa cola asíncrona con lease.

## Riesgos
- Que el usuario interprete la salida de la IA como certificación. Mitigación: UI que marca todo como "propuesto" hasta confirmación del contador y auditoría de cada confirmación.
- Sobre-promesa de tipos documentales: el MVP son 4. Comunicar el alcance.
- Datos reales antes de cerrar cifrado V1. Mitigación: flag `CREDITO_HUB_ALLOW_REAL_DATA`.

## Criterios de aceptación
- Un contador carga un lote de documentos y, sin cargar campos a mano, obtiene una propuesta de legajo con cada dato trazado a su origen.
- El contador puede confirmar/corregir/rechazar cada dato; nada se da por válido sin su acción.
- Un banco define sus requisitos y obtiene una matriz cumplido/falta/vencido contra un legajo autorizado.
- Toda acción sensible queda en `audit_logs`.

## Dependencias
- Pipeline OCR/IA existente (`lib/ocr/*`) como base de prompts y patrón de provider.
- Modelo de grants/scopes/`access_grants` ya implementado (reports/010).
- Helper `assertCanManageAccountingFolder` (`lib/auth/accounting-access.ts`).

## Preguntas abiertas
- ¿Qué banco concreto es el piloto y cuál es su formato real de requisitos? (define el primer template).
- ¿El volcado del perfil canónico a `balance_sheets`/`income_statements` es manual confirmado por el contador o automático tras certificación? (recomendado: manual).
- Verificación del modelo de visión xAI real — pendiente de `XAI_API_KEY` (ver 000 §5).
