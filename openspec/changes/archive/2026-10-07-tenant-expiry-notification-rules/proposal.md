## Why

Subscriptions expire silently. The daily job moves them to `vencida` and nobody is told: athletes find out when a booking is refused, and administrators have to check the subscriptions list to follow up. The notifications module (US-0125) can already deliver email and in-app notifications, and tenants already configure rules of their own for suspensions, so each organization can decide when and to whom expiry alerts are sent.

This change implements US-0135 (`projectspec/userstory/us0135-tenant-expiry-notification-rules.md`).

## What Changes

- New table `tenant_reglas_notificacion`, child of `tenants`: one row per alert rule with `tipo` (`vencimiento_pre` | `vencimiento_pos`), `dias` (1–60), `destinatarios` (`atletas` | `administradores` | `todos`), `canal_in_app`, `canal_email` and `activo`. At most 3 rules per type and tenant; no two rules with the same type and days. Readable and writable only by the tenant's administrators.
- New card "Notificaciones automáticas" in "Gestión de organización" with a right-side form modal, to list, create, edit and delete rules.
- New daily job `notificar_vencimientos_suscripciones()` (cron at 13:00 UTC, 8:00 a.m. Bogotá) that matches active rules against subscriptions by exact day and notifies the athlete, the tenant administrators or both, in the portal and/or by email.
- New log table `suscripcion_avisos_vencimiento` so an alert is never repeated for the same subscription, rule and end date.
- Four new email handlers under the module key `suscripciones`: `vencimiento_pre`, `vencimiento_pos` and their `_admin` variants.
- New partial index on `suscripciones (fecha_fin) where estado = 'vencida'`.

The approved UI design mirrors the existing "Reglas de Suspensión" card and its form modal.

### Implementation plan (page → component → hook → service → types)

1. Page: render the new card in `gestion-organizacion/page.tsx`, full width below the existing grid.
2. Components: `TenantReglasNotificacionCard` and `ReglaNotificacionFormModal`.
3. Hook: `useReglasNotificacion`.
4. Service: `reglas-notificacion.service.ts`.
5. Types: `reglas-notificacion.types.ts`.
6. Server library: `modulos/suscripciones-vencimiento.ts` and its registration.
7. Database: one migration (rules table with RLS and triggers, log table, job, cron, index), local only.
8. Verification, documentation, commit message and PR description.

### Files to create or modify

| Area | File | Change |
|------|------|--------|
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx` | Render `<TenantReglasNotificacionCard tenantId={tenantId} />` below the grid |
| Component | `src/components/portal/tenant/TenantReglasNotificacionCard.tsx` | New card |
| Component | `src/components/portal/tenant/ReglaNotificacionFormModal.tsx` | New right-side form modal |
| Hook | `src/hooks/portal/tenant/useReglasNotificacion.ts` | New |
| Service | `src/services/supabase/portal/reglas-notificacion.service.ts` | New CRUD service |
| Types | `src/types/portal/reglas-notificacion.types.ts` | New |
| Lib (server) | `src/lib/notificaciones/modulos/suscripciones-vencimiento.ts` | New: 4 email handlers |
| Lib (server) | `src/lib/notificaciones/registro.ts` | Register the handlers |
| Migration | `supabase/migrations/20261012120000_tenant_reglas_notificacion.sql` | Rules table + RLS + triggers, log table, job, cron, index |
| Docs | `projectspec/03-project-structure.md` | Document table, job, cron, card, hook, service, types |

## Non-goals

- A daily digest for administrators (they get one notification per matching subscription).
- Alerts to trainers.
- Per-user opt-out, and different channels per recipient group within one rule.
- Custom message text per tenant, and a configurable sending hour.
- Other rule types (overdue payments, low class balance).
- Catch-up of alerts for days on which the job did not run, and alerts for dates that passed before a rule was created.
- Default rules seeded for existing or new tenants.
- Applying the migration to the remote Supabase project.

## Capabilities

### New Capabilities
- `tenant-notification-rules`: the `tenant_reglas_notificacion` table with its constraints and RLS, the browser service and hook, and the "Notificaciones automáticas" card and form in "Gestión de organización".
- `subscription-expiry-alerts`: the daily job that matches rules against subscriptions, the duplicate guard, recipients and channels, the in-app texts and the emails.

### Modified Capabilities

None. The `gestion-organizacion` page gains a card without changing the existing requirements of `organization-view`.

## Impact

- **Database**: two new tables, one new cron job (`notificar-vencimientos-suscripciones`), one new index, three trigger functions on the rules table. No change to existing tables.
- **Client**: one new card on an administrator-only page.
- **Server**: one new handlers file; no new route.
- **Behaviour**: nothing is sent until a tenant creates a rule. Rules that include administrators send one message per administrator and matching subscription.
- **Depends on** US-0125 (notifications module). Independent of US-0134; both use the module key `suscripciones` with different `tipo` values.
