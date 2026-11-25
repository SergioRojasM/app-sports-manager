## Context

- **Where events stand.** US-0118 / US-0119 delivered `public.eventos` (with snapshots for discipline, venue, trainers and payment methods, a derived `precio`, and `borrador`), plus `evento_entradas` / `evento_entrada_cupones`, the invoker RPC `guardar_evento_completo`, and the admin management page and wizard. Published events are only visible inside `/portal/orgs/{tenantId}/gestion-eventos`.
- **Reference UX.** The pages to copy are the public-trainings pages:
  - `/entrenamientos-publicos` (`PublicEntrenamientosLandingPage`)
  - `/entrenamientos-publicos/[entrenamiento_id]` (`PublicTrainingDetallePage` + `PublicTrainingDetalleBody`)
  - `/portal/entrenamientos-publicos` (`EntrenamientosPublicosPage`, `useEntrenamientosPublicosMarketplace`, `PublicTrainingFiltersDrawer`)

  That feature **will be deprecated**, so events must not depend on it at runtime.
- **Wizard preview coupling.** The wizard preview already renders `PublicTrainingDetalleBody variant="evento"` through `toDetallePreviewItem()`. The approved event page layout is defined by the `team-events-wizard` requirement "Event page layout":
  - "Evento público" / "Evento privado" tag
  - no Ubicación or "Reserva tu cupo" cards
  - `punto_encuentro` as a "Ver ubicación" header link
  - "Reserva hasta N h antes" and "Página del evento" in the header
  - the closing banner titled "Reserva tu cupo"
- **RLS on `eventos`.** `anon` sees `publico and activo and not borrador`; members also see their tenants' active non-drafts; admins and trainers see **all** of their tenants' rows, including drafts and inactive ones.
- **Routing.** `middleware.ts` protects `/dashboard` and `/portal` only.
- **Constraints**:
  - Read **only** the `eventos` table on these pages (user requirement).
  - Migrations are applied locally only, never pushed to the remote Supabase.
  - Follow the US-0116 grit visual system in the portal and the landing shell on anonymous pages.
  - No toast system.

## Goals / Non-Goals

**Goals:**
- Four routes (listing and detail, anonymous and portal) with one query each against `eventos`.
- Correct visibility, applied explicitly and not only through RLS.
- A detail body shared by both detail pages and the wizard preview, preserving the approved event layout.
- A get-ticket flow with signup, login and **guest** entry, ending in a stable `onContinuar` seam for the purchase phase.
- `nombre_tenant` stored server-side at creation.
- Zero runtime imports from `entrenamientos-publicos` slices.

**Non-Goals:**
- The purchase itself: guest data, payments, tickets, email, coupons.
- Reading ticket or coupon tables publicly.
- Occupancy.
- Per-event server metadata.
- Tenant-rename propagation.
- Any change to public-trainings pages.

## Architecture

```
                         ┌──────────────────────────── public.eventos (RLS) ───────────────────────────┐
                         │  explicit filters: activo ∧ ¬borrador ∧ estado='confirmado' ∧ (fecha≥now ∨ null) │
                         │  + publico=true on landing surfaces                                             │
                         └───────────────▲───────────────────────────────▲─────────────────────────────────┘
                                         │ listEventosPublicados         │ getEventoPublicado
                                         │ ({soloPublicos})              │ (id, {soloPublicos})
Page                         Component (slice)                  Hook                         Service
────────────────────────     ─────────────────────────────      ─────────────────────────    ──────────────────
app/eventos                  landing/eventos/                   landing/eventos/             eventos.service.ts
  page.tsx ───────────────▶    EventosLandingPage ───────────▶    useEventosLanding ───────▶   listEventosPublicados
  [event_id]/page.tsx ────▶    EventoDetalleLandingPage ─────▶    portal/eventos/              getEventoPublicado
                                 └─ EventoDetalleBody ◀──┐          useEventoDetalle ────────▶
app/portal/eventos           portal/eventos/             │        portal/eventos/
  page.tsx ───────────────▶    EventosPublicosPage ──────┼──────▶  useEventosPublicos ──────▶  listEventosPublicados
  [event_id]/page.tsx ────▶    detalle/EventoDetallePortalPage     useEventoDetalle
                                 └─ EventoDetalleBody ◀──┤
                               shared: EventoPublicoCard, │        useObtenerEntrada (flow, no I/O)
                               EventosPublicosGrid,       │
                               ObtenerEntradaModal,       │
                               EventoEntradasModal,       │
                               EventoMetodoPagoCard       │
gestion-eventos wizard                                    │
  EventoPreview (Página) ─────────────────────────────────┘  (toDetallePreviewItem → EventoPublicoDetalle, no I/O)

guardar_evento_completo (RPC, invoker) ── on insert: nombre_tenant := tenants.nombre(p_tenant_id)
```

Get-ticket flow (`useObtenerEntrada`):

```
"Obtener entrada"
   ├─ auth initializing ─────────────▶ button disabled
   ├─ session + portal surface ──────▶ EventoEntradasModal(modo='usuario')
   ├─ session + landing surface ─────▶ push /portal/eventos/{id}?entradas=1
   └─ anonymous ─────────────────────▶ ObtenerEntradaModal
          ├─ Crear cuenta gratis ────▶ /auth/signup?next=/portal/eventos/{id}?entradas=1
          ├─ Ya tengo cuenta ────────▶ /auth/login?next=(same)
          └─ Continuar sin registro
                ├─ from listing ─────▶ push /eventos/{id}?entradas=1
                └─ from detail ──────▶ EventoEntradasModal(modo='invitado')

detail page load + ?entradas=1 (once, useRef guard) ─▶ open modal (portal: usuario; landing: invitado,
                                                        or redirect to portal detail if a session exists) ─▶ router.replace without the param
EventoEntradasModal: radio(precio) ─▶ [payment methods if valor>0] ─▶ "Continuar" (disabled; onContinuar seam)
```

## Decisions

### Page layer
1. **Server pages are thin; data loads client-side.**
   - Each route file is a server component: it awaits `params` and wraps a `'use client'` page in `<Suspense fallback={null}>`, because those pages read `useSearchParams` (`from`, `entradas`).
   - This mirrors `/entrenamientos-publicos/[entrenamiento_id]`.
   - *Alternative*: server-side fetch with `generateMetadata`. That would give better SEO, but it means a server Supabase client on anonymous routes and a second code path. Deferred (non-goal).
2. **Route param is named `event_id`** (user-specified path), even though tenant routes use `evento_id`. Only the page files read it and they pass `eventoId` down, so the inconsistency stays contained.

### Component layer
3. **Copy, don't reuse, the public-trainings components.**
   - Card, grid, filters drawer, banner modal, widget, detail sections and breadcrumb are copied into `components/{portal,landing}/eventos/`.
   - The deprecation of `entrenamientos-publicos` must not break events. The copies also drop training-only concerns (occupancy, required services, "Adquirir plan", form preview).
   - *Alternative*: generalize the training components with more `variant` flags. Rejected: it deepens the coupling this change is meant to remove.
   - Type-only imports (`PrecioItem`, `CronogramaItem`, `IncluyeItem`) stay; moving them is a follow-up.
4. **`EventoDetalleBody` preserves the approved event layout, and deviates from US-0120 on location.** It reproduces the "Event page layout" requirement exactly:
   - The hero tag reads "Evento público" / "Evento privado".
   - There is no Ubicación card. `punto_encuentro` is the "Ver ubicación" header link, titled with the venue name or "Punto de encuentro".
   - The header shows the lead time and "Página del evento".
   - The closing banner is titled "Reserva tu cupo".

   It **adds** only:
   - the organization line in the hero (hidden when `nombreTenant` is `''`);
   - Entrenadores (name + `experiencia`);
   - Entradas (the `precio` list + CTA).

   Payment methods are **not** shown on the event page (product owner decision): they belong to the ticket-purchase flow, so in this phase only `EventoEntradasModal` lists them for a paid ticket.

   Buttons read **"Obtener entrada"** instead of "Reservar mi cupo". The closing banner title stays "Reserva tu cupo"; **the product owner confirmed keeping the current title (2026-09-29).**

   *Why*: admins have already been previewing and publishing against that layout in the wizard. US-0120's separate "Ubicación" section with "Ver en mapa" from coordinates contradicts it. The approved layout wins, and the story's map section is dropped. **Confirmed by the product owner (2026-09-29): keep the current layout.**
5. **Chip vs tag wording.** Cards show a "Solo miembros" chip for `publico = false` (it says who can see the event). The detail hero keeps the existing "Evento privado" tag for consistency with the wizard preview.
6. **One `EventoMetodoPagoCard`** holds payment-method formatting, the copy button and URL safety. It is used (in its `compact` variant) only by the tickets modal; the event page does not list payment methods, which the purchase phase will present at checkout.
7. **Purchase seam = `EventoEntradasModal.onContinuar`.**
   - When the prop is absent, the button renders disabled with an `aria-describedby` "próximamente" notice.
   - The purchase phase only passes a handler; the modal API (`evento`, `modo`, `onContinuar`, `onClose`) is stable.
8. **Guest entry is a UI mode, not data.** "Continuar sin registro" only switches `EventoEntradasModal` to `modo="invitado"` (guest note + "¿Prefieres crear una cuenta?"). Nothing is written, so there is no abuse surface in this phase.

### Hook layer
9. **`useObtenerEntrada` owns all branching** (auth state × surface × `?entradas=1`). Pages stay declarative, and the three pages cannot drift. It performs no I/O; it only uses `useAuth`, `useRouter`, `useSearchParams` and `usePathname`.
10. **Client-side filtering, Bogotá date keys.**
    - `useEventosPublicos` copies the marketplace hook, but uses `toDateKeyInBogota` (from `eventos.utils.ts`) instead of browser-local `toDateKey`, so the date filter matches how event dates are displayed.
    - **Undated events always pass the date filter** and sort last, so a published event is never hidden by the default 60-day window.
    - Organización and Disciplina options are derived from the loaded rows, since there is no other table to read.
11. **`useEventoDetalle` is shared by both detail pages** (it lives in `hooks/portal/eventos/`, like the trainings landing pages import portal pieces). It distinguishes not-found (`evento === null`) from error, so a network failure is never shown as "Evento no encontrado".

### Service layer
12. **New functions live in the existing `eventos.service.ts`.** They reuse `mapServiceError`, `EventoServiceError` and the snapshot mapping, and keep "one service per table". They are the only cross-tenant functions, and they are named explicitly (`…Publicados` / `…Publicado`).
13. **Explicit filters, not RLS alone.**
    - Every call adds `activo = true`, `borrador = false`, `estado = 'confirmado'`, and `fecha_hora >= now() OR fecha_hora IS NULL` (via `.or(...)`).
    - `soloPublicos` adds `publico = true`. It is always `true` on landing surfaces, even with a session.
    - *Why*: RLS gives admins and trainers their own drafts and inactive rows, and gives members private rows. Discovery pages must never show the former. The landing page must never show private rows, even to a logged-in member.
14. **Explicit column projections.**
    - The list projection includes `metodos_pago`, so the tickets modal opened from the portal listing needs no second request. It excludes `formulario_id`, `creado_por` and `omitir_confirmacion_compra`.
    - The detail projection adds `descripcion_larga`, `cronograma`, `incluye` and `cancelacion_antelacion_horas`.
    - `metodos_pago` is **intended public content**: the admin selects which methods to attach in step 3, and step 3 now tells the admin they are shown to ticket buyers.
15. **`.limit(500)` safety cap** on the listing, with a `console.warn` in the hook when it is reached. Pagination is a future concern.
16. **Malformed ids are not found.** `22P02` from `getEventoPublicado` returns `null`, matching `getEventoCompleto`.

### Types / data layer
17. **`nombre_tenant` is set inside the RPC, on insert only.**
    - `select coalesce(nullif(btrim(t.nombre), ''), 'Organización') into v_nombre_tenant from tenants t where t.id = p_tenant_id`, after the FORBIDDEN check. `TENANT_INVALIDO` (`23503`) is raised if no row is found.
    - The UPDATE branch never touches the column, and any `nombre_tenant` in `p_evento` is ignored.
    - *Why the RPC*: it is the single write path for events, and the value must not come from the client.
    - *Alternative*: a `before insert` trigger. It would also cover non-RPC inserts, but there are none (`createEvento` was removed), and a trigger is harder to see. The RPC keeps all event-write logic in one place.
    - *Alternative*: a join or view to `tenants`. That violates the "only `eventos`" rule.
18. **Backfill, then `not null` + a non-blank check** in the same migration. The RPC is re-created with `create or replace` and the **same signature**, so the grants persist. They are re-stated anyway.
19. **`EventoPublicoListItem` / `EventoPublicoDetalle` are new view models** and are not merged into `EventoListItem`, which is tenant/admin-oriented (estado, borrador, activo). `toDetallePreviewItem` now returns `EventoPublicoDetalle`. The wizard preview **shows the organization name** (product owner decision, 2026-09-29), sourced from the new `eventos.nombre_tenant` column:
    - **Edit mode**: `useEventoWizard` keeps `nombreTenant` from the loaded `EventoCompleto.nombre_tenant` (`getEventoCompleto` already selects `*`). It is the stored snapshot, and it stays unchanged even if the tenant was renamed.
    - **Create mode, before the first save**: no row exists yet, so the wizard falls back to the existing `useTenantName(tenantId)`. The breadcrumb on the same page already calls it, and it returns the same value the RPC will write on insert.
    - After the first draft save, the value in state is kept (it equals what the RPC stored).
    - `toDetallePreviewItem(draft, eventoId, tenantId, nombreTenant)` receives it as a parameter. While it is still `null` (loading), `''` is passed and the hero hides the line.
    - *Alternative*: add the name to `useEventoWizardOptions`. That is equivalent, but mixing a per-event snapshot with tenant option lists is less clear.
20. **`METODO_PAGO_TIPO_LABELS`** is exported from `metodos-pago.types.ts`, replacing two duplicated local maps. The existing users may switch to it with no visible change.

### Navigation
21. **Global portal menu `EVENTOS_MENU_ITEM`** (`celebration` icon) goes after `PUBLIC_TRAININGS_MENU_ITEM`.
    - The landing header gets "Eventos" under "Plataforma".
    - `PortalBreadcrumb` gets `eventos: 'Eventos'`.
    - A uuid segment renders as "Evento": extend the existing uuid handling from US-0119, generalizing it if it is keyed to `gestion-eventos`.

## Risks / Trade-offs

- **[Risk] Tenant renames are not reflected in events.** → Documented as snapshot semantics (column comment + non-goal). A follow-up could add an "update tenant name on events" action.
- **[Risk] Client-side filtering over a 500-row cap** could hide events at scale. → A `console.warn` is logged at the cap. Move to server-side filters or pagination when needed.
- **[Risk] The explicit filters drift from RLS semantics** (for example, a future `estado`). → Both filters are centralized in one query builder inside the service. Spec scenarios cover admin-owned drafts, inactive and private-on-landing rows.
- **[Risk] Guest users expect to buy, but "Continuar" is disabled.** → The "próximamente" notice is always visible. The flow is shippable because discovery is still useful. The purchase phase fills the seam.
- **[Trade-off] Copying components duplicates code** with `entrenamientos-publicos` until that feature is removed. → This is accepted: it is temporary and removes the coupling. An isolation grep is part of verification.
- **[Risk] Re-creating `guardar_evento_completo` from a stale copy** could revert phase-2 fixes. → Copy the body from the latest migration verbatim, diff it against `20260929120100_guardar_evento_completo.sql`, and re-run the US-0119 RPC scenarios.
- **[Trade-off] Static `metadata` on detail routes** (generic title) means weaker SEO and link previews. → Deferred to a later story.
- **[Risk] Banner signed URLs expire** (1 year) and would break images on public pages. → This is existing US-0119 behavior. The placeholder renders on image error (`onError` fallback in the card and hero).

## Migration Plan

1. Add `supabase/migrations/20260930120000_eventos_nombre_tenant.sql`: column → backfill → `set not null` + check → `create or replace function guardar_evento_completo` (the latest body plus the three edits) → re-state the grants.
2. Apply **locally only** (`supabase db reset` or `supabase migration up`). Never push to the remote project from this change.
3. Verify in SQL:
   - backfilled values;
   - an RPC create stores `nombre_tenant` while ignoring a client value, and an edit keeps it;
   - the US-0119 RPC scenarios still pass;
   - the visibility matrix as anon, non-member, member, pending member and admin.
4. Ship the frontend.

**Rollback**:
- Frontend: revert the pages, slices and navigation. The wizard preview reverts to `PublicTrainingDetalleBody`.
- Database: re-apply the previous `guardar_evento_completo` definition, then `alter table eventos drop column nombre_tenant`. Both are safe, since no other code depends on the column.

## Open Questions

None. The three questions raised earlier were resolved by the product owner on 2026-09-29:
- **Location section**: keep the current layout (the header "Ver ubicación" link from `punto_encuentro`; no separate Ubicación / "Ver en mapa" section).
- **Closing banner title**: keep "Reserva tu cupo"; the button reads "Obtener entrada".
- **Wizard preview organization line**: show it, from `eventos.nombre_tenant` (with a `useTenantName` fallback before the first save of a new event).
