# Propuesta de tableros de control BI

## 1. Objetivo y alcance

Esta propuesta convierte las tablas operativas actuales de Sports Manager en indicadores para la toma de decisiones. El principio rector es que cada métrica se calcule dentro de un `tenant_id`, con una definición única y trazable a las tablas de origen.

Los tableros propuestos cubren tres audiencias:

- **Administración del tenant:** ingresos, recaudo, planes, suscripciones y salud de la comunidad.
- **Operación deportiva:** programación, reservas, ocupación, asistencia, escenarios, disciplinas y entrenadores.
- **Dirección de producto/negocio:** comportamiento de planes, servicios, marketplace público, retención y calidad de los datos.

La propuesta considera la totalidad de las tablas relacionales existentes. Algunas son fuentes de métricas directas; otras son dimensiones, configuración o trazabilidad que enriquecen los cortes de análisis.

> **Convención importante:** el sistema identifica entrenamientos publicados mediante `entrenamientos_publicos`. Por tanto, en esta propuesta "público" equivale a **publicado en el marketplace** y "no público" a un entrenamiento interno/no publicado. No debe etiquetarse automáticamente como "privado" hasta validar que ese sea el término de negocio definitivo.

## 2. Inventario analítico de las tablas

| Dominio | Tablas | Uso en BI |
| --- | --- | --- |
| Organización y personas | `tenants`, `usuarios`, `roles`, `miembros_tenant`, `perfil_deportivo`, `admin_tenants` | Dimensiones de organización, atleta y rol. Base de miembros, altas, estado y segmentación básica. |
| Equipo y ciclo de vida | `miembros_tenant_solicitudes`, `miembros_tenant_bloqueados`, `miembros_tenant_novedades`, `tenant_reglas_suspension`, `invitaciones_tenant`, `invitaciones_tenant_envios`, `altas_administradas_tenant` | Embudo de acceso, mora, suspensión, activaciones y gestión administrativa. |
| Catálogo y capacidad | `disciplinas`, `escenarios`, `horarios_escenarios`, `nivel_disciplina`, `usuario_nivel_disciplina` | Cortes por disciplina, sede/escenario, nivel y disponibilidad teórica. |
| Planeación de entrenamientos | `entrenamientos_grupo`, `entrenamientos_grupo_reglas`, `entrenamientos`, `entrenamiento_grupo_categorias`, `entrenamiento_categorias`, `entrenamiento_restricciones`, `entrenamiento_grupo_restricciones`, `responsabilidades`, `responsables` | Sesiones programadas, recurrencia, cupo, duración, categoría/nivel, restricciones y responsables. |
| Planes y servicios | `planes`, `planes_disciplina`, `plan_tipos`, `servicios`, `plan_tipos_servicios` | Catálogo comercial, precio vigente por tipo, beneficios por servicio y cobertura por disciplina. |
| Venta y suscripción | `suscripciones`, `suscripcion_servicios`, `pagos`, `tenant_metodos_pago` | Hechos de suscripción, recaudo, método de pago, vigencia y saldo de unidades de servicio. |
| Uso del servicio | `reservas`, `reserva_servicios`, `asistencias`, `reservas_reporte_view` | Hechos de reserva, cancelación, consumo de servicios y asistencia. La vista existente es útil para exportación y validación, no como única capa BI. |
| Marketplace y formularios | `entrenamientos_publicos`, `formularios_plantillas`, `formulario_plantilla_esquema`, `formulario_respuestas` | Clasificación de oferta pública y seguimiento del cumplimiento de formularios. |
| Comunicación | `notificaciones` | Volumen de notificaciones y, si se dispone de tipo/fecha, monitoreo operativo. No permite medir lectura o conversión sin eventos adicionales. |

Las tablas de reglas, restricciones, horarios, responsabilidades, plantillas y configuración no deben sumarse como transacciones. Deben servir para explicar el contexto de capacidad, elegibilidad, cobertura del servicio y cumplimiento operativo.

## 3. Modelo semántico recomendado

### 3.1 Hechos y granularidad

| Hecho lógico | Grano | Fuente primaria | Observaciones |
| --- | --- | --- | --- |
| Pago | Un registro por pago | `pagos` | El valor monetario es `monto`; debe usarse la fecha de pago/validación acordada por negocio. |
| Suscripción | Una suscripción de atleta a plan/tipo | `suscripciones` | Relaciona atleta, plan, tipo, vigencia y estado. Puede haber varias por atleta. |
| Reserva | Un atleta reservado en una sesión | `reservas` | Incluye estado, creación, cancelación y `suscripcion_id`. |
| Consumo de servicio | Un servicio descontado por reserva | `reserva_servicios` | Permite consumo multi-servicio; no sumar reservas después de unirla sin usar `count distinct reserva_id`. |
| Asistencia | Una validación por reserva | `asistencias` | `asistio` determina presencia efectiva. |
| Sesión | Un entrenamiento con fecha/hora | `entrenamientos` | Fuente de cupo, duración, disciplina, escenario, entrenador y estado. |
| Oferta pública | Una publicación por entrenamiento | `entrenamientos_publicos` | Aporta precio publicado, publicación, activo y atributos del marketplace. |
| Evento de miembro | Una novedad o movimiento administrativo | `miembros_tenant_novedades`, solicitudes, invitaciones y altas | Fuente para alertas y embudo; no sustituye una tabla histórica de estado. |

### 3.2 Dimensiones compartidas

- **Fecha:** derivada de `pagos.fecha_pago`, `suscripciones.fecha_inicio` y `fecha_fin`, `reservas.fecha_reserva`, `reservas.fecha_cancelacion`, `entrenamientos.fecha_hora`, `asistencias.fecha_asistencia` y los respectivos `created_at`.
- **Tenant:** `tenants`; es un filtro obligatorio en todas las vistas y tableros.
- **Atleta/usuario:** `usuarios`, complementada por `miembros_tenant`, rol y `perfil_deportivo`. Se recomienda minimizar PII en vistas de agregados.
- **Oferta deportiva:** disciplina, nivel/categoría, escenario, entrenamiento, grupo, entrenador, tipo de origen y publicación pública.
- **Oferta comercial:** plan, tipo de plan, servicio, método de pago y estado del pago/suscripción.

### 3.3 Vistas o tablas de hechos sugeridas

Crear vistas seguras o tablas materializadas refrescadas diariamente, siempre filtrables por `tenant_id`:

1. `bi.fct_pagos`: pago, suscripción, atleta, plan, tipo de plan, método de pago y fecha analítica.
2. `bi.fct_reservas`: reserva, entrenamiento, disciplina, escenario, entrenador, atleta, estado, fecha de reserva/cancelación y bandera `es_publico` basada en la existencia de `entrenamientos_publicos`.
3. `bi.fct_asistencia`: una fila por reserva con bandera de asistencia, fecha de sesión y dimensiones de la oferta.
4. `bi.fct_consumo_servicios`: una fila por `reserva_servicios`, con servicio, suscripción y unidades consumidas.
5. `bi.fct_suscripciones_diarias`: snapshot diario de suscripciones y saldo de servicios para métricas de vigencia, expiración y capacidad comercial.
6. `bi.dim_miembro`: estado actual del miembro, rol y atributos de usuario. Para tendencias de estados se necesita una instantánea diaria.

## 4. Reglas transversales de cálculo

Estas reglas deben implementarse una sola vez en la capa semántica, no reinterpretarse por visual.

| Concepto | Definición propuesta |
| --- | --- |
| Ingreso recaudado | `sum(pagos.monto)` solo de pagos en estado final aprobado/validado definido por negocio. No incluir pendientes ni rechazados. |
| Ingreso solicitado | `sum(pagos.monto)` de pagos pendientes más aprobados; sirve para cartera/pipeline, no para recaudo. |
| Reserva válida | Reserva cuyo estado no es `cancelada`. Para sesiones pasadas, reportar adicionalmente `completada` cuando el flujo lo use. |
| Reserva cancelada | `reservas.estado = 'cancelada'`; fecha de referencia: `fecha_cancelacion`. |
| Cupos ofertados | `sum(entrenamientos.cupo_maximo)` de sesiones no canceladas con cupo definido. Los cupos nulos deben quedar como "sin cupo definido", no como cero. |
| Ocupación de reservas | $\frac{\text{reservas válidas}}{\text{cupos ofertados}} \times 100$. Se calcula por sesión primero y luego se pondera por cupo. |
| Tasa de asistencia | $\frac{\text{asistencias con asistio = true}}{\text{asistencias registradas}} \times 100$. Mostrar cobertura de registro para no confundir ausencia de dato con inasistencia. |
| No-show | $\frac{\text{asistencias con asistio = false}}{\text{asistencias registradas}} \times 100$. |
| Miembro activo | `miembros_tenant.estado = 'activo'`, separado de usuario activo y de suscripción activa. |
| Suscripción vigente | `estado = 'activa'` y fecha de corte dentro de `fecha_inicio`/`fecha_fin`, si las fechas están informadas. Esta regla debe validarse frente al cron de vencimiento. |
| Atleta con suscripción activa | Miembro/atleta con al menos una suscripción vigente en el tenant. Usar `count distinct atleta_id`. |
| Público | El entrenamiento tiene un registro en `entrenamientos_publicos`; usar `activo` para distinguir publicado activo, inactivo o histórico. |

## 5. Tablero 1: Resumen ejecutivo del tenant

**Propósito:** dar en una vista la salud comercial, operativa y de comunidad del período seleccionado.

**Indicadores principales**

- Ingreso recaudado del período, variación contra período anterior e ingreso acumulado del año.
- Pagos pendientes de validación y su monto asociado.
- Suscripciones vigentes, nuevas, vencidas y canceladas.
- Miembros activos, en mora, suspendidos, inactivos y pendientes de activación.
- Reservas válidas, cancelaciones, ocupación promedio y tasa de asistencia.
- Próximas sesiones con ocupación superior al 80% y sesiones sin cupo definido.

**Visualizaciones**

- Tarjetas de KPI con comparación mensual y acumulado anual.
- Serie mensual de ingreso recaudado y reservas válidas.
- Semáforo de alertas: pagos pendientes, suscripciones por vencer, miembros en mora/suspensión y sesiones con baja ocupación.
- Distribución de miembros por estado y de suscripciones por estado.

**Fuentes:** `pagos`, `suscripciones`, `miembros_tenant`, `miembros_tenant_novedades`, `reservas`, `asistencias`, `entrenamientos` y `tenants`.

## 6. Tablero 2: Ingresos, recaudo y cartera

**Propósito:** entender cuánto se recauda, de dónde procede y qué dinero aún requiere gestión.

### KPIs y cortes

| Indicador | Cálculo / lectura | Cortes disponibles |
| --- | --- | --- |
| Ingreso recaudado | Suma de `pagos.monto` aprobados | Día, semana, mes, trimestre, año, tenant |
| Ingreso acumulado anual | Suma acumulada del ingreso recaudado desde el 1 de enero | Mes, año |
| Ingresos por plan y tipo | Pagos unidos a `suscripciones`, `planes` y `plan_tipos` | Plan, tipo, disciplina cubierta |
| Ingreso por método de pago | Pagos por `metodo_pago_id` y `tenant_metodos_pago` | Método, período |
| Cartera pendiente | Monto y número de pagos no finalizados | Antigüedad, método, plan, atleta responsable solo en detalle autorizado |
| Ticket promedio | Ingreso recaudado / número de pagos aprobados | Plan, tipo, método, período |
| Top atletas por ingreso | Suma de pagos aprobados por atleta | Período, plan, tipo |
| Ingreso asociado a entrenamiento público | Pagos de suscripciones creadas para reservas de entrenamientos con publicación pública | Público/no público, disciplina, entrenamiento |

**Visualizaciones recomendadas**

- Tendencia mensual con línea de acumulado anual y comparación contra año anterior cuando exista historia.
- Barras apiladas de ingreso por plan y tipo de plan.
- Pareto de atletas por ingreso, con el detalle restringido a roles autorizados.
- Tabla de cartera pendiente: fecha de creación, antigüedad, monto, método, plan/tipo y estado.
- Matriz plan x método de pago con monto, cantidad de pagos y ticket promedio.

**Nota de atribución público/no público:** los pagos están ligados a la suscripción, no directamente al entrenamiento. Una suscripción puede tener más de una reserva; por ello esta atribución debe presentarse como "ingreso asociado a compra para una reserva" y evitar sumarla como ingreso por cada entrenamiento. Para ingreso exacto por sesión se necesita un pago o una línea de venta directamente relacionada con la reserva.

**Fuentes:** `pagos`, `suscripciones`, `planes`, `plan_tipos`, `tenant_metodos_pago`, `reservas`, `entrenamientos`, `entrenamientos_publicos`, `usuarios`.

## 7. Tablero 3: Operación, ocupación y reservas

**Propósito:** optimizar la programación de sesiones, la capacidad y el uso de escenarios.

### KPIs y cortes

- Entrenamientos programados, realizados, cancelados y pendientes por fecha de sesión.
- Cupos ofertados, reservas válidas, cupos disponibles y tasa de ocupación promedio ponderada.
- Tasa de cancelación: $\frac{\text{reservas canceladas}}{\text{reservas creadas}} \times 100$.
- Reservas por disciplina, escenario, entrenador, día de la semana, franja horaria, nivel/categoría y origen de creación.
- Top entrenamientos, disciplinas, escenarios y atletas por cantidad de reservas válidas.
- Antelación de reserva: diferencia entre `fecha_reserva` y `entrenamientos.fecha_hora`.
- Sesiones completas, sesiones con menos del 40% de ocupación y sesiones sin cupo definido.
- Utilización de escenarios: horas de entrenamientos programados / horas disponibles en `horarios_escenarios`. Debe excluirse o marcarse como no calculable si faltan horarios.

**Visualizaciones recomendadas**

- Calendario/heatmap de ocupación por día de semana y franja horaria.
- Tabla de sesiones próximas ordenada por porcentaje de ocupación, cupos restantes y cancelaciones.
- Barras de reservas y ocupación por disciplina y escenario.
- Histograma de antelación de reserva y embudo reserva creada -> confirmada/completada -> asistencia.
- Mapa de calor escenario x hora para decidir expansión, reducción o reprogramación.

**Fuentes:** `entrenamientos`, `entrenamientos_grupo`, `entrenamientos_grupo_reglas`, `reservas`, `escenarios`, `horarios_escenarios`, `disciplinas`, `entrenamiento_categorias`, `nivel_disciplina`, `usuarios`, `entrenamientos_publicos`.

## 8. Tablero 4: Asistencia, compromiso y desempeño deportivo

**Propósito:** medir uso efectivo, identificar riesgo de deserción y apoyar la gestión de entrenadores.

**Indicadores principales**

- Asistencias confirmadas, ausencias/no-show y cobertura de validación de asistencia.
- Tasa de asistencia por disciplina, entrenador, escenario, categoría/nivel, sesión y atleta.
- Atletas con más asistencias, más reservas, más cancelaciones y mayor proporción de no-show.
- Tendencia semanal/mensual de asistencias y atletas activos por uso: atletas con al menos una asistencia en el período.
- Cohorte de primera asistencia: porcentaje que vuelve a asistir a 7, 30, 60 y 90 días.
- Alerta de riesgo: atleta con suscripción vigente y cero reservas o asistencias en los últimos 30 días; el umbral debe ser configurable.
- Cumplimiento de registro: sesiones pasadas con reservas pero sin registro de asistencia.

**Visualizaciones recomendadas**

- Embudo de uso: reserva válida -> asistencia registrada -> asistió.
- Ranking con filtros de período y disciplina; ocultar identidad completa si el perfil no está autorizado.
- Matriz entrenador x disciplina con reservas, asistencia, no-show y cobertura de registro.
- Cohortes mensuales de primera asistencia y curva de retorno.

**Fuentes:** `asistencias`, `reservas`, `entrenamientos`, `disciplinas`, `entrenamiento_categorias`, `nivel_disciplina`, `usuarios`, `suscripciones`, `miembros_tenant`.

## 9. Tablero 5: Equipo, miembros y ciclo de vida

**Propósito:** administrar la comunidad del tenant y priorizar acciones sobre altas, activaciones, mora y suspensión.

### Indicadores principales

- Total de miembros por rol y estado: activo, mora, suspendido, inactivo y pendiente de activación.
- Atletas activos, atletas con suscripción vigente y atletas miembros sin suscripción vigente.
- Nuevos miembros por período y tasa de activación de invitaciones/altas administradas.
- Solicitudes de ingreso por estado y tiempo medio de resolución.
- Invitaciones enviadas, expiradas, aceptadas/canjeadas si el estado disponible lo permite, y número de reenvíos.
- Novedades de miembros por tipo: falta de pago, inasistencias acumuladas, suspensión manual, reactivación y activación de cuenta.
- Miembros bloqueados y motivo/fecha de bloqueo cuando corresponda.
- Perfil deportivo completo/incompleto, únicamente como indicador de preparación operativa; no exponer peso o altura en tableros agregados.

**Segmentaciones**

- Rol, disciplina/nivel asignado, antigüedad de miembro, estado actual, plan/tipo de plan vigente y actividad reciente.
- Lista de acción: miembros activos sin suscripción, suscripciones por vencer, morosos, suspendidos y pendientes de activación.

**Fuentes:** `miembros_tenant`, `roles`, `usuarios`, `suscripciones`, `perfil_deportivo`, `miembros_tenant_solicitudes`, `miembros_tenant_bloqueados`, `miembros_tenant_novedades`, `invitaciones_tenant`, `invitaciones_tenant_envios`, `altas_administradas_tenant`, `usuario_nivel_disciplina`.

**Limitación temporal:** `miembros_tenant` guarda el estado actual. Para medir históricamente "miembros activos al cierre de cada mes" se requiere un snapshot diario/mensual o un historial de cambios de estado completo. Las novedades ayudan a explicar movimientos, pero no reemplazan ese snapshot.

## 10. Tablero 6: Suscripciones, planes y retención

**Propósito:** evaluar la propuesta comercial, la vigencia de las suscripciones y la continuidad de los atletas.

**Indicadores principales**

- Suscripciones nuevas, vigentes, vencidas, canceladas y pendientes por período.
- Atletas con suscripción vigente por plan, tipo de plan, disciplina cubierta y servicio incluido.
- Distribución de vigencia restante: vence en 7, 15 y 30 días; vencidas recientemente.
- Renovaciones: atleta que inicia una suscripción nueva dentro de una ventana definida después de terminar la anterior. La ventana recomendada es 30 días y debe ser configurable.
- Tasa de renovación: $\frac{\text{atletas renovados}}{\text{atletas con suscripción que venció}} \times 100$.
- Churn de suscripción: atletas que vencieron/cancelaron y no renovaron dentro de la ventana.
- Uso de clases/unidades: saldo inicial, saldo restante y porcentaje consumido por `suscripcion_servicios`; identificar saldos próximos a agotarse.
- Planes/tipos con mayor adquisición, mayor ingreso, mayor uso y menor renovación.

**Visualizaciones recomendadas**

- Embudo solicitud/pendiente -> pago aprobado -> suscripción activa -> primera reserva -> primera asistencia.
- Cohortes de suscripción por mes de inicio y retención a 30/60/90 días.
- Barras de suscripciones vigentes por plan/tipo y tabla de expiraciones próximas.
- Dispersión de consumo de servicios: porcentaje consumido versus días transcurridos de vigencia.

**Fuentes:** `suscripciones`, `pagos`, `planes`, `plan_tipos`, `planes_disciplina`, `plan_tipos_servicios`, `suscripcion_servicios`, `reserva_servicios`, `reservas`, `asistencias`, `servicios`.

## 11. Tablero 7: Servicios y utilización de beneficios

**Propósito:** comprobar que el catálogo de servicios ofrecido por los tipos de plan se consume y tiene demanda real.

**Indicadores principales**

- Suscripciones con derecho a cada servicio, unidades incluidas, unidades restantes y unidades consumidas.
- Reservas que consumen cada servicio y atletas usuarios únicos por servicio.
- Tasa de uso de beneficio: $\frac{\text{unidades consumidas}}{\text{unidades incluidas}} \times 100$, solo para servicios con límite numérico.
- Servicios ilimitados: reportar atletas con acceso y reservas asociadas, sin calcular porcentaje de saldo.
- Servicios más usados, subutilizados y vinculados a mayores tasas de renovación o asistencia.
- Cobertura de restricciones: entrenamientos cuyo acceso depende de un servicio y demanda generada por ellos.

**Visualizaciones recomendadas**

- Barras de unidades consumidas/restantes por servicio.
- Matriz tipo de plan x servicio con atletas cubiertos, uso y saldo promedio.
- Lista de atletas con saldos bajos y suscripciones vigentes para acciones de renovación o uso.

**Precaución:** `reserva_servicios` representa el ledger de una reserva. Si una reserva consume varios servicios, las métricas de reservas deben contar `distinct reserva_id`; las de consumo deben contar filas/unidades del ledger.

**Fuentes:** `servicios`, `plan_tipos_servicios`, `suscripcion_servicios`, `reserva_servicios`, `suscripciones`, `plan_tipos`, `reservas`, `entrenamiento_restricciones`, `entrenamiento_grupo_restricciones`.

## 12. Tablero 8: Marketplace público y formularios

**Propósito:** gestionar la oferta expuesta públicamente y su conversión hasta reserva y asistencia.

**Indicadores principales**

- Entrenamientos publicados, activos, inactivos y por publicar, por disciplina y tenant.
- Cupos, reservas válidas, ocupación y cancelaciones de sesiones publicadas.
- Precio publicado, reservas asociadas y recaudo asociado a compra para reserva, con la limitación de atribución descrita en el tablero financiero.
- Rendimiento de la oferta pública por disciplina, escenario, entrenador, fecha/hora y anticipación de reserva.
- Formularios requeridos: reservas que requieren formulario, respuestas recibidas y tasa de completitud.
- Campos requeridos faltantes o perfiles incompletos, usando la respuesta y snapshot de perfil solo como control de calidad, no como exposición de datos sensibles.

**Visualizaciones recomendadas**

- Embudo publicación activa -> reserva -> asistencia.
- Ranking de publicaciones por ocupación y cancelación.
- Calendario de oferta pública con cupos disponibles.
- Tabla de cumplimiento de formularios para seguimiento administrativo.

**Brecha explícita:** no existen eventos de impresión, visita, clic o inicio de checkout. No es posible medir conversión de visitantes del marketplace; solo conversión desde una publicación existente a reserva.

**Fuentes:** `entrenamientos_publicos`, `entrenamientos`, `reservas`, `asistencias`, `pagos`, `suscripciones`, `formularios_plantillas`, `formulario_plantilla_esquema`, `formulario_respuestas`.

## 13. Filtros, navegación y periodicidad

Todos los tableros deben incluir como mínimo: tenant, período, disciplina y clasificación público/no público cuando aplique. Los tableros de operación agregan escenario, entrenador, estado de entrenamiento, nivel/categoría y franja horaria. Los comerciales agregan plan, tipo de plan, servicio, estado de suscripción y método de pago.

La navegación debe permitir pasar de un KPI agregado a una lista operativa filtrada. Ejemplos: desde "pagos pendientes" a los pagos pendientes; desde "ocupación baja" a las sesiones próximas; desde "miembros sin suscripción" a la lista de atletas contactables. La lista detallada debe respetar el rol y RLS del usuario.

| Tablero | Actualización recomendada | Ventana por defecto |
| --- | --- | --- |
| Ejecutivo, ingresos, cartera | Cada hora o al validar un pago | Mes actual y año a la fecha |
| Operación y ocupación | Cada 15 minutos para próximas sesiones; diaria para histórico | Próximos 30 días y últimos 30 días |
| Asistencia, equipo, suscripciones, servicios | Diaria; intradía si la operación lo requiere | Últimos 30/90 días |
| Marketplace y formularios | Cada 15 minutos para cupos; diaria para tendencias | Próximos 60 días y últimos 90 días |

## 14. Brechas y decisiones necesarias antes de implementar

| Necesidad | Situación actual | Propuesta |
| --- | --- | --- |
| Ingreso exacto por entrenamiento | Un pago se asocia a suscripción; una suscripción puede utilizarse en varias reservas. | Crear `ordenes` y `lineas_orden`, o agregar una relación de pago/venta con la reserva cuando el cobro sea por sesión. |
| Rentabilidad y margen | No hay costos de entrenador, escenario, comisiones ni gastos. | Incorporar hechos de costo con fecha, tenant, centro de costo, disciplina/entrenamiento opcional y moneda. |
| Conversión de marketplace | No hay visitas, impresiones, clics o abandono de checkout. | Instrumentar eventos de producto anónimos/pseudonimizados: vista, detalle, inicio de reserva, inicio de pago y compra. |
| Histórico de estados de miembro | Se conserva estado actual y novedades, no una serie completa de vigencias de estado. | Generar snapshot diario o tabla de historial `miembro_estado_historial`. |
| Meta y presupuesto | No hay objetivos comerciales u operativos. | Crear tabla de metas por tenant, período, métrica, dimensión y valor objetivo. |
| Moneda e impuestos | Los importes son numéricos sin dimensión de moneda/impuesto visible. | Definir moneda por tenant y registrar impuestos, descuentos, reembolsos y neto/bruto. |
| Definición final de pago válido | La semántica del estado de pago debe quedar formalizada. | Documentar el/los estados que constituyen recaudo y centralizarlos en `bi.fct_pagos`. |
| Capacidad sin cupo | `cupo_maximo` puede ser nulo. | Obligar cupo en entrenamientos medibles o mostrar explícitamente "sin capacidad definida". |

## 15. Arquitectura, seguridad y calidad de datos

1. Mantener las tablas transaccionales como fuente de verdad y crear un esquema BI con vistas/tables materializadas; no dar acceso del proveedor de visualización a tablas sin control.
2. Incluir `tenant_id` en toda tabla de hechos, aplicar RLS y validar que una consulta nunca cruce tenants.
3. Usar dimensiones con claves estables y preservar el nombre/precio comercial relevante al hecho cuando cambie el catálogo. Para ingresos, el monto de `pagos` es la fuente histórica; para plan/tipo se recomienda almacenar snapshot de nombre si estos pueden renombrarse.
4. Ejecutar controles de calidad diarios: pagos sin suscripción, reservas sin entrenamiento, asistencia sin reserva, reserva cancelada con asistencia, cupos negativos, fechas incoherentes y registros sin tenant.
5. Evitar incluir email, teléfono, identificación, fecha de nacimiento, peso, altura o formularios en tableros generales. Reservar el detalle personal a vistas con permisos de administración.
6. Usar `America/Bogota` como zona operativa predeterminada para agrupar fechas mientras el tenant no tenga una zona horaria configurable. Los `timestamptz` deben convertirse a esa zona antes de calcular día, mes y franja horaria; una fase posterior podrá incorporar la zona IANA del navegador para presentación y límites de período personalizados.

## 16. Priorización de implementación

### Fase 1: valor inmediato

1. Capa `fct_pagos`, `fct_reservas`, `fct_asistencia` y dimensiones de fecha, atleta, oferta y plan.
2. Tablero de ingresos/recaudo y tablero de operación/ocupación.
3. Tablero de equipo con miembros activos, estados y atletas sin suscripción vigente.
4. Validaciones de calidad y definición formal de estados de pago, reserva y suscripción.

### Fase 2: gestión y retención

1. Snapshot diario de suscripciones, servicios y miembros.
2. Tableros de asistencia/compromiso, suscripciones/retención y servicios.
3. Alertas operativas de vencimiento, baja actividad, pagos pendientes y sesiones con ocupación crítica.

### Fase 3: producto y rentabilidad

1. Tablero de marketplace y formularios con instrumentación de eventos.
2. Hechos de ventas por reserva, costos, metas y presupuesto.
3. Margen por disciplina, escenario, entrenador, plan y canal; forecast de demanda y capacidad.

## 17. Criterios de aceptación de BI

La implementación estará lista para uso cuando se cumpla lo siguiente:

- Cada KPI documentado tenga fórmula, estado incluido/excluido, fecha de referencia y dueño de negocio.
- Los totales de ingreso recaudado concilien con `pagos` para un tenant y período de prueba.
- Los conteos de reservas, cancelaciones y asistencias concilien con las tablas operativas sin duplicar por `reserva_servicios` o categorías.
- Toda visual use `tenant_id` y respete los permisos de quien consulta.
- Las métricas de historial se calculen desde snapshots, no desde el estado actual aplicado retroactivamente.
- Los tableros muestren cobertura/calidad cuando un denominador pueda estar incompleto, en especial cupos y asistencia registrada.
