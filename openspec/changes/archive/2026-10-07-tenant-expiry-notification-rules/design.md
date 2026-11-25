## Context

US-0135 (`projectspec/userstory/us0135-tenant-expiry-notification-rules.md`) lets each tenant configure automatic alerts around a subscription's end date.

Current state, verified against the code and the local database:
- `vencer_suscripciones_expiradas()` runs daily at 06:00 UTC (cron `vencer-suscripciones-diarias`) and moves `activa` subscriptions with `fecha_fin < current_date` to `vencida`. Nothing is notified.
- `suscripciones.fecha_fin` is a `date` and may be null. `idx_suscripciones_estado_fecha_fin` is partial on `estado = 'activa'`.
- Tenant-level rules already exist for suspensions: `tenant_reglas_suspension`, `TenantReglasSuspensionCard`, `ReglaSuspensionFormModal`, `useReglasSuspension`, `reglas-suspension.service.ts`, `reglas-suspension.types.ts`. The card is rendered by `gestion-organizacion/page.tsx` in a two-column grid with `TenantPaymentMethodsCard`.
- The notifications module (US-0125) provides `_notificar_email`, `_notificar_in_app`, `_admins_tenant`, the dispatcher, the handler registry and the bell. US-0134 added `modulos/suscripciones.ts` under the module key `suscripciones`.
- Cron jobs are registered with the unschedule-then-schedule pattern.

Constraints: migrations are local only; type-check and lint must pass; `build` is never run; no test runner; emails are checked locally with Mailpit.

## Goals / Non-Goals

**Goals:**
- Administrators configure, per tenant, when alerts are sent, to whom and through which channels.
- Athletes and/or administrators are alerted exactly once per subscription, rule and end date.
- No alert is sent unless a tenant asked for it.
- The limits of the rules are enforced by the database.

**Non-Goals:**
- Digests, trainer alerts, opt-outs, custom texts, configurable hour, other rule types, catch-up of missed days.

## Decisions

### Architecture

```
gestion-organizacion/page.tsx
  └─ TenantReglasNotificacionCard ── useReglasNotificacion ── reglasNotificacionService ── reglas-notificacion.types
       └─ ReglaNotificacionFormModal                              (browser client, RLS: tenant administrators)
                                                                          │
                                                             tenant_reglas_notificacion
                                                                          │
pg_cron 13:00 UTC ──> notificar_vencimientos_suscripciones()
                        ├─ match active rules × suscripciones (exact day, Bogotá date, renewal check)
                        ├─ suscripcion_avisos_vencimiento  (insert ... on conflict do nothing)
                        └─ _notificar_in_app / _notificar_email  → athlete and/or _admins_tenant
notificaciones_outbox ──> dispatcher ──> registro ──> modulos/suscripciones-vencimiento.ts
```

### D1. A child table of `tenants`, one row per rule
Rules are a list (several distances per type), so they do not fit as columns on `tenants`. A dedicated table mirrors `tenant_reglas_suspension`, keeps RLS simple and lets later stories add rule types by extending the `tipo` check. JSON on `tenants` was rejected: no constraints, no per-row RLS.

### D2. Limits live in the database
The check constraints (type, 1–60 days, recipients, at least one channel), the unique `(tenant_id, tipo, dias)` and the two triggers (3 per type, immutable type and tenant) hold whatever the client does. The form repeats them only to give immediate feedback. The limit trigger can be raced by two simultaneous inserts; the worst case is a fourth rule for an administrator clicking twice, which is harmless and visible, so no lock is added.

### D3. Rules are readable only by administrators
`tenant_reglas_suspension` is readable by any authenticated user. Nothing outside the administrator page needs these rules, so all four policies use `get_admin_tenants_for_authenticated_user()`.

### D4. Exact-day matching with a log table
A rule fires on the single day `fecha_fin = today ± N`. A range (`<=`) would make a newly created "3 days after" rule notify every subscription that ever expired. The price is that a day on which the job does not run is lost; accepted and documented.

The log `suscripcion_avisos_vencimiento`, keyed by subscription, type, days and end date, makes the job idempotent (re-runs, re-enabled rules) and lets a subscription be alerted again when its end date changes. Checking for an existing notification row instead was rejected: a rule may have only the email channel, and outbox rows are not a stable history.

### D5. "Today" is the Bogotá date; the job runs at 13:00 UTC
`fecha_fin` is a plain date in the organization's local sense, so the comparison uses `(now() at time zone 'America/Bogota')::date`. 13:00 UTC is 8:00 a.m. in Bogotá: a reasonable hour for an email, and after the 06:00 UTC expiry job, so "after expiry" rules see the `vencida` state.

### D6. Renewal check
An athlete who already has another `activa` or `pendiente` subscription in the tenant that ends later (or has no end date) is not reminded: they renewed, or their request is under review. The check is per tenant, not per plan, because renewing into a different plan is still a renewal.

### D7. Recipients are an attribute of the rule
`destinatarios` selects athletes, administrators or both. Administrators get one notification per matching subscription, with their own text and link, under the types `vencimiento_pre_admin` / `vencimiento_pos_admin`. A digest would be easier on large tenants but needs a different data shape and template; it is a non-goal. Channels apply to every recipient of the rule; a tenant wanting different channels per audience creates two rules with different days.

The log is per subscription and rule, not per recipient, so changing a rule's audience later does not re-send past alerts.

### D8. One set-based function
`notificar_vencimientos_suscripciones()` loops over the matching `(rule, subscription)` pairs from one query that uses the partial indexes (`activa` existing, `vencida` new, active rules new). Volume per day is small (subscriptions ending on specific days), so a row loop calling the US-0125 helpers is simpler than set-based inserts into the notification tables and keeps one implementation of those inserts.

### D9. Handlers re-check the state at send time
The email is rendered later by the dispatcher. If the subscription was cancelled, deleted or its end date changed meanwhile, the handler returns `null` and the row is failed as `skipped`. The payload carries `fecha_fin` and `dias` so the email states what the alert was computed with. In-app notifications are created at once and are not retracted.

### D10. A separate handlers file
`modulos/suscripciones-vencimiento.ts` keeps expiry emails apart from the purchase and decision emails of US-0134 while sharing the module key `suscripciones`, so both stories can be merged in any order.

### D11. UI mirrors the suspension rules card (approved design)
Approved on 2026-10-06: the card and the right-side form modal copy `TenantReglasSuspensionCard` and `ReglaSuspensionFormModal` — header with icon, title and "Agregar" button; rule rows with an "Activa" / "Inactiva" badge, a detail line and edit / delete icon buttons; a confirmation dialog for deletion; the same loading, error and empty blocks. Differences: the card is full width below the existing grid, rules are split into "Antes del vencimiento" and "Después del vencimiento", the header has a subtitle, and a footnote states the sending hour. The form has Tipo (radio), Días, Destinatarios (select), Canales (checkboxes) and Activa.

## Risks / Trade-offs

- [The job does not run one day] → That day's alerts are lost (D4). Visible in `cron.job_run_details`.
- [Many administrators × many expiring subscriptions = many emails] → Only when a tenant chooses administrators as recipients; the dispatcher drains 20 per minute; a digest is a possible follow-up.
- [An alert goes out and the athlete renews minutes later] → Emails are skipped when the state changed before dispatch (D9); an already-created in-app notification stays.
- [Fourth rule through a race] → Harmless (D2).
- [Subscriptions edited to a past `fecha_fin`] → They match "after" rules only on the exact day, so backdated edits rarely alert; accepted.
- [Tenants in other timezones] → All tenants are treated as Bogotá, as the rest of the product does.
- [No automated tests] → Manual checklist: the job is run by hand against prepared subscriptions for every case.

## Migration Plan

1. Apply `20261012120000_tenant_reglas_notificacion.sql` locally with `npx supabase migration up` (not `db reset`, to keep local data).
2. Remote rollout (manual, by the owner): apply the migration and deploy the application in either order; nothing is sent until a tenant creates a rule.
3. Rollback: unschedule `notificar-vencimientos-suscripciones`, then drop the function, the two tables and the index; remove the card from the page.

## Open Questions

- None blocking. A daily digest for administrators and per-user opt-out are candidates for a later story.
