# US-0100 — Expand Public Training Banner URL Column and Add Fullscreen Banner Viewer

## ID
US-0100

## Name
Expand `banner_url` Column Length on Public Training Tables and Add a Fullscreen "Ver" Button on Marketplace Cards

## As a
Tenant administrator publishing a training to the Public Training Marketplace, and any visitor (logged-in or anonymous) browsing that marketplace

## I Want
1. The `banner_url` field on `entrenamientos_publicos` (and the derived `entrenamientos_publicos_view`) to accept URLs longer than 500 characters, and
2. A "Ver" (view) button on every public training card that opens the banner image fullscreen in a modal

## So That
1. Publishing a training banner never fails or silently truncates when the generated Supabase Storage signed URL (which embeds a JWT query string and routinely exceeds 500 characters) is saved, and
2. Visitors can inspect the training banner at full resolution without leaving the marketplace grid, on both the authenticated marketplace (`/portal/entrenamientos-publicos`) and the anonymous landing page (`/entrenamientos-publicos`)

---

## Description

### Current State

- `entrenamientos_publicos.banner_url` is declared as `varchar(500)` (`supabase/migrations/20260723010000_entrenamientos_publicos.sql:27`).
- `entrenamientos_publicos_view` selects `ep.banner_url` as-is (`supabase/migrations/20260724010000_entrenamientos_publicos_public_view.sql:32`), so its column inherits the same 500-character cap.
- `banner_url` is never a hand-typed URL — it is always the result of `storageService.uploadEntrenamientoPublicoBanner()` → `createSignedUrl(path, SIGNED_URL_TTL)` (`src/services/supabase/portal/storage.service.ts:155-174`), consumed in `usePublicarEntrenamiento.ts:150-164` and written via `publicarEntrenamiento()` in `entrenamientos-publicos.service.ts:174`. Supabase signed URLs embed a bearer token in the query string and commonly run 600–900+ characters, so the `varchar(500)` constraint causes publish/update failures (Postgres raises `value too long for type character varying(500)`) whenever the signed URL exceeds the cap.
- `PublicTrainingCard.tsx` (`src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx:53-63`) renders the banner as a plain `<img>` inside a fixed `h-64` container with no way to view it any larger. This card is shared, unmodified, by:
  - the authenticated marketplace grid (`PublicTrainingsGrid.tsx`, used from `EntrenamientosPublicosPage.tsx`), and
  - the anonymous landing page (`PublicEntrenamientosLandingPage.tsx`, which reuses `PublicTrainingCard`/`PublicTrainingsGrid` as-is per US-0091), and
  - the admin's live preview inside `PublicarEntrenamientoModal.tsx`.
- There is no existing "view image fullscreen" component in the codebase to reuse; the closest structural pattern is the fixed-overlay/backdrop/Escape-to-close pattern used by `FormularioPreviewModal.tsx`.

### Proposed Changes

**1. Column type change**
- Alter `entrenamientos_publicos.banner_url` from `varchar(500)` to `text` (no length cap — signed URLs are backend-generated, not user free-text, so there is no practical length ceiling to enforce).
- `entrenamientos_publicos_view` is a plain `select` (not `select *`) over `entrenamientos_publicos`; once the underlying column becomes `text`, the view must be dropped and recreated (Postgres will error on `alter column ... type` if the view depends on the column in a way that changes its output type) so `entrenamientos_publicos_view.banner_url` also becomes unrestricted `text`.
- No RLS, index, or grant changes are required — `banner_url` is not indexed and carries no policy of its own.

**2. Fullscreen banner viewer**
- Add a "Ver" icon button overlaid on the banner image area of `PublicTrainingCard.tsx`, visible only when `data.bannerUrl` is non-null (no button — and no dead space — when there's no banner).
- Clicking "Ver" opens a new modal component, `PublicTrainingBannerModal.tsx`, that renders the banner at full size/resolution against a dark backdrop, closable via a close button, click-on-backdrop, and `Escape` key — mirroring the existing overlay/backdrop/`Escape`-listener pattern from `FormularioPreviewModal.tsx`.
- The modal's open/closed state is owned locally inside `PublicTrainingCard.tsx` (a simple `useState`), so no prop plumbing is needed through `PublicTrainingsGrid.tsx`, `EntrenamientosPublicosPage.tsx`, or `PublicEntrenamientosLandingPage.tsx` — both the authenticated and anonymous surfaces get the button automatically since they render the same shared card component with no auth coupling.
- The "Ver" button must not trigger the card's "Reservar" action and must stop event propagation so it never interferes with any future click-through behavior on the card.
- Because `PublicarEntrenamientoModal.tsx`'s live preview also renders `PublicTrainingCard`, the admin preview gains the same "Ver" button for free; this is acceptable and requires no extra wiring.

---

## Database Changes

New migration file: `supabase/migrations/{timestamp}_entrenamientos_publicos_banner_url_text.sql`

```sql
begin;

-- US-0100: banner_url stores a Supabase Storage signed URL (JWT-bearing query
-- string), which routinely exceeds 500 characters and was being rejected by
-- the varchar(500) cap. Switch to unrestricted text; the view must be
-- dropped/recreated since it directly projects this column.

drop view public.entrenamientos_publicos_view;

alter table public.entrenamientos_publicos
  alter column banner_url type text;

-- Recreate the view exactly as defined in
-- 20260724010000_entrenamientos_publicos_public_view.sql, now inheriting
-- banner_url as text.
create view public.entrenamientos_publicos_view as
select
  ep.id,
  ep.tenant_id,
  ep.entrenamiento_id,
  ep.nombre,
  ep.descripcion,
  ep.disciplina_id,
  ep.fecha_hora,
  ep.duracion_minutos,
  ep.cupo_maximo,
  ep.punto_encuentro,
  ep.reserva_antelacion_horas,
  ep.cancelacion_antelacion_horas,
  ep.precio,
  ep.banner_url,
  ep.created_at,
  d.nombre as disciplina_nombre,
  e.nombre as escenario_nombre,
  e.ubicacion as escenario_ubicacion,
  t.nombre as tenant_nombre,
  t.logo_url as tenant_logo_url,
  coalesce(r.reservas_activas, 0) as reservas_activas
from public.entrenamientos_publicos ep
join public.disciplinas d on d.id = ep.disciplina_id
join public.escenarios e on e.id = ep.escenario_id
join public.tenants t on t.id = ep.tenant_id
left join lateral (
  select count(*) as reservas_activas
  from public.reservas r
  where r.entrenamiento_id = ep.entrenamiento_id
    and r.estado <> 'cancelada'
) r on true
where ep.activo = true
  and ep.fecha_hora >= now();

grant select on public.entrenamientos_publicos_view to anon, authenticated;

commit;
```

No changes to RLS policies, triggers, indexes, or storage policies — none reference `banner_url`'s type or length.

---

## API / Server Actions

No new server actions or API routes. No service-layer signature changes: `entrenamientos-publicos.service.ts` already types `banner_url`/`bannerUrl` as `string | null` (TypeScript `string` already accommodates any length); only the underlying Postgres column type changes.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/{timestamp}_entrenamientos_publicos_banner_url_text.sql` | Drop + recreate `entrenamientos_publicos_view`, alter `entrenamientos_publicos.banner_url` to `text` |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingBannerModal.tsx` | New fullscreen image viewer modal (backdrop + Escape + close button) |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | Add "Ver" button over the banner (shown only when `bannerUrl` is set); own local modal open/close state; render `PublicTrainingBannerModal` |
| Component | `src/components/portal/entrenamientos-publicos/index.ts` | Export `PublicTrainingBannerModal` if the barrel file re-exports sibling components |

No changes needed to `PublicTrainingsGrid.tsx`, `EntrenamientosPublicosPage.tsx`, `PublicEntrenamientosLandingPage.tsx`, or `PublicarEntrenamientoModal.tsx` — all consume `PublicTrainingCard` as-is and inherit the new button automatically.

---

## Acceptance Criteria

1. Publishing (or updating the publication of) a training whose banner produces a signed URL longer than 500 characters succeeds without a Postgres length error.
2. `entrenamientos_publicos.banner_url` is of type `text` in the database (verified via `\d entrenamientos_publicos` or an information_schema query) with no length modifier.
3. `entrenamientos_publicos_view` still exposes `banner_url` (still `text`, unrestricted) and every other previously exposed column, with identical row-filtering behavior (`activo = true and fecha_hora >= now()`) — the landing page (`/entrenamientos-publicos`) continues to load without changes to its query or types.
4. Existing published trainings with banners under 500 characters continue to display correctly after the migration (no data loss/truncation from the `alter column` operation).
5. On the authenticated marketplace (`/portal/entrenamientos-publicos`), every card whose training has a banner shows a "Ver" button; clicking it opens the banner fullscreen in a modal.
6. On the anonymous landing page (`/entrenamientos-publicos`, no session), the same "Ver" button and fullscreen modal work identically for an unauthenticated visitor.
7. Cards for trainings with no banner (`bannerUrl === null`) show no "Ver" button and keep the existing placeholder icon state.
8. The fullscreen modal closes via: clicking the close button, clicking the backdrop, and pressing `Escape`.
9. Clicking "Ver" does not trigger the card's "Reservar" action or otherwise navigate/submit.
10. The fullscreen modal is keyboard-accessible (close button is a focusable, labeled `button`; `Escape` closes) and the image has an `alt` matching the training name.
11. No regression to the "Reservar" button, occupancy bar, or any other existing card content/behavior.

---

## Implementation Steps

- [ ] Write and apply the migration locally (drop/recreate `entrenamientos_publicos_view`, alter `banner_url` to `text`)
- [ ] Regenerate/update local Supabase types if the project uses generated DB types (check for a `database.types.ts` or similar codegen step)
- [ ] Build `PublicTrainingBannerModal.tsx` (backdrop, Escape listener, close button, fullscreen `<img>`)
- [ ] Wire the "Ver" button + local modal state into `PublicTrainingCard.tsx`, gated on `data.bannerUrl`
- [ ] Verify the button/modal render correctly in all three consumers: authenticated marketplace, anonymous landing page, and `PublicarEntrenamientoModal` live preview
- [ ] Test manually: publish a training with a banner, confirm no truncation error; open "Ver" on both logged-in and logged-out sessions; confirm Escape/backdrop/close-button all dismiss the modal
- [ ] Confirm no console errors/hydration warnings on the anonymous landing page (Server Component boundary) after adding client-side modal state to `PublicTrainingCard`

---

## Non-Functional Requirements

- **Security**: No RLS or auth changes. `banner_url` remains a system-generated signed URL, never user-authored free text, so no new injection surface is introduced by removing the length cap. The public storage read policy (`public_training_banner_read`) is unaffected.
- **Performance**: `alter column ... type text` on a `varchar(500)` column is a metadata-only change in Postgres (no table rewrite), safe to run without downtime. Dropping/recreating the view is instantaneous.
- **Accessibility**: The "Ver" button must have an accessible label (e.g., `aria-label="Ver imagen"`); the modal's close control must be a labeled, focusable `button`; `Escape` must close the modal, matching the existing `FormularioPreviewModal.tsx` convention.
- **Error handling**: No new error states are introduced; if `bannerUrl` fails to load as an image, existing `<img>` broken-image browser behavior applies (unchanged from current behavior, out of scope for this story).
