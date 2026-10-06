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

Two mechanisms, both ending in the US-0125 helpers, so delivery, retries, the bell and the inbox work as they already do:

1. **The purchase becomes a single RPC, `comprar_suscripcion`.** Today it is three client calls (subscription, payment, proof path), which is not atomic, lets the client choose the amount, and makes the proof arrive as a later update that cannot be told apart from a re-upload. The RPC creates the subscription and the payment — with the proof path already set — in one transaction and enqueues the purchase notifications itself. The proof file is uploaded **before** the RPC, to a path built from a payment id generated in the browser.
2. **Every other event is enqueued by `AFTER` row triggers** on `suscripciones` and `pagos`, because those writes stay direct table writes (administrator screens and the proof re-upload). Those services, hooks and components do not change.

Emails are rendered by new handlers registered under the module key `suscripciones`.

In the triggers the actor is identified with `auth.uid()`: an action is "by the athlete" when `auth.uid() = suscripciones.atleta_id`, otherwise it is "by staff" (also for the service role and cron, where `auth.uid()` is null).

#### Notification matrix

| # | Event (database condition) | Athlete | Tenant administrators |
|---|---|---|---|
| 1 | **Purchase**: `comprar_suscripcion` RPC | `suscripcion_recibida` (email + in-app) | `suscripcion_nueva_admin` (email + in-app) |
| 2 | **Payment approved**: `pagos.estado` `pendiente → validado` | `pago_validado` (email + in-app) | none |
| 3 | **Payment rejected**: `pagos.estado` `pendiente → rechazado` | `pago_rechazado` (email + in-app, with `motivo_rechazo`) | none |
| 4 | **Subscription approved**: `suscripciones.estado` `pendiente → activa` | `suscripcion_aprobada` (email + in-app) | none |
| 5 | **Subscription rejected**: `suscripciones.estado` `pendiente → cancelada`, by staff | `suscripcion_rechazada` (email + in-app) | none |
| 6 | **Proof uploaded again**: the athlete updates `pagos` with a non-null `comprobante_path` (the path may be the same: a re-upload with the same extension overwrites the file) | none | `pago_comprobante_admin` (email + in-app) |
| 7 | **Subscription assigned**: insert on `suscripciones` by someone other than the athlete | `suscripcion_asignada` (email + in-app) | none |

Rules:
- "Tenant administrators" = `_admins_tenant(tenant_id)` (role `administrador`, `estado <> 'pendiente_activacion'`). Trainers are not notified. The administrator who performs an action never receives a notification about it (rows 2–5 and 7 notify only the athlete).
- **Row 1, "requires validation or not"**: the administrator notification states it explicitly. A purchase requires validation when the subscription is `pendiente` or the payment is `pendiente`. With today's flow that is always true for a purchase made by the athlete; the text is still computed from the data so a future auto-approved purchase reads correctly.
  - Requires validation → title "Nueva suscripción por validar".
  - Does not → title "Nueva suscripción".
- **Row 6**: the proof of the purchase is part of the `pagos` insert done by the RPC, so it never fires this row. Every later change of `comprobante_path` to a non-null value by the athlete notifies: replacing a proof, uploading after a rejection, or uploading for the first time from "Mis suscripciones" after buying without one.
- **Row 7 and the administrator's own payment**: when an administrator creates a subscription and its payment, only `suscripcion_asignada` is sent. There is no notification on `pagos` inserts, and a payment inserted already `validado` is not a `pendiente → validado` transition, so row 2 does not fire.
- **Row 4 on an assigned subscription**: a subscription inserted directly as `activa` is not a transition, so only row 7 fires. One inserted as `pendiente` and approved later fires row 7 and then row 4.
- Athlete cancelling the own pending subscription, `activa → cancelada`, `activa → vencida`, edits and deletions send nothing. (Expiry reminders are US-0135.)
- A trigger must never make the write fail: each trigger body is wrapped in `exception when others then raise warning`.

#### Purchase flow (athlete)

`useSuscripcion.submit` changes to:

1. Generate the payment id in the browser (`crypto.randomUUID()`), kept in a ref for the lifetime of the open modal so a retry reuses it.
2. When a file was chosen, upload it first with `storageService.uploadPaymentProof(supabase, tenantId, user.id, pagoId, file, { upsert: true })`. The storage policy `athlete_upload_own_receipts` does not require the payment row to exist. A failed upload stays non-blocking, as today: the purchase continues without a proof.
3. Call `suscripcionesService.comprarSuscripcion(...)` with the payment id and the uploaded path (or `null`).
4. On success keep the current ending ("Solicitud enviada. El administrador revisará tu suscripción.", close the modal).

Errors shown inline in the modal, as today:

| RPC error | Message |
|---|---|
| `PLAN_NO_DISPONIBLE`, `SUBTIPO_NO_DISPONIBLE` | "Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente." |
| `SUSCRIPCION_PENDIENTE_EXISTENTE` | "Ya tienes una solicitud pendiente para este plan." |
| `METODO_PAGO_INVALIDO` | "El método de pago seleccionado ya no está disponible. Elige otro." |
| `COMPROBANTE_INVALIDO` | "No se pudo adjuntar el comprobante. Inténtalo nuevamente." |
| any other | "No fue posible crear la suscripción." |

The partial state "Se creó la suscripción pero hubo un error al registrar el pago" can no longer happen and its message is removed. The pre-check `hasPendingSuscripcion` when the modal opens stays (it only disables the form early); the RPC is the authority.

The amount is no longer sent by the client: the RPC takes it from `plan_tipos.precio` (0 for a plan without subtypes, as today).

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

### 0. Purchase RPC: `comprar_suscripcion`

```sql
create or replace function public.comprar_suscripcion(
  p_tenant_id        uuid,
  p_plan_id          uuid,
  p_plan_tipo_id     uuid,
  p_metodo_pago_id   uuid,
  p_comentarios      text,
  p_pago_id          uuid,
  p_comprobante_path text
) returns jsonb
language plpgsql security definer set search_path = public as $$ ... $$;
revoke all on function public.comprar_suscripcion(uuid, uuid, uuid, uuid, text, uuid, text) from public, anon;
grant execute on function public.comprar_suscripcion(uuid, uuid, uuid, uuid, text, uuid, text) to authenticated;
```

Steps, in one transaction (any failure rolls everything back):

1. `auth.uid()` null → `raise exception 'FORBIDDEN' using errcode = '42501'`. The athlete is always `auth.uid()`; the client cannot buy for someone else.
2. `not can_subscribe_to_plan(p_plan_id, p_tenant_id)` → `PLAN_NO_DISPONIBLE` (same rule the dropped insert policy applied: plan of that tenant, `activo`, `visible_atletas`, and public or the caller is a member).
3. Subtype: when the plan has at least one `plan_tipos` row with `activo`, `p_plan_tipo_id` must be one of them; when it has none, `p_plan_tipo_id` must be null. Otherwise → `SUBTIPO_NO_DISPONIBLE`.
4. A `suscripciones` row of the caller for this plan with `estado = 'pendiente'` exists → `SUSCRIPCION_PENDIENTE_EXISTENTE`. Take `pg_advisory_xact_lock(hashtext(auth.uid()::text || p_plan_id::text))` first so two simultaneous calls cannot both pass.
5. `p_metodo_pago_id` not null and not an active `tenant_metodos_pago` row of `p_tenant_id` → `METODO_PAGO_INVALIDO`.
6. Proof: `p_comprobante_path` null is allowed. Otherwise it must match `orgs/{p_tenant_id}/users/{auth.uid()}/receipts/{p_pago_id}.{ext}` and exist in `storage.objects` (`bucket_id = 'org-assets'`), else → `COMPROBANTE_INVALIDO`. `p_pago_id` null is allowed only with a null path (the function then uses `gen_random_uuid()`); a `p_pago_id` that already exists in `pagos` → `COMPROBANTE_INVALIDO`.
7. Insert `suscripciones` (`estado = 'pendiente'`, `comentarios = nullif(btrim(p_comentarios), '')`).
8. When `p_plan_tipo_id` is not null: `perform populate_suscripcion_servicios(suscripcion_id, p_plan_tipo_id)`.
9. Insert `pagos` with `id = p_pago_id`, `monto = coalesce(plan_tipos.precio, 0)`, `estado = 'pendiente'`, `metodo_pago_id`, `comprobante_path`.
10. `perform _encolar_notificacion_suscripcion(suscripcion_id, 'suscripcion_recibida', pago_id)` and the same with `'suscripcion_nueva_admin'`, inside a `begin ... exception when others then raise warning` block so a notification problem never undoes the purchase.
11. Return `{ "suscripcion_id": ..., "pago_id": ... }`.

**RLS**: drop the policies `suscripciones_insert_own` and `pagos_insert_own`. Athletes can then create subscriptions and payments only through the RPC; the administrator insert policies (`suscripciones` admin insert, `pagos_insert_admin`) and `pagos_update_own` (proof re-upload) are unchanged.

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

The triggers skip rows written by `comprar_suscripcion` by construction: its `suscripciones` insert has `auth.uid() = atleta_id` (no `suscripcion_asignada`), and its `pagos` row is an insert (the `pagos` trigger is update-only).

### 2. Trigger functions (all `security definer`, `set search_path = public`, body wrapped in `exception when others then raise warning ...; return null;`)

| Trigger | Table / event | Condition → call |
|---|---|---|
| `suscripciones_notificar_insert` | `after insert on suscripciones for each row` | `auth.uid() is distinct from NEW.atleta_id` → `suscripcion_asignada` |
| `suscripciones_notificar_estado` | `after update of estado on suscripciones for each row when (OLD.estado is distinct from NEW.estado)` | `OLD.estado = 'pendiente' and NEW.estado = 'activa'` → `suscripcion_aprobada`; `OLD.estado = 'pendiente' and NEW.estado = 'cancelada' and auth.uid() is distinct from NEW.atleta_id` → `suscripcion_rechazada` |
| `pagos_notificar_update` | `after update of estado, comprobante_path on pagos for each row` | `OLD.estado = 'pendiente' and NEW.estado = 'validado'` → `pago_validado`; `OLD.estado = 'pendiente' and NEW.estado = 'rechazado'` → `pago_rechazado`; proof rule below → `pago_comprobante_admin` |

Proof rule in `pagos_notificar_update`:

```sql
NEW.comprobante_path is not null
and auth.uid() = (select s.atleta_id from suscripciones s where s.id = NEW.suscripcion_id)
```

`pagos` rows with `suscripcion_id is null` are ignored.

### 3. RLS

Only the two dropped insert policies of section 0. The helper and trigger functions are SECURITY DEFINER and revoked from `public`, `anon` and `authenticated`; they write to `notificaciones_outbox` (no client grants) and `notificaciones` (owner-only `select`) exactly as US-0125 defines.

---

## API / Server Actions

No new route or server action.

### Browser service — `src/services/supabase/portal/suscripciones.service.ts`

- **Function**: `comprarSuscripcion(payload: ComprarSuscripcionPayload): Promise<{ suscripcionId: string; pagoId: string }>`
- **Input**: `{ tenantId: string; planId: string; planTipoId: string | null; metodoPagoId: string | null; comentarios: string | null; pagoId: string; comprobantePath: string | null }`
- **Call**: `supabase.rpc('comprar_suscripcion', { p_tenant_id, p_plan_id, p_plan_tipo_id, p_metodo_pago_id, p_comentarios, p_pago_id, p_comprobante_path })`
- **Errors**: `SuscripcionServiceError` with codes `plan_unavailable` (`PLAN_NO_DISPONIBLE`, `SUBTIPO_NO_DISPONIBLE`), `pending_exists`, `invalid_payment_method`, `invalid_proof`, `unknown`.
- **Auth**: `authenticated`; the athlete is `auth.uid()` on the server.
- **Removed**: `suscripcionesService.createSuscripcion` and `pagosService.createPago` (their only caller is `useSuscripcion`), together with the types `SuscripcionInsert` and `PagoInsert` if nothing else uses them. `pagosService.updateComprobantePath` stays for `useSubirComprobante`.

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
| Migration | `supabase/migrations/20261011120000_notificaciones_suscripciones.sql` | `comprar_suscripcion` RPC, drop the two athlete insert policies, `_encolar_notificacion_suscripcion`, 3 trigger functions + 3 triggers |
| Service | `src/services/supabase/portal/suscripciones.service.ts` | Add `comprarSuscripcion`; remove `createSuscripcion` |
| Service | `src/services/supabase/portal/pagos.service.ts` | Remove `createPago` |
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | `submit`: client payment id, upload first, one RPC call, new error mapping |
| Types | `src/types/portal/suscripciones.types.ts` | `ComprarSuscripcionPayload`; new `SuscripcionServiceError` codes; drop `SuscripcionInsert` if unused |
| Types | `src/types/portal/pagos.types.ts` | Drop `PagoInsert` if unused |
| Lib (server) | `src/lib/notificaciones/modulos/suscripciones.ts` | New: 8 email handlers |
| Lib (server) | `src/lib/notificaciones/registro.ts` | Register `suscripcionesHandlers` |
| Docs | `projectspec/03-project-structure.md` | Add the module file, the triggers and the matrix to "Notifications module" |

No page or component changes: `SuscripcionModal` keeps its props and renders the error string the hook gives it.

---

## Acceptance Criteria

1. When an athlete buys a plan, the athlete gets one `suscripcion_recibida` in-app notification and one outbox row, and every active administrator of the tenant gets one `suscripcion_nueva_admin` in-app notification and one outbox row.
2. The administrator notification of a purchase is titled "Nueva suscripción por validar" while the subscription or its payment is `pendiente`.
3. A purchase with a payment proof attached creates the payment with `comprobante_path` already set, produces exactly one administrator notification (no `pago_comprobante_admin`), and the administrator email shows "Comprobante adjunto: Sí".
4. A purchase without a proof, or whose proof upload failed, produces the same notifications and the administrator email shows "Comprobante adjunto: No".
5. When an administrator approves a payment, the athlete gets `pago_validado`; no administrator is notified.
6. When an administrator rejects a payment with a reason, the athlete gets `pago_rechazado` and both the in-app message and the email contain the reason.
7. When an administrator approves a pending subscription, the athlete gets `suscripcion_aprobada` whose message includes the end date.
8. When an administrator cancels a pending subscription, the athlete gets `suscripcion_rechazada`. When the athlete cancels the own pending subscription, nothing is sent.
9. When an athlete uploads a proof after a rejection, replaces an existing proof, or uploads the first proof of a purchase made without one, every administrator gets `pago_comprobante_admin`; the athlete gets nothing.
10. When an administrator creates a subscription for an athlete, with or without a payment, the athlete gets exactly one notification (`suscripcion_asignada`) and no administrator is notified.
11. A subscription created by an administrator as `pendiente` and approved later produces `suscripcion_asignada` and then `suscripcion_aprobada`.
12. Expiry by the daily cron, edits, deletions and `activa → cancelada` send nothing.
13. Trainers, athletes other than the buyer, and administrators in `pendiente_activacion` receive nothing.
14. In-app notifications of the athlete link to `/portal/mis-suscripciones`; those of administrators link to `/portal/orgs/{tenant_id}/gestion-suscripciones`.
15. With the local Mailpit transport (`EMAIL_DEV_MAILPIT_URL`), each of the 8 types is delivered with the subject "{title} — {plan}" and the expected rows and button.
16. If a trigger function raises internally, the insert or update of `suscripciones` / `pagos` still succeeds.
17. An outbox row whose subscription was deleted before dispatch is resolved as failed with `skipped` and no email is sent.
18. The purchase is atomic: when `comprar_suscripcion` fails at any step, no `suscripciones`, `suscripcion_servicios` or `pagos` row is left behind and no notification is created.
19. The payment amount equals `plan_tipos.precio` of the chosen subtype (0 for a plan without subtypes), whatever the client sends.
20. `comprar_suscripcion` rejects: a plan that is inactive, hidden, of another tenant, or private for a non-member (`PLAN_NO_DISPONIBLE`); a missing, inactive or foreign subtype (`SUBTIPO_NO_DISPONIBLE`); a second pending request for the same plan, including two simultaneous calls (`SUSCRIPCION_PENDIENTE_EXISTENTE`); a payment method of another tenant or inactive (`METODO_PAGO_INVALIDO`); a proof path of another user, tenant or payment id, or a file that does not exist (`COMPROBANTE_INVALIDO`). Each shows its message in the modal.
21. An athlete can no longer insert into `suscripciones` or `pagos` directly (permission error); administrators still can.
22. Retrying a failed purchase in the same modal reuses the payment id and overwrites the uploaded proof instead of leaving a second file.
23. Buying from "Planes" of an organization and from the public plans modal (`PlanesPublicosModal`) both work as before from the athlete's point of view.
24. `npx tsc --noEmit` passes and `npm run lint` reports no new problem.

---

## Implementation Steps

- [ ] Create branch `feat/subscription-notifications` and verify it is not `main`/`master`/`develop`
- [ ] Write the migration and apply it locally with `npx supabase migration up` (never push it to the remote project)
- [ ] Add `comprarSuscripcion` to the service, update the types, and remove `createSuscripcion` / `createPago`
- [ ] Rewrite `useSuscripcion.submit` (payment id, upload first, RPC, error mapping)
- [ ] Add `src/lib/notificaciones/modulos/suscripciones.ts` and register it in `registro.ts`
- [ ] Verify the helper and trigger functions are not executable by `anon` / `authenticated`, that `comprar_suscripcion` is executable only by `authenticated`, and that athletes can no longer insert directly
- [ ] Test the purchase RPC: every rejection code, atomic rollback, server-side amount, retry with the same payment id, member plan and public plan
- [ ] Test manually with Mailpit: purchase with and without proof, approve and reject payment, approve and cancel subscription, proof re-upload (after rejection, replacement, late first upload), administrator-created subscription in each state combination
- [ ] Test the negative cases: athlete self-cancel, expiry cron, edit, delete
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run `npx tsc --noEmit` and `npm run lint` (do not run `build`)
- [ ] Write the commit message and PR description

---

## Non-Functional Requirements

- **Security**:
  - All new functions are SECURITY DEFINER with `search_path = public` and revoked from `public`, `anon` and `authenticated`.
  - `comprar_suscripcion` derives the athlete from `auth.uid()` and the amount from `plan_tipos`, and validates plan, subtype, payment method and proof path on the server; the direct athlete insert policies are dropped so the RPC cannot be bypassed.
  - Notifications are addressed only from server-side data (`suscripciones.atleta_id`, `_admins_tenant`); the client cannot choose a recipient.
  - Emails carry only that subscription's data; no payment proof file or link to it is included.
  - Logs never contain email addresses (inherited from the dispatcher).
- **Performance**:
  - The purchase is one round trip instead of three or four. The advisory lock is per athlete and plan, so it never blocks other buyers.
  - Triggers do one indexed lookup by primary key plus one insert per recipient; no scans.
  - The `pagos` trigger is declared `after update of estado, comprobante_path`, so other updates do not run it.
- **Accessibility**: no UI change; purchase errors keep using the modal's existing inline error; notifications appear in the existing bell and inbox.
- **Error handling**:
  - RPC business errors are raised with stable codes and mapped to the Spanish messages above; a notification failure inside the RPC or a trigger is downgraded to a warning and never blocks the write.
  - A proof file uploaded for a purchase that was then rejected by the RPC and never retried stays in storage as an orphan (athletes have no delete policy on receipts); accepted.
  - Email failures follow the US-0125 retry schedule and are recorded in `notificaciones_outbox.ultimo_error`.

---

## Out of Scope

Expiry reminders (US-0135), per-user or per-tenant switches for these notifications, notifications to trainers, notifications for bookings, and converting the remaining subscription writes (administrator screens, proof re-upload) to RPCs.
