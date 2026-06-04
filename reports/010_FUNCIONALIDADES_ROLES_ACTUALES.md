# Funcionalidades actuales por usuario - AgroCredit IA

Fecha: 2026-06-04

Este documento resume que puede hacer actualmente cada tipo de usuario dentro del sistema y como interactuan entre si. Describe el estado real de la aplicacion al dia de la fecha, no el alcance futuro deseado.

## Roles del sistema

El sistema trabaja con cuatro grupos principales de usuarios:

- Cliente / Productor
- Contador / Estudio contable
- Financista / Entidad solicitante
- Super Admin / Administrador de plataforma

Internamente, los roles principales son:

- `producer`: cliente o productor.
- `accountant` y `accounting_firm_admin`: contador o responsable de estudio contable.
- `bank_user` y `agro_company_user`: entidad financiera, banco, agro, maquinaria o insumos.
- `admin_platform`: super administrador.

## Cliente / Productor

El Cliente o Productor es el titular de la carpeta crediticia. Su funcion principal es tener una cuenta propia, preparar su informacion y controlar quien puede acceder a su carpeta.

### Registro y acceso

Actualmente el registro de Cliente / Productor es simple.

El usuario carga:

- Nombre.
- Email.
- Contrasena.

Al registrarse, el sistema crea automaticamente:

- Usuario de acceso.
- Organizacion minima tipo `system_user`.
- Membresia activa del usuario en esa organizacion.
- Rol `producer`.
- Organizacion por defecto para poder entrar al panel.

Despues del registro, el usuario entra al panel privado sin tener que completar todo el onboarding inicial.

### Panel actual del productor

El panel actual del productor ya no muestra datos ficticios de creditos, montos o solicitudes.

Muestra:

- Estado de cuenta activa.
- Estado de carpeta pendiente.
- Datos basicos de la sesion.
- Rol actual.
- Organizacion asociada.
- Proximos pasos operativos.
- Manual del sistema con preguntas frecuentes.

Las preguntas del manual se abren en un modal explicativo y se pueden cerrar con la X.

### Opciones visibles actuales

Desde el panel, el productor puede ir a:

- Completar configuracion.
- Gestionar contador o autorizaciones.
- Ver solicitudes de financiacion.
- Consultar el manual interno del sistema.

### Autorizaciones

El productor puede acceder a la seccion de autorizaciones.

Esta seccion esta pensada para:

- Revisar solicitudes de acceso.
- Administrar permisos.
- Controlar que entidades pueden ver informacion.
- Trabajar con grants de acceso.
- Manejar invitaciones de acceso cuando corresponda.

El modelo vigente indica que el productor conserva el control sobre su carpeta. El contador puede ayudar a cargar informacion, pero el acceso de terceros debe quedar autorizado y trazado.

### Solicitudes de financiacion

El productor tiene una ruta para solicitudes de financiacion.

La finalidad es que pueda:

- Crear o revisar solicitudes.
- Relacionar solicitudes con su organizacion.
- Trabajar con entidades financieras o comerciales.

La experiencia aun depende de que exista informacion real cargada en la carpeta y de que las entidades tengan los permisos correspondientes.

### Pendientes importantes del productor

Aunque el acceso simple ya funciona, todavia falta cerrar una experiencia completa para:

- Completar perfil propio desde el panel del productor.
- Elegir contador desde un flujo dedicado y claro.
- Ver estado real de carpeta con datos cargados.
- Ver solicitudes reales sin depender de pantallas base.
- Mostrar alertas reales y no contenido estatico.

## Contador / Estudio contable

El Contador o Estudio contable es el usuario que administra informacion de clientes y empresas relacionadas. Su rol principal es cargar, ordenar y mantener la carpeta contable y documental.

### Registro y habilitacion

El contador puede registrarse como estudio contable.

El flujo completo de onboarding de contador crea:

- Usuario de acceso.
- Organizacion tipo `accounting_firm`.
- Membresia del usuario como contador.
- Rol `accountant`.
- Estado inicial `pending_approval`.

El estudio contable requiere habilitacion de plataforma antes de operar plenamente.

Mientras el estudio esta pendiente, el contador ve una pantalla de revision donde se informa que la plataforma debe validar el estudio.

### Panel del contador

El panel del contador permite entrar al modulo de gestion de clientes.

Desde el panel puede:

- Ver acceso a clientes.
- Crear nuevo cliente.
- Entrar a la lista de clientes.
- Ver estado general de gestion de carpetas.

### Gestion de clientes

El contador tiene una seccion de clientes.

Desde alli puede:

- Listar clientes asignados al estudio.
- Buscar clientes por nombre o CUIT.
- Alternar vista lista o grilla.
- Crear un nuevo cliente desde un dialogo.
- Entrar al detalle de un cliente.

Cuando el contador crea un cliente desde su panel, el backend valida la sesion del contador y deriva el estudio contable desde su organizacion por defecto. Esto evita que el cliente pueda ser creado para un estudio arbitrario enviado desde el navegador.

### Detalle de cliente

En el detalle de un cliente, el contador puede ver:

- Razon social.
- CUIT.
- Actividad.
- Provincia.
- Ciudad.
- Domicilio.
- Telefono.
- Email.
- Estado de carpeta.

Tambien puede:

- Ver empresas relacionadas.
- Crear nuevas empresas relacionadas.
- Entrar a la carpeta de una empresa o persona.
- Compartir carpeta con financista mediante invitacion de acceso.

### Empresas relacionadas

El sistema permite que un cliente tenga empresas hijas o entidades fiscales relacionadas.

El contador puede:

- Crear una empresa relacionada.
- Cargar razon social.
- Cargar CUIT.
- Cargar actividad.
- Cargar provincia y ciudad.
- Cargar titulares en texto libre.
- Entrar a la carpeta propia de esa empresa.

Esto permite separar informacion de la persona principal y de empresas vinculadas.

### Carpeta contable

El contador puede trabajar sobre carpetas contables de clientes y empresas.

Actualmente existen modulos para:

- Periodos contables.
- Balance.
- Estado de resultados.
- Impuestos.
- Documentos.
- Bienes.
- Pasivos.
- Perfil extendido del productor.
- Checklist documental.

Tambien existe selector de entidad para trabajar sobre la declaracion personal o empresas hijas.

### Carga de Estados Contables con OCR/IA

El sistema ya tiene una primera version para importar estados contables.

El contador puede usar el flujo de importacion para:

- Subir PDF, imagen o Excel.
- Ejecutar extraccion mediante provider configurado.
- Crear un borrador en `financial_statement_imports`.
- Revisar una previsualizacion editable.
- Aplicar datos a balance y estado de resultados.

En produccion queda pendiente configurar proveedor real de IA si corresponde.

### Invitaciones y acceso por link

El contador puede iniciar invitaciones de acceso para compartir una carpeta con una entidad.

El sistema contempla:

- Link de invitacion.
- Token hasheado.
- Aprobacion.
- Reemision segura.
- Revocacion.
- Creacion de grant de acceso.
- Vista read-only para la entidad.

Segun el modelo, si el contador inicia un acceso, puede requerir aprobacion del titular de la carpeta.

### Pendientes importantes del contador

Aunque el modulo del contador es el mas avanzado, quedan pendientes:

- Integrar mejor los vinculos pendientes en el dashboard real del contador.
- Pulir la gestion de permisos y autorizaciones desde la experiencia diaria.
- Reemplazar cualquier pantalla con datos estaticos por datos reales.
- Consolidar textos legacy que aun usan "productor" en rutas internas por compatibilidad.

## Financista / Entidad solicitante

El Financista o Entidad solicitante representa bancos, financieras, empresas agro, maquinaria o insumos. Su funcion principal es pedir acceso a carpetas y evaluar informacion autorizada.

### Registro y acceso

El flujo completo de entidad crea:

- Usuario de acceso.
- Organizacion tipo `requesting_entity`.
- Subtipo de entidad.
- Membresia activa.
- Rol `bank_user`.
- Organizacion por defecto.

Los subtipos contemplados son:

- Banco.
- Financiera.
- Empresa agro.
- Maquinaria agricola.
- Insumos agricolas.

### Panel de entidad

La entidad tiene dashboard propio en `/app/entidad`.

El menu privado le permite acceder a:

- Dashboard.
- Solicitudes.
- Accesos.
- Riesgo.
- Reportes.
- Configuracion.

Algunas entradas pueden ser pantallas base o accesos preparados para evolucionar.

### Solicitudes de acceso

La entidad puede ir a la seccion de accesos.

Desde alli puede:

- Crear una nueva solicitud de acceso.
- Ver solicitudes creadas.
- Ver grants activos.
- Ver historial de grants.
- Consultar estados pendientes.

Las solicitudes se vinculan a una organizacion destino y a scopes o alcances de informacion.

### Scopes de acceso

El sistema contempla permisos por alcance.

Los scopes principales son:

- Perfil basico.
- Resumen contable.
- Balances.
- Estados de resultados.
- Impuestos.
- Bienes.
- Pasivos.
- Documentos.
- Carpeta completa.

Esto permite que una entidad no vea todo por defecto, sino solamente lo autorizado.

### Vista read-only de carpeta

La entidad puede acceder a una carpeta autorizada mediante la ruta de carpeta por organizacion destino.

La carpeta read-only muestra informacion segun grant activo.

Actualmente contempla:

- Banner de estado de grant.
- Bloqueo si no hay grant o esta vencido.
- Tabs por seccion.
- Resumen.
- Balance.
- Estado de resultados.
- Impuestos.
- Patrimonio.
- Documentos.

Cada tab se protege con `ScopeGuard`, por lo que la entidad solo puede ver secciones si el grant incluye el scope correspondiente.

### Financiamiento

La entidad tiene una seccion de financiacion.

Esta seccion esta pensada para:

- Gestionar solicitudes de financiacion.
- Revisar pedidos.
- Relacionar solicitudes con carpetas autorizadas.

La operacion completa depende de los datos de carpeta y de los grants existentes.

### Pendientes importantes de entidad

Queda pendiente completar o pulir:

- Vista final de riesgo y reportes.
- Flujo integral de evaluacion crediticia.
- Acciones sobre solicitudes con estados productivos completos.
- Listado completo de documentos en vista read-only.
- Resumen de patrimonio y pasivos en vista read-only.

## Super Admin / Administrador de plataforma

El Super Admin administra la plataforma y controla aspectos transversales de seguridad, estudios contables, organizaciones y auditoria.

### Creacion de super admin

Existe un flujo de bootstrap para crear un administrador inicial mediante clave de configuracion.

El super admin queda con rol:

- `admin_platform`.

### Dashboard admin

El admin tiene un dashboard en `/app/admin`.

Actualmente muestra estado general del sistema y accesos. Parte del contenido visible del dashboard admin puede ser contenido base o estatico de interfaz, por lo que no debe interpretarse todo como dato real productivo.

### Gestion de estudios contables

El admin tiene una seccion de estudios.

Desde alli puede:

- Listar estudios contables.
- Filtrar por pendientes, habilitados, rechazados o todos.
- Aprobar estudios pendientes.
- Rechazar estudios pendientes.
- Reactivar estudios rechazados.

Cuando aprueba un estudio:

- Cambia el estado de la organizacion a `active`.
- Actualiza claims de miembros con `orgStatus: active`.
- Registra auditoria.

Cuando rechaza:

- Cambia el estado correspondiente.
- Actualiza claims.
- Registra auditoria.

### Organizaciones

El admin tiene una seccion de organizaciones.

Esta seccion permite visualizar organizaciones del sistema segun el modelo vigente y sirve como punto de administracion general.

### Auditoria

El admin tiene una seccion de auditoria.

La auditoria intenta cargar logs reales desde el servicio correspondiente.

Si no hay logs o falla la carga, la pantalla incluye registros fallback de demostracion. Por eso esta pantalla todavia debe revisarse antes de considerarla 100% productiva en datos visibles.

La finalidad del modulo es:

- Ver actividad reciente.
- Revisar acciones realizadas.
- Consultar usuario, accion, IP o ubicacion, y timestamp.
- Tener trazabilidad de eventos sensibles.

### Control transversal

El admin puede acceder a rutas o pantallas que comparten componentes con otros roles, como accesos o auditoria, siempre bajo `RoleGate`.

Su funcion principal es:

- Habilitar actores.
- Controlar organizaciones.
- Ver auditoria.
- Mantener trazabilidad.
- Supervisar el correcto uso de permisos.

### Pendientes importantes de admin

Queda pendiente:

- Reemplazar metricas estaticas del dashboard admin por metricas reales.
- Revisar y eliminar fallbacks demo visibles en auditoria cuando exista data real.
- Completar reportes operativos.
- Consolidar administracion avanzada de usuarios y organizaciones.

## Interacciones entre usuarios

### Cliente / Productor con Contador

El cliente necesita un contador para mantener su carpeta contable completa.

La interaccion esperada es:

1. El cliente se registra.
2. El cliente elige o confirma un contador.
3. El contador acepta o queda vinculado mediante `producer_accountant_links`.
4. El contador carga informacion contable y documental.
5. El cliente conserva el control de autorizaciones hacia terceros.

Actualmente el contador tambien puede crear clientes desde su panel. En ese caso el sistema crea el vinculo activo entre el estudio y el cliente.

### Contador con Empresas del Cliente

El contador puede crear empresas relacionadas al cliente.

Esto permite:

- Separar persona principal y empresas hijas.
- Trabajar carpetas por entidad.
- Cargar balance, resultados, impuestos, bienes y documentos por empresa.
- Mantener relacion con el cliente raiz.

### Cliente / Productor con Financista

El cliente o productor autoriza acceso a su carpeta.

El financista no deberia ver informacion si no existe:

- Solicitud aprobada.
- Invitacion aceptada.
- Grant activo.
- Scope suficiente.
- Grant no vencido.

### Contador con Financista

El contador puede preparar la informacion y puede iniciar invitaciones de acceso.

La interaccion esperada es:

1. El contador mantiene la carpeta.
2. El contador puede compartir o invitar a una entidad.
3. El acceso puede requerir aprobacion del cliente.
4. La entidad accede en modo lectura a lo autorizado.

El contador no reemplaza la autorizacion del titular frente a terceros cuando el flujo exige aprobacion.

### Financista con Carpeta

El financista solicita o acepta acceso.

Despues puede:

- Ver resumen si tiene scope.
- Ver balance si tiene scope.
- Ver resultados si tiene scope.
- Ver impuestos si tiene scope.
- Ver documentos si tiene scope.
- Consultar carpeta mientras el grant este vigente.

No deberia poder modificar la carpeta contable del cliente.

### Super Admin con Contador

El super admin habilita o rechaza estudios contables.

Esta interaccion es importante porque el sistema busca que solo estudios verificados puedan operar plenamente.

### Super Admin con Plataforma

El super admin supervisa:

- Usuarios.
- Organizaciones.
- Estudios.
- Auditoria.
- Seguridad operativa.
- Trazabilidad de acciones.

## Estado de datos reales y datos base

Actualmente hay una diferencia importante entre:

- Funcionalidades ya conectadas a APIs y Firestore.
- Pantallas base con datos estaticos o fallback.

Ya estan mas conectados a datos reales:

- Registro simple de productor.
- Onboarding de contador y entidad.
- Alta de clientes desde contador.
- Listado de clientes por API del contador.
- Empresas relacionadas.
- Perfil extendido.
- Carpeta contable.
- OCR/IA de estados contables.
- Invitaciones de acceso.
- Vista read-only por grant.
- Aprobacion de estudios por admin.

Todavia pueden contener informacion base, demo o fallback:

- Dashboard admin.
- Algunos indicadores de auditoria.
- Algunos accesos de menu de entidad como riesgo, reportes o configuracion.
- Flujo visual final del productor para completar datos y elegir contador.

## Resumen operativo

El sistema ya permite una interaccion central:

1. El cliente/productor existe como titular de carpeta.
2. El contador puede cargar y mantener informacion del cliente.
3. La entidad puede solicitar o recibir acceso controlado.
4. El super admin habilita estudios y audita la plataforma.

El mayor avance funcional actual esta en el lado contador, carpeta contable, invitaciones/accesos y control admin de estudios.

El principal pendiente de experiencia es completar el camino guiado del productor despues del registro simple: completar perfil, elegir contador y ver el estado real de su carpeta.
