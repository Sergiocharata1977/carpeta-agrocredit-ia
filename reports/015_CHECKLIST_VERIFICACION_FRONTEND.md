# 015 — Checklist de verificación del frontend (CreditoHub IA)

**Fecha:** 2026-06-17
**Alcance:** verificación funcional, pantalla por pantalla, de los flujos del MVP CreditoHub IA + alta de carpeta con AFIP.
**Cómo usarlo:** marcá cada ítem `[x]` cuando lo pruebes en el navegador. Los ítems con ⛔ son **bloqueantes conocidos** (hoy no funcionan end-to-end sin la corrección indicada).

> **Dónde está la IA (aclaración):** la IA NO está en un solo botón. Vive en 3 lugares:
> 1. **Alta de carpeta** → botón "Subir constancia AFIP" (lee y prellena el alta).
> 2. **Productor → pestaña "Legajo IA"** → carga masiva de documentos + procesamiento.
> 3. **Productor → pestaña "Revisión"** → revisión de los datos que la IA extrajo.
> 4. **Entidad → "Requisitos"** y **carpeta → "Cumplimiento"** → parseo de requisitos y matriz.

---

## 0. Prerrequisitos de entorno (antes de probar)

- [ ] `.env.local` con `AI_PROVIDER` + clave (`XAI_API_KEY` o `ANTHROPIC_API_KEY`). **Sin clave, la IA corre en modo MOCK y devuelve datos de ejemplo** (aparece la advertencia "IA en modo demo").
- [ ] `CREDITO_HUB_ALLOW_REAL_DATA` = `false` (MVP en staging) → el intake masivo exige header `x-staging-data: true` (la UI ya lo manda).
- [ ] `CRON_SECRET` seteado (para el worker del pipeline).
- [ ] `firestore.rules` y `storage.rules` deployadas.
- [ ] Usuario contador (`accountant` / `accounting_firm_admin`) y usuario entidad (`bank_user`) de prueba.

---

## 1. Alta de carpeta — Manual (opción A) · `NuevoProductorDialog`

Pantalla: lista de productores (contador) → "Nueva carpeta".

- [ ] Abre el modal "Nueva carpeta".
- [ ] Se pueden **teclear** todos los campos: CUIT, Razón Social, Tipo de Persona, Actividad, Provincia, Localidad, Domicilio, Teléfono, Email.
- [ ] Validación: CUIT exige 11 dígitos; campos requeridos marcados con `*`.
- [ ] "Guardar productor" crea la carpeta y cierra el modal (toast de éxito).
- [ ] La nueva carpeta aparece en la lista.

## 2. Alta de carpeta — Con constancia AFIP / IA (opción B)

- [ ] En el modal aparece el bloque "Completar con constancia de AFIP (IA)".
- [ ] "Subir constancia AFIP" abre el selector (PDF / JPG / PNG / WEBP).
- [ ] Al subir, muestra "Leyendo documento..." y luego toast con **% de confianza**.
- [ ] El formulario se **prellena** con CUIT, razón social, tipo de persona, actividad, domicilio, etc.
- [ ] Lo prellenado es **editable** (puedo corregir antes de guardar — IA propone, humano confirma).
- [ ] Lo ya tipeado a mano **no se pisa** si quedó un campo cargado.
- [ ] Si la IA está en modo mock, aparece la advertencia "IA en modo demo… datos de ejemplo".
- [ ] "Guardar productor" persiste los datos revisados (el guardado = la autorización).
- [ ] Ruta API usada: `POST /api/credito-hub/afip-prefill` (solo lee, **no** guarda el documento).

---

## 3. Legajo IA — Carga masiva de documentos · `MassUploadDropzone` + `JobProgressList`

Pantalla: Productor → pestaña **"Legajo IA"** (`/app/contador/productores/[id]/legajo`).

- [ ] Se ve "Carga masiva IA" con botón "Elegir".
- [ ] Acepta múltiples archivos y `.zip` (PDF, imagen, Excel, ZIP).
- [ ] "Encolar documentos" sube y muestra toast "N documento(s) encolados".
- [ ] La sección "Procesamiento" lista un job por documento, refrescando cada ~4s.
- [ ] Cada job arranca en estado `queued`.
- [ ] **Botón "Procesar con IA (N)"** visible en la sección Procesamiento (se habilita si hay pendientes).
- [ ] Al apretarlo, la IA procesa los documentos de ESE legajo y los lleva a `awaiting_review` (toast "N documento(s) procesados").
- [ ] Un documento que la IA no puede leer queda `failed` con su error; el resto `awaiting_review`.
- [ ] (Opcional) En plan Vercel pago, el cron `/api/credito-hub/jobs/process` (Bearer `CRON_SECRET`) procesa en lote sin intervención. En Hobby (1 cron/día) se usa el botón.

> ✅ **Resuelto:** el procesamiento ya NO depende del cron. Ruta on-demand `POST /api/credito-hub/jobs/process-now` (auth de contador, scopeada al legajo).

---

## 4. Revisión profesional · `ReviewWorkbench` + `FieldReviewRow`

Pantalla: Productor → pestaña **"Revisión"** (`/app/contador/productores/[id]/revision`).

- [ ] Lista los campos `PENDING` o de baja confianza (<70%) extraídos por la IA.
- [ ] Cada fila muestra: código de campo, valor, **% de confianza** (rojo si <70%).
- [ ] "Confirmar" marca el campo como confirmado (toast + refresca).
- [ ] "Corregir" abre input + motivo, "Guardar" persiste el valor corregido.
- [ ] "Rechazar" descarta el campo (con motivo opcional).
- [ ] Cada acción recalcula el perfil canónico y queda en `audit_logs`.
- [ ] ✅ **Visor de documento:** el panel "Documento origen" ya renderiza PDF/imagen con URL firmada de 5 minutos desde `review/documents/[docId]/preview`; Excel/otros ofrecen abrir/descargar.
- [ ] Aislamiento: un contador sin vínculo con ese productor recibe error (no ve campos).

---

## 5. Requisitos bancarios (entidad) · `RequirementBuilder`

Pantalla: Entidad → **"Requisitos"** (`/app/entidad/requisitos`, sidebar).

- [ ] Solo visible para `bank_user` / `agro_company_user` / `admin_platform` (RoleGate).
- [ ] Permite cargar Banco, Producto y subir un PDF de requisitos.
- [ ] "Parsear PDF" muestra la propuesta de requisitos generada por IA.
- [ ] "Publicar" cambia el template a `published`.
- [ ] ✅ **Requisitos editables:** la propuesta IA se puede corregir antes de publicar: nombre, descripción, categoría, obligatorio, períodos, vigencia, responsable, formatos y reglas.
- [ ] Aislamiento: una entidad no puede publicar/ver templates de **otra** entidad (corregido — se liga a la org de la sesión).

---

## 6. Solicitud de crédito + Matriz de cumplimiento · `ComplianceMatrix`

Pantalla: Entidad → carpeta autorizada → **"Cumplimiento"** (`/app/entidad/carpetas/[targetOrgId]/cumplimiento`).

- [ ] ✅ **Acceso por navegación.** La vista de carpeta de la entidad muestra el botón "Ver cumplimiento".
- [ ] La pantalla carga los templates publicados de la entidad.
- [ ] ✅ **Selector de template:** ya no hay que pegar el ID a mano; se elige desde un selector.
- [ ] "Cruzar" crea la `CreditApplication` y corre el matching (`POST credit-applications` + `POST .../match`).
- [ ] La matriz muestra cada requisito con su `MatchStatus` (badge), explicación y documento.
- [ ] Aislamiento: la entidad solo puede cruzar legajos sobre los que tiene **grant vigente** (corregido).

---

## 7. Seguridad / aislamiento multi-tenant (negativos)

- [ ] Productor A no ve jobs/campos/perfil de Productor B.
- [ ] Contador sin vínculo no accede al legajo de un productor ajeno.
- [ ] Entidad sin grant vigente no corre matching ni ve la matriz.
- [ ] Entidad no puede atribuir una solicitud a otra entidad (forzado server-side).
- [ ] El worker `jobs/process` rechaza requests sin `Bearer CRON_SECRET` (401).
- [ ] Cubierto por tests automáticos: `__tests__/security/credito-hub-isolation.test.ts` (12 casos) + suite (105 tests).

---

## Resumen de bloqueantes / pendientes

| # | Severidad | Qué falta | Dónde |
|---|-----------|-----------|-------|
| 1 | ✅ Resuelto | Procesamiento on-demand con botón "Procesar con IA" (ya no depende del cron) | `JobProgressList` + `jobs/process-now` |
| 2 | ✅ Resuelto | Link de navegación a "Cumplimiento" | vista carpeta entidad |
| 3 | ✅ Resuelto | Visor real del documento en Revisión | `ReviewWorkbench` + preview firmado |
| 4 | ✅ Resuelto | Requisitos editables antes de publicar | `RequirementBuilder` |
| 5 | ✅ Resuelto | Selector de template en la matriz | `ComplianceMatrix` |
| 6 | ℹ️ Config | Clave de IA en prod (sin ella, modo mock/demo) | env |

> Queda 1 bloqueante de navegación (#2). Los ⚠️ son mejoras de UX; el flujo funciona sin ellas.
