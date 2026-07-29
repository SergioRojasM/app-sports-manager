# Delivery notes — service-restrictions-on-public-trainings (US-0094)

**Depends on US-0093** (`public-plans-for-non-members`), already merged into `develop` at `2391a8f`. Migration applied **locally only**.

## Commit message

```
feat(service-restrictions-on-public-trainings): allow publishing trainings with service restrictions

US-0089 blocked publishing any training carrying a servicio_*_id restriction,
on the premise that an outsider can never hold a service in a tenant they don't
belong to. US-0093 invalidated that premise, and the booking pipeline was
already tenant+athlete scoped rather than membership scoped.

The gate is retargeted, not removed: publication is now blocked only when NO
restriction row is satisfiable without membership. Rows are OR-ed at booking
time, so a single service-only row keeps a training publishable even alongside
membership-only rows; conditions ANDed within one row still block.

The marketplace shows required service names and finds sessions by them, and a
booking rejected for a missing service offers the organization's plan catalog.
Names come from a new entrenamientos_publicos_servicios_view granted to
authenticated only — the anonymous landing page and its view are untouched.

BREAKING: EntrenamientoPublicoServiceErrorCode replaces 'servicio_restriction'
with 'membership_restriction'; hasServicioRestrictions is replaced by
getPublishRestrictionSummary / hasBlockingMembershipRestrictions.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## Pull request description

```markdown
## Summary

Administrators can now publish a training whose access conditions are service-based,
so a visitor who is not a member can buy a public plan, receive the service units it
grants, and book that session through the same restriction/deduction pipeline members
already use.

Implements US-0094 · OpenSpec change `service-restrictions-on-public-trainings`.
**Builds on US-0093** — merge order matters.

## Why the old rule had to go

US-0089's gate rested on *"a cross-tenant visitor can never hold a subscription/service
in a tenant they aren't a member of"*. US-0093 made that false. The booking machinery
never needed changing: `getServicioEntitlements(tenantId, atletaId, …)` does not join
`miembros_tenant`, and the membership lookup in `validateBookingRestrictions` runs only
inside its `if (row.usuario_estado)` branch. The publish gate was the only obstacle, and
it forced admins to strip restrictions off a training just to make it visible.

## The gate is retargeted, not removed

Publication is blocked when the training **has** restriction rows and **none** is free of
membership-only conditions (`usuario_estado`, `validar_nivel_disciplina`).

The OR semantics are the subtle part: rows are OR-ed at booking time, so "block if any row
is membership-only" would be wrong — it would reject a training that also carries a
service-only row an outsider can satisfy. Verified against the trigger:

| Rows | Result |
|---|---|
| (none) · `[servicio]` · `[servicio]+[servicio]` · `[servicio] OR [usuario_estado]` | PUBLICA |
| `[usuario_estado]` · `[nivel]` · `[nivel] OR [usuario_estado]` · `[servicio + usuario_estado]` (one row) | BLOQUEA |

## Changes

**Database** — `20260729000100_entrenamientos_publicos_restricciones_servicio.sql`
- Drops the US-0089 trigger/function; adds `check_entrenamiento_publico_restricciones_membresia()` + trigger.
- Adds `entrenamientos_publicos_servicios_view` (`entrenamiento_id`, `servicios_requeridos text[]`).
- **`entrenamientos_publicos_view` is untouched** — verified by diffing its definition,
  columns and grants before/after.

**Backend** — `getPublishRestrictionSummary` returns both the blocking verdict and the
required service ids in one query (used by the gate *and* the publish preview);
`publicarEntrenamiento` maps the trigger's exception onto the same typed error;
`listPublicTrainings` merges the names with one extra query, degrading to `[]` on failure;
`listPublicTrainingsForLanding` is unchanged.

**Frontend** — "Requiere: …" row on `PublicTrainingCard` (renders nothing when empty, which
is what keeps the shared card unchanged on the landing page); required service names added
to the marketplace search; a dedicated rejection state in `PublicTrainingReservaModal` with
a "Ver planes de {org}" action opening `PlanesPublicosModal`.

## Security note worth reviewing

While verifying the new view I found that **Supabase's default privileges grant ALL on new
objects in `public` to `anon`**, so a plain `grant select … to authenticated` is a no-op.
Worse, this view is simple enough to be **auto-updatable**, and writing through a view runs
with the view owner's privileges — `anon` could have written into `entrenamientos_publicos`
bypassing its RLS. Confirmed empirically before the fix: the write reached the underlying
table's NOT NULL constraint (`23502`), meaning permission had already been granted.

Fixed with an explicit `revoke all … from anon, authenticated` before the grant. After it:
`anon` gets 401 on both read and write; `authenticated` holds `SELECT` only (200 read /
403 write). **The US-0091 view escapes this only because its joins make it non-updatable —
worth auditing any other view in the project created without an explicit revoke.**

## Verification

Applied locally; verified with SQL and real JWTs over PostgREST:

- Trigger against all eight row combinations (table above).
- New view as an authenticated **non-member**: resolves `["Entrenamientos Triatlon/Transiciones"]`
  for a training whose required service **no public plan grants** — while the same user reading
  `servicios` directly gets `[]`, which is exactly why the view exists.
- `anon`: 401 on the new view; `[]` (no rows) on `servicios` and `entrenamiento_restricciones`;
  landing view still returns its rows normally.
- `entrenamientos_publicos_view` definition / columns / grants: identical before and after.

`npx tsc --noEmit` clean; `npm run lint` at the pre-change baseline (34 problems, all
pre-existing). No test script exists in this repo.

**Still needs a human pass:** the UI click-through — the requirements row, the search by
service name, the rejection CTA, the publish gate in the options menu, and an end-to-end
non-member purchase → booking → cancellation. Everything beneath the UI is verified above.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
