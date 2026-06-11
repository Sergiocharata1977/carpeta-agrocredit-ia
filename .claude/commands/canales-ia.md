# /canales-ia

Análisis, diseño e implementación de los 4 canales de interacción de Don Cándido:
**Formulario Líquido · WhatsApp (cliente + empleados) · Voz · OpenClaw**

Úsalo para entender el estado actual de un canal, identificar gaps, y generar un plan de implementación concreto.

---

## Argumentos

`$ARGUMENTS` — canal a analizar. Opciones:

| Argumento | Canal |
|---|---|
| `form` o `formulario` | Formulario Líquido — forms adaptativos por contexto |
| `whatsapp` | WhatsApp cliente + empleados + relación con tareas |
| `voice` o `voz` | Voz por WhatsApp y por formulario |
| `openclaw` | OpenClaw terminal — plugin de skills externas |
| *(sin argumento)* | Resumen de los 4 canales con gap analysis |

Ejemplos:
```
/canales-ia
/canales-ia form
/canales-ia whatsapp
/canales-ia openclaw
```

---

## Contexto del sistema

Los 4 canales convergen en `UnifiedConverseService` (`src/services/ai-core/UnifiedConverseService.ts`).
Los 3 adaptadores actuales: `chatAdapter`, `voiceAdapter`, `whatsappAdapter` → todos terminan en el mismo motor IA.

```
Usuario (forma de entrada)
    ├── Formulario Líquido  → formulario adaptativo → UnifiedConverseService
    ├── WhatsApp cliente    → webhook Meta → whatsappAdapter → UnifiedConverseService
    ├── WhatsApp empleados  → misma infraestructura, lógica diferente
    ├── Voz (web)          → voiceAdapter → intent detection → UnifiedConverseService
    ├── Voz (WhatsApp)     → audio → transcripción → whatsappAdapter
    └── OpenClaw           → HTTP skill execution → skillExecutor → Firestore
```

---

## Procedimiento para análisis de canal

### Si $ARGUMENTS = `form` o `formulario`

**Visión del Formulario Líquido:**
Un formulario que se adapta dinámicamente según las respuestas anteriores, el contexto del usuario (rol, módulo, historial), y las reglas del proceso. No es un form estático con pasos fijos — los campos aparecen, cambian o desaparecen según lo que ocurre.

**Archivos a leer:**
```
src/types/forms.ts                         ← tipos actuales (básicos)
src/types/conversational-forms.ts          ← segundo sistema de tipos (duplicado)
src/services/ai-core/adapters/             ← ver si hay un form adapter
src/components/                            ← buscar componentes de formulario
src/app/api/                              ← buscar rutas /forms/ o /formularios/
```

**Checklist de estado:**
- [ ] ¿Hay un solo sistema de tipos de forms o están duplicados?
- [ ] ¿Los forms son estáticos (campos fijos) o adaptativos (campos condicionales)?
- [ ] ¿Existe un `FormAdapter` en `src/services/ai-core/adapters/`?
- [ ] ¿Los forms pueden enviarse por WhatsApp o solo por web?
- [ ] ¿Existe un motor de reglas para condiciones (campo X aparece si respuesta Y)?
- [ ] ¿Los forms guardan estado entre sesiones?
- [ ] ¿Hay un builder/editor de forms para el admin?

**Gap analysis a responder:**
1. ¿Qué hay hoy? (tipos, componentes, APIs existentes)
2. ¿Qué falta para que sea "líquido"? (condicionales, contexto dinámico, multi-canal)
3. ¿Cómo se integraría con WhatsApp y voz?

**Plan a generar:**
```
Ola 0: Unificar los dos sistemas de tipos en src/types/liquid-form.ts
Ola 1: Motor de reglas (LiquidFormEngine) — evalúa condiciones y decide próximo campo
Ola 2: FormAdapter en UnifiedConverseService (canal 'form')
Ola 3: WhatsApp rendering — enviar campos como mensajes interactivos
Ola 4: Voice rendering — leer campo en voz, capturar respuesta
Ola 5: Builder visual de forms en admin
```

---

### Si $ARGUMENTS = `whatsapp`

**Visión:**
- **WhatsApp cliente**: canal automatizado. El cliente recibe notificaciones, encuestas NPS, responde forms, consulta estado de servicio. Sin intervención humana por defecto.
- **WhatsApp empleados**: canal operativo interno. Un empleado recibe alertas de tareas asignadas, puede actualizar estado de una tarea, completar un formulario, consultar a Don Cándido.
- **Relación con tareas**: cuando una tarea se crea o vence, el empleado responsable recibe un mensaje WhatsApp. Puede responder "hecho" y el sistema actualiza el estado.

**Archivos a leer:**
```
src/types/whatsapp.ts                           ← tipos completos (573 líneas)
src/lib/whatsapp/WhatsAppClient.ts              ← cliente Meta Graph API
src/services/whatsapp/WhatsAppService.ts        ← servicio de negocio
src/services/ai-core/adapters/whatsappAdapter.ts ← adapter al motor IA
src/app/api/whatsapp/                           ← rutas de conversaciones
src/app/api/public/whatsapp/webhook/route.ts    ← webhook público
src/app/(dashboard)/crm/whatsapp/               ← inbox actual
src/config/plugins/crm-whatsapp-inbox.manifest.ts ← manifest del plugin
```

**Checklist de estado:**
- [ ] ¿El webhook distingue mensajes de clientes externos vs. empleados internos?
- [ ] ¿Existe lógica de routing: este número es cliente → flujo CRM, este número es empleado → flujo interno?
- [ ] ¿Se pueden enviar formularios por WhatsApp (mensajes interactivos con botones/listas)?
- [ ] ¿Existe notificación automática cuando se asigna una tarea?
- [ ] ¿El empleado puede responder y actualizar el estado de una tarea por WhatsApp?
- [ ] ¿Hay separación entre `crm_whatsapp_inbox` (plugin actual) y un hipotético `empleados_whatsapp`?
- [ ] ¿Los mensajes de voz (audio) de WhatsApp se transcriben?

**Gap analysis a responder:**
1. ¿El inbox actual es solo para operadores CRM o también para otros roles?
2. ¿Qué falta para el canal de empleados? (routing, notificaciones de tareas, forms por WA)
3. ¿Qué falta para el canal de clientes? (respuestas automáticas, NPS por WA, consultas sin humano)
4. ¿Cómo se maneja la transcripción de audios de WhatsApp?

**Plan a generar:**
```
Ola 0: Routing por número — identificar si es cliente o empleado en el webhook
Ola 1: Canal empleados — notificación de tarea asignada + respuesta de estado
Ola 2: Canal clientes — flujo automatizado sin intervención humana (NPS, estado, consulta)
Ola 3: WhatsApp forms — enviar un LiquidForm por WhatsApp como mensajes interactivos
Ola 4: Audio → transcripción en webhook (Whisper o similar)
```

---

### Si $ARGUMENTS = `voice` o `voz`

**Visión:**
- **Voz en web**: ya existe. `voiceAdapter` → `detectVoiceIntent` → `UnifiedConverseService`.
- **Voz en WhatsApp**: audio de WhatsApp → transcribir → procesar como texto → responder.
- **Voz en formularios**: el usuario habla en lugar de escribir. El form escucha, transcribe, valida el campo, avanza.
- **Comandos de voz**: "Abrir hallazgo de no conformidad", "Mostrar mis tareas", "Cuánto vendí este mes" → `UICommand` de navegación.

**Archivos a leer:**
```
src/services/ai-core/adapters/voiceAdapter.ts   ← adapter de voz actual
src/services/ai-core/voiceIntentDetector.ts     ← detección de intención
src/types/ai-core.ts                            ← AIChannel, AIInput, UICommand
src/app/api/                                   ← buscar rutas /voice/ o /voz/
src/app/(dashboard)/                           ← buscar páginas con voz
```

**Checklist de estado:**
- [ ] ¿El `voiceAdapter` es accesible desde el frontend (existe ruta API)?
- [ ] ¿El webhook de WhatsApp procesa mensajes de tipo `audio`?
- [ ] ¿Existe integración con un servicio de transcripción (Whisper, Google STT, etc.)?
- [ ] ¿Los UICommands de navegación (`NAVIGATE`, `OPEN_MODAL`) están implementados en el frontend?
- [ ] ¿Existe un componente de "grabación de voz" en la UI?
- [ ] ¿Los formularios aceptan input de voz en algún campo?

**Gap analysis a responder:**
1. ¿El voiceAdapter actual tiene ruta API expuesta al frontend?
2. ¿Qué pasa cuando llega un audio de WhatsApp? (¿se ignora, se notifica que no se entiende?)
3. ¿Qué UICommands están implementados en el frontend y cuáles son stub?

**Plan a generar:**
```
Ola 0: Ruta API /api/ai/voice/route.ts que expone voiceAdapter al frontend
Ola 1: Webhook WhatsApp procesa type='audio' → llama transcripción → texto → adapter
Ola 2: Componente VoiceRecorder en UI — graba, envía audio, muestra respuesta
Ola 3: UICommands implementados en frontend — navigate, open_modal, highlight
Ola 4: Campo de voz en LiquidForm — el form puede escuchar respuesta hablada
```

---

### Si $ARGUMENTS = `openclaw`

**Visión:**
OpenClaw es una API pública de ejecución de skills que permite a sistemas externos (landing pages, apps móviles, bots de WhatsApp de terceros, Zapier, Make) ejecutar acciones en Don Cándido usando una tenant_key. Funciona como un mini-AppStore de acciones por tenant.

Debe ser un plugin formal (`plugin_id: 'openclaw'`) con manifest, gating y marketplace.

**Estado actual:**
```
src/types/openclaw.ts                           ← tipos (modo, status, manifest, execute)
src/lib/openclaw/skillRegistry.ts               ← 14 skills (10 activas, 4 financieras desactivadas)
src/lib/openclaw/skillExecutor.ts               ← ejecuta read skills, stub write skills
src/lib/openclaw/confirmationStore.ts           ← confirmación 2-factor para write skills
src/lib/openclaw/tenantConfig.ts                ← config por org (tenant_key, enabled_skills)
src/app/api/public/openclaw/skills/route.ts     ← GET skills del tenant
src/app/api/public/openclaw/execute/route.ts    ← POST ejecutar skill
src/app/(dashboard)/admin/openclaw/page.tsx     ← admin panel
content/docs/don-candido/openclaw.md            ← docs internas
```

**Archivos a leer:**
```
src/types/openclaw.ts
src/lib/openclaw/skillRegistry.ts
src/lib/openclaw/skillExecutor.ts
src/config/plugins/                            ← verificar si openclaw.manifest.ts existe
src/app/api/public/openclaw/
src/app/(dashboard)/admin/openclaw/
```

**Checklist de estado:**
- [ ] ¿Existe `src/config/plugins/openclaw.manifest.ts`?
- [ ] ¿OpenClaw aparece en `PLATFORM_PLUGIN_MANIFESTS`?
- [ ] ¿El gating de `/admin/openclaw` usa un capability check?
- [ ] ¿Las write skills tienen implementación real o son solo confirmationStore?
- [ ] ¿Las 4 skills financieras desactivadas (`consultar_mayor`, `ver_libro_diario`) esperan la contabilidad central?
- [ ] ¿Existe un mecanismo para que otros plugins registren sus propias skills en OpenClaw?
- [ ] ¿Hay rate limiting en la API pública?
- [ ] ¿El `tenant_key` tiene rotación o revocación?

**Gap analysis a responder:**
1. ¿Por qué no tiene manifest formal si ya tiene toda la infraestructura?
2. ¿Cómo un plugin nuevo (ej: contabilidad_central) registra sus skills en OpenClaw?
3. ¿Qué falta para habilitar write skills de verdad?

**Plan a generar:**
```
Ola 0: Crear src/config/plugins/openclaw.manifest.ts y agregar a PLATFORM_PLUGIN_MANIFESTS
Ola 1: Gating formal — /admin/openclaw requiere hasCapability('openclaw')
Ola 2: API de registro de skills — plugins pueden registrar sus skills en OpenClaw
Ola 3: Write skills reales — crear tarea, registrar hallazgo, actualizar estado
Ola 4: Rate limiting + rotación de tenant_key
Ola 5: Skills financieras activadas cuando contabilidad_central esté operativo
```

---

### Si no hay argumento (overview de los 4 canales)

Hacer gap analysis rápido de los 4 canales y mostrar tabla de estado:

```
| Canal | Estado | Gap principal | Próximo paso |
|---|---|---|---|
| Formulario Líquido | ... | ... | ... |
| WhatsApp cliente | ... | ... | ... |
| WhatsApp empleados | ... | ... | ... |
| Voz | ... | ... | ... |
| OpenClaw | ... | ... | ... |
```

Luego hacer recomendación de orden de implementación según dependencias:
- Formulario Líquido es base para WhatsApp forms y Voice forms
- Transcripción de audio es base para WhatsApp voz
- OpenClaw manifest es independiente y rápido

---

## Formato de reporte final

```
## Canal: [NOMBRE] — [FECHA]

### Estado actual
[Qué existe en el codebase hoy]

### Gap vs. visión
[Qué falta — específico, con nombres de archivos]

### Dependencias
[Qué otros canales o módulos bloquean o son requeridos]

### Plan concreto
| Ola | Agente | Archivo | Acción |
|---|---|---|---|
| 0 | A | ... | ... |

### Decisión arquitectónica recomendada
[Si hay múltiples enfoques, cuál es el mejor y por qué]

### OpenClaw como plugin — opinión
[Solo si el argumento fue 'openclaw' o sin argumento]
Sí conviene formalizarlo. Ya tiene: tipos, skill registry, executor, confirmationStore,
API pública, admin page. Solo le falta el manifest. Es trabajo de 1-2 horas, no días.
El pattern ideal: openclaw es el "bus de skills externas" — cada plugin registra
sus skills al instalarse, OpenClaw las expone por API pública con autenticación por tenant_key.
```

---

## Archivos de referencia global del sistema de canales

```
src/services/ai-core/UnifiedConverseService.ts  ← cerebro central de IA
src/services/ai-core/adapters/chatAdapter.ts    ← canal chat web
src/services/ai-core/adapters/voiceAdapter.ts   ← canal voz
src/services/ai-core/adapters/whatsappAdapter.ts ← canal WhatsApp
src/types/ai-core.ts                            ← AIChannel, AIInput, ConverseResponse
src/types/context.ts                            ← UserContext (qué contexto llega a la IA)
src/ai/services/LLMRouter.ts                    ← Claude primario, Groq fallback
```

## Relación entre los 4 canales

```
LiquidForm (web)  ──────────────────────────────────────┐
LiquidForm (WhatsApp) ──── whatsappAdapter ─────────────┤
LiquidForm (voz)  ──────── voiceAdapter ────────────────┤
                                                         ▼
WhatsApp cliente  ──────── whatsappAdapter ──── UnifiedConverseService ──── LLMRouter
WhatsApp empleados ─────── whatsappAdapter ─────────────┤
                                                         │
Voz (web)  ─────────────── voiceAdapter ────────────────┤
Voz (WhatsApp audio) ───── transcripción → adapter ─────┘

OpenClaw  ──────── skillExecutor ──── Firestore (no pasa por UnifiedConverseService)
           (skills son ejecuciones directas, no conversaciones)
```

OpenClaw es el único canal que **no pasa por UnifiedConverseService** — es ejecución directa de acciones, no conversación con IA. Eso es correcto arquitectónicamente.
