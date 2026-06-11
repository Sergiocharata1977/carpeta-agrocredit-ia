# /manual-calidad

Genera un **Manual de Calidad ISO 9001** completo en PDF para una organización.
Usa HTML + Chrome headless (o Puppeteer si está disponible) para máximo control del diseño.

## Argumentos

`$ARGUMENTS` — parámetros del manual. Incluir:
- `org` — nombre de la organización (ej: "Agro Bicuffa SRL")
- `codigo` — código del documento (ej: "MC-001")
- `alcance` — alcance del SGC (ej: "Venta y servicio técnico de maquinaria agrícola")
- `version` — versión (ej: "1.0") — opcional, default "1.0"
- `colores` — esquema de colores: `case` (rojo #c8102e + negro), `iso` (verde #059669), `custom:#hexcolor`

Ejemplo: `org="Agro Bicuffa SRL" codigo=MC-001 alcance="Venta de maquinaria agrícola CASE" colores=case`

## Estructura del Manual de Calidad ISO 9001

El manual debe contener las siguientes secciones en orden:

### PORTADA
- Logo / nombre organización + badge ISO 9001:2015
- Título: "Manual de Calidad"
- Código, versión, fecha de emisión, responsable
- Cuadro de control de documento

### 1. OBJETO Y ALCANCE (Cláusula 1 / 4.3)
- Objeto del manual
- Alcance del SGC: productos/servicios incluidos, sitios, exclusiones justificadas

### 2. REFERENCIAS NORMATIVAS (Cláusula 2)
- ISO 9001:2015
- ISO 9000:2015 (vocabulario)
- Normativas sectoriales aplicables

### 3. TÉRMINOS Y DEFINICIONES (Cláusula 3)
- Tabla: Término | Definición | Fuente
- Mínimo 8 términos clave del SGC

### 4. CONTEXTO DE LA ORGANIZACIÓN (Cláusula 4)
- 4.1 Partes interesadas y contexto (tabla PEST simplificada)
- 4.2 Partes interesadas — tabla: Parte | Necesidades | Expectativas
- 4.3 Alcance del SGC
- 4.4 Mapa de procesos (diagrama Mermaid flowchart)

### 5. LIDERAZGO (Cláusula 5)
- 5.1 Compromiso de la dirección
- 5.2 Política de calidad (texto formal + principios)
- 5.3 Roles, responsabilidades y autoridades (tabla RACI simplificada)

### 6. PLANIFICACIÓN (Cláusula 6)
- 6.1 Riesgos y oportunidades (tabla: Riesgo | Probabilidad | Impacto | Acción)
- 6.2 Objetivos de calidad (tabla: Objetivo | Indicador | Meta | Frecuencia | Responsable)

### 7. APOYO (Cláusula 7)
- 7.1 Recursos (personas, infraestructura, ambiente)
- 7.2 Competencia (perfil de roles clave)
- 7.3 Toma de conciencia
- 7.4 Comunicación
- 7.5 Información documentada (lista maestra de documentos)

### 8. OPERACIÓN (Cláusula 8)
- 8.1 Planificación y control
- 8.2 Requisitos del cliente (flujo: consulta → oferta → pedido → entrega)
- 8.4 Control de proveedores (criterios de evaluación)
- 8.5 Producción/prestación del servicio
- 8.7 Control de salidas no conformes

### 9. EVALUACIÓN DEL DESEMPEÑO (Cláusula 9)
- 9.1 Indicadores clave del SGC (dashboard)
- 9.2 Auditoría interna (programa anual)
- 9.3 Revisión por la dirección (agenda tipo)

### 10. MEJORA (Cláusula 10)
- 10.1 No conformidades y acciones correctivas (flujo)
- 10.2 Mejora continua (ciclo PDCA)

### HISTORIAL DE REVISIONES
- Tabla: Versión | Fecha | Cambios | Aprobado por

## Procedimiento

1. Leer `reports/` para tomar contexto de documentos ya existentes (PD-COM-001, PD-CRE-001, etc.)
2. Leer `scripts/generate-pdf.cjs` para reusar el motor de generación existente
3. Generar el archivo HTML en `reports/html/{codigo}_Manual_Calidad_{org_slug}.html`
   - Fuente: `Arial, 'Helvetica Neue', Helvetica, sans-serif` (NO Google Fonts — falla en headless)
   - Colores según parámetro `colores`
   - Tamaño A4 con `@page { size: A4; margin: 20mm 18mm; }`
   - Tablas con encabezado del color primario, filas alternas `#f8fafc`
   - Diagramas con Mermaid.js vía CDN
4. Añadir el documento al array de `DOCS` en `scripts/generate-pdf.cjs`
5. Generar el PDF: `node scripts/generate-pdf.cjs`
6. Confirmar la ruta del PDF generado al usuario

## Colores por esquema

| Esquema | Primario | Acento | Fondo claro |
|---------|----------|--------|-------------|
| `case` | `#c8102e` | `#1a1a1a` | `#fff0f0` |
| `iso` | `#059669` | `#0f172a` | `#ecfdf5` |
| `custom` | valor hex dado | `#1a1a1a` | tint 10% |

## Reglas

- Tipografía: SIEMPRE usar fuentes del sistema (Arial/Helvetica). Nunca `@import` de Google Fonts
- Paginado: cada sección principal con `page-break-before: auto`
- Portada: `page-break-after: always`
- Tablas: `page-break-inside: avoid`
- Código de documento en footer de cada página
- El manual NO reemplaza los procedimientos (PD-XXX) — los referencia por código
- Versión 1.0 = "Edición inicial"
