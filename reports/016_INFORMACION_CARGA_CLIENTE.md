# 016 — Información que debe cargar un cliente (persona + empresas)

**Fecha:** 2026-06-17
**Tipo:** Referencia
**Estado:** 🟢 Vivo
**Alcance:** inventario completo, relevado de todos los formularios y schemas Zod del legajo, de la información que se necesita para completar la carpeta crediticia de un cliente y de sus empresas.

> **Quién carga qué (regla de negocio):** hoy la información contable/fiscal/patrimonial la carga el **contador habilitado**; el **cliente** autoriza accesos y completa su perfil básico. Esta lista es la información que el legajo necesita, independientemente de quién la teclee. Fuente: schemas en `lib/schemas/*` (verdad de los campos) y formularios en `components/*`.
>
> **Leyenda:** ✓ obligatorio · ◦ opcional · 💲 lleva moneda (ARS/USD).

---

## 1. Datos personales / del titular (Cliente raíz)

Form: `components/producers/ProducerForm.tsx` → schema `createProducerSchema` / `systemUserOrgSchema`.
También se puede **prellenar con la constancia de AFIP por IA** (botón "Subir constancia AFIP").

| Campo | Req. | Detalle |
|---|---|---|
| CUIT | ✓ | 11 dígitos sin guiones |
| Razón social / Nombre | ✓ | |
| Tipo de persona | ✓ | física / jurídica |
| Actividad | ✓ | agrícola / ganadera / mixta / hortícola / forestal / otra |
| Provincia | ✓ | |
| Localidad | ✓ | |
| Domicilio | ◦ | |
| Teléfono | ◦ | |
| Email | ◦ | |

---

## 2. Perfil extendido del titular

Form: `components/producers/ProducerProfileForm.tsx` → schema `producerProfilePayloadSchema`. Cuatro secciones:

### 2.1 Datos fiscales
| Campo | Req. | Detalle |
|---|---|---|
| Condición fiscal | ◦ | responsable inscripto / monotributista / exento / consumidor final / otro |
| Categoría fiscal | ◦ | categoría de monotributo, etc. |
| Actividades AFIP | ◦ | lista de actividades |
| Inicio de actividad | ◦ | año |
| Tiene empleados | ◦ | sí/no |
| Cantidad de empleados | ◦ | si tiene empleados |

### 2.2 Datos productivos
| Campo | Req. | Detalle |
|---|---|---|
| Hectáreas propias | ◦ | |
| Hectáreas alquiladas | ◦ | |
| Cultivos principales | ◦ | lista |
| Campaña actual | ◦ | |
| Producción estimada | ◦ | texto |
| Maquinaria principal | ◦ | texto |

### 2.3 Datos financieros estimados
| Campo | Req. | Detalle |
|---|---|---|
| Ventas estimadas | ◦ 💲 | anual |
| Deudas bancarias | ◦ 💲 | |
| Cheques emitidos | ◦ | monto |
| Cheques rechazados | ◦ | monto |
| Préstamos vigentes | ◦ | texto |
| Tarjetas rurales | ◦ | texto |
| Cupos comerciales | ◦ | texto |

### 2.4 Resumen patrimonial (texto libre)
Campos propios · Maquinaria · Vehículos · Silo bolsa / stock · Ganado.

---

## 3. Empresas del cliente (una o varias)

Form: `components/producers/EntitySelector.tsx` / wizard `SystemUserEntitiesStep` → schema `systemUserEntitySchema` / `addEntitySchema`.
Cada empresa es una organización hija (`system_user_entity`) con **su propia carpeta contable completa** (secciones 4 a 6).

| Campo | Req. | Detalle |
|---|---|---|
| Razón social | ✓ | |
| CUIT | ✓ | 11 dígitos |
| Actividad | ✓ | agrícola / ganadera / mixta / hortícola / forestal / otra |
| Provincia | ✓ | |
| Localidad | ✓ | |
| Titulares | ◦ | texto libre (socios/titulares de la empresa) |

---

## 4. Carpeta contable (por período — del titular o de cada empresa)

### 4.1 Período contable
Form: `AccountingPeriodForm` → `createAccountingPeriodSchema`.
Año ✓ · Tipo de período ✓ (ejercicio / campaña / semestre / trimestre) · Etiqueta ✓.

### 4.2 Balance / Estado de Situación Patrimonial
Form: `BalanceSheetForm` → `balanceSheetDetailsSchema`. Moneda 💲. Observaciones ◦.

- **Activo corriente:** caja y bancos · inversiones temporarias · créditos por ventas · otros créditos · bienes de cambio (inventario) · otros activos.
- **Activo no corriente:** créditos por ventas · otros créditos · bienes de cambio · inversiones · bienes de uso (PPE) · propiedades de inversión · activos intangibles · activos biológicos · otros activos.
- **Pasivo corriente y no corriente:** deudas comerciales · préstamos · sueldos y cargas sociales · deudas fiscales · anticipos de clientes · dividendos a pagar · otras deudas · previsiones.
- **Totales:** total activo · total pasivo · patrimonio neto (cuadre Activo = Pasivo + PN).

### 4.3 Estado de Resultados
Form: `IncomeStatementForm` → `incomeStatementDetailsSchema`. Moneda 💲.

Ventas netas · costo de mercadería vendida · resultado por tenencia de bienes de cambio · gastos de comercialización · gastos de administración · otros gastos · resultados de inversiones relacionadas · otros resultados de inversiones · resultados financieros por activos · resultados financieros por pasivos · otros ingresos y egresos · impuesto a las ganancias · resultado de operaciones discontinuadas · resultado por disposición de discontinuadas · resultados extraordinarios. Totales: ventas, resultado bruto, resultado neto.

### 4.4 Impuestos
Form: `TaxGridForm` / `TaxDocumentsForm` → `createTaxDocumentSchema`.
Por cada documento: tipo ✓ (IVA mensual · Ganancias anual · Anticipo Ganancias · Seguridad social / F.931 · Ingresos brutos · otro) · período fiscal ✓ · importe ✓ 💲.

---

## 5. Patrimonio — Bienes y Deudas

### 5.1 Bienes
Form: `RealEstateTable` / `MachineryTable` → `createAssetSchema`.

Comunes: tipo ✓ (inmueble · vehículo · maquinaria · hacienda · otro mueble) · categoría ✓ · descripción ✓ · valor estimado ✓ 💲 · estado de gravamen ✓ (libre / hipotecado / prendado / embargado / otro) · tipo de tenencia ✓ (propio / compartido / arrendado / otro) · % de titularidad ◦.
- **Solo inmuebles:** provincia · ciudad · dirección · hectáreas · referencia catastral · valuación fiscal.
- **Solo muebles/vehículos:** marca · modelo · año · identificador (patente / nº de serie).

### 5.2 Deudas / Pasivos
Form (carpeta bienes) → `createLiabilitySchema`.
Acreedor ✓ · tipo ✓ (préstamo bancario · crédito comercial · leasing · hipoteca · prenda · deuda fiscal · otro) · importe ✓ 💲 · fecha de vencimiento ✓ · tipo de garantía ◦.

---

## 6. Documentos a adjuntar (checklist documental)

Form: `components/producers/DocumentChecklist.tsx`. Cada uno tiene vigencia; al vencer se marca "Vencido".

| Documento | Vigencia | Nota |
|---|---|---|
| Constancia AFIP | 365 días | |
| Inscripción en Rentas (IIBB) | 365 días | |
| DDJJ IVA anual | 365 días | |
| DDJJ Ganancias | 365 días | |
| Formulario 931 | 45 días | **solo si tiene empleados** |
| Resumen bancario | 90 días | |
| Certificación de ingresos | 180 días | |

Además, cada balance / estado de resultados / impuesto / bien admite **documentos de respaldo adjuntos** (`documentIds`), y la carga masiva del **Legajo IA** acepta PDF / imagen / Excel / ZIP para que la IA clasifique y extraiga.

---

## 7. Resumen para checklist al cliente

1. **Identidad:** CUIT, razón social, tipo de persona, actividad, ubicación, contacto.
2. **Perfil:** condición fiscal, datos productivos (hectáreas, cultivos, maquinaria), financieros estimados (ventas, deudas, cheques) y resumen patrimonial.
3. **Por cada empresa:** identidad + carpeta contable completa.
4. **Contable (por período):** balance, estado de resultados, impuestos.
5. **Patrimonio:** bienes (inmuebles, vehículos, maquinaria, hacienda) y deudas.
6. **Documentos:** constancia AFIP, inscripción rentas, DDJJ IVA, DDJJ Ganancias, F.931 (si hay empleados), resumen bancario, certificación de ingresos.
