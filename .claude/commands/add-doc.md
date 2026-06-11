# /add-doc

Crea un nuevo documento Markdown en `content/docs/` con el frontmatter estandarizado del proyecto.

## Argumentos

`$ARGUMENTS` — descripción del documento a crear. Incluir:
- Módulo (mi-panel, rrhh, procesos, documentos, crm, auditorias, hallazgos, acciones, don-candido, contabilidad, dealer)
- Nombre/título del documento
- Pantalla o ruta asociada (ej: /rrhh/personal)

Ejemplo: `modulo=rrhh titulo="Gestión de Personal" pantalla=/rrhh/personal`

## Módulos válidos

| Módulo | Carpeta destino | Pantalla típica |
|--------|-----------------|-----------------|
| mi-panel | content/docs/mi-panel/ | /mi-panel |
| rrhh | content/docs/rrhh/ | /rrhh/personal, /rrhh/positions |
| procesos | content/docs/procesos/ | /procesos/definiciones |
| documentos | content/docs/documentos/ | /documentos |
| crm | content/docs/crm/ | /crm/clientes |
| auditorias | content/docs/auditorias/ | /mejoras/auditorias |
| hallazgos | content/docs/hallazgos/ | /mejoras/hallazgos |
| acciones | content/docs/acciones/ | /mejoras/acciones |
| don-candido | content/docs/don-candido/ | /mi-panel?tab=ia |
| contabilidad | content/docs/contabilidad/ | /contabilidad |
| dealer | content/docs/dealer/ | /dealer/solicitudes |

## Procedimiento

1. Determinar módulo, título, slug (kebab-case del título), pantalla
2. Verificar que no exista ya un archivo con ese slug en `content/docs/{modulo}/`
3. Leer `content/docs/README.md` para recordar las reglas de gobierno
4. Crear el archivo con el template EXACTO del paso siguiente
5. Confirmar la creación al usuario

## Template OBLIGATORIO

```md
---
title: "[TÍTULO VISIBLE]"
slug: "[modulo/slug-kebab-case]"
module: "[modulo]"
screen: "[/ruta-principal]"
summary: "[Resumen corto orientado a uso, máximo 2 oraciones.]"
roles: ["admin", "gerente", "jefe", "usuario"]
tags: ["[modulo]", "[tema-principal]"]
relatedRoutes: ["[/ruta-principal]"]
entity: "[entidad-firestore]"
order: 10
status: "active"
category: "usuario"
lastValidated: "[FECHA HOY YYYY-MM-DD]"
---

## Que es

[Descripción breve de la pantalla o funcionalidad. 2-4 oraciones.]

## Para que sirve

[Valor que aporta al usuario. Qué problema resuelve.]

## Como se usa

[Pasos principales de uso. Usar lista numerada.]

1. [Paso 1]
2. [Paso 2]
3. [Paso 3]

## Errores frecuentes

[Problemas comunes y cómo resolverlos. Si no hay conocidos, indicar "Sin errores frecuentes reportados."]

## Documentos relacionados

[Links a otros docs internos relevantes. Usar formato: - [Título](/documentacion/modulo/slug)]
```

## Reglas importantes

- Slug en kebab-case: `gestion-de-personal` NO `GestionPersonal`
- `lastValidated` debe ser la fecha de HOY
- El contenido debe referirse a pantallas y flujos REALES del producto
- NO incluir roadmap, deuda técnica ni estados temporales en el contenido
- Si la pantalla no existe todavía, NO crear el documento
