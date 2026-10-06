# US-0134 — Subscription and Payment Notifications (Email + In-App)

## ID
US-0134

## Name
Notify athletes and tenant administrators, by email and in the portal, of subscription purchases, payment and subscription decisions, payment-proof re-uploads and administrator-assigned subscriptions

## As a
- **Athlete** who buys a plan or receives a subscription from an administrator
- **Organization administrator** who validates payments and subscriptions

## I Want
- As an athlete: to be told that my purchase was received, to be told when my payment or my subscription is approved or rejected, and to be told when an administrator adds a subscription to my account.
- As an administrator: to be told of every new subscription purchase and whether it still needs my validation, and to be told when an athlete uploads a payment proof again.

## So That
Athletes know the state of what they paid for without opening the portal, and administrators react quickly to payments waiting for validation instead of discovering them by visiting "Gestión de suscripciones".

---

## Description

### Current State

- The notifications module of US-0125 exists: `_notificar_email` / `_notificar_in_app` / `_admins_tenant` (migration `20261009120000_notificaciones_modulo.sql`), the dispatcher, the handler registry `src/lib/notificaciones/registro.ts` and the header bell. Its only consumer is event purchases (`src/lib/notificaciones/modulos/eventos.ts`).
- The subscriptions module sends nothing. Its only feedback is the on-screen message "Solicitud enviada. El administrador revisará tu suscripción."
- **Subscription writes do not go through RPCs.** The browser inserts and updates `suscripciones` and `pagos` directly under RLS. There are no triggers on either table.
  - Purchase by an athlete (`useSuscripcion.ts`): insert `suscripciones` (`estado = 'pendiente'`) → insert `pagos` (`estado = 'pendiente'`, `comprobante_path = null`) → optional proof upload → `pagosService.updateComprobantePath` (sets the path, `estado = 'pendiente'`, `motivo_rechazo = null`).
  - Proof upload later (`useSubirComprobante.ts`): the same `updateComprobantePath`.
  - Payment decision (`gestionSuscripcionesService.updatePagoEstado`): update `pagos.estado` to `validado` or `rechazado` (+ `motivo_rechazo`).
  - Subscription decision (`updateSuscripcionEstado`): update `suscripciones.estado` to `activa` (with dates) or `cancelada`.
  - Administrator creates a subscription for an athlete (`crearSuscripcionAdmin`): insert `suscripciones` (`pendiente` or `activa`) and optionally `pagos` (`pendiente` or `validado`).
- States: `suscripciones.estado` in `pendiente | activa | vencida | cancelada`; `pagos.estado` in `pendiente | validado | rechazado`.

### Proposed Changes

#### Approach

Because every write is a direct table write, notifications are enqueued by **`AFTER` row triggers** on `suscripciones` and `pagos`. No service, hook or component of the subscriptions module changes. The triggers call the US-0125 helpers, so delivery, retries, the bell and the inbox work as they already do. Emails are rendered by new handlers registered under the module key `suscripciones`.

The actor is identified with `auth.uid()` inside the trigger: an action is "by the athlete" when `auth.uid() = suscripciones.atleta_id`, otherwise it is "by staff" (also for the service role and cron, where `auth.uid()` is null).

#### Notification matrix

| # | Event (database condition) | Athlete | Tenant administrators |
|---|---|---|---|
| 1 | **Purchase**: insert on `pagos` by the athlete | `suscripcion_recibida` (email + in-app) | `suscripcion_nueva_admin` (email + in-app) |
| 2 | **Payment approved**: `pagos.estado` `pendiente → validado` | `pago_validado` (email + in-app) | none |
| 3 | **Payment rejected**: `pagos.estado` `pendiente → rechazado` | `pago_rechazado` (email + in-app, with `motivo_rechazo`) | none |
| 4 | **Subscription approved**: `suscripciones.estado` `pendiente → activa` | `suscripcion_aprobada` (email + in-app) | none |
| 5 | **Subscription rejected**: `suscripciones.estado` `pendiente → cancelada`, by staff | `suscripcion_rechazada` (email + in-app) | none |
| 6 | **Proof uploaded again**: `pagos.comprobante_path` changes to a non-null value, by the athlete, and it is not the initial upload of the purchase | none | `pago_comprobante_admin` (email + in-app) |
| 7 | **Subscription assigned**: insert on `suscripciones` by someone other than the athlete | `suscripcion_asignada` (email + in-app) | none |

Rules:
- "Tenant administrators" = `_admins_tenant(tenant_id)` (role `administrador`, `estado <> 'pendiente_activacion'`). Trainers are not notified. The administrator who performs an action never receives a notification about it (rows 2–5 and 7 notify only the athlete).
- **Row 1, "requires validation or not"**: the administrator notification states it explicitly. A purchase requires validation when the subscription is `pendiente` or the payment is `pendiente`. With today's flow that is always true for a purchase made by the athlete; the text is still computed from the data so a future auto-approved purchase reads correctly.
  - Requires validation → title "Nueva suscripción por validar".
  - Does not → title "Nueva suscripción".
- **Row 6, initial upload excluded**: the proof attached during the purchase arrives as an `UPDATE` seconds after the `INSERT`, and must not produce a second administrator notification. The update is treated as the initial upload — and skipped — only when `OLD.comprobante_path is null and OLD.estado = 'pendiente' and OLD.created_at > now() - interval '10 minutes'`. Any other change of `comprobante_path` to a non-null value by the athlete notifies (replacing a proof, uploading after a rejection, or uploading for the first time later from "Mis suscripciones").
- **Row 7 and the administrator's own payment**: when an administrator creates a subscription and its payment, only `suscripcion_asignada` is sent. The `pagos` insert is not "by the athlete", so row 1 does not fire; a payment inserted already `validado` is not a `pendiente → validado` transition, so row 2 does not fire.
- **Row 4 on an assigned subscription**: a subscription inserted directly as `activa` is not a transition, so only row 7 fires. One inserted as `pendiente` and approved later fires row 7 and then row 4.
- Athlete cancelling the own pending subscription, `activa → cancelada`, `activa → vencida`, edits and deletions send nothing. (Expiry reminders are US-0135.)
- A trigger must never make the write fail: each trigger body is wrapped in `exception when others then raise warning`.

#### In-app notifications

`modulo = 'suscripciones'`, `entidad_tipo = 'suscripcion'`, `entidad_id = suscripciones.id`.

| `tipo` | `titulo` | `mensaje` | `url` |
|---|---|---|---|
| `suscripcion_recibida` | Recibimos tu solicitud | Tu suscripción a {plan} en {tenant} está en revisión. | `/portal/mis-suscripciones` |
| `pago_validado` | Pago aprobado | Tu pago de {plan} fue aprobado. | `/portal/mis-suscripciones` |
| `pago_rechazado` | Pago rechazado | Tu pago de {plan} fue rechazado: {motivo}. Puedes subir un nuevo comprobante. | `/portal/mis-suscripciones` |
| `suscripcion_aprobada` | Suscripción activa | Tu suscripción a {plan} está activa hasta el {fecha_fin}. | `/portal/mis-suscripciones` |
| `suscripcion_rechazada` | Suscripción rechazada | Tu solicitud de {plan} en {tenant} fue rechazada. | `/portal/mis-suscripciones` |
| `suscripcion_asignada` | Nueva suscripción | {tenant} agregó la suscripción {plan} a tu cuenta. | `/portal/mis-suscripciones` |
| `suscripcion_nueva_admin` | Nueva suscripción por validar / Nueva suscripción | {atleta} compró {plan}. | `/portal/orgs/{tenant_id}/gestion-suscripciones` |
| `pago_comprobante_admin` | Nuevo pago por validar | {atleta} subió un comprobante para {plan}. | `/portal/orgs/{tenant_id}/gestion-suscripciones` |

- `{plan}` = `planes.nombre`, followed by ` — {plan_tipos.nombre}` when the subscription has a `plan_tipo_id`.
- `{atleta}` = `usuarios.nombre || ' ' || usuarios.apellido`; `{tenant}` = `tenants.nombre`.
- `{fecha_fin}` formatted `DD/MM/YYYY`; when `fecha_fin` is null the sentence ends at "está activa."
- When `motivo_rechazo` is null the `pago_rechazado` message is "Tu pago de {plan} fue rechazado. Puedes subir un nuevo comprobante."

#### Emails

- Spanish copy, `es-CO` formats, shared layout `renderLayout` / `renderFilas` / `renderParrafo` from `src/lib/notificaciones/plantillas/layout.ts`. No attachments.
- Subject = the in-app title followed by ` — {plan}`.
- Body rows: Organización, Plan, Valor (`pagos.monto` formatted as COP, "Gratis" when 0, omitted when the subscription has no payment), Estado de la suscripción, Estado del pago, Vigencia (`fecha_inicio` – `fecha_fin` when both exist), and Motivo for `pago_rechazado`.
- Button: athlete emails → "Ver mis suscripciones" → `{APP_URL}/portal/mis-suscripciones`; administrator emails → "Validar" (or "Ver suscripciones" when no validation is required) → `{APP_URL}/portal/orgs/{tenant_id}/gestion-suscripciones`.
- Handlers read the subscription, its plan, its latest payment, the tenant and the athlete with the service-role client **at send time**; the outbox payload only carries ids and the rejection reason. If the subscription no longer exists the handler returns `null` (row resolved as `skipped`).
- The administrator email of row 1 says "Comprobante adjunto: Sí / No" from the payment's current `comprobante_path`, which is correct because the email is rendered after the initial upload.

---

## Database Changes

One migration, `supabase/migrations/20261011120000_notificaciones_suscripciones.sql`, wrapped in `begin; ... commit;`. Local only; never pushed to the remote project. No table or column is added.

### 1. Helper: `_encolar_notificacion_suscripcion`

```sql
create or replace function public._encolar_notificacion_suscripcion(
  p_suscripcion_id uuid,
  p_tipo text,
  p_pago_id uuid default null
) returns void
language plpgsql security definer set search_path = public as $$ ... $$;
revoke all on function public._encolar_notificacion_suscripcion(uuid, text, uuid) from public, anon, authenticated;
```

Behaviour:
- Loads the subscription with `planes.nombre`, `plan_tipos.nombre`, `tenants.nombre`, the athlete (`usuarios.id`, `email`, `nombre`, `apellido`) and, when `p_pago_id` is given, that payment (`monto`, `estado`, `motivo_rechazo`). Returns silently when the subscription is not found.
- Payload: `{ suscripcion_id, pago_id, tenant_id, plan, tenant_nombre, atleta_nombre, motivo_rechazo, requiere_validacion }`.
- For athlete types (`suscripcion_recibida`, `pago_validado`, `pago_rechazado`, `suscripcion_aprobada`, `suscripcion_rechazada`, `suscripcion_asignada`): one `_notificar_email` to the athlete's email and one `_notificar_in_app` to `atleta_id`, with the texts of the table above.
- For administrator types (`suscripcion_nueva_admin`, `pago_comprobante_admin`): one `_notificar_email` + one `_notificar_in_app` per row of `_admins_tenant(tenant_id)`.
- `requiere_validacion` = `suscripciones.estado = 'pendiente' or pagos.estado = 'pendiente'`.

### 2. Trigger functions (all `security definer`, `set search_path = public`, body wrapped in `exception when others then raise warning ...; return null;`)

| Trigger | Table / event | Condition → call |
|---|---|---|
| `suscripciones_notificar_insert` | `after insert on suscripciones for each row` | `auth.uid() is distinct from NEW.atleta_id` → `suscripcion_asignada` |
| `suscripciones_notificar_estado` | `after update of estado on suscripciones for each row when (OLD.estado is distinct from NEW.estado)` | `OLD.estado = 'pendiente' and NEW.estado = 'activa'` → `suscripcion_aprobada`; `OLD.estado = 'pendiente' and NEW.estado = 'cancelada' and auth.uid() is distinct from NEW.atleta_id` → `suscripcion_rechazada` |
| `pagos_notificar_insert` | `after insert on pagos for each row` | athlete of `NEW.suscripcion_id` `= auth.uid()` → `suscripcion_recibida` and `suscripcion_nueva_admin` (both with `p_pago_id = NEW.id`) |
| `pagos_notificar_update` | `after update of estado, comprobante_path on pagos for each row` | `OLD.estado = 'pendiente' and NEW.estado = 'validado'` → `pago_validado`; `OLD.estado = 'pendiente' and NEW.estado = 'rechazado'` → `pago_rechazado`; proof rule below → `pago_comprobante_admin` |

Proof rule in `pagos_notificar_update`:

```sql
NEW.comprobante_path is not null
and NEW.comprobante_path is distinct from OLD.comprobante_path
and auth.uid() = (select s.atleta_id from suscripciones s where s.id = NEW.suscripcion_id)
and not (OLD.comprobante_path is null
         and OLD.estado = 'pendiente'
         and OLD.created_at > now() - interval '10 minutes')
```

`pagos` rows with `suscripcion_id is null` are ignored by both `pagos` triggers.

### 3. RLS

No policy changes. The helper and trigger functions are SECURITY DEFINER and revoked from `public`, `anon` and `authenticated`; they write to `notificaciones_outbox` (no client grants) and `notificaciones` (owner-only `select`) exactly as US-0125 defines.

---

## API / Server Actions

No new route, server action or browser service.

### Server library

- **File**: `src/lib/notificaciones/modulos/suscripciones.ts` (`import 'server-only'`)
- **Export**: `suscripcionesHandlers: Record<string, NotificacionHandler>` with the keys `suscripciones.suscripcion_recibida`, `suscripciones.pago_validado`, `suscripciones.pago_rechazado`, `suscripciones.suscripcion_aprobada`, `suscripciones.suscripcion_rechazada`, `suscripciones.suscripcion_asignada`, `suscripciones.suscripcion_nueva_admin`, `suscripciones.pago_comprobante_admin`.
- **Input**: `NotificacionOutboxRow` (`entidad_id` = subscription id, `payload.pago_id`, `payload.motivo_rechazo`, `payload.requiere_validacion`).
- **Return**: `NotificacionEmail | null` (`null` when the subscription no longer exists).
- **Data access**: `createServiceClient()`; one query on `suscripciones` with the embeds `plan:planes(nombre)`, `plan_tipo:plan_tipos(nombre)`, `tenant:tenants(nombre)`, `atleta:usuarios(nombre, apellido)`, plus the payment by `payload.pago_id` or, without it, the latest `pagos` row of the subscription.
- **Auth**: runs only inside the dispatcher (bearer-protected route of US-0125).

- **File**: `src/lib/notificaciones/registro.ts` — spread `suscripcionesHandlers` into `HANDLERS`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261011120000_notificaciones_suscripciones.sql` | `_encolar_notificacion_suscripcion` + 4 trigger functions + 4 triggers |
| Lib (server) | `src/lib/notificaciones/modulos/suscripciones.ts` | New: 8 email handlers |
| Lib (server) | `src/lib/notificaciones/registro.ts` | Register `suscripcionesHandlers` |
| Docs | `projectspec/03-project-structure.md` | Add the module file, the triggers and the matrix to "Notifications module" |

No page, component, hook, browser service or type file changes.

---

## Acceptance Criteria

1. When an athlete buys a plan, the athlete gets one `suscripcion_recibida` in-app notification and one outbox row, and every active administrator of the tenant gets one `suscripcion_nueva_admin` in-app notification and one outbox row.
2. The administrator notification of a purchase is titled "Nueva suscripción por validar" while the subscription or its payment is `pendiente`.
3. A purchase with a payment proof attached produces exactly one administrator notification (no `pago_comprobante_admin`), and the administrator email shows "Comprobante adjunto: Sí".
4. A purchase without a proof produces the same notifications and the administrator email shows "Comprobante adjunto: No".
5. When an administrator approves a payment, the athlete gets `pago_validado`; no administrator is notified.
6. When an administrator rejects a payment with a reason, the athlete gets `pago_rechazado` and both the in-app message and the email contain the reason.
7. When an administrator approves a pending subscription, the athlete gets `suscripcion_aprobada` whose message includes the end date.
8. When an administrator cancels a pending subscription, the athlete gets `suscripcion_rechazada`. When the athlete cancels the own pending subscription, nothing is sent.
9. When an athlete uploads a proof after a rejection, replaces an existing proof, or uploads the first proof more than 10 minutes after the purchase, every administrator gets `pago_comprobante_admin`; the athlete gets nothing.
10. When an administrator creates a subscription for an athlete, with or without a payment, the athlete gets exactly one notification (`suscripcion_asignada`) and no administrator is notified.
11. A subscription created by an administrator as `pendiente` and approved later produces `suscripcion_asignada` and then `suscripcion_aprobada`.
12. Expiry by the daily cron, edits, deletions and `activa → cancelada` send nothing.
13. Trainers, athletes other than the buyer, and administrators in `pendiente_activacion` receive nothing.
14. In-app notifications of the athlete link to `/portal/mis-suscripciones`; those of administrators link to `/portal/orgs/{tenant_id}/gestion-suscripciones`.
15. With the local Mailpit transport (`EMAIL_DEV_MAILPIT_URL`), each of the 8 types is delivered with the subject "{title} — {plan}" and the expected rows and button.
16. If a trigger function raises internally, the insert or update of `suscripciones` / `pagos` still succeeds.
17. An outbox row whose subscription was deleted before dispatch is resolved as failed with `skipped` and no email is sent.
18. `npx tsc --noEmit` passes and `npm run lint` reports no new problem.

---

## Implementation Steps

- [ ] Create branch `feat/subscription-notifications` and verify it is not `main`/`master`/`develop`
- [ ] Write the migration and apply it locally with `npx supabase migration up` (never push it to the remote project)
- [ ] Add `src/lib/notificaciones/modulos/suscripciones.ts` and register it in `registro.ts`
- [ ] Verify the helper and trigger functions are not executable by `anon` / `authenticated`
- [ ] Test manually with Mailpit: purchase with and without proof, approve and reject payment, approve and cancel subscription, proof re-upload (after rejection, replacement, late first upload), administrator-created subscription in each state combination
- [ ] Test the negative cases: athlete self-cancel, expiry cron, edit, delete
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run `npx tsc --noEmit` and `npm run lint` (do not run `build`)
- [ ] Write the commit message and PR description

---

## Non-Functional Requirements

- **Security**:
  - All new functions are SECURITY DEFINER with `search_path = public` and revoked from `public`, `anon` and `authenticated`.
  - Notifications are addressed only from server-side data (`suscripciones.atleta_id`, `_admins_tenant`); the client cannot choose a recipient.
  - Emails carry only that subscription's data; no payment proof file or link to it is included.
  - Logs never contain email addresses (inherited from the dispatcher).
- **Performance**:
  - Triggers do one indexed lookup by primary key plus one insert per recipient; no scans.
  - The `pagos` update trigger is declared `after update of estado, comprobante_path`, so other updates do not run it.
- **Accessibility**: no UI change; notifications appear in the existing bell and inbox.
- **Error handling**:
  - Trigger failures are downgraded to warnings and never block the write.
  - Email failures follow the US-0125 retry schedule and are recorded in `notificaciones_outbox.ultimo_error`.

---

## Out of Scope

Expiry reminders (US-0135), per-user or per-tenant switches for these notifications, notifications to trainers, notifications for bookings, and converting the subscription writes to RPCs.
