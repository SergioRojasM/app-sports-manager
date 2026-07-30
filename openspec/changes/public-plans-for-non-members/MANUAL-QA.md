# Pruebas manuales — US-0093 · public-plans-for-non-members

| | |
|---|---|
| **Probado por** | _(tu nombre)_ |
| **Fecha** | |
| **Rama** | `feat/public-plans-for-non-members` |
| **Entorno** | Supabase local (migraciones `20260728000100`, `000200`, `000300` aplicadas) |
| **Navegador / dispositivo** | |

### Resumen (completar al terminar)

| Estado | Cantidad |
|---|---|
| ✅ OK | |
| ❌ Falla | |
| ⚠️ Pasa con reparos | |
| ⏭️ Omitido / No aplica | |
| ⬜ Pendiente | |

**Veredicto:** _(apto para PR / requiere correcciones)_

---

### Cómo registrar

En la columna **Est.** reemplaza `⬜` por: `✅` OK · `❌` falla · `⚠️` pasa con reparos · `⏭️` omitido.
En **Notas** escribe en una línea lo observado. Si el fallo necesita más detalle, pon `→ B1` y descríbelo en [Bugs encontrados](#bugs-encontrados).

**Prioridad:** 🔴 crítico (no verificado automáticamente, aquí es donde puede fallar) · 🟡 confirmación rápida (la capa de datos ya está validada) · 🟢 regresión (no debería haber cambiado).

---

## 0. Preparación

Necesitas **4 sesiones/usuarios** sobre una misma organización (llamémosla ORG-A):

| Rol | Para qué | Usuario usado |
|---|---|---|
| `administrador` de ORG-A | marcar plan público, validar suscripciones | |
| `entrenador` de ORG-A | comprobar que no ve columna ni botón "Adquirir" | |
| `usuario` (atleta miembro) de ORG-A | flujo de miembro + regresión | |
| **usuario sin membresía** en ORG-A | el comprador externo — el caso central | |

Datos previos en ORG-A:

| ⬜ | Dato necesario |
|---|---|
| ⬜ | Un plan **activo** con ≥ **2 subtipos activos** con precios distintos |
| ⬜ | Un subtipo con **servicios asignados**: uno con unidades numéricas y otro con `unidades` nulo → "ilimitado" |
| ⬜ | Al menos un plan **privado** (para comprobar que no se filtra) |
| ⬜ | Al menos un **método de pago activo** (sin esto no se puede completar la compra) |
| ⬜ | Un plan con **subtipo inactivo** |
| ⬜ | Un plan **inactivo** marcado como público |

> ⚠️ Las migraciones están aplicadas **solo en local**. No se han subido a ningún proyecto remoto.

---

## 1. Administración del plan (rol `administrador`)

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 1.1 | Abrir *Planes* → "Nuevo plan" | El check **"Plan público"** aparece desmarcado, con el texto de ayuda debajo | 🔴 | 🟢 | Sin Comentarios|
| 1.2 | Crear el plan con "Plan público" marcado | Se guarda; al reabrir en edición el check sigue marcado | 🔴 | 🟢 | Sin Comentarios|
| 1.3 | Editar un plan y desmarcar "Plan público" | Se guarda; al reabrir aparece desmarcado | 🔴 | 🟢 | Sin Comentarios|
| 1.4 | Duplicar un plan público | El duplicado conserva el valor del check | 🔴 | 🟢 | |
| 1.5 | Ver la tabla de planes | Existe la columna **Visibilidad**, separada de **Estado**, con badge `Público` (turquesa, icono `public`) o `Privado` (gris, icono `lock`) | 🔴 | 🟢 | |
| 1.6 | Revisar la tabla en pantalla angosta / móvil | La tabla scrollea horizontalmente sin romper el layout con la columna extra | 🔴 | 🟢 | |
| 1.7 | Planes preexistentes (creados antes del cambio) | Todos aparecen como **Privado** | 🟡 | 🟢 | |

## 2. La columna Visibilidad es solo del admin

> Punto más frágil del cambio: la columna no se puede gatear con `readOnly`, porque la vista del atleta pasa `readOnly={false}` para poder mostrar "Adquirir". Se usa una prop explícita `showVisibilidad`. Verifica los tres roles.

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 2.1 | Como **atleta miembro**, abrir *Planes* de ORG-A | **No** aparece la columna Visibilidad. Sí aparece el botón "Adquirir" por fila | 🟢 | ⬜ | |
| 2.2 | Como **entrenador**, abrir *Planes* de ORG-A | **No** aparece la columna Visibilidad ni acciones de fila | 🔴 | ⬜ | |

## 3. Botón "Ver planes" en el directorio

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 3.1 | Como **no-miembro**, ir a `/portal/orgs` | Cada tarjeta muestra **"Solicitar acceso"** y debajo **"Ver planes"** | 🔴 | 🟢 | |
| 3.2 | Como **miembro**, ir a `/portal/orgs` | La tarjeta de su organización muestra **"Ingresar"** y **"Ver planes"** | 🔴 | 🟢 | |
| 3.3 | Ver el directorio en móvil | Los dos botones caben y la tarjeta no se deforma | 🔴 | 🟢 | |
| 3.4 | Pulsar "Ver planes" | Abre el modal con el nombre de la organización en el título | 🔴 | 🟢 | |
| 3.5 | Cerrar el modal (botón ✕, clic en el fondo, tecla `Esc`) | Cierra en los tres casos y **el foco vuelve al botón "Ver planes"** | 🔴 | 🟢 | |
| 3.6 | Navegar solo con teclado (Tab / Enter) | Se llega al botón, se abre el modal, y los controles internos son alcanzables con foco visible | 🔴 | 🟢 | |

## 4. Catálogo de planes públicos (modal)

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 4.1 | Abrir el catálogo de ORG-A como no-miembro | Solo se listan los planes **públicos y activos**. El plan privado **no** aparece | 🟡 | 🟢 | |
| 4.2 | Plan inactivo marcado como público | **No** aparece en el catálogo | 🟡 | 🟢 | |
| 4.3 | Contenido de la tarjeta | Nombre, modalidad, chips de disciplina y beneficios | 🔴 | 🟢 | |
| 4.4 | Sección de subtipos **colapsada** | Muestra "N opciones disponibles" y "desde $X" con el precio **más bajo** | 🔴 | 🟢 | |
| 4.5 | Desplegar la sección | Se ven los subtipos **activos** con precio en COP, vigencia en días y los servicios que otorgan | 🔴 | 🟢 | |
| 4.6 | Subtipo inactivo | **No** aparece dentro del desplegable | 🔴 | 🟢 | |
| 4.7 | Servicio con `unidades` nulo | Se muestra como **"ilimitado"**, no como "× null" o "× 0" | 🔴 | 🟢 | |
| 4.8 | Servicio con unidades numéricas | Se muestra como "Nombre × N" | 🔴 | 🟢 | |
| 4.9 | Abrir y cerrar el desplegable con teclado | `<details>` responde a Enter/Espacio; el chevron rota al abrir | 🔴 | 🟢 | |

### 4b. Buscador

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 4.10 | Buscar por **nombre de plan** | Filtra en vivo, sin recargar | 🔴 | ⬜ | |
| 4.11 | Buscar por **nombre de subtipo** | El plan contenedor sigue visible | 🔴 | ⬜ | |
| 4.12 | Buscar por **nombre de servicio** | El plan sigue visible **y su desplegable se abre solo**, para que se vea el servicio que coincidió | 🔴 | ⬜ | |
| 4.13 | Buscar sin tildes ("natacion" con servicio "Natación") y en mayúsculas | Encuentra igual | 🔴 | ⬜ | |
| 4.14 | Limpiar la búsqueda | Los desplegables vuelven a **colapsarse** | 🔴 | ⬜ | |
| 4.15 | Buscar algo inexistente | Estado "no se encontraron planes ni servicios" con acción **"Limpiar búsqueda"**, que funciona | 🔴 | ⬜ | |

### 4c. Estados del modal

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 4.16 | Organización **sin** planes públicos | Mensaje "Esta organización no tiene planes públicos disponibles." | 🔴 | 🟢 | |
| 4.17 | Abrir el modal con la red lenta (throttling en DevTools) | Se ve el estado de carga antes del listado | 🔴 | 🟢 | |
| 4.18 | Forzar error (detener Supabase local o bloquear la petición) | Mensaje de error + botón **"Reintentar"**, y reintentar funciona al restaurar | 🔴 | ⬜ | |

## 5. Adquisición del plan

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 5.1 | Como **no-miembro**, pulsar "Adquirir" | Abre el modal de suscripción existente, paso 1 = selección de subtipo | 🔴 | 🟢 | |
| 5.2 | Completar: subtipo → método de pago → confirmar (sin archivo) | Mensaje de éxito "Solicitud enviada…" dentro del modal de catálogo | 🔴 | 🟢 | |
| 5.3 | Completar **con** comprobante adjunto | Sube sin error — **este era el bug de RLS del bucket**, es el punto a confirmar en UI | 🔴 | 🟢 | |
| 5.4 | Adjuntar un archivo > 5 MB o de tipo no permitido | Se rechaza en cliente con mensaje, no se envía | 🔴 | 🟢 | |
| 5.5 | Intentar adquirir **el mismo plan otra vez** con una solicitud `pendiente` | Bloquea con "Ya tienes una solicitud pendiente para este plan." | 🟡 | 🟢 | |
| 5.6 | Como **administrador** de ORG-A, abrir el catálogo de ORG-A | **No** aparece el botón "Adquirir" | 🔴 | 🟢 | |
| 5.7 | Como **entrenador** de ORG-A, ídem | **No** aparece "Adquirir" | 🔴 | ⬜ | |
| 5.8 | Como **atleta miembro** de ORG-A, abrir el catálogo | **Sí** aparece "Adquirir" y el flujo funciona | 🔴 | 🟢 | |
| 5.9 | Plan retirado a mitad de flujo: abrir el catálogo y, desde otra sesión de admin, desmarcar "Plan público"; luego confirmar la compra | Error legible: *"Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente."* (no el genérico) | 🔴 | ⬜ | |
| 5.10 | Tras comprar, volver a `/portal/orgs` | La tarjeta de ORG-A **sigue** mostrando "Solicitar acceso" — comprar no da membresía | 🟡 | 🟢 | |

## 6. Lado del administrador

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 6.1 | Abrir *Suscripciones* de ORG-A | La suscripción del comprador externo aparece con su nombre/email resueltos | 🟡 | 🟢 | |
| 6.2 | Ver el detalle del pago y el comprobante | El comprobante del comprador **se puede visualizar** | 🔴 | 🟢 | |
| 6.3 | Validar la suscripción y el pago | Cambian de estado igual que para un miembro; se calculan fechas | 🟡 | 🟢 | |
| 6.4 | Ver los servicios de esa suscripción ("Ver servicios") | Unidades correctas; `null` se muestra como ilimitado | 🔴 | 🟢 | |
| 6.5 | Rechazar / editar / eliminar esa suscripción | Funciona igual que con un miembro | 🟡 | 🟢 | |

## 7. Mis Suscripciones (nueva ruta cross-tenant)

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 7.1 | Menú del portal **fuera** de una organización | Aparece **"Mis Suscripciones"** apuntando a `/portal/mis-suscripciones` | 🔴 | 🟢 | |
| 7.2 | Menú **dentro** de una organización como `usuario` | **Ya no** aparece la entrada "Mis Suscripciones" del tenant | 🔴 | 🟢 | |
| 7.3 | Abrir `/portal/orgs/{id}/mis-suscripciones-y-pagos` (enlace viejo) | Redirige a `/portal/mis-suscripciones` | 🟡 | 🟢 | |
| 7.4 | Como comprador externo, abrir la página | Ve su suscripción recién comprada, **con el nombre de la organización** en la tarjeta | 🔴 | 🟢 | |
| 7.5 | Usuario con suscripciones en **2+ organizaciones** | Se listan todas, de más nueva a más vieja, cada una con su organización | 🔴 | ⬜ | |
| 7.6 | Filtro **Organización** | Aparece solo si hay 2+ organizaciones; filtra correctamente | 🔴 | ⬜ | |
| 7.7 | Combinar los 3 filtros (estado suscripción + estado pago + organización) | Lógica **Y**: solo lo que cumple todo | 🔴 | 🟢 | |
| 7.8 | Filtros que no arrojan resultados | Estado "sin resultados" + **"Limpiar filtros"**, que resetea **los tres** | 🔴 | 🟢 | |
| 7.9 | Usuario **sin ninguna** suscripción | Estado vacío con enlace a `/portal/orgs` ("Explorar organizaciones y sus planes"), sin barra de filtros | 🔴 | 🟢 | |
| 7.10 | Subir comprobante desde una tarjeta | Sube al tenant **de esa fila** y se refresca la vista previa | 🔴 | 🟢 | |
| 7.11 | **Re-subir** el comprobante de un pago que ya tenía uno | Reemplaza el archivo — **era un bug preexistente**, confirmar que ahora funciona | 🔴 | 🟢 | |
| 7.12 | Subir comprobantes en dos organizaciones distintas | Cada archivo queda en su ruta; ninguno pisa al otro | 🔴 | ⬜ | |
| 7.13 | Pago en estado `validado` | **No** se ofrece el botón de subir | 🟡 | 🟢 | |
| 7.14 | Abrir la página sin sesión iniciada | Redirige al login | 🟡 | 🟢 | |
| 7.15 | Abrir la página como usuario que solo es admin y nunca compró | Estado vacío, sin errores | 🔴 | 🟢 | |

## 8. Regresión

Las políticas RLS de `planes`, `plan_tipos`, `plan_tipos_servicios`, `planes_disciplina` y `servicios` pasaron de `using (true)` a un predicado real. **8.1 y 8.3 son obligatorias**: crear plan y crear servicio llegaron a romperse con `42501` y se corrigieron en `20260728000300`.

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 8.1 | *Planes* como admin: **crear** un plan | Se crea sin error | 🔴 | 🟢 | |
| 8.1b | *Planes* como admin: editar, duplicar, eliminar | Todo funciona; se ven todos los planes, incluidos los inactivos | 🔴 | 🟢 | |
| 8.2 | *Planes* como atleta y como entrenador | Se ven todos los planes activos de su organización | 🟢 | 🟢 | |
| 8.3 | *Servicios*: **crear** un servicio nuevo | Se crea sin error — mismo bug que 8.1, misma causa | 🔴 | 🟢 | |
| 8.3b | *Servicios*: listado, editar, eliminar | Se listan todos los servicios del tenant | 🟢 | 🟢 | |
| 8.3c | Crear un **subtipo** de plan con servicios asignados | Se guarda el subtipo y sus asignaciones | 🔴 | 🟢 | |
| 8.4 | Asignar servicios a un subtipo existente | El selector muestra los servicios y guarda bien | 🟢 | 🟢 | |
| 8.5 | *Suscripciones* (admin) | Listado completo con planes, subtipos y servicios | 🟢 | 🟢 | |
| 8.6 | Editar restricciones de un entrenamiento por servicio | Los **nombres** de los servicios se ven en el editor | 🟢 | ⬜ | |
| 8.7 | Reservar un entrenamiento con restricción por servicio | Descuenta unidades y muestra el saldo correcto | 🟢 | 🟢 | |
| 8.8 | *Inicio* (dashboard) y *Entrenamientos públicos* | Sin errores; contadores de suscripciones correctos | 🟢 | 🟢 | |

## 9. Seguridad — comprobaciones de humo en UI

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 9.1 | Como no-miembro, abrir el catálogo de una organización cuyos planes son **todos privados** | Estado vacío, no se filtra ningún nombre de plan | 🟡 | 🟢 | |
| 9.2 | Como no-miembro, entrar a `/portal/orgs/{id}/gestion-planes` a mano | Redirige (no hay acceso al tenant) | 🟡 | 🟢 | |
| 9.3 | Marcar público un plan, comprarlo, y luego **desmarcarlo** | El comprador sigue viendo su suscripción con el nombre del plan y de los servicios; el catálogo queda vacío | 🟡 | ⬜ | |

---

## Bugs encontrados

Un bloque por hallazgo. Referencia el `#` de la prueba en la columna Notas como `→ B1`.

### B1 — _(título)_

| | |
|---|---|
| **Prueba** | _(p. ej. 4.12)_ |
| **Severidad** | 🔴 bloqueante / 🟠 mayor / 🟡 menor / 🔵 cosmético |
| **Entorno** | navegador / dispositivo / rol |

**Pasos para reproducir**
1.
2.

**Esperado:**

**Obtenido:**

**Evidencia:** _(captura, error de consola, request fallido)_

---

### B2 — _(título)_

| | |
|---|---|
| **Prueba** | |
| **Severidad** | |
| **Entorno** | |

**Pasos para reproducir**
1.
2.

**Esperado:**

**Obtenido:**

**Evidencia:**

---

## Anexo — ya verificado automáticamente (no requiere repetirse)

Contra el stack local, con JWT reales sobre PostgREST y la API de Storage:

- Lecturas del catálogo para 4 perfiles (admin, entrenador, atleta miembro, no-miembro): los tres roles con membresía ven exactamente el mismo conjunto que antes del cambio (planes, subtipos, asignaciones de servicio, disciplinas y servicios); el no-miembro solo ve los planes públicos **y activos**.
- Inserción de suscripción: no-miembro→plan público **OK**; →plan privado, →plan público inactivo y →`atleta_id` ajeno **rechazados con 42501**; miembro→plan privado propio **OK**.
- Compra completa por API: `suscripciones` (pendiente) → `populate_suscripcion_servicios` → `pagos` (pendiente) → consulta cross-tenant devolviendo organización, plan, pago y unidades.
- Storage tras el arreglo: subida de no-miembro, re-subida (upsert), lectura propia, signed URL y lectura del admin — todas 200; escritura en carpeta ajena rechazada.
- Escrituras con `RETURNING` tras el arreglo de `20260728000300`: crear plan (privado / público / inactivo), actualizar plan, crear subtipo, crear servicio, e inserts de `planes_disciplina` y `plan_tipos_servicios`.
- El comprador no recibe fila en `miembros_tenant`.
- `npx tsc --noEmit` limpio; `npm run lint` en la línea base previa al cambio (34 problemas, todos preexistentes). El repo no define script de tests.

## Anexo — hallazgo abierto (no corregido, decisión pendiente)

Cualquier **miembro activo** de una organización puede leer cualquier archivo bajo `orgs/{tenantId}/`, incluidos **comprobantes de pago e imágenes de formularios de otros atletas**. Viene de la política preexistente `org_member_read` ([20260324000100:85](supabase/migrations/20260324000100_create_org_assets_bucket.sql#L85)), no de este cambio. Si se quiere cubrir en pruebas: iniciar sesión como atleta miembro y pedir la URL del comprobante de otro atleta — hoy responde 200.
