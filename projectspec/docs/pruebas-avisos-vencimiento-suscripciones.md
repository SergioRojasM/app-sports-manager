# Cómo probar los avisos de vencimiento de suscripciones (US-0135)

Guía paso a paso para probar en local las reglas de notificación del tenant y los avisos automáticos de vencimiento. Los correos llegan a Mailpit, no salen a ningún buzón real.

## Qué se prueba

- La tarjeta "Notificaciones automáticas" en Gestión de organización (crear, editar y eliminar reglas).
- El proceso diario que avisa a atletas y/o administradores antes y después de que venza una suscripción, en la plataforma y por correo.

## Requisitos

| Requisito | Cómo comprobarlo |
|---|---|
| Supabase local en marcha | `npx supabase status` |
| Migraciones aplicadas | `npx supabase migration up` (no uses `db reset`: borra los datos locales) |
| `.env.local` con `EMAIL_DEV_MAILPIT_URL=http://127.0.0.1:54324` | Sin esta variable los correos se envían de verdad por Resend |
| App en el puerto 3000 | `npm run dev` |
| Secretos de despacho en Vault | Ver la consulta de abajo |
| Un usuario administrador del tenant y al menos un atleta con suscripción | Datos locales existentes |

Para que la base de datos llame sola al despachador de correos, deben existir dos secretos. Compruébalo en el editor SQL de Studio (`http://127.0.0.1:54323`):

```sql
select name from vault.secrets where name like 'notificaciones%';
```

Si no devuelve las dos filas, créalas (el secreto es el valor de `NOTIFICACIONES_DISPATCH_SECRET` en `.env.local`):

```sql
select vault.create_secret('http://host.docker.internal:3000/api/internal/notificaciones/despachar', 'notificaciones_dispatch_url');
select vault.create_secret('<NOTIFICACIONES_DISPATCH_SECRET>', 'notificaciones_dispatch_secret');
```

## Parte 1: reglas en Gestión de organización

1. Inicia sesión como administrador y abre `/portal/orgs/{tenant_id}/gestion-organizacion`.
2. Baja hasta la tarjeta **Notificaciones automáticas**. Sin reglas muestra "Aún no hay reglas. Sin reglas no se envían avisos de vencimiento."
3. Pulsa **Agregar** y comprueba los valores por defecto: "Antes del vencimiento", "Solo atletas", los dos canales marcados y "Activa" marcada.
4. Prueba las validaciones. En cada caso no debe guardarse nada:

| Acción | Mensaje esperado |
|---|---|
| Guardar con días vacío, 0, 61 o 2,5 | "Ingresa un número de días entre 1 y 60." |
| Desmarcar los dos canales y guardar | "Selecciona al menos un canal." |
| Crear una regla con el mismo tipo y los mismos días que otra | "Ya existe una regla para ese número de días." |

5. Crea estas dos reglas, que se usan en la Parte 2:

| Tipo | Días | Destinatarios | Canales |
|---|---|---|---|
| Antes del vencimiento | 3 | Administradores y atletas | En la plataforma + Correo |
| Después del vencimiento | 2 | Solo administradores | Solo Correo |

6. Comprueba la lista: dos grupos ("Antes del vencimiento" y "Después del vencimiento"), ordenados por días, y en cada fila los destinatarios, los canales y la insignia "Activa".
7. Edita una regla: el tipo aparece bloqueado; los días, destinatarios, canales y estado sí se pueden cambiar.
8. Elimina una regla de prueba: pide confirmación. "Cancelar" no borra; "Eliminar" sí.
9. Límite: con 3 reglas de cada tipo, **Agregar** queda deshabilitado con la ayuda "Máximo 3 reglas por tipo".
10. Teclado: `Escape` cierra el formulario y el foco vuelve al botón que lo abrió.
11. Permisos: entra como entrenador o atleta a la misma URL. Debe redirigir fuera de la página.

## Parte 2: avisos automáticos

El proceso avisa solo en el **día exacto**: una suscripción coincide cuando su fecha de fin es hoy + N días (regla "antes") u hoy − N días (regla "después"). "Hoy" es la fecha de Bogotá.

### 2.1 Preparar suscripciones que coincidan

Con las reglas del paso 5 necesitas:

| Para probar | Estado de la suscripción | Fecha de fin |
|---|---|---|
| Regla "3 días antes" | `activa` | hoy + 3 |
| Regla "2 días después" | `vencida` | hoy − 2 |

La forma más simple es editar suscripciones existentes desde "Gestión de suscripciones". También se puede por SQL:

```sql
-- Suscripciones del tenant con su atleta, para elegir cuáles usar
select s.id, u.email, s.estado, s.fecha_fin
  from suscripciones s join usuarios u on u.id = s.atleta_id
 where s.tenant_id = '<tenant_id>'
 order by s.fecha_fin desc;

-- Ajustar una activa y una vencida (de atletas distintos)
update suscripciones set fecha_fin = (now() at time zone 'America/Bogota')::date + 3 where id = '<id_activa>';
update suscripciones set fecha_fin = (now() at time zone 'America/Bogota')::date - 2 where id = '<id_vencida>';
```

No se avisa a un atleta que tenga otra suscripción `activa` o `pendiente` en el mismo tenant que termine después (o sin fecha de fin): se considera que ya renovó. Usa atletas que no estén en ese caso.

### 2.2 Ejecutar el proceso

En producción corre solo cada día a las 8:00 a. m. (hora de Bogotá). Para probar, ejecútalo a mano en el editor SQL:

```sql
select public.notificar_vencimientos_suscripciones();
```

Devuelve el número de avisos creados (uno por suscripción y regla, sin contar destinatarios). Con las dos suscripciones preparadas debe devolver al menos 2.

### 2.3 Comprobar el resultado

| Dónde | Qué debe verse |
|---|---|
| Campana del atleta de la suscripción activa | "Tu suscripción está por vencer", con enlace a "Mis suscripciones" |
| Campana de cada administrador | "Suscripción por vencer", con el nombre del atleta y enlace a "Gestión de suscripciones" |
| Campana de los administradores, regla "después" | Nada: esa regla es solo por correo |
| Mailpit (`http://127.0.0.1:54324`), tras unos segundos | Un correo al atleta ("Tu suscripción está por vencer — {plan}") y uno por administrador para cada regla ("Suscripción por vencer — {atleta}", "Suscripción vencida — {atleta}") |

Los mensajes deben decir "1 día" o "{N} días" y la fecha en formato `DD/MM/AAAA`.

### 2.4 Casos adicionales

| Caso | Cómo probarlo | Resultado esperado |
|---|---|---|
| Sin repetidos | Ejecutar el proceso otra vez | Devuelve 0 y no crea avisos nuevos |
| Regla inactiva | Desmarcar "Activa", preparar otra suscripción y ejecutar | No avisa |
| Día que no coincide | Suscripción con fin en hoy + 4 y regla de 3 días | No avisa |
| Solo atletas | Regla con "Solo atletas" | Los administradores no reciben nada |
| Solo en la plataforma | Regla con solo "En la plataforma" | Aparece en la campana y no llega correo |
| Atleta que ya renovó | Atleta con otra suscripción activa que termina después | No avisa |
| Cambio de fecha | Cambiar la fecha de fin de una suscripción ya avisada para que vuelva a coincidir | Avisa de nuevo para la nueva fecha |
| Cambio de destinatarios | Cambiar los destinatarios de una regla que ya avisó | No reenvía ese aviso |
| Otro tenant | Tenant sin reglas | Sus suscripciones no generan avisos |

## Repetir una prueba

Cada aviso queda registrado para no repetirse. Para volver a probar la misma suscripción con la misma regla, borra su registro o cambia la fecha de fin:

```sql
delete from suscripcion_avisos_vencimiento where suscripcion_id = '<id>';
```

## Si algo no aparece

```sql
-- ¿Qué reglas hay y cuáles están activas?
select tipo, dias, destinatarios, canal_in_app, canal_email, activo
  from tenant_reglas_notificacion where tenant_id = '<tenant_id>';

-- ¿Se registró el aviso?
select * from suscripcion_avisos_vencimiento order by created_at desc limit 10;

-- ¿Se crearon y enviaron los correos?
select tipo, estado, intentos, ultimo_error
  from notificaciones_outbox order by created_at desc limit 10;
```

| Síntoma | Causa probable |
|---|---|
| El proceso devuelve 0 | Ninguna suscripción coincide en el día exacto, la regla está inactiva, el aviso ya se había enviado, o el atleta tiene otra suscripción vigente |
| Hay aviso en la campana pero no correo | La regla no tiene el canal "Correo" |
| Correos en `pendiente` con `intentos = 0` | La base no llega a la app: revisa que corra en el puerto 3000 y los secretos de Vault |
| `ultimo_error = resend_not_configured` | Falta `EMAIL_DEV_MAILPIT_URL` (o la clave de Resend) en `.env.local` |
| `ultimo_error = skipped` | La suscripción cambió de estado o de fecha entre el aviso y el envío; es el comportamiento esperado |
| `ultimo_error = mailpit_unreachable` | Mailpit no está en marcha (`npx supabase status`) |

## Limpieza

Para dejar la base como estaba:

```sql
delete from notificaciones where tipo like 'vencimiento%';
delete from notificaciones_outbox where tipo like 'vencimiento%';
delete from suscripcion_avisos_vencimiento;
delete from tenant_reglas_notificacion where tenant_id = '<tenant_id>';
```

Restaura además las fechas de fin que hayas cambiado en las suscripciones. Los correos de prueba se borran desde la propia interfaz de Mailpit.
