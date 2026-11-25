Tasks are listed page → component → hook → service → types. This change has no page, component, hook, browser service or type work; it is server-side only.

## 1. Branch setup

- [x] 1.1 Create the branch `feat/team-invitations-notifications-module` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Routes

- [x] 2.1 `src/app/auth/confirm/route.ts`: set `ALLOWED_TYPES` to `['invite', 'recovery']` and update the route comment
- [x] 2.2 `src/app/api/portal/orgs/[tenant_id]/invitaciones/route.ts`: call `deliverInvitation` with the trimmed input (no `email`, no `nombre`)
- [x] 2.3 `src/app/api/portal/orgs/[tenant_id]/invitaciones/[invitacion_id]/reenviar/route.ts`: same

## 3. Server library

- [x] 3.1 `src/lib/portal/invitaciones-delivery.ts`: remove `email` and `nombre` from `DeliverInvitationInput`; replace the `inviteUserByEmail` call with `service.rpc('encolar_invitacion_tenant', { p_invitacion_id })`
- [x] 3.2 `invitaciones-delivery.ts`: on RPC error call `registrar_fallo_invitacion(id, 'enqueue_error')`, log `invitacion_fallida` and return `errorResponse('unexpected', 500)`; on success log the event with `codigo: 'encolada'` and return `jsonNoStore({ invitacion_id }, 202)`; update the doc comment
- [x] 3.3 Create `src/lib/notificaciones/modulos/invitaciones.ts` (`server-only`): load the invitation with `tenant:tenants(nombre)` and `rol:roles(nombre)` through `createServiceClient()`; return `null` when it is gone, not `pendiente` / `enviada`, or expired
- [x] 3.4 `modulos/invitaciones.ts`: resolve the account with `rpc('_auth_usuario_por_email')` and build the link — `generateLink` invite (no account), `generateLink` recovery (never used), or the login link (established); on an "already exists" error of the invite link re-read the account and continue; throw `invite_link_failed` on any other link error
- [x] 3.5 `modulos/invitaciones.ts`: render the email (subject, greeting, sentence, rows Organización / Rol / Válida hasta in America/Bogota, branch paragraph and button, closing line; role labels; no `nota_admin`) with the shared layout
- [x] 3.6 Export `invitacionesHandlers` and spread it into `HANDLERS` in `src/lib/notificaciones/registro.ts`
- [x] 3.7 `src/lib/portal/privileged-route.ts`: remove `isEmailAlreadyRegistered` if nothing else imports it — kept: `miembros/aprovisionar/route.ts` uses it, and so does the new handler

## 4. Database migration (local only)

- [x] 4.1 Create `supabase/migrations/20261013120000_invitaciones_notificaciones.sql` wrapped in `begin; ... commit;` (use the next free timestamp if a later migration exists)
- [x] 4.2 Create `_auth_usuario_por_email(text)`; revoke from `public`, `anon`, `authenticated`; grant execute to `service_role`
- [x] 4.3 Create `encolar_invitacion_tenant(uuid)`: lock and validate the invitation, enqueue the email, create the in-app notification for an established account with a `usuarios` row, update the invitation; same grants
- [x] 4.4 Apply locally with `npx supabase migration up`. Never push the migration to the remote Supabase project

## 5. Cleanup

- [x] 5.1 Remove the `[auth.email.template.invite]` block from `supabase/config.toml` and delete `supabase/templates/invite.html`
- [x] 5.2 Confirm no `inviteUserByEmail` call remains under `src/`

## 6. Verification

- [x] 6.1 Grants: both new functions are executable only by `service_role`
- [x] 6.2 New email (no account): `202`, one outbox row, no in-app notification, no token in the payload; the email in Mailpit has the subject, rows and the button "Crear contraseña y aceptar"; the link signs in, shows the password page and then the invitation page, and the invitation can be accepted
- [x] 6.3 Established account: outbox row and in-app notification "Invitación a {tenant}" linking to `/portal/invitaciones/{id}`; the email has "Ver invitación" → `/auth/login?next=…` and no token
- [x] 6.4 Resend to a never-used account: the email carries a `type=recovery` link that signs in through `/auth/confirm` and lands on the password page
- [x] 6.5 Resend creates a new outbox row (and in-app notification for an established account); the fourth resend within an hour answers the existing rate-limit error
- [x] 6.6 Invitation cancelled or expired before dispatch: no email, no Auth user created, row failed as `skipped`
- [ ] 6.7 Retry: a row that fails once is sent on retry with a working link and no duplicate Auth user
- [ ] 6.8 Enqueue failure: invitation `fallida` with `codigo_error = 'enqueue_error'` and `500`
- [x] 6.9 `/auth/confirm` rejects other types and missing tokens; an invalid token redirects to `/auth/login?error=invitacion_invalida`
- [x] 6.10 No Supabase Auth email appears in Mailpit during any of the above; `nota_admin` appears nowhere
- [x] 6.11 After enqueueing, the invitation is `enviada` / `canal_entrega = 'email'` and the "Invitaciones" tab shows "Pendiente"
- [x] 6.12 Run `npx tsc --noEmit` and `npm run lint`; no new problem in the touched files. Do not run `build`

## 7. Documentation and delivery

- [x] 7.1 Update `projectspec/03-project-structure.md`: the two invitation routes, `auth/confirm`, `invitaciones-delivery.ts`, the notifications module section and `modulos/invitaciones.ts`
- [x] 7.2 Write the commit message and the pull request description, including the rollout order (migration first, then the application)
