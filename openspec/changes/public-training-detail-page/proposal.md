## Why

Public trainings are only browsable as cards inside two grids (`/entrenamientos-publicos` and `/portal/entrenamientos-publicos`) that reuse `PublicTrainingCard`. There is no per-training URL, so organizations cannot share a direct link to a single public training on external platforms (social media, ads, partner sites) — visitors always land on the full marketplace grid instead of a rich, self-contained page for the training being promoted. A placeholder route already exists at `src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx` but is empty, and the underlying data model has no schedule, "what's included" list, multi-price support, or long-form description — only a single flat `precio` and a short 2-line `descripcion`.

## What Changes

- Implement the detail page route `/entrenamientos-publicos/{entrenamiento_id}` (public, unauthenticated-friendly, client-side data fetch from `entrenamientos_publicos_view`), rendering a "not found" inline state for an invalid/unpublished/past training.
- Build a new page shell and section components under `components/landing/entrenamientos-publicos/detalle/`, matching [projectspec/designs/pencil/grit-arena-v2.pen](../../../projectspec/designs/pencil/grit-arena-v2.pen) node `obHO3` ("Content", inside the `OyIqr` "Public Training Detail" frame) as visually faithfully as possible — layout, spacing, typography, and colors, not only which content is present: header/breadcrumb, hero banner, tags/title/subtitle/meta row, descripción (Markdown), incluye checklist, cronograma timeline, location card, reserve card, pricing grid, closing CTA banner, footer.
- Add a "Ver detalles" button to `PublicTrainingCard` (both grids) linking to the detail page with a `from` origin query param, so the breadcrumb/"Volver" affordance returns to whichever grid the visitor came from (falling back to the public landing page for cold external links).
- Wire "Reservar mi cupo" on the detail page to the existing auth-branching booking entry points unmodified: `RegistrateParaReservarModal` (anonymous, existing guided-booking journey) and `PublicTrainingReservaModal` (authenticated), based on `useAuth()`.
- Extend `PublicarEntrenamientoModal`/`usePublicarEntrenamiento` so tenant admins can author the new fields at publish time: repeatable `cronograma` (hora + descripción), `incluye` (título + descripción), and `precio` (nombre + precio + descripción) list editors; a `descripcion_larga` Markdown textarea; and a `pagina_evento_url` link field.
- **BREAKING (data model)**: `entrenamientos_publicos.precio` changes from a single nullable `numeric(10,2)` to a `jsonb` array of `{ nombre, precio, descripcion }` items. Existing single prices are migrated into a one-item `"Precio general"` array; existing NULLs become an empty array (`Gratis`). `entrenamientos_publicos_view` is dropped and recreated to project the new column type plus the new `cronograma`, `incluye`, `descripcion_larga`, `pagina_evento_url` columns and an `entrenador_nombre` join.
- `descripcion_larga` is rendered via `react-markdown` (React-element output, never `dangerouslySetInnerHTML`) so admin-authored Markdown cannot execute arbitrary HTML/script in a visitor's browser.

## Capabilities

### New Capabilities
- `public-training-detail-page`: The shareable, unauthenticated-friendly detail page for a single public training — route, page shell/sections matching the `obHO3` design node, the "Ver detalles" card entry point with stable back-navigation (`from` param), and the reservation entry point that reuses the existing anonymous/authenticated booking flows unmodified.

### Modified Capabilities
*(none — no existing `openspec/specs/` capability currently covers the public-trainings marketplace/publish feature introduced by prior US-0089/US-0091/US-0103 work, so the data-model and publish-form changes needed to support the detail page are folded into the new `public-training-detail-page` spec above rather than tracked as a modification.)*

## Non-Goals

- No changes to how booking, plan purchase, or formulario submission work — the anonymous guided-signup journey (`guidedBooking.ts`, `RegistrateParaReservarModal`) and the authenticated booking modal (`PublicTrainingReservaModal`) are reused exactly as they exist today.
- No "Nivel recomendado" row and no amenity tags ("Parqueadero", "Vestieres") on the location card — no data source exists for either and none was requested.
- No "MÁS POPULAR" featured-card badge in the pricing grid — every price option renders with identical visual treatment regardless of position in the array.
- No RLS policy changes — the five new columns live on `entrenamientos_publicos`, whose existing admin-only-write / `activo`-or-own-tenant-read policies already cover them.
- No new API routes or server actions — all data access stays client-side through the existing `services/supabase` layer.
- No change to `middleware.ts`'s `protectedPaths` — the new route is not under `/portal` and must keep loading for anonymous visitors exactly like `/entrenamientos-publicos` already does.

## Impact

- **Database**: one new migration (`20260828120000_entrenamientos_publicos_detalle_fields.sql`) — `cronograma`/`incluye`/`descripcion_larga`/`pagina_evento_url` columns added, `precio` migrated from `numeric` to `jsonb` array, `entrenamientos_publicos_view` dropped/recreated with the new columns and an `entrenador_nombre` join. No RLS policy changes.
- **Types**: `src/types/portal/entrenamientos-publicos.types.ts` — new `CronogramaItem`/`IncluyeItem`/`PrecioItem` types; `EntrenamientoPublico.precio` and `PublicTrainingListItem.precio` change from a scalar to `PrecioItem[]`; new fields added to `EntrenamientoPublico`, `PublicarEntrenamientoInput`/`EntrenamientoPublicoFormValues`, and `PublicTrainingListItem`.
- **Services**: `src/services/supabase/portal/entrenamientos-publicos.service.ts` — extend `listPublicTrainings`/`listPublicTrainingsForLanding` selects/mappings; add `getPublicTrainingDetail(entrenamientoId)`; extend `publicarEntrenamiento`'s write payload.
- **Hooks**: new `src/hooks/landing/entrenamientos-publicos/usePublicTrainingDetalle.ts`; extend `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts`.
- **Components**: new `detalle/` tree (`PublicTrainingDetallePage`, `PublicTrainingDetalleHero`, `...Descripcion`, `...Incluye`, `...Cronograma`, `...Ubicacion`, `...Reserva`, `...Precios`); modify `PublicTrainingCard.tsx` (new `entrenamientoId` prop, "Ver detalles" link, `formatPrecio()` for the array shape), `PublicTrainingsGrid.tsx`, `PublicarEntrenamientoModal.tsx`.
- **Route**: `src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx` implemented (currently an empty placeholder).
- **Dependency**: add `react-markdown` (no Markdown renderer currently installed).
- **Downstream consumers unaffected**: every file that reads/writes `EntrenamientoPublico.precio` or `PublicTrainingListItem.precio` must be updated for the type change, but no other feature slice (bookings, plans, formularios) is otherwise touched.
