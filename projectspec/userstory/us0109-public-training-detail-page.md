# US-0109 — Public Training Detail Page

## ID
US-0109

## Name
Dedicated Detail Page for Public Trainings (Cronograma, Incluye, Multi-Price, Long Description)

## As a
Visitor (anonymous or authenticated) reached through the public trainings marketplace or an external platform link

## I Want
A full, shareable detail page for a single published public training — with its schedule, what's included, pricing options, and a long-form Markdown description — that lets me book directly (or prompts me to sign up/log in first if I'm anonymous)

## So That
Organizations can share a direct URL to one specific public training on external platforms (social media, ads, partner sites), and visitors land on a rich, self-contained page instead of only discovering the training buried inside the marketplace grid

---

## Description

### Current State

- Public trainings are only browsable as cards inside two grids that reuse the same components:
  - `/entrenamientos-publicos` (anonymous landing, US-0091) — reads the anon-safe `entrenamientos_publicos_view`.
  - `/portal/entrenamientos-publicos` (authenticated marketplace, US-0089) — reads `entrenamientos_publicos` directly plus a couple of authenticated-only joins (required services, formulario).
- Both grids render [PublicTrainingCard.tsx](../../src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx), driven by `PublicTrainingCardData`. There is no way to link to a single training — no per-training URL exists.
- A placeholder route already exists at [src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx](../../src/app/entrenamientos-publicos/%5Bentrenamiento_id%5D/page.tsx) but the file is empty.
- `entrenamientos_publicos.precio` is a single nullable `numeric(10,2)` — one flat price (or "Gratis" when null). There is no schedule, no "what's included" list, and no long-form description; only the short `descripcion` (used as a 2-line teaser on the card).
- The booking flow for an anonymous visitor already exists end-to-end: [RegistrateParaReservarModal.tsx](../../src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx) sends them to `/auth/signup` or `/auth/login` with a guided `next` target (built by [guidedBooking.ts](../../src/lib/portal/entrenamientos-publicos/guidedBooking.ts)) that lands back on `/portal/entrenamientos-publicos` and auto-opens [PublicTrainingReservaModal.tsx](../../src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx) for the target training. For an already-authenticated visitor, [EntrenamientosPublicosPage.tsx](../../src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx) opens that same modal directly. This story reuses both flows as-is — it does not change how booking, plan purchase, or formulario submission work.

### Proposed Changes

**1. Detail page route (public, unauthenticated-friendly)**

- Implement [src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx](../../src/app/entrenamientos-publicos/%5Bentrenamiento_id%5D/page.tsx). `entrenamiento_id` is the source `entrenamientos.id` (matches `entrenamientos_publicos.entrenamiento_id`, unique per the existing `entrenamientos_publicos_entrenamiento_id_uk` constraint) — the same id already used as `PublicTrainingListItem.entrenamientoId` everywhere else.
- This route is **not** under `/portal` and is **not** listed in `middleware.ts`'s `protectedPaths` (`["/dashboard", "/portal"]`), so it loads for anonymous visitors exactly like `/entrenamientos-publicos` already does. No middleware change needed — confirm this stays true after implementation.
- Data is fetched client-side (mirrors every other page in this feature slice) from `entrenamientos_publicos_view` — the same anon-safe view the landing page already uses — so the page works identically whether the visitor is logged in or not, and whether they arrived from the portal marketplace, the public landing page, or a cold external link.
- When no row matches (invalid id, unpublished, deactivated, or a past `fecha_hora` — the view already filters `activo = true and fecha_hora >= now()`), render an inline "not found" state with a link back to `/entrenamientos-publicos`. Do not use Next's `notFound()` — data is fetched client-side like the rest of this feature, not in a server component.

**2. New page shell + sections, matching grit-arena-v2.pen node `obHO3` ("Content", inside the `OyIqr` "Public Training Detail" frame)**

> **Design fidelity**: The implementation must be as visually faithful as possible to [projectspec/designs/pencil/grit-arena-v2.pen](../designs/pencil/grit-arena-v2.pen), node `obHO3`. This includes layout/structure, spacing, typography (sizes, weights), colors, and component composition for every section listed below — not just which pieces of content are present. Any visual deviation from the design must be called out explicitly in the section it affects (as already done for the out-of-scope elements below); absent such a note, the design is the source of truth over this document's prose.

Built as a new component tree under `components/landing/entrenamientos-publicos/detalle/` (same bounded context as the existing anonymous landing page, since this route is also outside `/portal`):

- **Header/Breadcrumb**: reuse the existing landing `Header` component (same as `PublicEntrenamientosLandingPage`); add a breadcrumb row "Inicio › Entrenamientos › {training nombre}" below it, matching the design's `AOIa5 Breadcrumb Row`. "Inicio" links to `/`, "Entrenamientos" links to the **`from` origin** described below (not hardcoded), so the breadcrumb and the "Volver" affordance behave consistently.
- **Hero banner**: full-width image from `bannerUrl` (design node `UBgoO`), with a graceful fallback (existing icon placeholder, matching `PublicTrainingCard`'s empty-banner state) when `bannerUrl` is null.
- **Tags + Title + Subtitle + Meta row** (design nodes `xtDW1`, `n9paX`, `t0mYE1`, `d4lCP`): discipline tag, "ENTRENAMIENTO PÚBLICO" tag, `nombre` as title, `descripcion` (existing short field) as subtitle, and a meta row with date, time, `escenarioNombre`/`puntoEncuentro`, and `reservasActivas`/`cupoMaximo`.
- **Descripción section** (design node `Z08z5i`): heading "Descripción" + the new `descripcion_larga` field rendered as Markdown (see Non-Functional Requirements — Security for the rendering approach). When `descripcion_larga` is null/empty, hide the whole section (do not fall back to the short `descripcion`, which is already shown as the subtitle).
- **Incluye section** (design node `osAIG`): heading "¿Qué incluye este entrenamiento?" + a checklist rendered from the new `incluye` JSON array (`{ titulo, descripcion }` per item). Hidden entirely when the array is empty.
- **Cronograma / schedule card** (design node `x03t4`): heading "¿Cómo será la sesión?" + a "Xh Ymin en total" badge computed from the existing `duracion_minutos` field (no new field needed for the badge) + a vertical timeline rendered from the new `cronograma` JSON array (`{ hora, descripcion }` per item, in the order stored). Hidden entirely when the array is empty.
- **Location card** (design node `A31Ea`): reuses existing `escenarioNombre`/`escenarioUbicacion`/`puntoEncuentro` fields (no new columns). Include a simple static map-style placeholder (no illustration/drawing) and a "Ver en Google Maps" link built from `escenarioNombre` + `escenarioUbicacion` as a Google Maps search query — no new field needed. **Do not implement** the amenity tags ("Parqueadero", "Vestieres") shown in the design — there is no data source for them and none was requested; omit that row.
- **Reserve card** (design node `mttfC`): info rows for cupos disponibles, duración, and entrenador (new: `entrenador_nombre`, only shown when the publication has an `entrenador_id` — resolved via the view join described in Database Changes). Primary CTA "Reservar mi cupo" (see point 4 below) plus a secondary "Ver detalles oficiales" CTA driven by the new `pagina_evento_url` field — an admin-authored link to the organization's own detailed event page. Render it (opens in a new tab, with the design's "Serás redirigido al sitio oficial del evento" note) only when `pagina_evento_url` is set; hide it entirely otherwise. **Do not implement** the "Nivel recomendado" row — no requested data source for it.
- **Pricing section** (design node `H16bLE`): heading "Precios y opciones" + a responsive grid of price cards, one per item of the new `precio` JSON array (`{ nombre, precio, descripcion }`). All cards render with the same visual treatment regardless of position — **do not** implement the design's "MÁS POPULAR" featured badge on any card; every price option is equally weighted. Hidden entirely when the array is empty (an unpriced/free training).
- **CTA banner** (design node `I6JYGB`): closing banner with a second "Reservar mi cupo" button wired to the same reserve handler as the primary CTA.
- **Footer**: reuse the existing landing footer content already present on `PublicEntrenamientosLandingPage`'s parent layout, or replicate the design's footer section if no shared footer component exists yet — check for one before building a new one.

**3. "Ver detalles" button on the training card, with a stable back target**

- Add `entrenamientoId?: string` to `PublicTrainingCardData` ([PublicTrainingCard.tsx](../../src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx)) and wire it through both existing mapping sites: [PublicTrainingsGrid.tsx](../../src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx)'s `toCardData()` (pass `item.entrenamientoId`) and `PublicarEntrenamientoModal.tsx`'s live-preview `previewData` (**omit** it there — the training may not be published yet, so no live detail URL exists to link to during preview).
- When `entrenamientoId` is present, render a "Ver detalles" button/link on the card (next to the existing "Reservar" button) pointing to `/entrenamientos-publicos/{entrenamientoId}?from={encodeURIComponent(currentPathname)}`, where `currentPathname` is read via `usePathname()` in the card itself (it is already a client component). This makes the same card component correctly link back to whichever grid it was rendered in — `/portal/entrenamientos-publicos` or `/entrenamientos-publicos` — without any prop threading beyond the id.
- On the detail page, read the `from` search param. The breadcrumb's "Entrenamientos" crumb and any "Volver" link/button both target that value. When `from` is absent (a cold visit from an external platform link, or the param was stripped), fall back to `/entrenamientos-publicos` (the public landing page). Do not rely on `router.back()` or `document.referrer` — the `from` param must be the single source of truth, since it must also work correctly after a hard page reload (which loses in-app navigation history) and for a visitor who never had any prior in-app history at all.

**4. Reservation entry point — reuse existing auth branching exactly**

- On "Reservar mi cupo" click (both the reserve-card CTA and the closing CTA banner), check the current session with the existing [`useAuth()`](../../src/hooks/auth/useAuth.ts) hook (already handles `initializing`/`user` via `supabase.auth.getSession()` + `onAuthStateChange`; this is the first place it's used outside `/portal`, so add nothing new there — just call it).
  - **Anonymous** (`!initializing && !user`): open the existing [RegistrateParaReservarModal.tsx](../../src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx) unmodified, passing a `PublicTrainingListItem`-shaped target built from the fetched detail data (`entrenamientoId`, `tenantId`, `disciplinaId`, `nombre`). This reuses the exact same guided signup/login → marketplace → auto-open-booking-modal journey that already exists (US-0103) — after auth, the visitor lands on `/portal/entrenamientos-publicos` and continues the normal plan-purchase/booking flow there. Do not build a second guided-booking target that returns to the detail page — that would duplicate `guidedBooking.ts`'s logic for no benefit, since the guided journey already ends in a fully working booking flow.
  - **Authenticated** (`user` present): open the existing [PublicTrainingReservaModal.tsx](../../src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx) unmodified, passing `tenantId`, `entrenamientoId`, `disciplinaId`, `trainingNombre`, `tenantNombre`, `omitirConfirmacionPlan` from the fetched detail data — the same props `EntrenamientosPublicosPage.tsx` already passes. This continues straight into the existing plan-purchase/booking/formulario flow unmodified.
  - While `initializing` is true, disable the CTA (brief loading state) rather than guessing which modal to open.

**5. Publish-time authoring of the new fields**

- The new `cronograma`, `incluye`, `precio` (array), and `descripcion_larga` fields are filled in by the tenant admin when publishing/managing a public training, in [PublicarEntrenamientoModal.tsx](../../src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx) (state owned by [usePublicarEntrenamiento.ts](../../src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts)):
  - Replace the single "Precio (COP)" number input with a repeatable list editor (add/remove row), each row = nombre + precio (COP) + descripción. Zero rows is valid and means "Gratis", matching current behavior.
  - Add a repeatable "Cronograma" list editor (add/remove row): hora (text or time input) + descripción, in display order (no separate `orden` field — array order **is** the order).
  - Add a repeatable "Incluye" list editor (add/remove row): título + descripción.
  - Add a "Descripción larga (Markdown)" textarea for `descripcion_larga`, with helper text noting Markdown is supported and will be rendered on the public page.
  - Add a "Página del evento (URL)" text input for the new `pagina_evento_url` field — optional, validated as a well-formed URL when non-empty (same pattern as the existing `formulario_externo` URL field elsewhere in this feature), so the admin can link to a more detailed description of the event hosted on their own site.
  - Update the modal's live `PublicTrainingCard` preview (`previewData`) to pass the new array-shaped fields so the preview accurately reflects the multi-price display described below.

---

## Database Changes

New migration: `supabase/migrations/20260828120000_entrenamientos_publicos_detalle_fields.sql`

```sql
begin;

alter table public.entrenamientos_publicos
  add column if not exists cronograma jsonb not null default '[]'::jsonb,
  add column if not exists incluye jsonb not null default '[]'::jsonb,
  add column if not exists descripcion_larga text,
  add column if not exists pagina_evento_url text;

-- precio: numeric(10,2) -> jsonb array of { nombre, precio, descripcion }.
-- Existing single prices are migrated into a one-item array so no data is lost;
-- existing NULLs (free trainings) become an empty array.
drop view public.entrenamientos_publicos_view;

alter table public.entrenamientos_publicos
  drop constraint if exists entrenamientos_publicos_precio_ck;

alter table public.entrenamientos_publicos
  alter column precio drop default;

alter table public.entrenamientos_publicos
  alter column precio type jsonb using (
    case
      when precio is null then '[]'::jsonb
      else jsonb_build_array(
        jsonb_build_object('nombre', 'Precio general', 'descripcion', null, 'precio', precio)
      )
    end
  );

alter table public.entrenamientos_publicos
  alter column precio set default '[]'::jsonb,
  alter column precio set not null;

alter table public.entrenamientos_publicos
  add constraint entrenamientos_publicos_precio_array_ck check (jsonb_typeof(precio) = 'array'),
  add constraint entrenamientos_publicos_cronograma_array_ck check (jsonb_typeof(cronograma) = 'array'),
  add constraint entrenamientos_publicos_incluye_array_ck check (jsonb_typeof(incluye) = 'array');

-- Recreate the anon-safe view (dropped above because it projects `precio`'s old type),
-- carrying forward every column from 20260812190000_entrenamientos_publicos_banner_url_text.sql
-- unchanged, plus the new columns and an entrenador display-name join.
create view public.entrenamientos_publicos_view as
select
  ep.id,
  ep.tenant_id,
  ep.entrenamiento_id,
  ep.nombre,
  ep.descripcion,
  ep.descripcion_larga,
  ep.pagina_evento_url,
  ep.disciplina_id,
  ep.fecha_hora,
  ep.duracion_minutos,
  ep.cupo_maximo,
  ep.punto_encuentro,
  ep.reserva_antelacion_horas,
  ep.cancelacion_antelacion_horas,
  ep.precio,
  ep.cronograma,
  ep.incluye,
  ep.banner_url,
  ep.created_at,
  d.nombre as disciplina_nombre,
  e.nombre as escenario_nombre,
  e.ubicacion as escenario_ubicacion,
  t.nombre as tenant_nombre,
  t.logo_url as tenant_logo_url,
  nullif(trim(concat(coalesce(u.nombre, ''), ' ', coalesce(u.apellido, ''))), '') as entrenador_nombre,
  coalesce(r.reservas_activas, 0) as reservas_activas
from public.entrenamientos_publicos ep
join public.disciplinas d on d.id = ep.disciplina_id
join public.escenarios e on e.id = ep.escenario_id
join public.tenants t on t.id = ep.tenant_id
left join public.usuarios u on u.id = ep.entrenador_id
left join lateral (
  select count(*) as reservas_activas
  from public.reservas r
  where r.entrenamiento_id = ep.entrenamiento_id
    and r.estado <> 'cancelada'
) r on true
where ep.activo = true
  and ep.fecha_hora >= now();

-- Supabase's default privileges re-grant ALL to anon/authenticated on every recreate —
-- revoke first, then grant only SELECT (same fix already applied by every prior
-- migration that touches this view).
revoke all on public.entrenamientos_publicos_view from anon, authenticated;
grant select on public.entrenamientos_publicos_view to anon, authenticated;

commit;
```

`pagina_evento_url` is a plain nullable `text` column — no check constraint, since an admin-authored external URL doesn't need array-shape validation the way `precio`/`cronograma`/`incluye` do; validate its shape client-side in the publish form instead (see Proposed Changes, point 5).

No RLS policy changes: the five new columns live on `entrenamientos_publicos`, whose existing `select`/`insert`/`update`/`delete` policies (admin-only writes, `activo = true OR own tenant` reads) already cover them — RLS is column-agnostic. The view continues to run with its owner's privileges (bypassing RLS the same way it already does for `tenant_nombre`/`tenant_logo_url`), which is what lets it also expose `entrenador_nombre` and `pagina_evento_url` to `anon` — no new grant on `usuarios` is created or needed.

---

## API / Server Actions

All data access is client-side via the existing `services/supabase` layer (no new API routes — this codebase uses direct Supabase client calls from hooks, not server actions).

- **File**: `src/services/supabase/portal/entrenamientos-publicos.service.ts`
  - Extend `listPublicTrainings()` (authenticated marketplace query against `entrenamientos_publicos` directly) to select `cronograma, incluye, descripcion_larga, pagina_evento_url` and add an `entrenador:usuarios(nombre, apellido)` embed (same embed pattern already used for `disciplina`/`escenario`/`tenant`), mapping to the new `PublicTrainingListItem` fields below. Update the row type and `precio` mapping (now `PrecioItem[]`, straight passthrough — Postgrest returns jsonb as parsed JSON already).
  - Extend `listPublicTrainingsForLanding()` similarly, reading the extra columns off `entrenamientos_publicos_view` (already includes `entrenador_nombre` per the migration above).
  - Add `getPublicTrainingDetail(entrenamientoId: string): Promise<PublicTrainingListItem | null>` — selects the same column list as `listPublicTrainingsForLanding()` from `entrenamientos_publicos_view`, filtered `.eq('entrenamiento_id', entrenamientoId).maybeSingle()`. Reuses `PublicTrainingListItem` as the return shape (no separate "detail" type) since the new fields now live on that type unconditionally. Auth/RLS: none needed beyond the view's existing `anon, authenticated` grant.

- **File**: `src/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle.ts` (new)
  - Input: `entrenamientoId: string`.
  - Calls `entrenamientosPublicosService.getPublicTrainingDetail(entrenamientoId)` on mount/id change.
  - Exposes `{ item, loading, error, refetch }`, mirroring `usePublicEntrenamientosLanding.ts`'s shape.

- **File**: `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts`
  - Extend `EntrenamientoPublicoFormValues`/submit payload to carry `cronograma: CronogramaItem[]`, `incluye: IncluyeItem[]`, `precio: PrecioItem[]` (replacing the single string), `descripcionLarga: string`, and `paginaEventoUrl: string`. Validate each `precio` row's amount the same way the single value is validated today (number ≥ 0); reject the row-level input, not the whole array, with an inline per-row error. Validate `paginaEventoUrl` as a well-formed URL when non-empty; empty is valid (field is optional).

No changes to `publicarEntrenamiento()`'s auth/RLS requirements (still admin-of-tenant only, enforced by the existing `entrenamientos_publicos_insert_admin`/`_update_admin` policies).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260828120000_entrenamientos_publicos_detalle_fields.sql` | New: `cronograma`/`incluye`/`descripcion_larga`/`pagina_evento_url` columns, `precio` numeric→jsonb array migration, view recreate with `entrenador_nombre` |
| Types | `src/types/portal/entrenamientos-publicos.types.ts` | Add `CronogramaItem`, `IncluyeItem`, `PrecioItem`; change `EntrenamientoPublico.precio` to `PrecioItem[]`; add `cronograma`, `incluye`, `descripcion_larga`, `pagina_evento_url` to `EntrenamientoPublico`; update `PublicarEntrenamientoInput`/`EntrenamientoPublicoFormValues` for the new array fields plus `paginaEventoUrl`; add `cronograma`, `incluye`, `descripcionLarga`, `paginaEventoUrl`, `entrenadorNombre` to `PublicTrainingListItem`; change its `precio` to `PrecioItem[]` |
| Service | `src/services/supabase/portal/entrenamientos-publicos.service.ts` | Extend `listPublicTrainings`/`listPublicTrainingsForLanding` selects+mapping; add `getPublicTrainingDetail(entrenamientoId)`; extend `publicarEntrenamiento` write payload |
| Hook | `src/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle.ts` | New: loads one training's detail by `entrenamientoId` |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts` | Extend form state/validation/submit for `cronograma`/`incluye`/`precio[]`/`descripcionLarga` |
| Component | `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` | Replace single price input with repeatable price/cronograma/incluye row editors + `descripcion_larga` textarea |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | Add optional `entrenamientoId` to `PublicTrainingCardData`; render "Ver detalles" link (`usePathname()`-derived `from`); update `formatPrecio()` for the array shape (`Gratis` / single value / "Desde $min COP") |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx` | Pass `entrenamientoId` in `toCardData()` |
| Page | `src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx` | New: renders `PublicTrainingDetallePage`; static metadata |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetallePage.tsx` | New: page shell — data fetch, `from`/back handling, auth branch for the reserve CTA, not-found state |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleHero.tsx` | New: banner + tags + title/subtitle + meta row |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleDescripcion.tsx` | New: Markdown-rendered `descripcion_larga` section |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleIncluye.tsx` | New: "incluye" checklist |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleCronograma.tsx` | New: schedule timeline |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleUbicacion.tsx` | New: location card + Google Maps link |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleReserva.tsx` | New: reserve info card + primary "Reservar" CTA + secondary "Ver detalles oficiales" CTA (`pagina_evento_url`, shown only when set) |
| Component | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetallePrecios.tsx` | New: pricing grid from `PrecioItem[]` |
| Dependency | `package.json` | Add `react-markdown` (no Markdown renderer currently installed — see Non-Functional Requirements) |

---

## Acceptance Criteria

1. Visiting `/entrenamientos-publicos/{entrenamiento_id}` for a published (`activo = true`), future (`fecha_hora >= now()`) training renders the full detail page without requiring authentication.
2. Visiting the same URL for an id that doesn't exist, isn't published, or is in the past shows a "not found" state with a link back to `/entrenamientos-publicos` — it does not error or blank-render.
3. The page is as visually faithful as possible to grit-arena-v2.pen node `obHO3` — not only its structure (hero banner, tags/title/subtitle/meta, descripción, incluye, cronograma, ubicación, reserve card including the "Ver detalles oficiales" secondary CTA when `pagina_evento_url` is set, pricing grid with no featured/"MÁS POPULAR" badge on any card, closing CTA) but also its spacing, typography, and colors — excluding the explicitly-out-of-scope elements (Nivel recomendado row, amenity tags, decorative map artwork).
4. `PublicTrainingCard` shows a "Ver detalles" button/link on both `/entrenamientos-publicos` (public landing) and `/portal/entrenamientos-publicos` (authenticated marketplace) grids, and it is absent from the live preview inside `PublicarEntrenamientoModal`.
5. Clicking "Ver detalles" from the public landing grid, then the breadcrumb's "Entrenamientos" crumb (or a "Volver" affordance) on the detail page, returns to `/entrenamientos-publicos`. Doing the same from the portal marketplace grid returns to `/portal/entrenamientos-publicos`. Visiting the detail URL directly (no `from` param) and using the same affordance lands on `/entrenamientos-publicos`.
6. On the detail page, clicking "Reservar mi cupo" while logged out opens the existing "Regístrate para reservar" modal; completing signup or login lands the visitor back in the authenticated marketplace with the booking modal auto-opened for the same training (unchanged guided-booking behavior, verified end to end, not just that the modal opens).
7. On the detail page, clicking "Reservar mi cupo" while logged in opens the existing booking modal directly and completes a full reservation (including any attached formulario and plan/service requirement flow) exactly as it does today from the marketplace grid.
8. Publishing or editing a public training in `PublicarEntrenamientoModal` lets the admin add/remove/edit any number of cronograma rows (hora + descripción), incluye rows (título + descripción), and precio rows (nombre + precio + descripción), plus enter a Markdown `descripcion_larga` and a `pagina_evento_url`; saving persists all five fields and reopening the modal shows the previously saved values.
9. A training published with zero precio rows shows "Gratis" on both the card and the detail page pricing section is hidden (not an empty grid).
10. A training published with exactly one precio row shows that single price on the card (unchanged from current behavior); with two or more rows, the card shows "Desde $&lt;lowest&gt; COP" and the detail page shows all rows as separate cards, all styled identically — no card is visually marked as featured/most-popular regardless of its position in the array.
11. A training published with an empty cronograma or incluye array hides that entire section on the detail page (no empty heading with no content beneath it).
12. `descripcion_larga` renders as formatted Markdown (headings, bold, lists, paragraphs at minimum) without allowing raw HTML injection — verify with a description containing a `<script>` tag or an `<img onerror>` payload and confirm it renders as literal text, not executed markup.
13. A pre-existing public training that had a plain numeric `precio` before this migration still displays correctly after migration, with its price appearing in a single-item pricing array labeled "Precio general".
14. The entrenador's name appears on the detail page only when the publication has an `entrenador_id`; it is silently omitted (not shown as "null" or an empty row) when absent.
15. When `pagina_evento_url` is set, the detail page's "Ver detalles oficiales" secondary CTA opens it in a new tab (`target="_blank"` with `rel="noopener noreferrer"`) alongside the "Serás redirigido al sitio oficial del evento" note; when unset, the CTA and note are both absent — not rendered disabled or empty.
16. `npm run build` (or the project's TypeScript check) passes with no type errors introduced by the `precio` type change across every file that reads/writes `EntrenamientoPublico.precio` or `PublicTrainingListItem.precio`.

---

## Implementation Steps

- [ ] Write and apply the migration (`cronograma`/`incluye`/`descripcion_larga`/`pagina_evento_url` columns, `precio` numeric→jsonb conversion, view recreate with `entrenador_nombre`); verify the existing `entrenamientos_publicos_view` grants still resolve to only `select` for `anon`/`authenticated`
- [ ] Update `entrenamientos-publicos.types.ts` (`CronogramaItem`, `IncluyeItem`, `PrecioItem`, and every touched existing type)
- [ ] Update `entrenamientos-publicos.service.ts`: extend both list functions' selects/mappings, add `getPublicTrainingDetail`, extend `publicarEntrenamiento`'s write payload
- [ ] Add `react-markdown` dependency
- [ ] Build `usePublicTrainingDetalle` hook
- [ ] Build the `detalle/` component tree, matching the grit-arena-v2.pen `obHO3` node section by section as faithfully as possible (structure, spacing, typography, and colors — not just content); verify each section against the design as you go rather than only at the end
- [ ] Wire the `[entrenamiento_id]/page.tsx` route
- [ ] Add the "Ver detalles" button to `PublicTrainingCard` (with `usePathname()`-derived `from`) and thread `entrenamientoId` through `PublicTrainingsGrid`'s `toCardData()`
- [ ] Update `formatPrecio()` in `PublicTrainingCard` for the array shape
- [ ] Extend `usePublicarEntrenamiento` + `PublicarEntrenamientoModal` with the three new repeatable row editors, the Markdown textarea, and the `pagina_evento_url` input; update the modal's live preview mapping
- [ ] Manually verify: anonymous booking journey end-to-end (detail page → signup/login → guided booking modal → completed reservation), authenticated booking journey end-to-end, migrated legacy pricing data, empty cronograma/incluye/precio states, not-found state, Markdown XSS payload rendering as literal text, "Ver detalles oficiales" CTA present/absent based on `pagina_evento_url`, no featured badge on any pricing card
- [ ] Confirm `middleware.ts`'s `protectedPaths` still excludes the new route (no change expected, but verify)

---

## Non-Functional Requirements

- **Security**:
  - `descripcion_larga` must be rendered through `react-markdown` (React-element output, no `dangerouslySetInnerHTML`) rather than a hand-rolled Markdown-to-HTML parser, so arbitrary HTML/script in an admin-authored description can never execute in a visitor's browser (see Acceptance Criterion 12).
  - No new RLS policies are introduced; the new columns inherit the existing table policies, and the view continues to expose only pre-approved, non-sensitive columns to `anon` (consistent with the existing `tenant_nombre`/`tenant_logo_url` precedent for `entrenador_nombre`).
- **Performance**: `getPublicTrainingDetail` is a single indexed-equality query (`entrenamiento_id`, already covered generally by the view's underlying table scan pattern used by the landing page) — no pagination or additional indexing needed for a single-row lookup.
- **Accessibility**: Timeline, incluye checklist, and pricing cards must use semantic list markup (`<ul>`/`<ol>` or equivalent ARIA roles) rather than bare `<div>` rows, matching the existing card components' pattern of `aria-label`/`aria-hidden` on icon-only elements. The "Reservar mi cupo" CTA must expose a disabled/loading state (not just a visual dimming) while `useAuth()` is `initializing`.
- **Error handling**: Detail-fetch errors (network/Supabase failure) render the same inline error + "Reintentar" button pattern already used by `PublicEntrenamientosLandingPage`/`EntrenamientosPublicosPage`, not a hard crash or blank page. The distinct "not found" (no matching row) and "error" (fetch failed) states must be visually distinguishable, per Acceptance Criterion 2.
