# US-0089 — Public Training Marketplace

## ID
US-0089

## Name
Publish trainings to a cross-tenant Public Training Marketplace

## As a
Tenant administrator (publisher) and any authenticated platform user (visitor)

## I Want
Administrators to be able to publish a single training instance as a public listing (with its own price and banner image), and any authenticated user — whether or not they belong to that organization — to browse all published trainings from a dedicated "Entrenamientos Públicos" page.

## So That
Clubs can market their open training sessions to athletes outside their own organization, and prospective athletes have a discovery surface to find and reserve sessions across every club on the platform, using the exact same booking process (forms, restrictions, advance-notice rules) that already applies inside a tenant.

---

## Description

### Current State

- `entrenamientos` already has a `visibilidad` (`publico`/`privado`) + `visible_para` mechanism (US-0013) that only flips a flag and grants cross-tenant **SELECT** on the row itself via RLS (`entrenamientos_select_authenticated`). There is **no UI surface that lists these public rows** anywhere in the app — the mechanism is effectively dead weight today.
- `EntrenamientoWizard.tsx` (inside `EntrenamientoFormModal.tsx`) exposes a `Privado`/`Público` radio group (lines ~173–205) that lets any admin/coach flip a training's visibility at creation/edit time, with no separate curation step (no price, no marketing image, no admin review before it goes cross-tenant).
- `src/app/portal/entrenamientos-publicos/page.tsx` exists as an **empty placeholder file** (no exported component) directly under `src/app/portal/` — the same non-tenant-scoped tier as `/portal/inicio` and `/portal/orgs`, i.e. reachable by any authenticated user without entering a specific organization's tenant context.
- The training options menu (`EntrenamientoActionModal.tsx`, opened via the "Opciones" button in `EntrenamientosList.tsx`) currently offers: Ver detalle, Ver reservas, Editar, Eliminar. There is no publishing action.
- The portal dropdown menu (`PortalNavMenu.tsx` → `usePortalNavigation` → `resolvePortalMenu()` in `src/types/portal.types.ts`) only shows `Inicio` and `Organizaciones Disponibles` when the user has not entered a tenant (`!tenantId` branch).

### Proposed Changes

This US introduces a **separate, denormalized publication record** (`entrenamientos_publicos`) rather than reusing the existing `visibilidad`/`visible_para` flag. Publishing is a deliberate, admin-curated action that snapshots the fields relevant to a public listing (name, description, schedule, location, capacity) plus two new marketing-only fields (`precio`, `banner_url`), decoupled from the operational training row. This lets an admin edit how the public listing reads/looks without touching the real training, and lets us cleanly scope "publish this one instance, never the series."

The existing `visibilidad`/`visible_para` columns and their RLS policy are **left in place untouched** (no migration removes them) since other code paths may still read them, but no UI will set them to `publico` anymore going forward — the radio toggle is removed and creation always forces `privado`. This is called out explicitly so the implementer doesn't try to "finish the migration" by deleting the old columns; that is out of scope here.

#### 1. Publish action (admin-only, single instance)

- Add a **"Publicar"** entry to `EntrenamientoActionModal.tsx`, visible only when `role === 'administrador'` (stricter than `canManage`, which also includes `entrenador`). Disabled with the same "no se pueden publicar entrenamientos pasados" treatment as `canEdit`/`canDelete` when the instance is historical.
- Button label reads **"Publicar"** when the instance has no existing `entrenamientos_publicos` row, and **"Gestionar publicación"** when one already exists (fetched via a lightweight lookup, see Hooks section).

##### 1a. Pre-publish validation: block trainings with servicio-based restrictions

Before the "Publicar" button can be used, it must be checked against the training's existing `entrenamiento_restricciones` rows (US-0034):

- **A training with any servicio-based restriction (`servicio_1_id`…`servicio_4_id` set on any `entrenamiento_restricciones` row) cannot be published.** A cross-tenant visitor can never satisfy that condition — they cannot hold a subscription/service in a tenant they aren't a member of — so publishing such a training would just produce a listing nobody outside the org could ever successfully book. This is a hard rule, not a warning.
- **Trainings whose only "restriction" is the advance-notice window (`reserva_antelacion_horas`/`cancelacion_antelacion_horas`, which live directly on `entrenamientos`, not as `entrenamiento_restricciones` rows) remain publishable** — a pure time-based cutoff is satisfiable by anyone, member or not, so it is never a blocker.
- Other `entrenamiento_restricciones` conditions this US does **not** block on (`plan_id`, `disciplina_id` + `validar_nivel_disciplina`, `usuario_estado`) are out of scope for this check — only `servicio_*_id` is validated, per this US's explicit ask. Note this as a known gap for a future US if it turns out those also need blocking.
- **UI enforcement**: `EntrenamientosPage.tsx` computes a `canPublish`/`publishDisabledReason` alongside the existing `selectedActionContext` (`canEdit`/`canDelete`), using `entrenamientosService.getInstanceRestrictions(tenantId, trainingId)` (already used by `ReservasPanel.tsx` — no new query shape). When `true`, the "Publicar"/"Gestionar publicación" button in `EntrenamientoActionModal.tsx` is disabled with the reason: *"Este entrenamiento tiene restricciones de servicios y no puede publicarse. Elimina las restricciones de servicio del entrenamiento para poder publicarlo."*
- **Service + DB enforcement (defense-in-depth)**: `entrenamientosPublicosService.publicarEntrenamiento(...)` re-checks the same condition immediately before insert/update and throws a typed `EntrenamientoPublicoServiceError('servicio_restriction', ...)` if violated (guards against a stale disabled-button state, e.g. two admins editing concurrently). The migration additionally adds a `before insert or update` trigger on `entrenamientos_publicos` that raises if the referenced `entrenamiento_id` has any servicio-restricted row — so the rule holds even for a future code path that writes to this table directly, not just through this service.
- Clicking opens a new `PublicarEntrenamientoModal.tsx`: a right-side slide-over showing a **live preview** of the public card (reusing `PublicTrainingCard.tsx`, see below) next to an editable form: nombre, descripción (max 2 lines guidance, matches the reference card), precio, and a banner image upload (drag/select, preview, same MIME/size validation pattern as `useOrgBannerUpload`). Read-only fields shown in the preview but not editable here: fecha/hora, duración, escenario (ubicación), cupo — these stay driven by the source `entrenamiento` row so the listing never drifts from the real session.
- Submitting calls `entrenamientosPublicosService.publicarEntrenamiento(...)`, which **inserts** a new row keyed by `entrenamiento_id` the first time, or **updates in place** on subsequent opens (one-to-one, enforced by a unique constraint). Only the single `entrenamientos` row referenced (`trainingId`) is touched — never `entrenamiento_grupo_id` siblings — satisfying "cuando se publica, solo se publica el entrenamiento no la serie."
- When a publication already exists, the modal also shows a secondary **"Despublicar"** button that sets `activo = false` (soft unpublish, keeps history, re-publishable later by reopening the same modal).

#### 2. Remove the visibility toggle from the training wizard

- Remove the `Privado`/`Público` radio group from `EntrenamientoWizard.tsx` (~lines 173–205). Replace with a **read-only** info row: a static "Privado" pill (or the instance's current stored value, for legacy edited rows — see Non-Functional/Edge cases) plus helper text: *"Los entrenamientos se crean privados. Podrás publicarlos públicamente después, desde las opciones del entrenamiento."*
- `useEntrenamientoForm.ts` keeps `visibilidad: 'privado'` as the fixed initial value (already the default) and it is never reassigned by user input anymore — the field simply stops being interactive. No changes needed to `TrainingWizardValues`, `CreateTrainingSeriesInput`, or the service's `visibilidad`/`visible_para` write path; they keep working exactly as today, always receiving `'privado'` for newly created trainings via the wizard.
- `TrainingField` union, `fieldErrors.visibilidad`, and the existing validation in `useEntrenamientoForm.ts` (line ~260) are left as-is (harmless dead code paths) since `values.visibilidad` can no longer become anything but `'privado'`/its original value through this form.

#### 3. Public Training Marketplace page

- Replace the empty `src/app/portal/entrenamientos-publicos/page.tsx` with a page that **only renders a component** (no data fetching/business logic in the page file, per architecture rules):

  ```tsx
  import { EntrenamientosPublicosPage } from '@/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage';

  export default function Page() {
    return <EntrenamientosPublicosPage />;
  }
  ```

- Build the page using **`projectspec/designs/pencil/grit-arena.pen` node `ql3Ij`** as the exact visual reference: deep navy background with soft cyan/teal glows and diagonal accent lines; left column (title "Entrenamientos Públicos" + subtitle + glass filter panel: date chips Hoy/Mañana/Esta semana/Fin de semana, a monthly mini calendar, an "Organización" dropdown, and a search field); right column: a responsive grid of `PublicTrainingCard`s; a floating glass widget top-right showing a live count ("N entrenamientos disponibles esta semana").
- **Scope adaptation vs. the design mock** (documented here so the implementer doesn't chase 1:1 parity where it doesn't map to this domain):
  - The design's "Team" dropdown becomes **"Organización"** — since here the cross-tenant axis is the club/tenant, not a team within one club. Options are the distinct tenants that currently have at least one active publication.
  - Date chips (Hoy/Mañana/Esta semana/Fin de semana) and the search field are **fully functional**, filtering the fetched list client-side by `fecha_hora` and by `nombre`/`descripcion` substring match, respectively.
  - The mini calendar is **visual only in this iteration** (renders the current month, highlights today) — it does not drive filtering. Calling this out explicitly as a scope cut; wiring day-click filtering is a natural follow-up US if needed.
  - The "Featured" card treatment from the design (larger card, cyan glow, "Featured" badge) is applied to the **most recently published** active listing; the remaining results render as standard cards in a responsive grid (wraps naturally instead of the fixed 6-card layout from the static mock).
- Trainings are filtered to `activo = true` and `fecha_hora >= now()` (no point marketing a session that already happened).

#### 4. Booking from the marketplace reuses the existing reservation pipeline as-is

Booking process and formulario handling are **identical to today's** — nothing new is invented, because `entrenamientos_publicos.entrenamiento_id` always points at the real, operational `entrenamientos` row. Publishing never forks the reservation logic; it only adds a marketing wrapper around the same training.

- Clicking **"Reservar"** on a `PublicTrainingCard` opens a new, deliberately thin wrapper — `PublicTrainingReservaModal.tsx` — that renders the **existing** `ReservaFormModal` (and, when the training has an internal form template, the **existing** `FormularioRespuestaModal`) exactly as `ReservasPanel.tsx` does today, driven by a new `usePublicTrainingReserva.ts` hook that composes the **existing** `useReservaForm`/`useFormularioRespuestaForm` hooks and the **existing** `reservasService.create()` — no changes to `reservas.service.ts` are needed.
  - We do **not** reuse `ReservasPanel.tsx` wholesale: it also bundles the tenant-admin reservations list, CSV/Excel export, and attendance management, none of which a cross-tenant visitor should ever see (and `role` will be `null`/non-member for them in that tenant, so those admin branches must stay hidden — verify this explicitly, see Acceptance Criteria).
  - `tenantId` and the target training come from the publication row itself (`entrenamientos_publicos.tenant_id` / `entrenamiento_id`), **not** from route params or `useTenantAccess` — the marketplace page has no `[tenant_id]` segment, and both `useReservaForm` and `ReservaFormModal` already accept `tenantId` as a plain prop, so this requires no changes to their signatures.
- Because booking targets the same `entrenamiento_id`, everything that already gates a booking today keeps gating it identically for a marketplace visitor:
  - **Servicio-based restrictions never actually surface here in practice**, because §1a blocks publishing any training that has one — by the time a listing is visible on the marketplace, it is guaranteed not to carry a `servicio_*_id` restriction. The existing `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` rejection codes in `reservas.service.ts` still exist and still fire correctly for same-tenant bookings; they simply shouldn't be reachable from a published listing. Keep this as a defense-in-depth expectation (see Acceptance Criteria), not something to special-case away.
  - **Formularios** (`formulario_id`/`formulario_externo`/`formulario_obligatorio`) — apply exactly as today; an internal form template still routes through `FormularioRespuestaModal` before the reservation is created, an external form link still opens in a new tab per the existing flow.
  - **Advance-notice rules** (`reserva_antelacion_horas` for booking, `cancelacion_antelacion_horas` for cancelling) — enforced at booking/cancellation time by the **existing** validation against the source `entrenamientos` row (single source of truth; no new enforcement logic). `entrenamientos_publicos` additionally **snapshots** `reserva_antelacion_horas`/`cancelacion_antelacion_horas` at publish time purely so the card can **display** the rule to a visitor before they open the booking form (e.g. "Reserva con al menos 4h de anticipación"). If an admin changes the rule on the operational training later without reopening "Gestionar publicación," the displayed snapshot can go briefly stale — acceptable, low-impact, same class of staleness already accepted for `nombre`/`descripcion`; the enforced value is never stale because it's read from the source row.
- **Known limitation (explicitly out of scope for this US):** a cross-tenant reservation created this way lives under the *foreign* tenant. Since the visitor is not a member of that tenant, they cannot navigate into `/portal/orgs/[tenant_id]/(atleta)/mis-reservas` to see or cancel it later from that surface. Surfacing "my reservations across every tenant I've ever booked with, member or not" is a separate, larger feature and is **not** built here — flag it to the user after a successful booking (e.g. a confirmation toast with the reservation's date/time) but do not attempt to solve cross-tenant reservation history in this US.

---

## Database Changes

New migration: `supabase/migrations/20260723010000_entrenamientos_publicos.sql`

```sql
begin;

create table public.entrenamientos_publicos (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null,
  entrenamiento_id  uuid not null,
  nombre            varchar(150),
  descripcion       text,
  disciplina_id     uuid not null,
  escenario_id      uuid not null,
  entrenador_id     uuid,
  fecha_hora        timestamptz,
  duracion_minutos  integer,
  cupo_maximo       integer,
  punto_encuentro   varchar(200),
  estado            varchar(30) not null default 'pendiente',
  reserva_antelacion_horas      integer,
  cancelacion_antelacion_horas  integer,
  precio            numeric(10,2),
  banner_url        varchar(500),
  activo            boolean not null default true,
  publicado_por     uuid,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),

  constraint entrenamientos_publicos_tenant_id_fkey
    foreign key (tenant_id) references public.tenants(id) on delete cascade,
  constraint entrenamientos_publicos_entrenamiento_id_fkey
    foreign key (entrenamiento_id) references public.entrenamientos(id) on delete cascade,
  constraint entrenamientos_publicos_disciplina_id_fkey
    foreign key (disciplina_id) references public.disciplinas(id) on delete restrict,
  constraint entrenamientos_publicos_escenario_id_fkey
    foreign key (escenario_id) references public.escenarios(id) on delete restrict,
  constraint entrenamientos_publicos_entrenador_id_fkey
    foreign key (entrenador_id) references public.usuarios(id) on delete set null,
  constraint entrenamientos_publicos_publicado_por_fkey
    foreign key (publicado_por) references public.usuarios(id) on delete set null,
  constraint entrenamientos_publicos_entrenamiento_id_uk
    unique (entrenamiento_id),
  constraint entrenamientos_publicos_precio_ck
    check (precio is null or precio >= 0),
  constraint entrenamientos_publicos_cupo_ck
    check (cupo_maximo is null or cupo_maximo > 0),
  constraint entrenamientos_publicos_reserva_antelacion_ck
    check (reserva_antelacion_horas is null or reserva_antelacion_horas >= 0),
  constraint entrenamientos_publicos_cancelacion_antelacion_ck
    check (cancelacion_antelacion_horas is null or cancelacion_antelacion_horas >= 0)
);

create index idx_entrenamientos_publicos_tenant_id on public.entrenamientos_publicos (tenant_id);
create index idx_entrenamientos_publicos_activo on public.entrenamientos_publicos (activo);
create index idx_entrenamientos_publicos_fecha_hora on public.entrenamientos_publicos (fecha_hora);

alter table public.entrenamientos_publicos enable row level security;
grant select, insert, update, delete on public.entrenamientos_publicos to authenticated;

-- SELECT: any authenticated user (member or not) can browse active public listings
create policy entrenamientos_publicos_select_authenticated on public.entrenamientos_publicos
  for select to authenticated
  using (activo = true or tenant_id in (
    select t.id from public.get_admin_tenants_for_authenticated_user() t
  ));

-- INSERT/UPDATE/DELETE: tenant admin only
create policy entrenamientos_publicos_insert_admin on public.entrenamientos_publicos
  for insert to authenticated
  with check (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t));

create policy entrenamientos_publicos_update_admin on public.entrenamientos_publicos
  for update to authenticated
  using (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t))
  with check (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t));

create policy entrenamientos_publicos_delete_admin on public.entrenamientos_publicos
  for delete to authenticated
  using (tenant_id in (select t.id from public.get_admin_tenants_for_authenticated_user() t));

create trigger entrenamientos_publicos_set_updated_at
  before update on public.entrenamientos_publicos
  for each row execute function public.set_updated_at();

-- Defense-in-depth: a training with any servicio-based restriction row can never be
-- published, since a cross-tenant visitor can never hold a subscription/service in a
-- tenant they don't belong to. The UI/service layer already blocks this before it gets
-- here; this trigger guarantees the rule holds for any future direct write too.
create or replace function public.check_entrenamiento_publico_sin_restriccion_servicio()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1
    from public.entrenamiento_restricciones er
    where er.entrenamiento_id = new.entrenamiento_id
      and (
        er.servicio_1_id is not null
        or er.servicio_2_id is not null
        or er.servicio_3_id is not null
        or er.servicio_4_id is not null
      )
  ) then
    raise exception 'No se puede publicar un entrenamiento con restricciones de servicios.';
  end if;

  return new;
end;
$$;

create trigger entrenamientos_publicos_no_servicio_restriccion
  before insert or update on public.entrenamientos_publicos
  for each row execute function public.check_entrenamiento_publico_sin_restriccion_servicio();

-- Storage: allow ANY authenticated user (not just tenant members) to read publication
-- banners, since they must be visible to cross-tenant visitors on the marketplace page.
-- Upload/update/delete already covered by the existing org_admin_* policies
-- (they match any path under orgs/{tenantId}/..., which includes the new subpath below).
create policy public_training_banner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'org-assets'
    and (storage.foldername(name))[1] = 'orgs'
    and (storage.foldername(name))[3] = 'entrenamientos-publicos'
  );

commit;
```

**Column rationale** — mirrors `entrenamientos` for display-relevant fields (`nombre`, `descripcion`, `disciplina_id`, `escenario_id`, `entrenador_id`, `fecha_hora`, `duracion_minutos`, `cupo_maximo`, `punto_encuentro`, `estado`), plus `reserva_antelacion_horas`/`cancelacion_antelacion_horas` (snapshotted **for display only** — booking now reuses the existing reservation pipeline against the source `entrenamiento_id`, so enforcement always reads the live value from `entrenamientos`, never from this snapshot; see "Booking from the marketplace reuses the existing reservation pipeline"), plus the two new marketing fields (`precio`, `banner_url`). Intentionally **excluded**: `entrenamiento_grupo_id`, `origen_creacion`, `es_excepcion_serie`, `bloquear_sync_grupo` (series/sync internals, meaningless once snapshotted), `visibilidad`/`visible_para` (this table's existence *is* the public flag — use `activo` instead), and `formulario_externo`/`formulario_id`/`formulario_obligatorio` (not duplicated — the booking flow reads these directly from the source `entrenamientos` row via `entrenamiento_id`, exactly as it does for a same-tenant booking, so there is nothing to snapshot).

---

## API / Server Actions

All data access goes through a new service, called from hooks only (no direct Supabase calls from components/pages).

- **File**: `src/services/supabase/portal/entrenamientos-publicos.service.ts`
  - `getPublicacionByEntrenamientoId(tenantId: string, entrenamientoId: string): Promise<EntrenamientoPublico | null>` — used to prefill the publish modal and to compute the "Publicar" vs "Gestionar publicación" button label. Admin-scoped read (relies on the admin branch of the SELECT policy).
  - `listPublishedEntrenamientoIds(tenantId: string): Promise<Set<string>>` — lightweight id-only fetch to badge which trainings in the admin's list are already published.
  - `hasServicioRestrictions(tenantId: string, entrenamientoId: string): Promise<boolean>` — queries `entrenamiento_restricciones` for the given `entrenamiento_id` and returns `true` if any row has `servicio_1_id`/`servicio_2_id`/`servicio_3_id`/`servicio_4_id` set. Backs the `canPublish` computation in `EntrenamientosPage.tsx` (§1a).
  - `publicarEntrenamiento(input: PublicarEntrenamientoInput): Promise<EntrenamientoPublico>` — first calls `hasServicioRestrictions`; if `true`, throws `EntrenamientoPublicoServiceError('servicio_restriction', 'Este entrenamiento tiene restricciones de servicios y no puede publicarse.')` without attempting the write. Otherwise upserts by `entrenamiento_id` (insert if absent, else update); sets `publicado_por` to the current user on insert only; copies `reserva_antelacion_horas`/`cancelacion_antelacion_horas` from the source `entrenamientos` row at publish time (read-only snapshot for display, refreshed every time the admin reopens "Gestionar publicación" and saves). Also maps the Postgres trigger's raised exception (no fixed SQLSTATE — matches on the raised message or falls back to `error.code === 'P0001'`) to the same `'servicio_restriction'` error code, so the UI shows one consistent message regardless of which layer caught it. Auth/RLS: admin of `input.tenantId`.
  - `despublicarEntrenamiento(tenantId: string, id: string): Promise<void>` — sets `activo = false`. Auth/RLS: admin of `tenantId`.
  - `listPublicTrainings(filters: PublicTrainingFilters): Promise<PublicTrainingListItem[]>` — cross-tenant query: `entrenamientos_publicos` joined with `disciplinas(nombre)`, `escenarios(nombre, ubicacion)`, `tenants(nombre, logo_url)`, filtered to `activo = true` and `fecha_hora >= now()`, optionally by `filters.tenantId`. Batches a reservation count per `entrenamiento_id` (same approach as the existing `reservas_activas` enrichment in `useEntrenamientos.ts` ~line 525) to populate the occupancy bar. Auth: any `authenticated` user (relies on the `activo = true` branch of the SELECT policy — no membership check).
  - `listPublicTenantOptions(): Promise<SelectOption[]>` — distinct tenants with at least one active publication, for the "Organización" filter dropdown.

- **File**: `src/services/supabase/portal/storage.service.ts` (extend existing)
  - `uploadEntrenamientoPublicoBanner(supabase, tenantId, entrenamientoId, file): Promise<StorageUploadResult>` — mirrors `uploadOrgBanner`, path via new `buildEntrenamientoPublicoBannerPath` builder, `upsert: true`.

- **File**: `src/types/portal/storage.types.ts` (extend existing)
  - `buildEntrenamientoPublicoBannerPath(tenantId, entrenamientoId, ext): string` → `orgs/{tenantId}/entrenamientos-publicos/{entrenamientoId}.{ext}`.

- **Booking (no service changes)**: the marketplace's "Reservar" flow calls the **existing** `reservasService.create()`, `reservasService.getCategoriasConDisponibilidad()`, `entrenamientosService.getInstanceRestrictions()`, and `formulariosService`/`useFormularioRespuestaForm` exactly as `ReservasPanel.tsx` does today, all keyed by the publication's `entrenamiento_id` and `tenant_id`. No new server-side booking logic is introduced by this US.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260723010000_entrenamientos_publicos.sql` | New table, RLS, indexes, trigger, storage read policy |
| Types | `src/types/portal/entrenamientos-publicos.types.ts` | New: `EntrenamientoPublico`, `PublicarEntrenamientoInput`, `PublicTrainingListItem`, `PublicTrainingFilters`, `EntrenamientoPublicoFormValues`, `EntrenamientoPublicoServiceError` (error codes include `'servicio_restriction'`) |
| Types | `src/types/portal/storage.types.ts` | Add `buildEntrenamientoPublicoBannerPath` |
| Types | `src/types/portal.types.ts` | Add `PUBLIC_TRAININGS_MENU_ITEM`, append to `!tenantId` branch of `resolvePortalMenu` |
| Service | `src/services/supabase/portal/entrenamientos-publicos.service.ts` | New service (see API section) |
| Service | `src/services/supabase/portal/storage.service.ts` | Add `uploadEntrenamientoPublicoBanner` |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts` | New: publish modal state, prefill, submit, despublicar, banner upload |
| Hook | `src/hooks/portal/entrenamientos-publicos/useEntrenamientosPublicosMarketplace.ts` | New: fetch list + tenant options, filter state (date chip, search, org), derived "this week" count |
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` | New: thin composition of the **existing** `useReservaForm`/`useFormularioRespuestaForm` for a cross-tenant marketplace booking (tenantId/entrenamientoId supplied from the publication row, not route context) |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Add `publishedEntrenamientoIds` fetch/state for action-modal button labeling |
| Component | `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx` | New: preview + edit form + banner upload + despublicar |
| Component | `src/components/portal/entrenamientos/EntrenamientoActionModal.tsx` | Add "Publicar"/"Gestionar publicación" button (admin-only), disabled with reason when `canPublish` is `false` |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Wire `PublicarEntrenamientoModal` open/close; compute `canPublish`/`publishDisabledReason` via `hasServicioRestrictions` alongside `selectedActionContext`; pass `isPublished`/role to action modal |
| Component | `src/components/portal/entrenamientos/EntrenamientoWizard.tsx` | Remove visibility radio group; add read-only info row |
| Component | `src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx` | New: top-level marketplace page container |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingFilters.tsx` | New: left glass panel (date chips, calendar, org dropdown, search) |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | New: shared card (used by marketplace grid AND the publish-modal preview); "Reservar" opens `PublicTrainingReservaModal` |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | New: thin wrapper rendering the **existing** `ReservaFormModal`/`FormularioRespuestaModal`, driven by `usePublicTrainingReserva.ts` — no admin-only affordances (no reservas list, no CSV export, no asistencias) |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx` | New: responsive grid, featured + standard treatment |
| Component | `src/components/portal/entrenamientos-publicos/SessionsAvailableWidget.tsx` | New: floating glass count widget |
| Component | `src/components/portal/entrenamientos-publicos/index.ts` | New: barrel export |
| Page | `src/app/portal/entrenamientos-publicos/page.tsx` | Replace empty placeholder with component render only |
| Menu | `src/components/portal/PortalNavMenu.tsx` | No code change needed — consumes updated `resolvePortalMenu()` automatically |

---

## Acceptance Criteria

1. A migration creates `entrenamientos_publicos` with the columns listed above, RLS enabled, and the four policies (select/insert/update/delete) applied and verified in the local Supabase instance.
2. As an **administrador**, opening "Opciones" on any non-historical training instance shows a **"Publicar"** button; as an **entrenador** or **usuario**, it does not appear.
2a. As an **administrador**, if the training has at least one `entrenamiento_restricciones` row with a `servicio_1_id`…`servicio_4_id` set, the "Publicar"/"Gestionar publicación" button is **disabled** and shows the reason ("...tiene restricciones de servicios y no puede publicarse..."); a training whose only restriction is `reserva_antelacion_horas`/`cancelacion_antelacion_horas` (no `entrenamiento_restricciones` rows at all, or rows without any `servicio_*_id`) keeps the button enabled.
2b. Attempting to call `entrenamientosPublicosService.publicarEntrenamiento(...)` directly (bypassing the disabled button, e.g. via a scratch script or a stale UI state) for a training with a servicio-based restriction fails with the `'servicio_restriction'` error — proving both the service-layer pre-check and the DB trigger reject it; inserting/updating `entrenamientos_publicos` directly in SQL for such a training also fails, confirming the trigger fires independent of the service layer.
3. Opening "Publicar" on a training with no existing publication (and no servicio restriction) shows an empty/prefilled-from-training form (nombre/descripcion default to the training's own values) and a live card preview matching the visual language of `grit-arena.pen` node `ql3Ij`.
4. Submitting the publish form creates exactly one row in `entrenamientos_publicos` linked to that `entrenamiento_id`; the source `entrenamientos` row and its `entrenamiento_grupo` (if any) are **not modified**, and no sibling instance in the same series receives a publication.
5. Reopening "Opciones" on an already-published instance shows **"Gestionar publicación"** instead of "Publicar"; opening it prefills the form with the existing publication's values and offers a **"Despublicar"** button.
6. Clicking "Despublicar" sets `activo = false`; the listing immediately disappears from the public marketplace on next load, and reopening "Publicar" on that same training still shows "Gestionar publicación" with `activo` re-enabled on next save.
7. Uploading a banner image validates MIME type (jpeg/png/webp) and size (≤2 MB, matching `useOrgBannerUpload`'s existing limits) before upload; on success the signed URL is stored in `banner_url`.
8. `EntrenamientoWizard.tsx` no longer shows a Público/Privado radio group; creating a new training always persists `visibilidad = 'privado'`.
9. Editing a pre-existing training that was already `visibilidad = 'publico'` (from before this change) shows its current value as read-only text and does not silently overwrite it back to `privado` on save.
10. The dropdown menu shown when the authenticated user has **not** entered an organization (`/portal/inicio`, `/portal/orgs`) includes a new **"Entrenamientos Públicos"** item linking to `/portal/entrenamientos-publicos`; the item is **not** injected into the tenant-scoped menu (inside `/portal/orgs/[tenant_id]/...`).
10a. The "Entrenamientos Públicos" menu item is visible to every authenticated role (`administrador`, `entrenador`, `usuario`).
11. `src/app/portal/entrenamientos-publicos/page.tsx` renders `<EntrenamientosPublicosPage />` only — no data fetching or Supabase calls in the page file itself.
12. Visiting `/portal/entrenamientos-publicos` as an authenticated user who is **not** a member of any tenant that published a listing still successfully loads and displays those listings (proves the cross-tenant, non-membership-gated SELECT policy and the new storage read policy both work).
13. The date chips (Hoy/Mañana/Esta semana/Fin de semana) filter the visible list client-side by `fecha_hora`; the search field filters by case-insensitive substring match on `nombre`/`descripcion`; the "Organización" dropdown filters by tenant.
14. The floating widget shows an accurate count of currently-listed (post-filter or total, per implementation choice — pick one and keep it consistent) trainings occurring within the current week.
15. The most recently published active listing renders with the "Featured" treatment (larger card, cyan outline/glow, badge); all others render as standard cards in a responsive grid that reflows on narrower viewports (no fixed 6-card layout).
16. Each card shows its advance-notice rule (e.g., "Reserva con al menos Xh de anticipación") sourced from the publication's snapshotted `reserva_antelacion_horas`, when set.
17. An empty state is shown when there are zero active, non-past public listings (e.g., "No hay entrenamientos públicos disponibles por ahora.").
18. Deleting the source `entrenamiento` (or its parent group being cancelled such that the instance is deleted) cascades and removes its `entrenamientos_publicos` row (`on delete cascade`), so the marketplace never shows an orphaned listing.
19. Clicking "Reservar" on a published listing opens the **same** `ReservaFormModal` used inside a tenant (via `PublicTrainingReservaModal`), targeting the publication's `entrenamiento_id`; on success, a `reservas` row is created exactly as it would be from inside the owning tenant.
20. Because §2a/§2b block publishing any training with a servicio-based restriction, no published listing should ever be able to produce a `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` rejection in practice — this is validated by the pre-publish check, not by testing the rejection path from the marketplace (that path is exercised by existing, unrelated tests for same-tenant bookings).
21. A published training with an attached internal form template (`formulario_id`) routes a marketplace visitor through the same `FormularioRespuestaModal` fill-out step before the reservation is created, identical to booking from inside the tenant; a training with `formulario_externo` still opens that external link, unchanged.
22. Attempting to book a training less than `reserva_antelacion_horas` before its start time is rejected with the same validation message used today for same-tenant bookings — proving enforcement reads the live value from the source `entrenamientos` row, not a potentially stale snapshot.
23. `PublicTrainingReservaModal` never renders the tenant-admin-only affordances that `ReservasPanel.tsx` bundles (reservations list, CSV/Excel export, asistencia management, "Ver plantilla" preview) for a visitor whose `role` in the owning tenant is `null`.

---

## Implementation Steps

- [ ] Create migration `20260723010000_entrenamientos_publicos.sql`; apply locally; verify RLS with `select`/`insert`/`update`/`delete` as both admin and non-admin roles via SQL editor or a scratch script; verify the `entrenamientos_publicos_no_servicio_restriccion` trigger rejects a direct `insert`/`update` targeting an `entrenamiento_id` that has a servicio-restricted row.
- [ ] Add `entrenamientos-publicos.types.ts` and extend `storage.types.ts` with the banner path builder.
- [ ] Implement `entrenamientos-publicos.service.ts` (publish/despublish/list/lookup/`hasServicioRestrictions`) and extend `storage.service.ts` with `uploadEntrenamientoPublicoBanner`; map both the service-layer pre-check and the trigger's raised exception to `EntrenamientoPublicoServiceError('servicio_restriction', ...)`.
- [ ] Extend `useEntrenamientos.ts` to fetch `publishedEntrenamientoIds` for the tenant (batch, once per page load, refreshed after publish/despublish).
- [ ] Build `usePublicarEntrenamiento.ts` (open/close, prefill via `getPublicacionByEntrenamientoId`, banner upload state, submit, despublicar).
- [ ] In `EntrenamientosPage.tsx`, compute `canPublish`/`publishDisabledReason` via `hasServicioRestrictions` (fetched alongside `selectedActionContext`); pass into `EntrenamientoActionModal.tsx`.
- [ ] Build `PublicarEntrenamientoModal.tsx` and wire it into `EntrenamientosPage.tsx`; add the "Publicar"/"Gestionar publicación" button to `EntrenamientoActionModal.tsx` gated on `role === 'administrador'` and disabled when `!canPublish`.
- [ ] Remove the visibility radio group from `EntrenamientoWizard.tsx`; add the read-only info row.
- [ ] Add `PUBLIC_TRAININGS_MENU_ITEM` to `portal.types.ts` and append it inside the `!tenantId` branch of `resolvePortalMenu`.
- [ ] Build `useEntrenamientosPublicosMarketplace.ts` (fetch + filter state + derived counts).
- [ ] Build `PublicTrainingCard.tsx`, `PublicTrainingFilters.tsx`, `PublicTrainingsGrid.tsx`, `SessionsAvailableWidget.tsx`, `EntrenamientosPublicosPage.tsx` following the `ql3Ij` reference (colors, spacing, glass panels, cyan glow, Featured treatment).
- [ ] Build `usePublicTrainingReserva.ts` and `PublicTrainingReservaModal.tsx`, composing the **existing** `useReservaForm`/`useFormularioRespuestaForm`/`ReservaFormModal`/`FormularioRespuestaModal` with `tenantId`/`entrenamientoId` sourced from the publication row; wire "Reservar" on `PublicTrainingCard.tsx` to open it.
- [ ] Replace `src/app/portal/entrenamientos-publicos/page.tsx` with the render-only page.
- [ ] Manual test: publish a training as admin in Tenant A; log in as a user with no membership in Tenant A; confirm the listing (with banner) is visible at `/portal/entrenamientos-publicos`; despublish; confirm it disappears.
- [ ] Manual test: attempt to reach "Publicar" as `entrenador`/`usuario` role — confirm the option is absent.
- [ ] Manual test: publish one instance of a recurring series; confirm sibling instances and the `entrenamientos_grupo` row are unaffected.
- [ ] Manual test: attempt to publish a training that has a servicio-based `entrenamiento_restricciones` row — confirm the button is disabled with the explanatory reason, and that calling the service directly also fails.
- [ ] Manual test: as the non-member visitor from the first test, book the published training. Confirm: a `reservas` row is created against the source `entrenamiento_id`; a training with an internal formulario routes through `FormularioRespuestaModal` first; booking inside the `reserva_antelacion_horas` cutoff is rejected.
- [ ] Update `projectspec/03-project-structure.md` with the new `entrenamientos-publicos` feature slice entries (components/hooks/services/types) following existing conventions.

---

## Non-Functional Requirements

- **Security**:
  - RLS is the sole enforcement boundary for publish/despublish/delete (admin-of-tenant only) — the UI-level `role === 'administrador'` gate is a UX convenience, not the security control.
  - The public SELECT policy (`activo = true`) intentionally has **no** membership check — any authenticated platform account can read active listings and their banners. Do not add a membership check here or the marketplace breaks by design.
  - Banner uploads are still gated to tenant admins via the existing `org_admin_upload`/`org_admin_update` storage policies (no new write policy needed); only a new **read** policy was added for the marketplace's cross-tenant viewers.
  - Booking security is **entirely inherited**: `reservas`, `entrenamiento_restricciones`, `entrenamiento_categorias`, and the `book_and_deduct_service_units`/`cancel_and_restore_service_units` RPCs are untouched by this US, so their existing RLS/SECURITY DEFINER guarantees apply identically to a marketplace-originated booking. Do not weaken any of those policies to "make cross-tenant booking work" — if a visitor is correctly rejected today for lacking a subscription, they must still be rejected when booking via the marketplace.
  - The servicio-restriction publish gate is enforced at **three layers** (UI disabled button, service pre-check, DB trigger) precisely so it cannot be silently bypassed by a future code path — treat all three as required, not redundant.
- **Performance**: `listPublicTrainings` should batch its reservation-count enrichment (one query with an `in (...)` filter over the fetched `entrenamiento_id`s), not N+1 per card. Add the `idx_entrenamientos_publicos_activo` and `idx_entrenamientos_publicos_fecha_hora` indexes (included above) since the marketplace query always filters on both.
- **Accessibility**: Date chips and the "Organización" dropdown must be reachable and operable via keyboard; the "Reservar" button must be a real, focusable button (not a disabled decoration) since it now opens the booking modal.
- **Error handling**: Publish/despublish failures surface inline in `PublicarEntrenamientoModal.tsx` (same `role="alert"` banner pattern as `GuardarPlantillaModal.tsx`); marketplace load failures show a retry banner consistent with `EntrenamientosPage.tsx`'s existing error state pattern; booking failures (restriction rejection, past-cutoff, form validation) surface inline in `PublicTrainingReservaModal.tsx` using the same messaging `ReservaFormModal.tsx` already produces — no new error copy needs to be invented.
- **Known limitation**: cross-tenant bookings are not yet visible to the visitor outside the marketplace flow itself (see "Booking from the marketplace reuses the existing reservation pipeline" in Proposed Changes) — a unified "my reservations across all tenants" view is out of scope and left for a follow-up US.
