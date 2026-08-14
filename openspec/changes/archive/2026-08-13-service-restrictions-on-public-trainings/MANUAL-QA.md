# Pruebas manuales — US-0094 · service-restrictions-on-public-trainings

| | |
|---|---|
| **Probado por** | _(tu nombre)_ |
| **Fecha** | |
| **Rama** | `feat/service-restrictions-on-public-trainings` |
| **Entorno** | Supabase local (migración `20260729000100` aplicada; depende de US-0093, ya en `develop`) |
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

En **Est.** reemplaza `⬜` por: `✅` OK · `❌` falla · `⚠️` pasa con reparos · `⏭️` omitido.
En **Notas** escribe en una línea lo observado. Si necesita más detalle, pon `→ B1` y descríbelo en [Bugs encontrados](#bugs-encontrados).

**Prioridad:** 🔴 crítico (no verificado automáticamente — UI, interacción, render) · 🟡 confirmación rápida (la capa de datos ya está validada) · 🟢 regresión (no debería haber cambiado).

---

## 0. Preparación

**Usuarios** sobre una misma organización (ORG-A):

| Rol | Para qué | Usuario usado |
|---|---|---|
| `administrador` de ORG-A | publicar, validar suscripciones | |
| `entrenador` de ORG-A | regresión del gate | |
| `usuario` (atleta miembro) de ORG-A | regresión de reserva con servicios | |
| **usuario sin membresía** en ORG-A | el caso central | |

**Datos previos.** Lo más laborioso es tener un entrenamiento por combinación de restricciones; sin ellos la sección 1 no se puede probar.

| ⬜ | Dato necesario |
|---|---|
| ⬜ | **Servicio S** en ORG-A, otorgado por un **plan público activo** (para que el no-miembro pueda comprarlo) |
| ⬜ | Entrenamiento **futuro A**: sin restricciones |
| ⬜ | Entrenamiento **futuro B**: una fila `[servicio = S]` |
| ⬜ | Entrenamiento **futuro C**: dos filas — `[servicio = S]` y `[usuario_estado = activo]` |
| ⬜ | Entrenamiento **futuro D**: una fila `[usuario_estado = activo]` |
| ⬜ | Entrenamiento **futuro E**: una fila `[validar_nivel_disciplina = true]` |
| ⬜ | Entrenamiento **futuro F**: una sola fila con `[servicio = S] + [usuario_estado = activo]` juntos |
| ⬜ | Un entrenamiento ya publicado y **sin** restricciones (regresión) |
| ⬜ | Método de pago activo en ORG-A (para completar la compra del plan) |

> ⚠️ Migración aplicada **solo en local**. No se ha subido a ningún proyecto remoto.

---

## 1. Gate de publicación (rol `administrador`)

Espejo en UI de la tabla de verdad ya verificada contra el trigger. Abre el menú de opciones del entrenamiento y mira la entrada "Publicar".

| # | Entrenamiento | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 1.1 | **A** sin restricciones | "Publicar" **habilitado** | 🔴 | ⬜ | |
| 1.2 | **B** `[servicio]` | "Publicar" **habilitado** — este es el cambio central de la historia | 🔴 | ⬜ | |
| 1.3 | **C** `[servicio]` OR `[usuario_estado]` | "Publicar" **habilitado** (las filas son OR; la de servicio es satisfacible) | 🔴 | ⬜ | |
| 1.4 | **D** `[usuario_estado]` | **Deshabilitado**, con el motivo sobre restricciones que solo cumple un miembro | 🔴 | ⬜ | |
| 1.5 | **E** `[validar_nivel_disciplina]` | **Deshabilitado**, mismo motivo | 🔴 | ⬜ | |
| 1.6 | **F** servicio + `usuario_estado` en la **misma fila** | **Deshabilitado** (dentro de una fila las condiciones son AND) | 🔴 | ⬜ | |
| 1.7 | Cualquiera, entrenamiento **pasado** | Deshabilitado con "No se pueden publicar entrenamientos pasados." (motivo anterior, no el nuevo) | 🔴 | ⬜ | |
| 1.8 | Texto del motivo deshabilitado | Se lee completo dentro del menú, sin desbordar ni cortarse (es más largo que el anterior) | 🔴 | ⬜ | |
| 1.9 | Publicar **B** de verdad | Se crea la publicación sin error | 🔴 | ⬜ | |
| 1.10 | Con **D** abierto en dos sesiones: quitar sus restricciones en una, publicar en la otra sin refrescar | Si el estado quedó obsoleto, el error mostrado es el mensaje legible, **nunca** un error crudo de Postgres | 🔴 | ⬜ | |

## 2. Vista previa del modal de publicación

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 2.1 | Abrir "Publicar" sobre **B** | La tarjeta de vista previa muestra la fila **"Requiere: {nombre de S}"** | 🔴 | ⬜ | |
| 2.2 | Abrir "Publicar" sobre **A** | La vista previa **no** muestra fila de requisitos ni hueco vacío | 🔴 | ⬜ | |
| 2.3 | Entrenamiento con **2+ servicios** requeridos | Nombres distintos, ordenados alfabéticamente, sin repetidos | 🔴 | ⬜ | |

## 3. Marketplace autenticado — visualización

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 3.1 | Como **no-miembro**, abrir `/portal/entrenamientos-publicos` | La tarjeta de **B** muestra "Requiere: {S}" | 🔴 | ⬜ | |
| 3.2 | Tarjeta de un publicado sin restricciones | Sin fila de requisitos; la tarjeta se ve igual que antes | 🔴 | ⬜ | |
| 3.3 | Como **miembro** de ORG-A, misma página | Ve la misma fila de requisitos | 🟡 | ⬜ | |
| 3.4 | Tarjeta destacada (featured) y tarjeta normal | La fila de requisitos se ve bien en ambos tamaños | 🔴 | ⬜ | |
| 3.5 | En móvil | La fila no rompe el layout de la tarjeta | 🔴 | ⬜ | |
| 3.6 | Servicio requerido que **ningún plan público otorga** | El **nombre** igual se muestra (viene de la vista, no de `servicios`) | 🟡 | ⬜ | |

## 4. Marketplace autenticado — buscador

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 4.1 | Buscar por nombre del entrenamiento | Filtra como siempre | 🟢 | ⬜ | |
| 4.2 | Buscar por descripción | Filtra como siempre | 🟢 | ⬜ | |
| 4.3 | Buscar por el **nombre del servicio S** | La sesión **B** aparece en los resultados | 🔴 | ⬜ | |
| 4.4 | Combinar búsqueda por servicio + chip de fecha + organización | Los filtros se combinan (lógica Y) | 🔴 | ⬜ | |
| 4.5 | Limpiar la búsqueda | Vuelve el listado completo | 🟢 | ⬜ | |

## 5. Reserva del no-miembro — el flujo central

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 5.1 | Como no-miembro **sin suscripción**, pulsar "Reservar" en **B** | Aparece el estado de rechazo con el mensaje que **nombra el servicio S** | 🔴 | ⬜ | |
| 5.2 | Ese estado ofrece la acción | Botón **"Ver planes de {ORG-A}"** visible junto a "Cerrar" | 🔴 | ⬜ | |
| 5.3 | Pulsar "Ver planes de {ORG-A}" | Abre el catálogo de planes públicos de esa organización | 🔴 | ⬜ | |
| 5.4 | Cerrar el catálogo | El foco vuelve al botón "Ver planes"; se sigue viendo el estado de rechazo | 🔴 | ⬜ | |
| 5.5 | Adquirir desde ahí el plan que otorga **S** | Sigue el flujo de US-0093 sin cambios (subtipo → método de pago → comprobante) | 🔴 | ⬜ | |
| 5.6 | Con la suscripción aún **pendiente**, intentar reservar **B** | Rechazada: las unidades solo sirven con la suscripción `activa` | 🔴 | ⬜ | |
| 5.7 | El admin valida la suscripción; reservar **B** | La reserva **se crea** | 🔴 | ⬜ | |
| 5.8 | Revisar el saldo de servicios tras reservar | Las unidades de **S** se descontaron en "Mis Suscripciones" | 🔴 | ⬜ | |
| 5.9 | Cancelar esa reserva dentro de la ventana permitida | Las unidades se **restauran** | 🔴 | ⬜ | |
| 5.10 | Agotar las unidades y reservar otra sesión que requiera **S** | Mensaje de "no te quedan unidades" **y** la acción "Ver planes de {ORG-A}" | 🔴 | ⬜ | |
| 5.11 | Reservar **B** con formulario interno adjunto | El paso de formulario sigue funcionando antes de la reserva | 🔴 | ⬜ | |
| 5.12 | Reservar **C** (tiene fila de servicio y fila de estado) | Se permite por la fila de servicio | 🔴 | ⬜ | |
| 5.13 | Accesibilidad del estado de rechazo | Se navega con teclado, el foco entra al diálogo y los botones tienen foco visible | 🔴 | ⬜ | |

## 6. Landing anónima — no debe cambiar

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 6.1 | Sin sesión, abrir `/entrenamientos-publicos` | Las tarjetas se ven **igual que antes**: sin fila "Requiere:" en ninguna, ni siquiera en **B** | 🔴 | ⬜ | |
| 6.2 | Pulsar "Reservar" en **B** sin sesión | Sale el diálogo de "Regístrate para reservar" — **no** el catálogo de planes | 🔴 | ⬜ | |
| 6.3 | Listado completo sin sesión | Mismos entrenamientos, mismos datos y mismo orden que antes del cambio | 🟡 | ⬜ | |

## 7. Regresión

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 7.1 | **Miembro** reserva un entrenamiento **privado** con restricción de servicio | Validación, descuento y mensajes idénticos a antes | 🟢 | ⬜ | |
| 7.2 | **Miembro** reserva el publicado **B** | Igual que cualquier reserva con servicios | 🟢 | ⬜ | |
| 7.3 | Publicar / despublicar / republicar un entrenamiento **sin** restricciones | Funciona como antes | 🟢 | ⬜ | |
| 7.4 | "Gestionar publicación" sobre **B** (editar precio, banner, nombre) | Guarda sin activar el gate | 🔴 | ⬜ | |
| 7.5 | Editar las restricciones de un entrenamiento desde su formulario | Los nombres de servicio siguen viéndose y guardando | 🟢 | ⬜ | |
| 7.6 | Marketplace con la red lenta / con Supabase detenido | Si falla la consulta de servicios requeridos, el listado **igual se muestra** sin la fila de requisitos, no una pantalla en blanco | 🔴 | ⬜ | |
| 7.7 | Publicaciones creadas **antes** de este cambio | Siguen publicadas y visibles | 🟡 | ⬜ | |

## 8. Seguridad — humo en UI

| # | Prueba | Resultado esperado | Prio | Est. | Notas |
|---|---|---|---|:---:|---|
| 8.1 | Con DevTools sin sesión, pedir `/rest/v1/entrenamientos_publicos_servicios_view` | 401 | 🟡 | ⬜ | |
| 8.2 | Sin sesión, pedir `/rest/v1/servicios` | Respuesta vacía `[]` — ningún nombre de servicio | 🟡 | ⬜ | |
| 8.3 | Autenticado no-miembro, intentar escribir por la vista nueva (POST) | Rechazado (403) | 🟡 | ⬜ | |

---

## Bugs encontrados

Un bloque por hallazgo. Referencia el `#` de la prueba en Notas como `→ B1`.

### B1 — _(título)_

| | |
|---|---|
| **Prueba** | _(p. ej. 5.7)_ |
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

Contra el stack local, con SQL y JWT reales sobre PostgREST:

- **Trigger contra las 8 combinaciones** de la sección 1: `sin filas`, `[servicio]`, `[servicio]+[servicio]` y `[servicio] OR [usuario_estado]` publican; `[usuario_estado]`, `[nivel]`, `[nivel] OR [usuario_estado]` y `[servicio+usuario_estado]` en una misma fila bloquean. La sección 1 solo confirma que la UI refleje esto.
- **Vista nueva como no-miembro autenticado**: devuelve el nombre del servicio requerido incluso cuando **ningún plan público lo otorga**, mientras que ese mismo usuario leyendo `servicios` directamente recibe `[]` — que es justamente la razón de existir de la vista.
- **`anon`**: 401 en la vista nueva (lectura y escritura); `[]` en `servicios` y `entrenamiento_restricciones`.
- **Vista anónima `entrenamientos_publicos_view`**: definición, columnas y grants **idénticos** antes y después de la migración (diff de los tres).
- **`authenticated`**: solo `SELECT` sobre la vista nueva (200 lectura / 403 escritura).
- `npx tsc --noEmit` limpio; `npm run lint` en la línea base previa (34 problemas, todos preexistentes). El repo no define script de tests.

## Anexo — hallazgos abiertos (decisión pendiente)

1. **Privilegios por defecto de Supabase sobre vistas nuevas.** Un `grant select … to authenticated` no restringe nada: los *default privileges* ya conceden ALL a `anon` sobre cualquier objeto nuevo en `public`. En esta migración se corrigió con un `revoke all … from anon, authenticated` explícito. La vista de US-0091 se salva solo porque sus joins la hacen no-actualizable — **conviene auditar el resto de vistas del proyecto** creadas sin revoke explícito, porque una vista auto-actualizable concedida a `anon` permite escribir en la tabla subyacente con privilegios del owner, saltándose su RLS.
2. **Heredado de US-0093 (sin cerrar):** cualquier **miembro activo** de una organización puede leer cualquier archivo bajo `orgs/{tenantId}/`, incluidos comprobantes de pago e imágenes de formularios de otros atletas (política preexistente `org_member_read`).
