Tasks are listed page → component → hook → service → types. The UI design is approved (design.md, D11): it mirrors the "Reglas de Suspensión" card and modal.

## 1. Branch setup

- [x] 1.1 Create the branch `feat/tenant-expiry-notification-rules` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Page

- [x] 2.1 `src/app/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion/page.tsx`: render `<TenantReglasNotificacionCard tenantId={tenantId} />` full width below the grid of `TenantPaymentMethodsCard` and `TenantReglasSuspensionCard`

## 3. Components

- [x] 3.1 Create `src/components/portal/tenant/TenantReglasNotificacionCard.tsx` copying the structure of `TenantReglasSuspensionCard`: header (icon, title "Notificaciones automáticas", subtitle, "Agregar" button), loading, error with "Reintentar", empty state "Aún no hay reglas. Sin reglas no se envían avisos de vencimiento."
- [x] 3.2 Card: list the rules in the groups "Antes del vencimiento" and "Después del vencimiento" (a group without rules is not rendered), ordered by `dias`; each row shows "{N} días antes de vencer" / "{N} días después de vencer" ("1 día" for 1), the "Activa" / "Inactiva" badge, the recipients label, the channels, and "Editar" / "Eliminar" icon buttons with `aria-label`
- [x] 3.3 Card: disable "Agregar" with the hint "Máximo 3 reglas por tipo" when both types have 3 rules; add the footnote "Los avisos se envían cada día a las 8:00 a. m. (hora de Bogotá)."
- [x] 3.4 Card: delete confirmation dialog, as in `TenantReglasSuspensionCard`
- [x] 3.5 Create `src/components/portal/tenant/ReglaNotificacionFormModal.tsx` copying `ReglaSuspensionFormModal`: fields Tipo (radio group with legend; read-only when editing; a type with 3 rules disabled when creating), Días, Destinatarios (native select, default "Solo atletas"), Canales (checkbox group with legend, both checked), Activa
- [x] 3.6 Modal: client validation and messages ("Ingresa un número de días entre 1 y 60.", "Selecciona al menos un canal."), `role="alert"` + `aria-describedby`, show the hook's `submitError`, close on `Escape` / "Cancelar" unless saving, return focus to the trigger

## 4. Hook

- [x] 4.1 Create `src/hooks/portal/tenant/useReglasNotificacion.ts` following `useReglasSuspension`: load, `rules`, `isLoading`, `isSubmitting`, `error`, `reload`, modal state and open / close functions
- [x] 4.2 `handleCreate`, `handleUpdate`, `handleDelete`: refresh and close on success; on failure set `submitError` from the service error code (`duplicate` → "Ya existe una regla para ese número de días.", `max_reached` → "Solo puedes tener 3 reglas de cada tipo.", otherwise a generic message) and keep the modal open
- [x] 4.3 Expose `conteoPorTipo` (`{ vencimiento_pre, vencimiento_pos }`)

## 5. Service

- [x] 5.1 Create `src/services/supabase/portal/reglas-notificacion.service.ts` with `listReglas(tenantId)` (ordered by `tipo`, `dias`), `createRegla`, `updateRegla`, `deleteRegla` on the browser client
- [x] 5.2 Map errors to `ReglaNotificacionServiceError`: `23505` → `duplicate`, message containing `MAX_REGLAS_NOTIFICACION` → `max_reached`, `42501` → `forbidden`, else `unknown`

## 6. Types

- [x] 6.1 Create `src/types/portal/reglas-notificacion.types.ts`: `ReglaNotificacionTipo`, `ReglaNotificacionDestinatarios`, `REGLA_NOTIFICACION_DESTINATARIOS_LABELS`, `ReglaNotificacion`, `ReglaNotificacionCreatePayload`, `ReglaNotificacionUpdatePayload`, `ReglaNotificacionServiceError` (+ code type), `REGLA_NOTIFICACION_MAX_POR_TIPO = 3`, `REGLA_NOTIFICACION_DIAS_MAX = 60`

## 7. Server library

- [x] 7.1 Create `src/lib/notificaciones/modulos/suscripciones-vencimiento.ts` (`server-only`): loader of the subscription with plan, subtype, tenant and athlete (name, email) through `createServiceClient()`; return `null` when it is gone, its state no longer matches (pre → `activa`, pos → `vencida`) or its `fecha_fin` differs from the payload
- [x] 7.2 Add the athlete handlers `vencimiento_pre` and `vencimiento_pos` (subject "{title} — {plan}", rows, renewal paragraph, "Ver mis suscripciones")
- [x] 7.3 Add the administrator handlers `vencimiento_pre_admin` and `vencimiento_pos_admin` (subject "{title} — {atleta}", rows with the athlete's name and email, "Ver suscripciones")
- [x] 7.4 Export `suscripcionesVencimientoHandlers` and spread it into `HANDLERS` in `src/lib/notificaciones/registro.ts`

## 8. Database migration (local only)

- [x] 8.1 Create `supabase/migrations/20261012120000_tenant_reglas_notificacion.sql` wrapped in `begin; ... commit;` (use the next free timestamp if a later migration exists)
- [x] 8.2 Create `tenant_reglas_notificacion` with its checks, the unique constraint, the partial index, the `updated_at` trigger, the limit trigger (`MAX_REGLAS_NOTIFICACION`) and the immutability trigger (`TIPO_INMUTABLE`)
- [x] 8.3 Enable RLS, revoke from `anon`, grant `select, insert, update, delete` to `authenticated`, and create the four administrator-only policies
- [x] 8.4 Create `suscripcion_avisos_vencimiento` with RLS enabled, no policies and no client grants
- [x] 8.5 Create `idx_suscripciones_vencidas_fecha_fin` on `suscripciones (fecha_fin) where estado = 'vencida'`
- [x] 8.6 Create `notificar_vencimientos_suscripciones()` (Bogotá date, exact-day match, renewal check, log insert, recipients and channels, texts) and revoke it from clients
- [x] 8.7 Register the cron job `notificar-vencimientos-suscripciones` at `0 13 * * *` with the unschedule-then-schedule pattern
- [x] 8.8 Apply locally with `npx supabase migration up`. Never push the migration to the remote Supabase project

## 9. Verification

- [x] 9.1 Constraints: invalid `tipo`, `dias` 0 and 61, invalid `destinatarios`, no channel, duplicate, fourth rule of a type, change of `tipo` — all rejected
- [x] 9.2 RLS: an administrator of the tenant can read and write; a trainer, an athlete and an administrator of another tenant cannot; `anon` is denied; the log table and the job are not accessible to clients
- [x] 9.3 UI: empty state, create, edit (type read-only), delete with confirmation, grouping and order, each validation message, "Agregar" disabled at the limit, keyboard (`Escape`, focus return)
- [x] 9.4 Job, run by hand with `select public.notificar_vencimientos_suscripciones();` against prepared subscriptions: pre and pos on the exact day; other distances and null `fecha_fin` ignored; inactive rule ignored; second run creates nothing; renewal check; changed `fecha_fin` alerts again; another tenant untouched
- [x] 9.5 Recipients and channels: `atletas`, `administradores`, `todos`; email only; in-app only; trainers and `pendiente_activacion` administrators excluded; changing recipients afterwards does not re-send
- [x] 9.6 Texts: "1 día" vs "{N} días", `DD/MM/YYYY`, plan with subtype, administrator texts and links
- [x] 9.7 Emails in Mailpit: the four types with their subjects, rows and buttons; a row whose subscription changed state before dispatch is failed as `skipped`
- [x] 9.8 The cron job exists with schedule `0 13 * * *`
- [x] 9.9 Run `npx tsc --noEmit` and `npm run lint`; no new problem in the touched files. Do not run `build`

## 10. Documentation and delivery

- [x] 10.1 Update `projectspec/03-project-structure.md`: the two tables, the job and cron, the card, modal, hook, service, types and the new handlers file
- [x] 10.2 Write the commit message and the pull request description
