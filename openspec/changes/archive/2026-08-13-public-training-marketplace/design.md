## Context

Trainings already carry a dormant `visibilidad`/`visible_para` flag (US-0013) with cross-tenant RLS on `entrenamientos`, but no page consumes it. The training options menu (`EntrenamientoActionModal.tsx`), the training wizard (`EntrenamientoWizard.tsx`), and the reservation pipeline (`reservas.service.ts`, `ReservaFormModal`, `FormularioRespuestaModal`, `entrenamiento_restricciones`) are mature and heavily tested; this change must slot into them without altering their internal contracts. The target page, `src/app/portal/entrenamientos-publicos/page.tsx`, already exists as an empty placeholder at the non-tenant-scoped tier of `/portal` (sibling to `/portal/inicio`, `/portal/orgs`), so any authenticated user — member or not — can reach it. The visual reference is `projectspec/designs/pencil/grit-arena.pen` node `ql3Ij` (dark, glassmorphic marketplace layout: left filter column, right card grid, floating count widget).

## Goals / Non-Goals

**Goals:**
- Let a tenant admin curate and publish a single training instance (never its series/group) as a public listing with its own price and banner, independent of the operational training row.
- Prevent publishing any training whose booking eligibility a cross-tenant visitor could never satisfy (servicio-based restrictions), enforced redundantly (UI, service, DB trigger).
- Give any authenticated user, regardless of tenant membership, a marketplace page to browse and book published trainings using the **existing** reservation/formulario/restriction pipeline, unmodified.
- Reuse established conventions: hexagonal layering (page → component → hook → service → types), RLS as the real security boundary, feature-slice folder structure.

**Non-Goals:**
- Migrating or retiring the legacy `visibilidad`/`visible_para` mechanism — left in place, simply no longer reachable from the UI.
- Building a unified "my reservations across every tenant" view for visitors who book cross-tenant — flagged as a known follow-up.
- Making the marketplace's mini calendar or the "Featured" ordering algorithm configurable — calendar is visual-only, "Featured" is simply the most-recently-published listing.
- Relaxing or duplicating any existing booking-restriction, formulario, or advance-notice enforcement — the marketplace must invoke the same code paths, not reimplement them.

## Decisions

### 1. A denormalized publication table, not a flag flip
**Decision**: introduce `entrenamientos_publicos` as a one-to-one snapshot (`unique(entrenamiento_id)`) of display-relevant fields plus `precio`/`banner_url`, rather than reusing `visibilidad = 'publico'` directly.
**Why over the alternative** (just flipping `visibilidad` and building a page that queries `entrenamientos` where `visibilidad = 'publico'`): the existing flag carries no price/banner, no curation step, and conflates "is public" with "is the exact live operational data" — an admin can't word a public-facing description differently from the internal one, or unpublish without deleting the training. A separate table gives a clean admin-editable surface and an explicit `activo` unpublish switch, at the cost of one denormalized copy that must be kept intentionally in sync only where it matters for display (not for booking enforcement — see Decision 3).

### 2. Pre-publish servicio-restriction gate, enforced three times
**Decision**: block publishing when `entrenamiento_restricciones` has any row with `servicio_1_id`…`servicio_4_id` set — checked in the UI (disabled button + reason), in the service (`publicarEntrenamiento` pre-check throwing a typed error), and in the database (a `before insert or update` trigger on `entrenamientos_publicos`).
**Why**: a cross-tenant visitor can never hold a subscription/service in a tenant they don't belong to, so publishing such a training would create a listing that is structurally unbookable by its target audience — worse than not listing it. Three layers is deliberate defense-in-depth: the UI check is a fast, cheap UX guard; the service check protects any programmatic caller; the trigger is the actual guarantee, since it holds even if a future code path writes to `entrenamientos_publicos` directly, bypassing the service. Advance-notice restrictions (`reserva_antelacion_horas`/`cancelacion_antelacion_horas`) are explicitly exempted — they're satisfiable by anyone and live as plain columns on `entrenamientos`, not as `entrenamiento_restricciones` rows.
**Alternative considered**: only a service-layer check. Rejected because it is silently bypassable by direct SQL/RPC access, and this codebase already favors RLS/triggers as the source of truth for security-relevant invariants (see `*_ck` constraints and `book_and_deduct_service_units`).

### 3. Booking reuses the existing pipeline unmodified; enforcement never reads the snapshot
**Decision**: `entrenamientos_publicos.entrenamiento_id` is the single source of truth for booking. The marketplace's "Reservar" button opens a new thin wrapper (`PublicTrainingReservaModal` + `usePublicTrainingReserva`) that composes the **existing** `useReservaForm`/`useFormularioRespuestaForm`/`ReservaFormModal`/`FormularioRespuestaModal`/`reservasService.create()` — zero changes to `reservas.service.ts`. `reserva_antelacion_horas`/`cancelacion_antelacion_horas` are snapshotted onto `entrenamientos_publicos` **only for card display** ("Reserva con al menos Xh de anticipación"); the actual cutoff check at booking time still reads the live value from `entrenamientos`.
**Why**: reimplementing booking/restriction/formulario logic for a "public" variant would fork business rules that are already well-tested, doubling maintenance and risking subtle divergence (e.g., a bug fix landing in one path but not the other). Because Decision 2 already forbids publishing anything with a servicio restriction, in practice the only rejection a marketplace visitor should ever see is the advance-notice one or a full-capacity one — both are legitimately universal.
**Alternative considered**: also duplicating `formulario_id`/`entrenamiento_restricciones` conditions onto `entrenamientos_publicos` for a fully self-contained "public booking" record. Rejected — it would require re-deriving eligibility logic against a copy that can drift from the source of truth, exactly the failure mode Decision 2 exists to prevent for services.

### 4. `PublicTrainingCard` is shared between the marketplace grid and the publish-modal preview; `ReservasPanel` is *not* reused for booking
**Decision**: build one presentational `PublicTrainingCard` component used both by `PublicTrainingsGrid` (marketplace) and `PublicarEntrenamientoModal` (admin's live preview while editing). For booking, build a new minimal `PublicTrainingReservaModal` rather than embedding the existing `ReservasPanel.tsx`.
**Why**: `ReservasPanel` bundles the tenant-admin reservations list, CSV/Excel export, and attendance management — none of which a cross-tenant, non-member visitor should ever see, and none of which is protected by anything other than `role` being falsy for them (fragile to rely on for hiding, not for security, since `reservas` RLS already blocks the underlying data — but the UX would still be wrong/confusing). A focused wrapper around just `ReservaFormModal`/`FormularioRespuestaModal` is safer and clearer than gating a large admin panel down to a small athlete-facing subset.

### 5. Menu placement: non-tenant branch only, no new route guard needed
**Decision**: add the "Entrenamientos Públicos" entry inside `resolvePortalMenu`'s `!tenantId` branch (`src/types/portal.types.ts`), alongside `Inicio`/`Organizaciones Disponibles`. No change to any tenant-scoped route guard layout.
**Why**: the page is intentionally outside any `[tenant_id]` segment — same tier as `/portal/inicio` — so it needs no membership/role gate beyond "authenticated," matching the existing pattern for that tier exactly.

### 6. Storage: one new cross-tenant read policy, zero new write policies
**Decision**: publication banners live under the existing `org-assets` bucket at `orgs/{tenantId}/entrenamientos-publicos/{entrenamientoId}.{ext}`. The existing `org_admin_upload`/`org_admin_update`/`org_admin_delete` policies already match any path under `orgs/{tenantId}/...`, so no new write policy is needed. A new SELECT policy (`public_training_banner_read`) is added because the existing `org_member_read` policy requires tenant membership, which would incorrectly block a cross-tenant visitor from ever loading the banner's signed URL.
**Why**: minimal, additive change to a well-understood policy set; matches Decision 1's principle of touching as little existing infrastructure as possible.

## Risks / Trade-offs

- **[Risk]** Snapshotted `reserva_antelacion_horas`/`cancelacion_antelacion_horas` can go stale if an admin changes the rule on the operational training without reopening "Gestionar publicación." → **Mitigation**: acceptable and explicitly scoped — the *displayed* value can lag, but the *enforced* value never does (always read live from `entrenamientos`), so staleness is a minor UX quirk, not a business-rule bug. Same class of staleness already accepted for `nombre`/`descripcion`.
- **[Risk]** A visitor can book a training in a tenant they don't belong to, but has no page to see/cancel that reservation later (no tenant membership → can't reach `/portal/orgs/[tenant_id]/(atleta)/mis-reservas`). → **Mitigation**: out of scope for this change; surface a clear success confirmation at booking time (date/time/location) as a stopgap, and track "cross-tenant reservation history" as a follow-up US.
- **[Risk]** Three-layer servicio-restriction enforcement (UI + service + trigger) adds a small amount of duplication. → **Mitigation**: intentional defense-in-depth for a security/business-integrity invariant, consistent with existing patterns in this codebase (e.g., `*_ck` CHECK constraints duplicating what forms already validate); the trigger is the only layer that must never be skipped, the other two are UX/DX conveniences.
- **[Risk]** `PublicTrainingCard` is shared across two different contexts (live marketplace vs. admin preview inside `PublicarEntrenamientoModal`) — a prop-shape mismatch between the two callers could silently break one of them. → **Mitigation**: design the card's props purely from `PublicTrainingListItem`-shaped data (or a subset), never from `EntrenamientoPublico` DB row shape directly, so both callers map through the same view-model type.
- **[Risk]** Removing the `Privado`/`Público` radio group is a visible **UI-level breaking change** for admins used to setting visibility at creation time. → **Mitigation**: replace with clear read-only copy explaining publishing now happens via the training's options menu; call this out in release notes.

## Migration Plan

1. Author `supabase/migrations/20260723010000_entrenamientos_publicos.sql` (table, indexes, RLS policies, `set_updated_at` trigger, servicio-restriction validation trigger, new storage read policy).
2. Apply **locally only** via the local Supabase CLI (`supabase db reset` / `supabase migration up` against the local stack) — do **not** push this migration to the remote/hosted Supabase project as part of this change.
3. Verify RLS and the validation trigger locally (admin vs. non-admin insert/update/delete; direct insert against a servicio-restricted `entrenamiento_id` fails).
4. Ship application code (types → services → hooks → components → pages) behind the new table; no data backfill is required since the table starts empty.
5. Rollback strategy: the migration is additive-only (new table, new policies, one new storage policy) — reverting is a straightforward drop of the new table/policies/trigger with no impact on existing tables, since nothing existing is altered.

## Open Questions

- Should the pre-publish check also block on non-servicio restriction types (`plan_id`, `disciplina_id` + `validar_nivel_disciplina`, `usuario_estado`)? Explicitly out of scope per the current ask (servicio-only), flagged as a possible follow-up if cross-tenant bookings against those conditions turn out to be similarly unsatisfiable in practice.
- Should "Featured" selection ever become admin-controlled (e.g., a manual pin) instead of always "most recently published"? Left as most-recent for v1; no requirement to make it configurable yet.
