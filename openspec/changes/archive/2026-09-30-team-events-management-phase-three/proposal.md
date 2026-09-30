## Why

Phases 1 and 2 (US-0118, US-0119) let a tenant admin create, draft, publish and manage events with tickets and payment methods, but a published event is still visible only inside that tenant's admin page. Nobody else can find it or get a ticket. US-0120 adds the audience-facing side:
- listing pages and detail pages, both anonymous and in the portal;
- a "get ticket" entry point that also allows continuing **without signing up**.

This is the discovery flow the ticket-purchase phase will plug into, and it is built so that the public-trainings marketplace can later be deprecated without breaking events.

## What Changes

- **New pages**:
  - `/eventos` (anonymous listing; fills the empty untracked placeholder) and `/eventos/[event_id]` (anonymous detail), both outside `middleware.ts`'s `protectedPaths`.
  - `/portal/eventos` (authenticated listing; fills the empty untracked placeholder) and `/portal/eventos/[event_id]` (authenticated detail).
- **Listings** are copies of the `/entrenamientos-publicos` experience:
  - featured "Próximo" card + grid;
  - the portal adds a "Filtrar" drawer (date range, quick chips, search, **Organización**, **Disciplina**), a 60-day default window and a count widget.
- **Single data source.** Every read targets **only** `public.eventos`: no embeds, views or RPCs. Visibility filters (`activo`, `borrador = false`, `estado = 'confirmado'`, future or undated) are applied explicitly, and the landing pages also add `publico = true`.
- **Detail pages** are built on a new `EventoDetalleBody`. It keeps the approved event layout (US-0119 "Event page layout") and adds:
  - the organization name;
  - an **Entrenadores** section (with `experiencia`);
  - an **Entradas** section.

  Payment methods are not shown on the event page; they belong to the ticket-purchase flow (only the tickets modal lists them in this phase).
- **"Obtener entrada" flow**:
  - Anonymous visitors get a modal with *Crear cuenta gratis*, *Ya tengo cuenta* (both return to `/portal/eventos/{id}?entradas=1`) and **Continuar sin registro**, which opens the tickets modal in guest mode on the public detail page.
  - Authenticated users go straight to the tickets modal.
  - `EventoEntradasModal` lists the ticket options from `precio` and shows the accepted payment methods for paid tickets. It ends in a disabled "Continuar" button: the `onContinuar` seam for the purchase phase.
- **New column** `eventos.nombre_tenant` (not null, backfilled). `guardar_evento_completo` sets it from `tenants` **on create only**; client values are ignored, and edits never touch it.
- **New service functions**: `eventosService.listEventosPublicados({ soloPublicos })` and `getEventoPublicado(id, { soloPublicos })`, plus a new error code mapping `TENANT_INVALIDO`.
- **Wizard preview.** The US-0119 wizard preview (*Página*) switches from `PublicTrainingDetalleBody` to `EventoDetalleBody` and shows the organization name from `nombre_tenant`, and step 3 tells the admin that selected methods are shown to ticket buyers. The events module no longer depends on `entrenamientos-publicos` components.
- **Navigation**:
  - a global portal menu entry "Eventos" (`/portal/eventos`);
  - a landing header entry "Eventos" (`/eventos`);
  - breadcrumb labels `eventos` → "Eventos", and a uuid segment → "Evento".
- `METODO_PAGO_TIPO_LABELS` is exported from `metodos-pago.types.ts`.
- **Management page (added after review)**: an "Activo" / "Inactivo" pill in the cards (opaque, over the banner), list and calendar views, and a quick "Activar evento" / "Desactivar evento" action in every actions menu.

## Capabilities

### New Capabilities
- `team-events-discovery`: the event listing pages (`/eventos`, `/portal/eventos`). It covers:
  - visibility per surface and the card content;
  - the portal filters and the default window;
  - empty, error and loading states;
  - the "Obtener entrada" flow (signup / login / continue without signup, `?entradas=1` auto-open);
  - `EventoEntradasModal` (ticket selection, guest vs user mode, payment methods, purchase seam).
- `team-events-detail-page`: the event detail pages (`/eventos/[event_id]`, `/portal/eventos/[event_id]`). It covers:
  - routing and states (loading / error / not found);
  - `from`-based back navigation;
  - the `EventoDetalleBody` sections (hero with organization, description, incluye, cronograma, entrenadores, entradas, closing CTA; no payment methods).

### Modified Capabilities
- `team-events-data`:
  - the `nombre_tenant` column (not null, backfilled);
  - new cross-tenant read functions `listEventosPublicados` / `getEventoPublicado`, with explicit filters and column projections;
  - the `TENANT_INVALIDO` error mapping.
- `team-events-tickets-data`: `guardar_evento_completo` sets `nombre_tenant` from `tenants` on create and never changes it on edit.
- `team-events-wizard`:
  - the *Página* preview and the "Event page layout" are rendered by `EventoDetalleBody` (adding the organization, Entrenadores and Entradas sections);
  - step 3 shows the "se mostrarán a quienes adquieran entradas" helper text.
- `team-events-management`: an Activo / Inactivo indicator in every view and a quick activar/desactivar action (no modal).
- `portal-role-navigation`: the global (no tenant) sidebar gains an "Eventos" entry to `/portal/eventos` after "Entrenamientos Públicos".

## Non-goals

- Ticket purchase of any kind: guest contact capture, payment, attendee and ticket records, coupon redemption, or email delivery. "Continuar" stays disabled.
- Reading `evento_entradas` or `evento_entrada_cupones` on public pages (sale windows, bundles, coupons).
- Occupancy or tickets-sold counts.
- Server-rendered per-event SEO metadata (`generateMetadata`).
- Propagating tenant renames to existing events: `nombre_tenant` is a snapshot.
- Removing, redirecting or modifying `/entrenamientos-publicos`, its detail page, or `/portal/entrenamientos-publicos`.
- Restricting `metodos_pago` columns. They are intended public content, visible to the event's audience.
- Changes to `LoginForm` / `SignupForm`: they already honor `next`.

## Files to Create or Modify

Order follows page → component → hook → service → types, then lib, database and docs.

| Layer | File | Change |
|-------|------|--------|
| Page | `src/app/eventos/page.tsx` | Fill the placeholder: `metadata` + `<EventosLandingPage />` |
| Page | `src/app/eventos/[event_id]/page.tsx` | New: `await params`, Suspense, `<EventoDetalleLandingPage eventoId />` |
| Page | `src/app/portal/eventos/page.tsx` | Fill the placeholder: Suspense + `<EventosPublicosPage />` |
| Page | `src/app/portal/eventos/[event_id]/page.tsx` | New: `await params`, Suspense, `<EventoDetallePortalPage eventoId />` |
| Component | `src/components/landing/eventos/EventosLandingPage.tsx`, `EventoDetalleLandingPage.tsx`, `EventoDetalleBreadcrumb.tsx`, `index.ts` | New: landing shells |
| Component | `src/components/portal/eventos/EventosPublicosPage.tsx` | New: portal listing |
| Component | `src/components/portal/eventos/EventoPublicoCard.tsx`, `EventosPublicosGrid.tsx`, `EventoBannerModal.tsx`, `EventosDisponiblesWidget.tsx`, `EventosPublicosFiltersDrawer.tsx` | New: listing pieces |
| Component | `src/components/portal/eventos/ObtenerEntradaModal.tsx`, `EventoEntradasModal.tsx`, `EventoMetodoPagoCard.tsx`, `index.ts` | New: get-ticket flow |
| Component | `src/components/portal/eventos/detalle/EventoDetalleBody.tsx`, `EventoDetalleHero.tsx`, `EventoDetalleDescripcion.tsx`, `EventoDetalleIncluye.tsx`, `EventoDetalleCronograma.tsx`, `EventoDetalleEntrenadores.tsx`, `EventoDetalleEntradas.tsx`, `EventoDetalleCtaBanner.tsx`, `EventoDetalleStates.tsx`, `EventoDetallePortalPage.tsx`, `index.ts` | New: detail body and portal detail page |
| Component | `src/components/portal/gestion-eventos/wizard/EventoPreview.tsx` | Render `EventoDetalleBody` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | Public-visibility helper text; use `METODO_PAGO_TIPO_LABELS` |
| Component | `src/components/portal/PortalBreadcrumb.tsx` | `eventos` label; uuid segment → "Evento" |
| Component | `src/components/landing/Header.tsx` | "Eventos" → `/eventos` under "Plataforma" |
| Hook | `src/hooks/landing/eventos/useEventosLanding.ts` | New |
| Hook | `src/hooks/portal/eventos/useEventosPublicos.ts`, `useEventoDetalle.ts`, `useObtenerEntrada.ts` | New |
| Service | `src/services/supabase/portal/eventos.service.ts` | `listEventosPublicados`, `getEventoPublicado`, projections, mappers, `TENANT_INVALIDO` |
| Types | `src/types/portal/eventos.types.ts` | `Evento.nombre_tenant`; `EventoPublicoListItem`, `EventoPublicoDetalle`, `EventoEntradasModo`, `EventoEntradaSeleccion`, `EventosPublicosDateChip` |
| Types | `src/types/portal/metodos-pago.types.ts` | `METODO_PAGO_TIPO_LABELS` |
| Types | `src/types/portal.types.ts` | `EVENTOS_MENU_ITEM` in `resolvePortalMenu` (no tenant) |
| Lib | `src/lib/portal/eventos-publicos.utils.ts` | New: chip ranges, search matcher, `from` resolution, href builders, `toHttpUrl` |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | `toDetallePreviewItem` returns `EventoPublicoDetalle` (+ `nombreTenant` parameter, `metodosPago`) |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | Expose `nombreTenant`: `EventoCompleto.nombre_tenant` in edit mode, `useTenantName(tenantId)` before the first save |
| Migration | `supabase/migrations/20260930120000_eventos_nombre_tenant.sql` | Column, backfill, `not null` + check, re-created RPC |
| Docs | `projectspec/03-project-structure.md` | Routes, slices, service, column, RPC change |

## Implementation Plan

1. Migration: add `nombre_tenant`, backfill it, and re-create `guardar_evento_completo` with the insert-only assignment. Apply locally and verify in SQL.
2. Types: `eventos.types.ts`, `metodos-pago.types.ts`.
3. Service: projections, mappers, `listEventosPublicados`, `getEventoPublicado`, error mapping.
4. Lib: `eventos-publicos.utils.ts`; update `toDetallePreviewItem`.
5. Hooks: `useEventosLanding`, `useEventosPublicos`, `useEventoDetalle`, `useObtenerEntrada`.
6. Components:
   - shared listing pieces;
   - get-ticket modals and the payment-method card;
   - the `detalle/` sections and `EventoDetalleBody`;
   - the four page components.
7. Pages: fill the two placeholders and create the two `[event_id]` routes.
8. Wizard: switch `EventoPreview` to `EventoDetalleBody`; add the step 3 helper text.
9. Navigation: portal menu, landing header, breadcrumb.
10. Verification:
    - seed events across two tenants and walk through the visibility, filters, detail and get-ticket paths;
    - run the isolation grep, `npm run lint` and `npm run build`.
11. Update `projectspec/03-project-structure.md`.

## Impact

- **Database**: one column on `eventos` and a re-created RPC with the same signature and grants. No RLS or index changes.
- **Security**: public pages rely on RLS plus explicit filters. `formulario_id`, `creado_por` and `omitir_confirmacion_compra` are never selected. `metodos_pago` is shown intentionally. "Continuar sin registro" writes nothing in this phase.
- **Code**: new `eventos` slices, with no imports from `components|hooks|lib/*/entrenamientos-publicos`. The wizard preview drops its dependency on `PublicTrainingDetalleBody`.
- **Unchanged**: the public-trainings pages and the `gestion-eventos` management behavior.
