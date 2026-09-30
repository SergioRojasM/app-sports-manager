# US-0120 — Team Events Management (Phase 3: Public & Portal Event Listing and Detail Pages)

## ID
US-0120

## Name
Team events module, phase 3: event discovery and detail pages, both anonymous (`/eventos`, `/eventos/[event_id]`) and in the portal (`/portal/eventos`, `/portal/eventos/[event_id]`).
- They copy the `/entrenamientos-publicos` experience and read **only** the `eventos` table.
- A new `eventos.nombre_tenant` snapshot column is set when an event is created.
- A "get ticket" entry point lets visitors sign up, log in, or **continue without signing up**.
- Everything lives in new `eventos` feature slices that do not depend on the soon-to-be-deprecated `entrenamientos-publicos` slice.

## As a
Visitor (not logged in) and authenticated portal user (athlete, trainer or administrator of any tenant)

## I Want
- To browse the upcoming published events of every team, filtered by date, text, discipline and organization.
- To open a detail page for each event: description, what is included, schedule, trainers, venue and ticket options.
- To start getting a ticket either with my account or, if I prefer, without signing up.

## So That
- The events built in US-0118 / US-0119 reach their audience.
- Visitors who do not want an account are not lost at the entry point.
- The ticket-purchase phase has a finished discovery → detail → ticket-selection flow to plug into.
- This replaces the public-trainings marketplace, which will be deprecated.

---

## Description

### Current State
- **Existing event data.** US-0118 created the `eventos` table and the admin management page. US-0119 added the wizard, drafts (`borrador`), tickets (`evento_entradas`), coupons and payment-method snapshots. The RPC `guardar_evento_completo` rewrites the derived `eventos.precio` (`[{ nombre, precio, descripcion }]`) on every save.
- **No visibility outside the admin page.** Events are visible only to their own tenant's admins, inside `/portal/orgs/{tenantId}/gestion-eventos`, and there is no public or member-facing page.
- **No tenant name on the row.** `eventos` does not store the organization name, so showing it today would require reading `tenants`.
- **Empty route placeholders.** `src/app/eventos/page.tsx` and `src/app/portal/eventos/page.tsx` exist as **empty, untracked placeholders** (0 bytes). The detail routes do not exist.
- **The reference experience is public trainings:**
  - `/entrenamientos-publicos` → `PublicEntrenamientosLandingPage` (landing shell, `Header`, `PublicTrainingsGrid`, `RegistrateParaReservarModal`).
  - `/entrenamientos-publicos/[entrenamiento_id]` → `PublicTrainingDetallePage` (landing shell, `from`-driven breadcrumb, loading / error / not-found states, `PublicTrainingDetalleBody`).
  - `/portal/entrenamientos-publicos` → `EntrenamientosPublicosPage` (sticky header with a count widget, "Filtrar" drawer, default 60-day window, featured card + grid).
- **Wizard preview dependency.** The US-0119 wizard preview (`EventoPreview`) renders `PublicTrainingDetalleBody variant="evento"` through `toDetallePreviewItem()`, which builds a `PublicTrainingListItem`. This couples the events module to the slice that will be deprecated.
- **Routing.** `middleware.ts` protects only `/dashboard` and `/portal`. `/eventos/**` is therefore already public, and `/portal/eventos/**` already redirects to login with `next`.

### Proposed Changes

#### Scope of this phase
| In scope | Out of scope (later phases) |
|----------|-----------------------------|
| Listing pages `/eventos` and `/portal/eventos` | Ticket purchase: guest contact data, payment, attendee and ticket records, coupon redemption |
| Detail pages `/eventos/[event_id]` and `/portal/eventos/[event_id]` | Occupancy / tickets sold |
| `eventos.nombre_tenant` column, backfill, and setting it in `guardar_evento_completo` on create | Propagating tenant renames to existing events (it is a snapshot) |
| Organization name on cards and detail pages; **Organización** and **Disciplina** filters | Server-rendered SEO metadata per event (`generateMetadata`) |
| "Get ticket" modal with **Crear cuenta / Ya tengo cuenta / Continuar sin registro** | Removing or redirecting `/entrenamientos-publicos` |
| `EventoEntradasModal`: ticket selection shown from `precio`, in *invitado* or *usuario* mode, ending in the purchase seam | |
| Moving the wizard preview to the new `EventoDetalleBody` | |
| Menu, landing header and breadcrumb entries | |

#### Data source rule: only `public.eventos`
Every read in this story is `from('eventos')`, with **no embeds** and no other table, view or RPC. The row carries everything the pages need as snapshots:

| UI field | Source column |
|---|---|
| Organization | `nombre_tenant` (**new**, text snapshot, see *Database Changes*) |
| Discipline | `disciplina_id` (text, the discipline **name**) |
| Venue | `escenario_id` snapshot (`nombre`, `ubicacion`, `direccion`, `coordenadas`, `image_url`), falling back to `punto_encuentro` |
| Trainers | `entrenador_id[]` (`nombre`, `experiencia`) |
| Tickets / price | `precio` (derived from the complete tickets) |
| Payment methods | `metodos_pago[]` (`nombre`, `tipo`, `valor`, `url`, `comentarios`): the snapshots the admin **chose to publish** for this event in wizard step 3 |
| Page content | `descripcion_larga` (Markdown), `cronograma`, `incluye`, `pagina_evento_url` |
| Banner | `banner_url` (signed URL stored by the wizard) |

Accepted consequences:
- **No occupancy.** Cards and the detail page show "Cupo: N" or "Cupo ilimitado" (`formatCupo`) instead of "reservas activas / cupos disponibles".
- **Limited ticket detail.** Ticket details come from `precio` only (name, amount, description). Sale windows, *Múltiple* bundles and coupons live in `evento_entradas` / `evento_entrada_cupones`, which are not read. The purchase phase will read them.

#### Which events are shown (listing and detail)
The service **always** applies these filters explicitly, never relying on RLS alone, because RLS lets a tenant's admins and trainers read their own drafts and inactive events:
- `activo = true`
- `borrador = false`
- `estado = 'confirmado'` (cancelled events are hidden)
- `fecha_hora >= now()` **or** `fecha_hora is null` (undated events are listed as "Fecha por definir")

| Surface | Extra filter | Result |
|---|---|---|
| `/eventos`, `/eventos/[event_id]` | `publico = true`, always, even when the browser has a session | Only public events. A private event's id shows "Evento no encontrado". |
| `/portal/eventos`, `/portal/eventos/[event_id]` | none (RLS decides) | Public events of every tenant, plus the `publico = false` events of tenants where the user is a (non-pending) member. Private events show a **"Solo miembros"** chip. |

A detail page for an event that exists but fails these filters (draft, inactive, cancelled, past, or private on the landing page) is indistinguishable from a bad id: it shows "Evento no encontrado". This matches `getPublicTrainingDetail`.

Listing order: `fecha_hora` ascending, nulls last, then `nombre`. The first item is the **featured** card ("Próximo").

#### Column projections (never `*`)
```ts
const EVENTOS_PUBLICOS_LIST_SELECT =
  'id, tenant_id, nombre_tenant, nombre, descripcion, pagina_evento_url, disciplina_id, ' +
  'escenario_id, entrenador_id, fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro, ' +
  'reserva_antelacion_horas, precio, metodos_pago, banner_url, publico';

const EVENTO_PUBLICO_DETALLE_SELECT =
  EVENTOS_PUBLICOS_LIST_SELECT + ', descripcion_larga, cronograma, incluye, cancelacion_antelacion_horas';
```
- **`metodos_pago` is public content.** In wizard step 3 the admin picks which of the team's payment methods apply to the event, precisely so that buyers see them. The event's `publico` flag already decides who can read the row. The column is in **both** projections: the tickets modal opens from the portal listing too, and this way it needs no extra request. Cards do not render it.
- `formulario_id`, `creado_por` and `omitir_confirmacion_compra` are **never** selected. They are internal, and cards and detail pages do not use them.

#### Slice layout (no dependency on `entrenamientos-publicos`)
- **No new or modified file may import** from `components/*/entrenamientos-publicos/`, `hooks/*/entrenamientos-publicos/` or `lib/portal/entrenamientos-publicos/`. Components are **copied and adapted**.
- Type-only imports that `eventos.types.ts` already has (`PrecioItem`, `CronogramaItem`, `IncluyeItem`) are allowed. Moving them is a follow-up.
- Allowed imports: the grit kit (`@/components/ui`), `@/components/landing/Header` / `Footer`, `@/lib/portal/disciplina-visual`, `@/lib/portal/eventos.utils`, `useAuth`, `react-markdown`.

| Folder | Purpose |
|---|---|
| `src/components/portal/eventos/` | Portal listing page plus pieces shared with the landing page (card, grid, filters drawer, tickets modal, get-ticket modal, count widget, banner modal) |
| `src/components/portal/eventos/detalle/` | `EventoDetalleBody` and its sections (shared by both detail pages and the wizard preview), the portal detail page, and the states |
| `src/components/landing/eventos/` | Landing listing shell and the landing detail page shell |
| `src/hooks/portal/eventos/` | Portal listing hook, detail hook (used by both detail pages), get-ticket flow hook |
| `src/hooks/landing/eventos/` | Landing listing hook |
| `src/lib/portal/eventos-publicos.utils.ts` | Date chips, search matcher, `from` resolution, `?entradas=` helpers |

#### "Get ticket" flow (`ObtenerEntradaModal` + `useObtenerEntrada`)
This replaces the "registrate para reservar" modal. The CTA label is **"Obtener entrada"** everywhere.

**When the user has a session** (`useAuth().user`, never decided while `initializing`, during which the CTA is disabled):
- On a portal page → open `EventoEntradasModal` in `modo="usuario"`.
- On a landing page → `router.push('/portal/eventos/{id}?entradas=1')`.

**When the user is anonymous** → open `ObtenerEntradaModal` (copy of `RegistrateParaReservarModal`, grit/landing styles as on the source page):
- Title: "Obtén tu entrada".
- Body: "Para **{nombre}** puedes crear una cuenta gratis para gestionar tus entradas desde GRIT Arena, o continuar sin registrarte."
- Three actions, in this order:

  1. **"Crear cuenta gratis"** (primary) → `/auth/signup?next={encodeURIComponent('/portal/eventos/{id}?entradas=1')}`
  2. **"Ya tengo cuenta"** (secondary) → `/auth/login?next={same}`
  3. **"Continuar sin registro"** (tertiary, text-style button, icon `arrow_forward`):
     - From the landing **listing** → `router.push('/eventos/{id}?entradas=1')`.
     - From the landing **detail** page → close this modal and open `EventoEntradasModal` in `modo="invitado"` on the same page.
- Below the actions, a muted hint: "Sin cuenta no podrás ver tus entradas en el portal; te las enviaremos a tu correo." (The purchase phase must honor this promise.)
- `LoginForm` and `SignupForm` are **not** modified; they already honor `next`. The US-0103 `guidedBooking` helpers are **not** reused.

**`?entradas=1` auto-open** (both detail pages): after the event loads, if the param is present, open `EventoEntradasModal` once (`useRef` guard). The mode is `usuario` on the portal page and `invitado` on the landing page (on the landing page only when there is no session; with a session, redirect to the portal detail). Then `router.replace(pathname + other params, { scroll: false })` to drop it. If the event is not found, the param is ignored.

#### `EventoEntradasModal` (ticket selection; the purchase seam)
Follows the existing modal pattern: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus on open, `Escape` closes, focus returns to the trigger.

- Header "Entradas · {nombre}", plus a line with the organization, date and place.
- A radio list (`role="radiogroup"`, native radios) of the `precio` options. Each shows `nombre`, the amount (`formatCop`, or "Gratis" for `0`) and `descripcion`. The first option is preselected. With an empty `precio`: "Este evento aún no tiene entradas disponibles.", and the continue button is hidden.
- When the selected ticket has an amount `> 0` and the event has payment methods, a compact **"Métodos de pago aceptados"** block lists the methods. It reuses the same card as `EventoDetalleMetodosPago`, in its `compact` variant: name, tipo badge and `valor` with "Copiar"; `url` and `comentarios` go behind a "Ver más" toggle. The block is hidden for free tickets.
- In `modo="invitado"`, an info note: "Estás comprando como invitado. Te pediremos tus datos de contacto para enviarte la entrada." It also shows a link "¿Prefieres crear una cuenta?" that goes to the signup URL above.
- Primary button **"Continuar"** calls the prop `onContinuar({ eventoId, entrada: PrecioItem, modo })`. **In this phase** the pages pass no handler. The button is rendered disabled with `aria-describedby` pointing to a `GritAlert` (info): "La compra de entradas estará disponible próximamente." The purchase phase supplies `onContinuar` without changing the modal's API.
- A "Cerrar" button.

#### UI: `/eventos` (anonymous listing), `EventosLandingPage`
A copy of `PublicEntrenamientosLandingPage` (landing shell, `Header`, `font-landing-*`):
- "Volver al inicio" link, `h1` "Eventos disponibles", subtitle "Descubre los eventos de los equipos en GRIT Arena y obtén tu entrada."
- Loading "Cargando eventos…". Error "No fue posible cargar los eventos." with a **"Reintentar"** button.
- `EventosPublicosGrid` with no filters (same as the trainings landing page). Card CTAs: "Ver detalles" → `/eventos/{id}?from=/eventos`, and "Obtener entrada" → get-ticket flow.
- `metadata`: title "Eventos disponibles — GRIT Arena", description "Descubre eventos de los equipos en GRIT Arena y obtén tu entrada."

#### UI: `/portal/eventos` (authenticated listing), `EventosPublicosPage`
A copy of `EntrenamientosPublicosPage` inside the portal shell (US-0116 system: `grit-*`, `rounded-grit-*`, one `h1`, no outer padding):
- **Sticky header**: `h1` "Eventos <span class=text-grit-cyan>Públicos</span>", `EventosDisponiblesWidget` ("{N} eventos disponibles", singular "1 evento disponible"), and a "Filtrar" button (icon `tune`).
- **Default window note** while `isDefaultDateRange`: "Se muestran los eventos de los próximos 60 días. Si quieres ver más, filtra por fechas."
- **`EventosPublicosFiltersDrawer`** (copy of `PublicTrainingFiltersDrawer`):
  - Month calendar range picker.
  - Quick chips *Hoy* / *Mañana* / *Esta semana* / *Fin de semana* (clicking the active chip clears the range).
  - Search.
  - **Organización** select ("Todas" + distinct `{ tenantId, nombreTenant }` of the loaded events, sorted by label).
  - **Disciplina** select ("Todas" + distinct `disciplina_id` names, sorted).
  - **"Limpiar filtros"**, which restores the defaults (60-day window, empty search, all organizations and disciplines).
- **Filtering** (client-side, `useMemo`), all combined with AND:
  - Date range: compares `toDateKeyInBogota(fechaHora)` against `dateFrom` / `dateTo`, both inclusive. **Undated events always pass the date filter** and are placed after the dated ones.
  - Search: trimmed, case- and accent-insensitive (`normalize('NFD')`). Matches `nombre`, `descripcion`, `nombreTenant`, `disciplinaNombre`, `escenarioNombre`, `puntoEncuentro` and trainer names.
  - Organización: by `tenantId`.
  - Disciplina: by exact name.
- Card CTAs: "Ver detalles" → `/portal/eventos/{id}?from=/portal/eventos`; "Obtener entrada" → `EventoEntradasModal` in `modo="usuario"`.

#### UI: detail pages
`EventoDetalleBody` (in `components/portal/eventos/detalle/`) is chrome-agnostic and shared by both detail pages and the wizard preview. Props:
```ts
{
  evento: EventoPublicoDetalle;
  onObtenerEntrada: () => void;
  obtenerEntradaDisabled: boolean;
  tipoLabel?: string;   // hero tag, e.g. "Evento público" / "Solo miembros"
}
```
Sections, copied and adapted from `PublicTrainingDetalle*` using the `variant="evento"` behavior:

1. **`EventoDetalleHero`**: banner (or discipline-gradient placeholder) with the "Ver" banner modal, discipline chip, `tipoLabel` tag, **organization line** (icon `shield`, `nombreTenant`), `h1` name, short `descripcion`, and meta items:
   - Date ("Fecha por definir"), and the time range `formatRangoHorario(fechaHora, duracionMinutos)`.
   - Place, **as the current event layout does (product owner decision, 2026-09-29)**: `punto_encuentro` rendered as a "Ver ubicación" link (new tab) when it is an http/https URL, otherwise as plain text; titled with the escenario name or "Punto de encuentro". There is no separate Ubicación section.
   - Capacity.
   - "Reserva hasta N h antes" / "Cancela hasta N h antes" when set.
   - "Página del evento" external link (`pagina_evento_url`).
   - It contains a divider and **`EventoDetalleDescripcion`** (`descripcion_larga` rendered with `react-markdown`, never `dangerouslySetInnerHTML`; hidden when empty).
2. **`EventoDetalleIncluye`** and **`EventoDetalleCronograma`**, side by side on `lg`, each hidden when its array is empty.
3. **`EventoDetalleEntrenadores`** (new, no training equivalent): one card per `entrenador_id` snapshot with the name and its `experiencia` (hidden when empty). The section is hidden when there are no trainers.
4. **`EventoDetalleEntradas`**: list of `precio` options (name, amount or "Gratis", description), with the "Obtener entrada" button.
Payment methods are **not** shown on the event page (product owner decision, 2026-09-30): they will be presented in the ticket-purchase flow. In this phase only `EventoEntradasModal` lists them, for a selected paid ticket.
5. **`EventoDetalleCtaBanner`**: closing banner keeping the current title "Reserva tu cupo" (no subtitle; product owner decision, 2026-09-29), with the button "Obtener entrada".

**`/eventos/[event_id]`** (`src/app/eventos/[event_id]/page.tsx`, server page):
- `await params` and render `<Suspense fallback={null}><EventoDetalleLandingPage eventoId={event_id} /></Suspense>` (it reads `from` and `entradas`).
- Static `metadata`: "Evento | GRIT Arena".
- `EventoDetalleLandingPage` (`components/landing/eventos/`) copies the `PublicTrainingDetallePage` shell (landing `Header` + `Footer`, `landing-shell`). It renders the breadcrumb, then the loading / error ("Reintentar") / not-found ("Evento no encontrado", link to `/eventos`) states, or the body.
- `from` is resolved as same-origin paths only; otherwise it falls back to `/eventos` (same rule as `resolveOrigin`).
- `tipoLabel="Evento público"`.
- Data comes from `useEventoDetalle(eventoId, { soloPublicos: true })`.

**`/portal/eventos/[event_id]`** (`src/app/portal/eventos/[event_id]/page.tsx`, server page):
- `await params` and render `<Suspense fallback={null}><EventoDetallePortalPage eventoId={event_id} /></Suspense>`.
- It is inside the portal shell, which provides the breadcrumb, so there is no custom breadcrumb.
- A "Volver a eventos" link uses `from` (same-origin, default `/portal/eventos`).
- The same states as the landing page, with the not-found state linking to `/portal/eventos`.
- `tipoLabel` is "Evento público", or "Solo miembros" when `publico = false`.
- Data comes from `useEventoDetalle(eventoId, { soloPublicos: false })`.

#### Wizard preview migration (US-0119 follow-through)
- `EventoPreview` (*Página* tab) renders **`EventoDetalleBody`** instead of `PublicTrainingDetalleBody`, with `onObtenerEntrada={() => {}}` and `obtenerEntradaDisabled`.
- `toDetallePreviewItem(draft, eventoId, tenantId, nombreTenant)` in `src/lib/portal/eventos-wizard.utils.ts` now returns an **`EventoPublicoDetalle`**. The preview **shows the organization name** (product owner decision, 2026-09-29), taken from the new `eventos.nombre_tenant` column:
  - **Edit mode**: `useEventoWizard` exposes `nombreTenant` from the loaded `EventoCompleto.nombre_tenant`.
  - **Create mode, before the first save**: the row does not exist yet, so the wizard falls back to the existing `useTenantName(tenantId)` hook (already used by the breadcrumb on that page). It returns the same value the RPC will store on insert, and it is kept after the first draft save.
  - While the name is still loading, `''` is passed and the hero hides the line.
- `EventoMetodosPagoStep` helper text (US-0119 step 3) adds: "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento." This way the admin knows they are publishing them.
- After this change, `grep -r "entrenamientos-publicos" src/components/portal/gestion-eventos src/lib/portal/eventos-wizard.utils.ts` returns only type imports.

#### Navigation
- Portal global menu (`resolvePortalMenu`, no tenant): add `EVENTOS_MENU_ITEM = { label: 'Eventos', href: '/portal/eventos', icon: 'celebration' }` right after `PUBLIC_TRAININGS_MENU_ITEM`.
- Landing `Header` → "Plataforma" children: add `{ label: 'Eventos', href: '/eventos' }` after "Calendario de Entrenamientos".
- `PortalBreadcrumb` `SLUG_LABELS`: add `eventos: 'Eventos'`. A uuid segment under `/portal/eventos/` renders "Evento" and never the raw id. Reuse the uuid handling added in US-0119; if it is keyed to `gestion-eventos`, generalize it.

---

## Database Changes

### Migration: `supabase/migrations/20260930120000_eventos_nombre_tenant.sql`

```sql
-- =============================================
-- Migration: Team events phase 3 (US-0120)
-- Organization name snapshot on eventos, set once on create by guardar_evento_completo.
-- =============================================

begin;

-- 1. Column + backfill
alter table public.eventos add column nombre_tenant varchar(150);

update public.eventos e
   set nombre_tenant = coalesce(nullif(btrim(t.nombre), ''), 'Organización')
  from public.tenants t
 where t.id = e.tenant_id;

alter table public.eventos alter column nombre_tenant set not null;
alter table public.eventos
  add constraint eventos_nombre_tenant_ck check (length(btrim(nombre_tenant)) > 0);

comment on column public.eventos.nombre_tenant is
  'Tenant name snapshot taken when the event is created (US-0120). Not updated on tenant rename.';

-- 2. guardar_evento_completo: set nombre_tenant on insert
--    Re-create the function from the LATEST definition in 20260929120100_guardar_evento_completo.sql,
--    copied verbatim, with only these changes:
--      a) declare v_nombre_tenant varchar(150);
--      b) right after the FORBIDDEN role check (step 1), and only when p_es_nuevo:
--           select coalesce(nullif(btrim(t.nombre), ''), 'Organización')
--             into v_nombre_tenant
--             from tenants t
--            where t.id = p_tenant_id;
--           if not found then
--             raise exception 'TENANT_INVALIDO' using errcode = '23503';
--           end if;
--      c) in the `insert into eventos (...)` add the column `nombre_tenant` and the value `v_nombre_tenant`.
--    The UPDATE branch does NOT touch nombre_tenant. The value is never read from p_evento
--    (client-sent values are ignored).
create or replace function public.guardar_evento_completo(
  p_tenant_id  uuid,
  p_evento_id  uuid,
  p_es_nuevo   boolean,
  p_borrador   boolean,
  p_evento     jsonb,
  p_entradas   jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
  -- … full body as described above …
$$;

commit;
```

Notes:
- **Signature and grants.** The signature is unchanged, so `create or replace` keeps the existing grants (`execute` to `authenticated`, revoked from `anon` / `public`). Re-state them anyway at the end of the migration for clarity.
- **Tenant read under `security invoker`.** The function is `security invoker`, so the `tenants` read runs under the caller's RLS. Verify that a tenant admin/trainer can `select nombre from tenants where id = <their tenant>`. They can already, since the portal shows it. A `not found` there means the caller has no access and is covered by the earlier `FORBIDDEN` check.
- **No RLS changes.** The existing `eventos` policies (anon: `publico and activo and not borrador`; authenticated: + member tenants' active non-drafts, + all rows of admin/trainer tenants) cover the new column. `nombre_tenant` is public information, the same as `tenantNombre` in `entrenamientos_publicos_view`.
- **No new index.** The landing query uses `idx_eventos_publicos_fecha_hora`, and the organization filter is client-side.
- **Error mapping.** Map the new RPC code in `eventos.service.ts` `mapServiceError`: `TENANT_INVALIDO` (`23503`) → `invalid_reference`, "La organización del evento no existe."
- **Types.** Regenerate Supabase types if the project keeps a generated `database.types.ts`.

**`metodos_pago` visibility is intended.** The column holds only the methods the admin explicitly attached to the event (wizard step 3), for buyers to pay with. It is readable by exactly the audience that can read the event (`publico` / member rules), so no column-level restriction is needed. The admin controls exposure by choosing which methods to attach. The wizard step 3 helper text should say so; see *Wizard preview migration*.

---

## API / Server Actions

### `src/services/supabase/portal/eventos.service.ts` (modify)

#### `listEventosPublicados(options: { soloPublicos: boolean }): Promise<EventoPublicoListItem[]>`
```ts
let query = supabase
  .from('eventos')
  .select(EVENTOS_PUBLICOS_LIST_SELECT)
  .eq('activo', true)
  .eq('borrador', false)
  .eq('estado', 'confirmado')
  .or(`fecha_hora.gte.${new Date().toISOString()},fecha_hora.is.null`);
if (options.soloPublicos) query = query.eq('publico', true);
const { data, error } = await query
  .order('fecha_hora', { ascending: true, nullsFirst: false })
  .limit(500);
```
- Cross-tenant: there is no `tenant_id` filter.
- Rows are mapped with `toPublicoListItem`.

#### `getEventoPublicado(eventoId: string, options: { soloPublicos: boolean }): Promise<EventoPublicoDetalle | null>`
- Same filters as the listing, plus `.eq('id', eventoId)`, then `.select(EVENTO_PUBLICO_DETALLE_SELECT).maybeSingle()`.
- A malformed id (`22P02`) returns `null`, as does no row.
- Rows are mapped with `toPublicoDetalle`.

#### Both functions
- Errors go through the existing `mapServiceError` → `EventoServiceError`.
- Auth: the browser client with the current session when present, otherwise anon. Access is enforced by RLS plus the explicit filters. No service role.
- `listEventos`, `getEventoCompleto`, `guardarEventoCompleto`, `updateEstadoEvento` and `deleteEvento` are unchanged, apart from the new `TENANT_INVALIDO` mapping.

### Types: `src/types/portal/eventos.types.ts` (modify)
- `Evento`: add `nombre_tenant: string`.
- New types:
```ts
/** Cross-tenant listing item for /eventos and /portal/eventos (US-0120). Built only from `eventos` columns. */
export type EventoPublicoListItem = {
  id: string;
  tenantId: string;
  nombreTenant: string;
  nombre: string;
  descripcion: string | null;
  paginaEventoUrl: string | null;
  disciplinaNombre: string;
  escenario: EventoEscenarioSnapshot | null;
  escenarioNombre: string | null;
  escenarioUbicacion: string | null;
  puntoEncuentro: string | null;
  entrenadores: EventoEntrenadorSnapshot[];
  /** Trainer names joined with ", ", or null. */
  entrenadorNombre: string | null;
  fechaHora: string | null;
  duracionMinutos: number | null;
  cupoMaximo: number | null;
  reservaAntelacionHoras: number | null;
  precio: PrecioItem[];
  /** Payment methods the admin published for this event (US-0119 step 3). */
  metodosPago: EventoMetodoPagoSnapshot[];
  bannerUrl: string | null;
  publico: boolean;
};

/** Detail page / wizard preview model (US-0120). */
export type EventoPublicoDetalle = EventoPublicoListItem & {
  descripcionLarga: string | null;
  cronograma: CronogramaItem[];
  incluye: IncluyeItem[];
  cancelacionAntelacionHoras: number | null;
};

export type EventoEntradasModo = 'usuario' | 'invitado';

export type EventoEntradaSeleccion = {
  eventoId: string;
  entrada: PrecioItem;
  modo: EventoEntradasModo;
};

export type EventosPublicosDateChip = 'today' | 'tomorrow' | 'this_week' | 'weekend';
```

### Hooks
| Hook | Returns |
|---|---|
| `src/hooks/landing/eventos/useEventosLanding.ts` | `{ items, loading, error, refetch }`. Calls `listEventosPublicados({ soloPublicos: true })`. Error message: "No fue posible cargar los eventos." |
| `src/hooks/portal/eventos/useEventosPublicos.ts` | Same shape as `useEntrenamientosPublicosMarketplace`: `loading`, `error`, `items`, `allItems`, `featuredItem`, `standardItems`, `tenantOptions: { id, label }[]` (derived from rows), `disciplinaOptions: string[]`, `dateFrom`, `dateTo`, `isDefaultDateRange`, `calendarMonth`, `goToPrevMonth` (not before the current Bogotá month), `goToNextMonth`, `setDateRange`, `clearDateRange`, `applyDateChip`, `search`, `setSearch`, `tenantId`, `setTenantId`, `disciplina`, `setDisciplina`, `hasActiveFilters`, `clearFilters`, `refetch`. Calls `listEventosPublicados({ soloPublicos: false })`. |
| `src/hooks/portal/eventos/useEventoDetalle.ts` | `(eventoId, { soloPublicos })` → `{ evento, loading, error, refetch }`. `evento === null` after loading means not found. Error message: "No fue posible cargar el evento." |
| `src/hooks/portal/eventos/useObtenerEntrada.ts` | `({ evento, surface: 'landing-listado' \| 'landing-detalle' \| 'portal' })` → `{ obtenerEntrada(), disabled, registroModalOpen, closeRegistroModal, entradasModal: { open, modo, close }, continuarSinRegistro(), signupHref, loginHref }`. Encapsulates the branching described in *"Get ticket" flow*. It also opens the modal from `?entradas=1` and strips the param, once. |

### Lib: `src/lib/portal/eventos-publicos.utils.ts` (new, pure)
- `computeEventosChipRange(chip, now = new Date())` → Bogotá date keys (Monday-first week).
- `addDaysKeyInBogota(dateKey, days)`.
- `matchesEventoSearch(item, needle)`: accent-insensitive.
- `resolveEventosOrigin(from, fallback)`: same-origin paths only.
- `buildEventoPortalDetalleHref(id, { entradas })`, `buildEventoLandingDetalleHref(id, { entradas, from })`.
- `toHttpUrl(value)`: copied, not imported, from the trainings hero.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260930120000_eventos_nombre_tenant.sql` | `nombre_tenant` column, backfill, `not null` + check, re-created `guardar_evento_completo` setting it on insert |
| Types | `src/types/portal/eventos.types.ts` | `Evento.nombre_tenant`; `EventoPublicoListItem` (incl. `metodosPago`), `EventoPublicoDetalle`, `EventoEntradasModo`, `EventoEntradaSeleccion`, `EventosPublicosDateChip` |
| Types | `src/types/portal/metodos-pago.types.ts` | Export `METODO_PAGO_TIPO_LABELS: Record<MetodoPagoTipo, string>` (Transferencia, Efectivo, Tarjeta, Pasarela, Otro), the same values currently duplicated in `EventoMetodosPagoStep` and `TenantPaymentMethodsCard`. Those two may switch to it with no visible change. |
| Service | `src/services/supabase/portal/eventos.service.ts` | Projections, `toPublicoListItem`, `toPublicoDetalle`, `listEventosPublicados`, `getEventoPublicado`, `TENANT_INVALIDO` mapping |
| Lib | `src/lib/portal/eventos-publicos.utils.ts` | New pure helpers (see above) |
| Lib | `src/lib/portal/eventos-wizard.utils.ts` | `toDetallePreviewItem` returns `EventoPublicoDetalle` (+ `nombreTenant` param) |
| Hook | `src/hooks/landing/eventos/useEventosLanding.ts` | New |
| Hook | `src/hooks/portal/eventos/useEventosPublicos.ts` | New |
| Hook | `src/hooks/portal/eventos/useEventoDetalle.ts` | New |
| Hook | `src/hooks/portal/eventos/useObtenerEntrada.ts` | New |
| Component | `src/components/portal/eventos/EventoPublicoCard.tsx` | New: adapted from `PublicTrainingCard`. It shows the organization line (`nombreTenant`), the "Solo miembros" chip, capacity instead of occupancy, trainers, price, and "Ver detalles" + "Obtener entrada". It drops required services, the form preview and "Adquirir plan". |
| Component | `src/components/portal/eventos/EventosPublicosGrid.tsx` | New: featured + grid, empty and filtered-empty states |
| Component | `src/components/portal/eventos/EventoBannerModal.tsx` | New: copy of `PublicTrainingBannerModal` |
| Component | `src/components/portal/eventos/EventosDisponiblesWidget.tsx` | New: copy of `SessionsAvailableWidget` |
| Component | `src/components/portal/eventos/EventosPublicosFiltersDrawer.tsx` | New: copy of `PublicTrainingFiltersDrawer` with Organización + Disciplina + "Limpiar filtros" |
| Component | `src/components/portal/eventos/ObtenerEntradaModal.tsx` | New: signup / login / **continuar sin registro** |
| Component | `src/components/portal/eventos/EventoEntradasModal.tsx` | New: ticket selection in `usuario` / `invitado` mode, with `onContinuar` as the purchase seam |
| Component | `src/components/portal/eventos/EventosPublicosPage.tsx` | New `'use client'` portal listing page |
| Component | `src/components/portal/eventos/detalle/EventoDetalleBody.tsx` | New: section layout, shared by both detail pages and the wizard preview |
| Component | `src/components/portal/eventos/detalle/EventoDetalleHero.tsx`, `EventoDetalleDescripcion.tsx`, `EventoDetalleIncluye.tsx`, `EventoDetalleCronograma.tsx`, `EventoDetalleEntrenadores.tsx`, `EventoDetalleEntradas.tsx`, `EventoDetalleCtaBanner.tsx`, `EventoDetalleStates.tsx` | New: copies and adaptations of the `PublicTrainingDetalle*` sections (plus the trainers and payment-methods sections) |
| Component | `src/components/portal/eventos/EventoMetodoPagoCard.tsx` | New: one payment method (name, tipo badge, `valor` + "Copiar", safe `url` link, `comentarios`), with a `compact` variant for `EventoEntradasModal` |
| Component | `src/components/portal/eventos/detalle/EventoDetallePortalPage.tsx` | New `'use client'` portal detail page |
| Component | `src/components/portal/eventos/detalle/index.ts`, `src/components/portal/eventos/index.ts` | New barrels |
| Component | `src/components/landing/eventos/EventosLandingPage.tsx` | New `'use client'` landing listing shell |
| Component | `src/components/landing/eventos/EventoDetalleLandingPage.tsx` | New `'use client'` landing detail shell (Header/Footer, breadcrumb, states, body, modals) |
| Component | `src/components/landing/eventos/EventoDetalleBreadcrumb.tsx` | New: copy of `PublicTrainingDetalleBreadcrumb` ("Eventos › {nombre}") |
| Component | `src/components/landing/eventos/index.ts` | New barrel |
| Component | `src/components/portal/gestion-eventos/wizard/EventoPreview.tsx` | Render `EventoDetalleBody` instead of `PublicTrainingDetalleBody` |
| Component | `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx` | Helper text "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento."; optionally use `METODO_PAGO_TIPO_LABELS` |
| Hook | `src/hooks/portal/gestion-eventos/useEventoWizard.ts` | Expose `nombreTenant` (`EventoCompleto.nombre_tenant` in edit mode; `useTenantName(tenantId)` before the first save of a new event) |
| Page | `src/app/eventos/page.tsx` | Fill the placeholder: `metadata` + `<EventosLandingPage />` |
| Page | `src/app/eventos/[event_id]/page.tsx` | New server page: `await params`, Suspense, `<EventoDetalleLandingPage eventoId />` |
| Page | `src/app/portal/eventos/page.tsx` | Fill the placeholder: `<Suspense><EventosPublicosPage /></Suspense>` |
| Page | `src/app/portal/eventos/[event_id]/page.tsx` | New server page: `await params`, Suspense, `<EventoDetallePortalPage eventoId />` |
| Navigation | `src/types/portal.types.ts` | `EVENTOS_MENU_ITEM` after `PUBLIC_TRAININGS_MENU_ITEM` |
| Navigation | `src/components/landing/Header.tsx` | "Eventos" → `/eventos` under "Plataforma" |
| Navigation | `src/components/portal/PortalBreadcrumb.tsx` | `eventos: 'Eventos'`; uuid segment → "Evento" |
| Docs | `projectspec/03-project-structure.md` | The 4 routes, new slices, `eventos-publicos.utils.ts`, the service functions, `nombre_tenant` in the eventos table notes, and the RPC change |

No file under any `entrenamientos-publicos` folder is modified.

---

## Acceptance Criteria

**Database**
1. After the migration, `eventos.nombre_tenant` is `not null`, and every pre-existing row holds its tenant's current name.
2. Creating an event through the wizard (either a draft or a final save) stores `nombre_tenant` equal to `tenants.nombre` for that tenant, even if the RPC payload includes a different `nombre_tenant`.
3. Editing an event (draft or published) never changes `nombre_tenant`. Renaming the tenant afterwards does not change existing events.
4. `guardar_evento_completo` keeps its grants: it is callable by `authenticated` and not by `anon`. All US-0119 RPC acceptance criteria (validation, drafts, atomicity, `client_key` map) still pass.

**Data & visibility**
5. Every data request made by the four pages targets `rest/v1/eventos` only (checked in the Network tab). There are no requests to `tenants`, `disciplinas`, `escenarios`, `usuarios`, `evento_entradas`, views or RPCs.
6. No projection includes `formulario_id`, `creado_por` or `omitir_confirmacion_compra`. `metodos_pago` is included, and it contains only the methods the admin attached to that event.
7. `/eventos` lists only events with `publico = true`, `activo = true`, `borrador = false`, `estado = 'confirmado'` and a future or null `fecha_hora`, from every tenant. This holds with or without a session.
8. Drafts, inactive, cancelled and past events never appear in either listing. Their detail URLs show "Evento no encontrado", including for the owning tenant's admin.
9. On `/portal/eventos` and `/portal/eventos/{id}`, a member of tenant T sees T's private events with the "Solo miembros" chip. A non-member or a `pendiente_activacion` member does not see them; the detail page shows "Evento no encontrado".
10. `/eventos/{id}` of a private event shows "Evento no encontrado", even for a member who has a session.
11. Listings are ordered by date ascending, undated last, and the first card is the featured "Próximo" card.

**Listing pages**
12. `/eventos` loads without a session and shows the landing `Header`, "Volver al inicio", `h1` "Eventos disponibles", and the title "Eventos disponibles — GRIT Arena". A load error shows "Reintentar", which re-fetches. With no events, it shows "No hay eventos disponibles por ahora."
13. Each card shows: the banner or placeholder, discipline chip, **organization name**, name, description, Bogotá date and time (or "Fecha por definir"), place (venue + location, meeting point, or "Lugar por definir"), capacity, trainers when present, and a price of "Gratis", "$X" or "Desde $X". It has the buttons "Ver detalles" and "Obtener entrada".
14. `/portal/eventos` without a session redirects to login and returns afterwards. The global menu shows "Eventos" after "Entrenamientos Públicos". The breadcrumb reads "Eventos". The page shows one `h1`, the count widget (matching the filtered count; singular for 1), and the 60-day note while the default range is active.
15. By default the portal listing shows events from today through today + 60 days (Bogotá), plus **all** undated events.
16. In the drawer, the date range, quick chips, search, Organización and Disciplina combine with AND. Clicking the active chip clears it. Search ignores case and accents ("cafe" matches "Café") and matches the organization name. The Organización and Disciplina options are exactly the distinct values of the loaded events, sorted, plus "Todas".
17. Filters with no match show "No hay eventos que coincidan con los filtros" and "Limpiar filtros", which restores all defaults.

**Detail pages**
18. `/eventos/{id}` loads without a session inside the landing shell. `/portal/eventos/{id}` loads inside the portal shell with the breadcrumb "Eventos › Evento" (never a raw uuid). Both show exactly one `h1` with the event name.
19. The detail page shows the hero (banner, discipline, organization, date, time range, place, capacity, antelación lines, "Página del evento" link when set), the Markdown description, Incluye, Cronograma, the **Entrenadores** section with each trainer's `experiencia`, Entradas, and the closing banner "Reserva tu cupo" with the "Obtener entrada" button. There is no separate Ubicación section. Every section with no data is hidden, not shown empty.
19b. The event page (both routes and the wizard preview) shows **no** payment methods, even for a paid event that has them; they appear only in the Entradas modal for a selected paid ticket.
20. A `punto_encuentro` that is an http/https URL is rendered in the hero as a "Ver ubicación" link opening in a new tab (`rel="noopener noreferrer"`), titled with the escenario name or "Punto de encuentro"; otherwise it is plain text.
21. A malformed id (`/eventos/abc`) or an unknown id shows "Evento no encontrado" with a link back to the right listing. A network failure shows the error state with "Reintentar", not "not found".
22. The "Volver" / breadcrumb target honors a same-origin `from` param. An external or protocol-relative `from` (`//evil.com`) falls back to `/eventos` or `/portal/eventos`.

**Get-ticket flow**
23. While the session is resolving, "Obtener entrada" is disabled.
24. Anonymous on `/eventos` or `/eventos/{id}`: "Obtener entrada" opens "Obtén tu entrada" with three actions.
    - "Crear cuenta gratis" → `/auth/signup?next=%2Fportal%2Feventos%2F{id}%3Fentradas%3D1`; "Ya tengo cuenta" → `/auth/login?next=…` with the same value.
    - "Continuar sin registro" from the listing → `/eventos/{id}?entradas=1`; from the detail page → it closes the modal and opens the Entradas modal in *invitado* mode.
    - `Escape` and the close button close the modal.
25. After signing up or logging in from that modal, the user lands on `/portal/eventos/{id}` with the Entradas modal open (*usuario* mode), and `?entradas=1` is removed from the URL.
26. With a session on a landing page, "Obtener entrada" navigates straight to `/portal/eventos/{id}?entradas=1`. On a portal page it opens the Entradas modal directly.
27. `/eventos/{id}?entradas=1` without a session opens the Entradas modal in *invitado* mode once and strips the param. Reloading afterwards does not reopen it.
28. The Entradas modal lists each `precio` option as a radio (name, amount or "Gratis", description), with the first one preselected. In *invitado* mode it shows the guest note and the "¿Prefieres crear una cuenta?" link. "Continuar" is disabled and described by "La compra de entradas estará disponible próximamente." An event with empty `precio` shows "Este evento aún no tiene entradas disponibles."
28b. In the Entradas modal, selecting a paid ticket shows the "Métodos de pago aceptados" block with the event's methods. Selecting a free ticket hides it. This works when the modal is opened from the portal listing, with no extra network request.

**Wizard preview**
29. In the US-0119 wizard, the *Página* preview renders `EventoDetalleBody` and still updates live with every keystroke, including the new Entrenadores section; it shows no payment methods. Step 3 shows the helper text "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento." The *Tarjeta* preview is unchanged.

**Isolation**
30. `grep -rE "(components|hooks)/[a-z]+/entrenamientos-publicos|lib/portal/entrenamientos-publicos"` over the new `eventos` slices, `components/portal/gestion-eventos` and `lib/portal/eventos*.ts` returns nothing. Only type imports from `types/portal/entrenamientos-publicos.types` remain.
31. `/entrenamientos-publicos`, its detail page, `/portal/entrenamientos-publicos` and `/portal/orgs/{tenantId}/gestion-eventos` (list + wizard) behave exactly as before. `npm run lint` and `npm run build` pass.

---

## Implementation Steps

- [ ] Write `20260930120000_eventos_nombre_tenant.sql`: copy the latest RPC body, apply the three changes, apply locally, and verify AC 1–4 in SQL
- [ ] Verify the visibility matrix in SQL as anon, non-member, member, pending member and admin (AC 7–10), and confirm `banner_url` loads without a session
- [ ] Update `eventos.types.ts` (`nombre_tenant` + the new types)
- [ ] Add the projections, mappers, `listEventosPublicados`, `getEventoPublicado` and the `TENANT_INVALIDO` mapping to `eventos.service.ts`
- [ ] Create `src/lib/portal/eventos-publicos.utils.ts`
- [ ] Create the hooks: `useEventosLanding`, `useEventosPublicos`, `useEventoDetalle`, `useObtenerEntrada`
- [ ] Build the shared components: card, grid, banner modal, widget, filters drawer, `ObtenerEntradaModal`, `EventoEntradasModal`
- [ ] Build the `detalle/` sections and `EventoDetalleBody`
- [ ] Build the pages: `EventosPublicosPage`, `EventoDetallePortalPage`, `EventosLandingPage`, `EventoDetalleLandingPage` + breadcrumb, and the barrels
- [ ] Fill the two placeholder routes and create the two `[event_id]` routes
- [ ] Switch `EventoPreview` / `toDetallePreviewItem` to `EventoDetalleBody` / `EventoPublicoDetalle`
- [ ] Add the menu item, landing header link and breadcrumb labels
- [ ] Seed events across two tenants (public / private, confirmed / cancelled, draft, inactive, past, undated, with and without banner / escenario / coordinates / trainers / cronograma / incluye / payment methods (with and without `url` and `comentarios`), free / one price / several prices) and walk through AC 5–29
- [ ] Test the three get-ticket paths end to end: signup, login, and continue without signup, from both the listing and the detail page
- [ ] Run the isolation grep (AC 30), `npm run lint` and `npm run build`
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**:
  - RLS stays the enforcement layer. The explicit filters (`activo`, `borrador`, `estado`, and `publico` on the landing pages) make sure staff-only rows never reach discovery or detail pages.
  - `nombre_tenant` is set **server-side** inside the RPC from `tenants` and is never taken from the client payload. Edits never touch it.
  - Explicit column projections. `formulario_id`, `creado_por` and `omitir_confirmacion_compra` are never requested.
  - `metodos_pago` is published on purpose. It holds only the methods the admin attached to the event, and it reaches exactly the event's audience. Payment URLs render as links only for http/https, and `comentarios` is plain text (no HTML or Markdown).
  - "Continuar sin registro" creates no data in this phase. The guest purchase (contact data capture, validation, rate limiting, email delivery) is designed in the purchase story.
  - `from` redirects accept same-origin paths only. `event_id` is used only as an equality filter (malformed ids → not found). `?entradas` is a boolean flag only.
  - External links (`pagina_evento_url`, maps, URL-type `punto_encuentro`) use `target="_blank" rel="noopener noreferrer"` and only http/https schemes.
  - Markdown goes through `react-markdown`, never `dangerouslySetInnerHTML`.
  - No service-role client.
- **Performance**:
  - One query per listing page and one per detail page. There are no N+1 calls, unlike the trainings marketplace's per-row capacity calls.
  - The landing listing is backed by `idx_eventos_publicos_fecha_hora`, and the detail lookup by the primary key.
  - `limit(500)` safety cap on listings; the hook logs `console.warn` when it is reached. Client-side filters are memoized.
  - Banners use `loading="lazy"`, except on the featured card and the detail hero.
- **Accessibility**:
  - One `h1` per page. Card titles are `h3`; detail sections use `h2`.
  - Modals: `role="dialog"`, `aria-modal`, `aria-labelledby`, focus moves inside on open and returns to the trigger on close, and `Escape` closes them.
  - Ticket options are a native radio group. The disabled "Continuar" button is described by the "próximamente" notice.
  - Date chips use `aria-pressed`. Every select and the search input have a `<label>`. Icon-only buttons have an `aria-label`.
  - The "Solo miembros", "Próximo" and "Evento público" tags carry text, not just an icon or color.
- **Error handling**:
  - Load errors show an inline message with "Reintentar". Not-found has its own state, separate from errors.
  - Hooks `console.error` the underlying error before setting the Spanish message.
  - There is no toast system; do not add one.
