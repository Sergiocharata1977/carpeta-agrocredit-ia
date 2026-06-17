# Sistema documental — Agro-Credit / Legajo

Entrada única a la documentación de planificación y estado del proyecto. Si vas
a tocar código o documentación estructural, **empezá por acá**.

> Fuente de verdad: cuando la documentación contradiga al código actual, gana el
> código — y se actualiza el documento (regla de continuidad, ver `CLAUDE.md`).

---

## Orden de lectura obligatorio

Al retomar el proyecto o iniciar una sesión (`protocolo`, `cargar contexto`):

1. **`HANDOFF_ACTUAL.md`** — qué se hizo en la última sesión, archivos tocados, pendientes, riesgos y qué IA trabaja en qué.
2. **`000_ESTADO_ACTUAL_PROYECTO.md`** — visión del producto, reglas de negocio, actores, módulos y rutas vigentes.
3. **`../docs/MODULE_REGISTRY.md`** — módulos, rutas, servicios y colecciones canónicas (buscar acá antes de crear cualquier cosa).
4. **`../CLAUDE.md`** — patrones obligatorios, convenciones, seguridad y protocolo multi-IA.
5. El **plan específico** del área que vas a tocar (tabla de abajo).

---

## Catálogo de documentos

| # | Documento | Tipo | Estado | De qué trata |
|---|-----------|------|--------|--------------|
| — | `HANDOFF_ACTUAL.md` | Bitácora | 🟢 Vivo | Estado por sesión: cambios, archivos, pendientes y validación. Se actualiza al cerrar cada sesión. |
| 000 | `000_ESTADO_ACTUAL_PROYECTO.md` | Estado | 🟢 Vivo | Qué es el producto, reglas de negocio críticas, actores, módulos `ga`/`beta`, colecciones y rutas. |
| 004 | `004_PLAN_ONBOARDING_Y_REGISTRO.md` | Plan | ✅ Completado | Wizards de registro (usuario/contador/entidad), modelo `organizations` unificado, acceso temporizado y guards de carpeta. |
| 005 | `005_ROADMAP_INTEGRATION_CORE.md` | Roadmap | 🟡 En progreso | De formularios a hub de integración: API `/api/hub/*`, API keys, webhooks, SDK, MCP. Olas 4 y 6 hechas; 5, 7 y 8 pendientes. |
| 010 | `010_FUNCIONALIDADES_ROLES_ACTUALES.md` | Referencia | 🟢 Vivo | Qué puede hacer hoy cada rol (cliente, contador, entidad, admin) y cómo interactúan. Estado real, no futuro. |
| 011 | `011_PENDIENTES_PRODUCTOR_CONTADOR.md` | Plan | ✅ Completado | Experiencia del productor (perfil, contador, habilitaciones) y dashboard del contador. |
| 012 | `012_PLAN_LANZAMIENTO_SEGURO_ENCRIPTACION.md` | Plan | 📐 Planificado | Lanzamiento seguro: aislamiento multi-tenant, auditoría por sección y cifrado V1 de archivos fuente. **Ola 0 (ADR) bloqueante antes de codear.** |
| 013 | `013_AUDITORIA_LIMPIEZA_CONTROL_TECNICO_LEGAJO.md` | Auditoría | 🟢 Vivo | Hallazgos de seguridad y deuda técnica con severidad, archivo y criterio de cierre. Quedan pendientes P1. |
| 014 | `014_PLAN_CREDITO_HUB_IA.md` | Plan | ✅ Completado (MVP) | CreditoHub IA: capa multiproveedor, cola documental, clasificación/extracción con procedencia, revisión profesional, requisitos y matriz. |
| 015 | `015_CHECKLIST_VERIFICACION_FRONTEND.md` | Checklist | 🟢 Vivo | Verificación pantalla por pantalla de los flujos (alta AFIP, Legajo IA, revisión, requisitos, cumplimiento) con bloqueantes marcados. |
| 016 | `016_INFORMACION_CARGA_CLIENTE.md` | Referencia | 🟢 Vivo | Inventario completo de la información que debe cargar un cliente y sus empresas (datos personales, perfil, contable, patrimonio, documentos), relevado de todos los formularios y schemas. |
| 017 | `017_PLAN_LEGAJO_UNICO_CONTADOR.md` | Plan | 📐 Planificado | Formulario/legajo único operado por el contador: pestañas por carpeta (titular + empresas), zona única de carga con auto-routing por IA, certificación profesional con sello y asistente IA contextual por cliente. |

**Leyenda de estado:** 🟢 Vivo (se mantiene actualizado) · ✅ Completado · 🟡 En progreso · 📐 Planificado (no implementado).

---

## Documentación de referencia (`../docs/`)

Material técnico estable que complementa a los planes:

- `MODULE_REGISTRY.md` — registro canónico de módulos, rutas, servicios y colecciones.
- `ARQUITECTURA.md` · `MODELO_DATOS.md` — arquitectura y modelo de datos.
- `PERMISOS.md` · `SEGURIDAD_FIRESTORE.md` — roles, scopes y reglas de seguridad.
- `DEPLOY_VERCEL_FIREBASE.md` — deploy y variables de entorno.
- `QA_CHECKLIST.md` — checklist de QA.
- `credito-hub/` — documentación técnica detallada de CreditoHub IA.

---

## Convenciones del sistema documental

- **Numeración:** `NNN_TITULO_EN_MAYUSCULAS.md`, tres dígitos, correlativo. El número no se reutiliza.
- **Números retirados** (planes ya completados y eliminados a pedido del dueño): `001` (plan original), `002` (reorganización de base de datos), `003` (vistas por rol), `006` (OCR/IA EECC), `007` (perfil extendido), `008` (ABM clientes/empresas), `009` (invitaciones por link). No reasignar.
- **Próximo número libre:** `018`.
- **Tipos:** Estado · Plan · Roadmap · Checklist · Auditoría · Referencia · Bitácora.
- Cada plan declara su estado y, si aplica, sus olas con estado individual.

### Cómo agregar un documento nuevo

1. Tomá el próximo número libre y nombralo con la convención.
2. Encabezá con `# Título` y una línea de **Estado**.
3. Agregalo a la tabla de catálogo de este README.
4. Si cambia alcance, módulos o colecciones, actualizá `000_ESTADO_ACTUAL_PROYECTO.md` y `../docs/MODULE_REGISTRY.md`.
5. Registrá el cambio en `HANDOFF_ACTUAL.md` al cerrar la sesión.
