## Context

US-0063 introduced `suscripcion_servicios` (per-service unit ledger) and `plan_tipos_servicios` (service assignments per plan subtype). US-0065 removes all references to the legacy `clases_restantes` / `clases_plan` fields. After these two stories land, the application has no unit capacity displayed anywhere in the subscription-facing UI.

Four UI surfaces need updating:
1. `SuscripcionModal` — plan acquisition (Step 1: subtype cards, Step 2: summary box)
2. `InicioSuscripciones` — home dashboard subscription widget
3. `SuscripcionCard` — athlete's mis-suscripciones-y-pagos view
4. `SuscripcionesTable` — admin gestion-suscripciones table

## Goals / Non-Goals

**Goals:**
- Expose `SuscripcionServicioDisplay` as a shared read-model type used in all four views
- Extend three service queries to join `suscripcion_servicios → servicios(nombre)` in a single query (no N+1)
- Render per-service unit information consistently: `{nombre}: {restantes}/{incluidas}`, `∞` for null (unlimited)
- Show service inclusions in `SuscripcionModal` subtypes using already-loaded `PlanTipo.servicios` data

**Non-Goals:**
- Editing or resetting service unit counts from any UI
- Adding pagination to the services list within a subscription
- Changing database schema, RLS policies, or RPCs
- Handling service catalog updates that occur after a subscription is created (snapshot at purchase is already stored in `unidades_incluidas`)

## Decisions

### Decision 1: Shared `SuscripcionServicioDisplay` read-model type

**Decision**: Introduce one new interface in `suscripciones.types.ts` that all three subscription-facing views import.

**Alternatives considered**:
- Inline service data as `{ id, nombre, restantes, incluidas }` directly in each view's row type — rejected because it duplicates the shape definition in four places and makes future field additions require four edits.

**Rationale**: A single source of truth for the display shape is consistent with how `SuscripcionEstado` and `PagoEstado` are already re-exported from `gestion-suscripciones.types.ts`.

---

### Decision 2: Fetch service data via nested join in existing queries

**Decision**: Extend the `select` string in `fetchMisSuscripciones`, `fetchMisSuscripcionesTenant`, and `fetchSuscripcionesAdmin` with a nested join to `suscripcion_servicios(servicio_id, unidades_incluidas, unidades_restantes, servicio:servicios!suscripcion_servicios_servicio_id_fkey(nombre))`.

**Alternatives considered**:
- Fetch service data lazily on card expand — rejected: adds loading states and complexity to components that are already client-side filtered.
- Separate `getSuscripcionServicios(id)` call per subscription after the list loads — rejected: O(N) queries, breaks the no-extra-round-trips constraint.

**Rationale**: Supabase PostgREST nested selects are rendered as a single SQL query with a lateral join. There is no performance penalty over the existing query, and the data is available synchronously in the component render cycle.

---

### Decision 3: `SuscripcionModal` reuses already-loaded `PlanTipo.servicios`

**Decision**: Do not add any new service fetch to `SuscripcionModal` or its parent hook. The `planesService.getPlanes` call already joins `plan_tipos_servicios(servicio_id, unidades, servicios(nombre))` and maps the result into `PlanTipo.servicios?: PlanTipoServicioRow[]`. The modal renders this data directly.

**Alternatives considered**:
- Fetch services separately when the modal opens — rejected: redundant; data is already in the `plan` prop.

**Rationale**: Zero additional network requests. The `servicioNombre` field on `PlanTipoServicioRow` is already populated by the mapper in `planes.service.ts`.

---

### Decision 4: `∞` for null units, rose highlight for zero

**Decision**: Render null `unidades_restantes` / `unidades_incluidas` as the `∞` character. When `unidades_restantes === 0` (and `unidades_incluidas` is not null), apply a rose/red color class to signal exhaustion.

**Rationale**: Consistent with the legacy class progress bar behavior (rose when empty). The `∞` symbol is unambiguous and compact in dense table cells.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| PostgREST nested select may return `null` instead of `[]` when no `suscripcion_servicios` rows exist | Defensive mapping: use `(row.suscripcion_servicios ?? [])` in all mappers |
| The `servicios` join alias in PostgREST can conflict if the FK name changes | The FK `suscripcion_servicios_servicio_id_fkey` is stable (migration from US-0063); use explicit hint in select string |
| `SuscripcionModal` renders `tipo.servicios` which uses `servicioNombre?: string` (optional field) | Guard with `s.servicioNombre ?? s.servicioId` fallback in render; in practice `servicioNombre` is always populated by the `getPlanes` mapper |
| Admin table "Servicios" column with many items can overflow narrow viewports | Truncate to 3 services + `+N más` label; cell already has `whitespace-nowrap` |
