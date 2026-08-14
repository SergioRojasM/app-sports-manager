## Why

Since US-0063 introduced `suscripcion_servicios` (per-service unit tracking) and US-0065 removes the legacy `clases_restantes` / `clases_plan` fields, subscription views are left with no capacity information at all. Athletes and admins cannot see how many units remain per service, and athletes cannot preview service inclusions before purchasing a plan subtype.

## What Changes

- **New display type** `SuscripcionServicioDisplay` added to `suscripciones.types.ts` for pairing service name with unit counters across views.
- **Three service queries extended** (`fetchMisSuscripciones`, `fetchMisSuscripcionesTenant`, `fetchSuscripcionesAdmin`) to join `suscripcion_servicios → servicios(nombre)` in the same query — no extra round-trips.
- **Four type shapes updated**: `InicioSuscripcion`, `MiSuscripcionRow`, `SuscripcionAdminRow` each gain `servicios: SuscripcionServicioDisplay[]`.
- **Home dashboard** (`InicioSuscripciones`): legacy class progress bar replaced with compact per-service inline row (`{nombre}: {restantes}/{incluidas}` · `∞` for unlimited).
- **Athlete subscription card** (`SuscripcionCard`): legacy `clases_restantes / clases_plan` block replaced with a services section showing per-service mini progress bars; `∞` for unlimited; rose highlight when `unidades_restantes === 0`.
- **Admin subscriptions table** (`SuscripcionesTable`): "Clases" column replaced with "Servicios" column showing `{nombre}: {restantes}/{incluidas}`; truncated to 3 + `+N más` when needed.
- **Plan acquisition modal** (`SuscripcionModal`): Step 1 tipo cards and Step 2 summary box gain compact service chips using data already loaded by `getPlanes` — no additional fetch needed.

## Capabilities

### New Capabilities
- `subscription-service-unit-display`: Displays per-service unit allocations (`unidades_incluidas` / `unidades_restantes`) across all subscription-facing views (home dashboard, athlete view, admin table) and in the plan acquisition modal.

### Modified Capabilities
- `user-home-dashboard`: Subscription item rendering changes — removes legacy class progress bar, adds per-service unit inline row.
- `user-subscriptions-and-payments-view`: `SuscripcionCard` unit display block changes from class-based to service-based.
- `subscription-management`: Admin `SuscripcionesTable` "Clases" column replaced with "Servicios" column.
- `plan-management`: `SuscripcionModal` Step 1 and Step 2 gain service chip rendering for plan subtypes.

## Non-goals

- No database schema changes (tables/columns are not added or dropped).
- No RLS policy changes (existing policies from US-0062/US-0063 are sufficient).
- No new RPCs or server actions.
- No editing of subscription service unit values from the UI (read-only display only).
- No pagination or lazy-loading of service rows per subscription.

## Impact

**Types**
- `src/types/portal/suscripciones.types.ts` — new `SuscripcionServicioDisplay` interface
- `src/types/portal/inicio.types.ts` — `InicioSuscripcion` gains `servicios` field
- `src/types/portal/mis-suscripciones-y-pagos.types.ts` — `MiSuscripcionRow` gains `servicios` field
- `src/types/portal/gestion-suscripciones.types.ts` — `SuscripcionAdminRow` gains `servicios` field

**Services**
- `src/services/supabase/portal/inicio.service.ts` — `fetchMisSuscripciones`: extended select + mapper
- `src/services/supabase/portal/mis-suscripciones.service.ts` — `fetchMisSuscripcionesTenant`: extended select + mapper
- `src/services/supabase/portal/gestion-suscripciones.service.ts` — `fetchSuscripcionesAdmin`: extended select + mapper

**Components**
- `src/components/portal/inicio/InicioSuscripciones.tsx`
- `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx`
- `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`
- `src/components/portal/planes/SuscripcionModal.tsx`

**Dependencies**
- Depends on US-0065 (`feat/remove-clases-field-usage`) being merged first, as both touch overlapping type and component files.
