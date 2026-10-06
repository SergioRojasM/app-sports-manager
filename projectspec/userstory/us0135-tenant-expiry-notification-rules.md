# US-0135 — Tenant Notification Rules: Subscription Expiry Alerts

## ID
US-0135

## Name
Tenant-configurable notification rules, with automatic in-app and email alerts before and after a subscription expires

## As a
- **Organization administrator**
- **Athlete** with a subscription in that organization

## I Want
- As an administrator: to configure, from "Gestión de organización", how many days before and after a subscription's end date my athletes are alerted, and through which channels.
- As an athlete: to be reminded that my subscription is about to expire, and that it has expired, in the portal and by email.

## So That
Athletes renew on time and organizations recover lapsed subscriptions without contacting each athlete by hand.

---

## Description

### Current State

- `vencer_suscripciones_expiradas()` (cron `vencer-suscripciones-diarias`, 06:00 UTC, migration `20260604000100_cron_vencimiento_suscripciones.sql`) moves `activa` subscriptions whose `fecha_fin < current_date` to `vencida`. It notifies nobody.
- Tenant-level rules already exist for suspensions: table `tenant_reglas_suspension`, `TenantReglasSuspensionCard` + `ReglaSuspensionFormModal`, hook `useReglasSuspension`, service `reglas-suspension.service.ts`. The card is rendered in `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` next to `TenantPaymentMethodsCard`.
- The notifications module (US-0125) provides `_notificar_email`, `_notificar_in_app`, the dispatcher and the handler registry. Subscriptions have no automatic alerts.
- `suscripciones.fecha_fin` is a `date` and may be null.

### Proposed Changes

#### Data model

A new child table of `tenants`, `tenant_reglas_notificacion`: one row per alert rule.

| Field | Meaning |
|---|---|
| `tipo` | `vencimiento_pre` (before the end date) or `vencimiento_pos` (after it) |
| `dias` | Days of distance from `fecha_fin`, 1 to 60 |
| `canal_in_app`, `canal_email` | Channels; at least one must be on |
| `activo` | Rule enabled |

- A tenant may have at most **3 rules per `tipo`** and no two rules with the same `tipo` and `dias`.
- A tenant without rules sends no alerts (no default rules are seeded).
- The `tipo` column is an open list guarded by a check constraint, so later stories can add other conditions without a new table.

#### Automatic alerts

A daily job evaluates the active rules. "Today" is the current date in `America/Bogota`.

| Rule | A subscription matches when | Notification |
|---|---|---|
| `vencimiento_pre`, `dias = N` | `estado = 'activa'` and `fecha_fin = today + N` | `vencimiento_pre` |
| `vencimiento_pos`, `dias = N` | `estado = 'vencida'` and `fecha_fin = today - N` | `vencimiento_pos` |

- Recipient: the athlete of the subscription (`suscripciones.atleta_id`), whether or not they are a member of the tenant. Administrators are not notified.
- **Renewal check**: no alert is sent when the athlete has another subscription in the same tenant with `estado in ('activa', 'pendiente')` whose `fecha_fin` is null or later than this one's (they already renewed or have a request in review).
- **No duplicates**: every alert is recorded in a log keyed by subscription, `tipo`, `dias` and `fecha_fin`. Running the job twice on the same day, or re-enabling a rule, never repeats an alert. Changing a subscription's `fecha_fin` makes it eligible again for the new date.
- **Exact-day match**: a rule created today does not alert subscriptions that already passed its day (for example a new "3 days after" rule does not notify everything that expired last month). If the job does not run on a given day, that day's alerts are not sent later.
- Subscriptions with `fecha_fin is null` never match.
- The job runs at **13:00 UTC (8:00 a.m. Bogotá)**, after the 06:00 UTC expiry job, so `vencimiento_pos` sees the `vencida` state.

In-app notification (`modulo = 'suscripciones'`, `entidad_tipo = 'suscripcion'`, `url = '/portal/mis-suscripciones'`):

| `tipo` | `titulo` | `mensaje` |
|---|---|---|
| `vencimiento_pre` | Tu suscripción está por vencer | Tu suscripción a {plan} en {tenant} vence en {N} días, el {fecha_fin}. |
| `vencimiento_pos` | Tu suscripción venció | Tu suscripción a {plan} en {tenant} venció hace {N} días, el {fecha_fin}. |

- `{N} días` reads "1 día" when `N = 1`. `{fecha_fin}` is `DD/MM/YYYY`. `{plan}` = `planes.nombre`, plus ` — {plan_tipos.nombre}` when the subscription has a subtype.

Email: subject = the title followed by ` — {plan}`; rows Organización, Plan, Fecha de vencimiento; button "Ver mis suscripciones" → `{APP_URL}/portal/mis-suscripciones`. For `vencimiento_pre` the paragraph is "Renueva tu plan para no perder el acceso."; for `vencimiento_pos`, "Renueva tu plan para volver a reservar." The handler returns `null` (row `skipped`) when the subscription no longer exists, or when at send time it is no longer `activa` (pre) / `vencida` (pos).

#### UI — "Notificaciones automáticas" card in Gestión de organización

- New card `TenantReglasNotificacionCard` rendered in `gestion-organizacion/page.tsx` below the existing two-column grid, full width.
- The card mirrors `TenantReglasSuspensionCard` (same header, list rows, action buttons and states) and its form mirrors `ReglaSuspensionFormModal` (right-side slide modal). Per the rule in `openspec/config.yaml`, the visual design must be approved before building the components.
- Header: title "Notificaciones automáticas", subtitle "Avisa a tus atletas antes y después de que venza su suscripción.", button "Agregar regla" (disabled with the hint "Máximo 3 reglas por tipo" when both types already have 3).
- Rules are listed in two groups, "Antes del vencimiento" and "Después del vencimiento", each ordered by `dias` ascending. A row shows:
  - the sentence "{N} días antes de vencer" / "{N} días después de vencer" ("1 día" when `N = 1`);
  - channel tags "En la plataforma" and/or "Correo";
  - an "Activa" / "Inactiva" badge;
  - "Editar" and "Eliminar" actions (delete asks for inline confirmation).
- Empty state: "Aún no hay reglas. Sin reglas no se envían avisos de vencimiento."
- Form fields:
  - "Tipo" (radio): "Antes del vencimiento" / "Después del vencimiento". Read-only when editing.
  - "Días" (integer input, 1–60, required).
  - "Canales" (checkboxes): "En la plataforma", "Correo electrónico". At least one required. Both checked by default.
  - "Activa" (checkbox, default checked).
- Validation messages (inline, `role="alert"`):
  - days empty or out of range → "Ingresa un número de días entre 1 y 60."
  - no channel → "Selecciona al menos un canal."
  - duplicate `tipo` + `dias` (also from the database unique violation `23505`) → "Ya existe una regla para ese número de días."
  - fourth rule of a type (also from the database error `MAX_REGLAS_NOTIFICACION`) → "Solo puedes tener 3 reglas de cada tipo."
- A footnote in the card: "Los avisos se envían cada día a las 8:00 a. m. (hora de Bogotá)."

---

## Database Changes

One migration, `supabase/migrations/20261012120000_tenant_reglas_notificacion.sql`, wrapped in `begin; ... commit;`. Local only; never pushed to the remote project.

### 1. `public.tenant_reglas_notificacion`

```sql
create table public.tenant_reglas_notificacion (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  tipo          varchar(30) not null,
  dias          integer not null,
  canal_in_app  boolean not null default true,
  canal_email   boolean not null default true,
  activo        boolean not null default true,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint tenant_reglas_notificacion_tipo_ck check (tipo in ('vencimiento_pre', 'vencimiento_pos')),
  constraint tenant_reglas_notificacion_dias_ck check (dias between 1 and 60),
  constraint tenant_reglas_notificacion_canal_ck check (canal_in_app or canal_email),
  constraint tenant_reglas_notificacion_uk unique (tenant_id, tipo, dias)
);
create index idx_tenant_reglas_notificacion_activas
  on public.tenant_reglas_notificacion (tipo, dias) where activo;
```

- `updated_at` trigger with the existing `public.set_updated_at()`.
- `before insert` trigger `tenant_reglas_notificacion_max`: raises `MAX_REGLAS_NOTIFICACION` when the tenant already has 3 rows of `NEW.tipo`.
- `tipo` is immutable: a `before update` trigger raises `TIPO_INMUTABLE` when `NEW.tipo is distinct from OLD.tipo` or `NEW.tenant_id is distinct from OLD.tenant_id`.

**RLS** (enabled; `revoke all` from `anon`; `grant select, insert, update, delete` to `authenticated`):

| Policy | Command | Rule |
|---|---|---|
| `tenant_reglas_notificacion_select_admin` | select | `tenant_id in (select id from public.get_admin_tenants_for_authenticated_user())` |
| `tenant_reglas_notificacion_insert_admin` | insert | same, as `with check` |
| `tenant_reglas_notificacion_update_admin` | update | same, as `using` and `with check` |
| `tenant_reglas_notificacion_delete_admin` | delete | same, as `using` |

Unlike `tenant_reglas_suspension`, `select` is limited to the tenant's administrators: athletes have no reason to read these rules.

### 2. `public.suscripcion_avisos_vencimiento` (duplicate guard)

```sql
create table public.suscripcion_avisos_vencimiento (
  suscripcion_id uuid not null references public.suscripciones(id) on delete cascade,
  tipo           varchar(30) not null,
  dias           integer not null,
  fecha_fin      date not null,
  created_at     timestamptz not null default now(),
  primary key (suscripcion_id, tipo, dias, fecha_fin)
);
```

RLS enabled, no policies, `revoke all` from `anon` and `authenticated` (written only by the job).

### 3. Function and cron

`public.notificar_vencimientos_suscripciones() returns integer` — SECURITY DEFINER, `search_path = public`, revoked from `public`, `anon`, `authenticated`. Returns the number of alerts created.

For each active rule and each matching subscription (conditions of the table in "Automatic alerts", including the renewal check):
1. `insert into suscripcion_avisos_vencimiento ... on conflict do nothing`; continue only when a row was inserted.
2. When `canal_in_app`: `_notificar_in_app(atleta_id, tenant_id, 'suscripciones', tipo, titulo, mensaje, '/portal/mis-suscripciones', 'suscripcion', suscripcion_id)`.
3. When `canal_email`: `_notificar_email(tenant_id, 'suscripciones', tipo, usuarios.email, atleta_id, 'suscripcion', suscripcion_id, payload)` with payload `{ suscripcion_id, tenant_id, plan, tenant_nombre, dias, fecha_fin }`.

"Today" = `(now() at time zone 'America/Bogota')::date`.

Cron `notificar-vencimientos-suscripciones`, `0 13 * * *`, `select public.notificar_vencimientos_suscripciones();`, registered with the unschedule-then-schedule pattern.

The existing index `idx_suscripciones_estado_fecha_fin` covers only `activa`; add:

```sql
create index if not exists idx_suscripciones_vencidas_fecha_fin
  on public.suscripciones (fecha_fin) where estado = 'vencida';
```

---

## API / Server Actions

### Browser service — `src/services/supabase/portal/reglas-notificacion.service.ts`

`export const reglasNotificacionService = { ... }` on the browser client, following `reglas-suspension.service.ts`.

| Function | Input | Return | Auth |
|---|---|---|---|
| `listReglas` | `tenantId: string` | `ReglaNotificacion[]` ordered by `tipo`, `dias` | RLS: tenant administrators |
| `createRegla` | `ReglaNotificacionCreatePayload` (`tenant_id`, `tipo`, `dias`, `canal_in_app`, `canal_email`, `activo`) | `ReglaNotificacion` | RLS insert |
| `updateRegla` | `id: string`, `ReglaNotificacionUpdatePayload` (`dias`, `canal_in_app`, `canal_email`, `activo`) | `ReglaNotificacion` | RLS update |
| `deleteRegla` | `id: string` | `void` | RLS delete |

Errors are mapped to `ReglaNotificacionServiceError` with codes `duplicate` (`23505`), `max_reached` (message contains `MAX_REGLAS_NOTIFICACION`), `forbidden` (`42501`) and `unknown`.

### Server library

- **File**: `src/lib/notificaciones/modulos/suscripciones-vencimiento.ts` (`import 'server-only'`)
- **Export**: `suscripcionesVencimientoHandlers` with the keys `suscripciones.vencimiento_pre` and `suscripciones.vencimiento_pos`.
- **Input / return**: `NotificacionOutboxRow` → `NotificacionEmail | null` (`null` when the subscription is gone or its state no longer matches the alert).
- **Data access**: `createServiceClient()`, subscription by `entidad_id` with plan, subtype and tenant names.
- **File**: `src/lib/notificaciones/registro.ts` — spread the new handlers into `HANDLERS`.

No new route handler.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261012120000_tenant_reglas_notificacion.sql` | Rules table + RLS + triggers, log table, job function, cron, index |
| Types | `src/types/portal/reglas-notificacion.types.ts` | `ReglaNotificacionTipo`, `ReglaNotificacion`, create/update payloads, `ReglaNotificacionFormValues`, `ReglaNotificacionServiceError`, `REGLA_NOTIFICACION_MAX_POR_TIPO = 3`, `REGLA_NOTIFICACION_DIAS_MAX = 60` |
| Service | `src/services/supabase/portal/reglas-notificacion.service.ts` | New CRUD service |
| Hook | `src/hooks/portal/tenant/useReglasNotificacion.ts` | New: list, create, update, delete, modal state, per-type counters (mirrors `useReglasSuspension`) |
| Component | `src/components/portal/tenant/TenantReglasNotificacionCard.tsx` | New card |
| Component | `src/components/portal/tenant/ReglaNotificacionFormModal.tsx` | New right-side form modal |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` | Render `<TenantReglasNotificacionCard tenantId={tenantId} />` below the grid |
| Lib (server) | `src/lib/notificaciones/modulos/suscripciones-vencimiento.ts` | New: 2 email handlers |
| Lib (server) | `src/lib/notificaciones/registro.ts` | Register the handlers |
| Docs | `projectspec/03-project-structure.md` | Document table, job, cron, card, hook, service, types |

---

## Acceptance Criteria

1. An administrator sees the "Notificaciones automáticas" card in "Gestión de organización" with the empty state when the tenant has no rules.
2. An administrator can create a rule choosing type, days (1–60), channels and active state; it appears in the right group ordered by days.
3. Saving with days empty, 0, 61 or non-integer shows "Ingresa un número de días entre 1 y 60." and does not save.
4. Saving with no channel shows "Selecciona al menos un canal." and does not save.
5. Creating a second rule with the same type and days shows "Ya existe una regla para ese número de días."
6. A fourth rule of the same type is rejected with "Solo puedes tener 3 reglas de cada tipo.", both from the form and when inserted directly against the database.
7. An administrator can edit days, channels and active state of a rule, and cannot change its type; deleting asks for confirmation and removes it.
8. A trainer, an athlete or an administrator of another tenant can neither read nor write the tenant's rules (RLS), and the page stays under the `(administrador)` guard.
9. With an active rule `vencimiento_pre` of 3 days, an `activa` subscription whose `fecha_fin` is 3 days after today (Bogotá) produces, when the job runs, one in-app notification "Tu suscripción está por vencer" and one outbox row for its athlete.
10. With an active rule `vencimiento_pos` of 2 days, a `vencida` subscription whose `fecha_fin` was 2 days ago produces one "Tu suscripción venció" alert.
11. A rule with only "Correo" creates the outbox row and no in-app notification; a rule with only "En la plataforma" does the opposite.
12. Running the job twice on the same day creates no additional notification.
13. An inactive rule, a subscription with `fecha_fin` null, and a subscription whose distance to `fecha_fin` differs from the rule's days produce nothing.
14. No alert is sent to an athlete who has another `activa` or `pendiente` subscription in the same tenant ending later (or without end date).
15. A rule created today does not alert subscriptions whose matching day already passed.
16. Changing a subscription's `fecha_fin` makes it eligible again for alerts on the new date.
17. An athlete of tenant A is alerted only by tenant A's rules.
18. The message reads "1 día" for one day and "{N} días" otherwise, and shows the end date as `DD/MM/YYYY`.
19. If the subscription is renewed, cancelled or deleted between the job and the dispatch, the email is not sent and the outbox row is failed as `skipped`.
20. The cron job `notificar-vencimientos-suscripciones` is scheduled at `0 13 * * *` and `suscripcion_avisos_vencimiento` is not readable by `anon` or `authenticated`.
21. With the local Mailpit transport, both emails arrive with the subject "{title} — {plan}" and the "Ver mis suscripciones" button.
22. `npx tsc --noEmit` passes and `npm run lint` reports no new problem.

---

## Implementation Steps

- [ ] Create branch `feat/tenant-expiry-notification-rules` and verify it is not `main`/`master`/`develop`
- [ ] Get design approval for the card and the form modal
- [ ] Write the migration and apply it locally with `npx supabase migration up` (never push it to the remote project)
- [ ] Add types, service and hook
- [ ] Build `TenantReglasNotificacionCard` and `ReglaNotificacionFormModal`; wire the card into the page
- [ ] Add the email handlers and register them
- [ ] Verify RLS (administrator of the tenant only) and that the job function and log table have no client access
- [ ] Test manually: rule CRUD and validations; run `select public.notificar_vencimientos_suscripciones();` against subscriptions prepared for each case (pre, pos, channels, duplicates, renewal check, inactive rule, other tenant)
- [ ] Check both emails in Mailpit
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run `npx tsc --noEmit` and `npm run lint` (do not run `build`)
- [ ] Write the commit message and PR description

---

## Non-Functional Requirements

- **Security**:
  - Rules are readable and writable only by the tenant's administrators (RLS on all four commands); `tipo` and `tenant_id` are immutable.
  - The 3-per-type limit, the day range and the "at least one channel" rule are enforced in the database, not only in the form.
  - The job function and the log table have no client grants. Recipients are derived from `suscripciones.atleta_id` only.
- **Performance**:
  - The job is one set-based statement per run, using the partial indexes on `suscripciones (estado, fecha_fin)` for `activa` and the new one for `vencida`, and the partial index on active rules.
  - Emails are queued and sent by the existing dispatcher in batches of 20 per minute; a large tenant's alerts drain over several minutes.
- **Accessibility**:
  - The form modal traps focus, closes on `Escape` and returns focus to its trigger, as `ReglaSuspensionFormModal` does.
  - Type is a radio group with a legend; channels are a checkbox group with a legend; errors use `role="alert"` and are tied to their field with `aria-describedby`.
  - Active state and channels are shown as text, not colour alone.
- **Error handling**:
  - Load failure of the card shows an inline error with "Reintentar"; save and delete errors are shown inline in the modal or row.
  - A failure of the job is visible in `cron.job_run_details`; email failures follow the US-0125 retry schedule.

---

## Dependencies

US-0125 (notifications module). Independent of US-0134; both register handlers under the `suscripciones` module key with different `tipo` values.

## Out of Scope

Alerts to administrators, per-athlete opt-out, custom message text per tenant, other rule types (payments overdue, low class balance), a choice of sending hour, and catch-up of alerts for days on which the job did not run.
