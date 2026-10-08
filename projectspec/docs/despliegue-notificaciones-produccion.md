# Despliegue del módulo de notificaciones en producción

Guía paso a paso para poner en marcha el envío de notificaciones (correo y avisos en la plataforma) en producción, con lo aprendido en el despliegue del 7 de octubre de 2026.

Este documento no contiene valores de secretos. Donde aparece `<…>` va el valor real, que solo debe vivir en Vercel, en Supabase Vault y en Resend.

## Estado al escribir esta guía

| Paso | Estado |
|---|---|
| La base de datos llega al despachador | Validado en producción (respuesta `200`) |
| El despachador toma las filas de la cola | Validado en producción |
| Resend acepta el envío | Validado en producción. La primera invitación falló con `resend_validation_error` porque `EMAIL_FROM` estaba guardado con comillas en Vercel; al corregir el formato, el correo salió |
| Rotación de claves expuestas | **Pendiente** (ver la sección final) |

## Cómo funciona, en una línea

```
evento en la app ──> fila en notificaciones_outbox ──> la base llama por HTTP (pg_net)
   ──> POST /api/internal/notificaciones/despachar en Vercel ──> Resend ──> correo
```

La base llama al despachador al insertar una fila y, además, cada minuto mientras haya filas pendientes.

## Paso 1: variables de entorno en Vercel

En Vercel → proyecto → Settings → Environment Variables, entorno Production:

| Variable | Valor | Nota |
|---|---|---|
| `RESEND_API_KEY` | `<clave de Resend>` | Con permiso de envío para `grit-arena.com` |
| `EMAIL_FROM` | `GRIT Arena <no-reply@grit-arena.com>` | **Sin comillas.** En `.env.local` lleva comillas; en Vercel no se quitan y Resend rechaza el remitente. Fue la causa del fallo en el primer despliegue |
| `NOTIFICACIONES_DISPATCH_SECRET` | `<secreto aleatorio>` | Generar con `openssl rand -hex 32`. Distinto del de `.env.local` |
| `APP_URL` | `https://www.grit-arena.com` | Ya existía. De aquí salen los enlaces de los correos |
| `SUPABASE_SERVICE_ROLE_KEY` | `<clave de servicio>` | Ya existía |

No definir `EMAIL_DEV_MAILPIT_URL` en producción (es solo para desarrollo; en producción se ignora).

Después de cambiar cualquier variable hay que **redesplegar**: solo aplican a despliegues nuevos.

## Paso 2: migraciones en Supabase

Aplicar, en este orden:

| Migración | Contenido |
|---|---|
| `20261009120000_notificaciones_modulo.sql` | Cola, bandeja, despacho, cron |
| `20261011120000_notificaciones_suscripciones.sql` | Compra por RPC y avisos de suscripciones |
| `20261012120000_tenant_reglas_notificacion.sql` | Reglas del tenant y avisos de vencimiento |
| `20261013120000_invitaciones_notificaciones.sql` | Invitaciones al equipo |

Comprobar que quedaron:

```sql
select proname from pg_proc
 where proname in ('_notificar_email', 'comprar_suscripcion',
                   'notificar_vencimientos_suscripciones', 'encolar_invitacion_tenant');
```

Deben salir las cuatro. La extensión `pg_net` debe estar activa (Database → Extensions).

## Paso 3: elegir la URL del despachador

Aquí estuvo el problema del primer despliegue. La base debe poder hacer un `POST` a la ruta sin que nada intermedio la bloquee.

| URL probada | Resultado | Motivo |
|---|---|---|
| `https://www.grit-arena.com/api/internal/…` | Falla | Cloudflare responde con una verificación anti-bots (`cf-mitigated: challenge`) que la base no puede resolver |
| `https://app-sports-manager-<id>-….vercel.app/…` | No usar | Apunta a un despliegue concreto; queda obsoleta en el siguiente despliegue y está protegida |
| `https://app-sports-manager-git-main-….vercel.app/…` | Falla (`302` a login) | Protegida por "Vercel Authentication" |
| La anterior + `?x-vercel-protection-bypass=<secreto>` | **Funciona (`200`)** | Es la que quedó en uso |

### Generar el secreto de bypass

Vercel → proyecto → Settings → Deployment Protection → **Protection Bypass for Automation** → Add Secret.

### Probar antes de guardar

```bash
curl -i -X POST "https://app-sports-manager-git-main-sergiorojasms-projects.vercel.app/api/internal/notificaciones/despachar?x-vercel-protection-bypass=<secreto-de-bypass>" \
  -H "Authorization: Bearer <NOTIFICACIONES_DISPATCH_SECRET>"
```

| Respuesta | Significado |
|---|---|
| `200` con `{"procesadas":…,"enviadas":…,"fallidas":…}` | Correcto |
| `302` hacia `vercel.com/sso-api` | El bypass no se aplicó: revisar el secreto o redesplegar |
| `401` | El `Bearer` no coincide con `NOTIFICACIONES_DISPATCH_SECRET` de Vercel |
| `503` | Falta `NOTIFICACIONES_DISPATCH_SECRET` en Vercel |
| HTML de Cloudflare | Se está usando el dominio propio en vez del de Vercel |

## Paso 4: secretos en Supabase Vault

Son dos, con estos nombres exactos:

| Nombre | Valor |
|---|---|
| `notificaciones_dispatch_url` | La URL completa del paso 3, con el parámetro de bypass |
| `notificaciones_dispatch_secret` | El mismo valor que `NOTIFICACIONES_DISPATCH_SECRET` en Vercel |

**Crear** (solo la primera vez; si ya existe da el error `duplicate key … secrets_name_idx`):

```sql
select vault.create_secret('<url-completa>', 'notificaciones_dispatch_url');
select vault.create_secret('<secreto>', 'notificaciones_dispatch_secret');
```

**Modificar** uno existente. El primer argumento es el **id** del secreto, no su nombre ni su valor; por eso va la subconsulta:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'notificaciones_dispatch_url'),
  '<url-completa>'
);
```

**Verificar** qué hay guardado:

```sql
select name, decrypted_secret from vault.decrypted_secrets where name like 'notificaciones%';
```

También se pueden editar desde el panel: Project Settings → Vault.

## Paso 5: comprobar que la base llega al despachador

Generar una notificación real (por ejemplo, invitar a un correo propio al equipo) y revisar:

```sql
-- Últimas llamadas de la base: debe aparecer 200 con el JSON del despachador
select status_code, left(content, 80), created
  from net._http_response order by created desc limit 3;

-- La cola
select tipo, estado, intentos, ultimo_error, created_at
  from notificaciones_outbox order by created_at desc limit 10;
```

El cron solo llama cuando hay filas pendientes: con la cola vacía no aparecen llamadas nuevas.

| Lo que se ve en la cola | Significado |
|---|---|
| `enviada` | El correo salió |
| `pendiente`, `intentos = 0` | La base no llega al despachador: revisar la URL y el secreto de Vault |
| `pendiente`, `intentos > 0` | El despachador sí corre; el envío falló y se reintentará. Ver `ultimo_error` |
| `procesando` | Una llamada la tomó y no terminó; se libera sola a los 10 minutos |
| `error` | Agotó los 5 intentos; ya no se reintenta |

Reintentos automáticos: 1 minuto, 5 minutos, 30 minutos y 2 horas después de cada fallo.

## Paso 6: si Resend rechaza el envío

Valores de `ultimo_error` y qué revisar:

| Error | Causa probable |
|---|---|
| `resend_not_configured` | Falta `RESEND_API_KEY` o `EMAIL_FROM` en Vercel, o no se redesplegó |
| `resend_validation_error` | Remitente o destinatario inválido. Causa confirmada en el primer despliegue: `EMAIL_FROM` guardado **con comillas** en Vercel. Otras posibles: la clave es de una cuenta donde `grit-arena.com` no está verificado, o el destinatario tiene un formato inválido |
| `resend_rate_limit_exceeded` | Demasiados envíos seguidos; se resuelve con los reintentos |
| `skipped` | El registro cambió antes del envío (invitación cancelada, suscripción renovada…). Es el comportamiento esperado |
| `handler_not_found` | El código desplegado es anterior a la migración aplicada: redesplegar |

El mensaje exacto de Resend está en su panel, sección **Logs**. Para reproducirlo con los mismos valores de Vercel:

```bash
curl -s -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer <RESEND_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"from":"GRIT Arena <no-reply@grit-arena.com>","to":"delivered@resend.dev","subject":"prueba","text":"hola"}'
```

`delivered@resend.dev` es una dirección de pruebas de Resend: acepta el correo sin entregarlo a nadie. Si esta llamada devuelve un `id`, la clave y el dominio están bien y el problema está en el valor de `EMAIL_FROM` en Vercel.

Tras corregir y redesplegar, para no esperar al siguiente reintento:

```sql
update notificaciones_outbox
   set proximo_intento_at = now()
 where estado = 'pendiente';
```

Una fila en `error` no se recupera así; hay que repetir la acción desde la app (por ejemplo, "Reenviar" la invitación).

## Claves que se deben rotar

Estas claves quedaron escritas en una conversación de trabajo durante el desarrollo y el despliegue. Deben reemplazarse por valores nuevos.

| Clave | Por qué | Dónde se usa | Prioridad |
|---|---|---|---|
| Clave de Resend que empieza por `re_FoCUB…` | Se pegó en el chat para las pruebas | `.env.local`; Vercel, si se usó la misma | Alta: permite enviar correos a nombre de `grit-arena.com` |
| `NOTIFICACIONES_DISPATCH_SECRET` que empieza por `021d9ac6…` | Se pegó en el chat en un `curl`. Además es **el mismo valor** en producción y en `.env.local` | Vercel, Supabase Vault y `.env.local` | Media: solo permite disparar el envío de lo que ya está en cola |
| Secreto de bypass de Vercel | No se expuso. Rotarlo solo si se compartió fuera de Vercel y Vault | Vercel y la URL guardada en Vault | Baja |

### Rotar la clave de Resend

1. En Resend → API Keys, crear una clave nueva con permiso "Sending access" restringido a `grit-arena.com`.
2. Ponerla en `RESEND_API_KEY` en Vercel y redesplegar.
3. Comprobar un envío (paso 5).
4. Borrar la clave anterior en Resend.
5. Para local, crear otra clave distinta o dejar `RESEND_API_KEY` vacía y usar Mailpit.

### Rotar `NOTIFICACIONES_DISPATCH_SECRET`

Hay que cambiarlo en Vercel y en Vault; mientras no coincidan, el despachador responde `401` y los correos esperan en cola (no se pierden).

1. Generar el valor: `openssl rand -hex 32`.
2. Vercel: actualizar `NOTIFICACIONES_DISPATCH_SECRET` y redesplegar.
3. Vault, en cuanto el despliegue esté listo:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'notificaciones_dispatch_secret'),
  '<secreto-nuevo>'
);
```

4. Comprobar con el `curl` del paso 3 y con las consultas del paso 5.
5. Generar **otro** valor distinto para `.env.local` y para el Vault del Supabase local.

### Rotar el secreto de bypass de Vercel

1. En Vercel → Deployment Protection, regenerar el secreto.
2. Redesplegar si Vercel lo indica.
3. Actualizar la URL en Vault con el secreto nuevo (`update_secret` del paso 4).

Si se regenera en Vercel y no se actualiza Vault, las notificaciones vuelven a quedarse en cola sin ningún aviso.

## Cosas a recordar

- **El alias `git-main` sigue a la rama `main`.** Si cambia la rama de producción, hay que cambiar la URL de Vault.
- **Al destrabarse la cola salen de golpe los correos acumulados**, incluidos avisos de hace horas. Si alguno ya no tiene sentido, borrarlo de `notificaciones_outbox` antes de corregir.
- **Orden de despliegue de cada parte:**
  - Módulo base e invitaciones: primero la migración, luego la aplicación.
  - Suscripciones (compra por RPC): primero la aplicación y enseguida la migración, en un momento de poco uso.
  - Reglas de vencimiento: en cualquier orden; no se envía nada hasta que un tenant cree una regla.
- **Los avisos de vencimiento** se envían cada día a las 8:00 a. m. (hora de Bogotá).
