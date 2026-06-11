# US-0066 — Display Subscription Service Units in All UI Views

## ID
US-0066

## Name
Show Services and Remaining/Included Units in All Subscription UI Views

## As a
User (athlete) or Administrator

## I Want
Every place in the UI that shows a subscription to also display the services included in that subscription together with their current remaining and total included units

## So That
I can see at a glance how many units I (or an athlete) have left per service without navigating to a separate screen

---

## Description

### Current State
US-0063 introduced the `suscripcion_servicios` table, which stores one row per (subscription, service) pair with `unidades_incluidas` and `unidades_restantes`. US-0065 removes the legacy `clases_restantes` / `clases_plan` fields from all types and components.

After US-0065 lands, subscription cards and the admin table display no unit or capacity information at all — neither the old class count (removed) nor the new per-service units (not yet implemented). The data exists in the database but is never fetched or rendered.

There are three distinct UI locations that show subscriptions:

| View | Component | Route |
|------|-----------|-------|
| Home dashboard | `InicioSuscripciones` | `/portal/inicio` |
| Athlete self-service view | `SuscripcionCard` | `/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos` |
| Admin management table | `SuscripcionesTable` | `/portal/orgs/[tenant_id]/(administrador)/gestion-suscripciones` |

### Proposed Changes

#### New Shared Type: `SuscripcionServicioDisplay`
A display-oriented type that pairs unit data with the service name for rendering. Defined in `suscripciones.types.ts`:

```ts
export interface SuscripcionServicioDisplay {
  servicio_id: string;
  servicio_nombre: string;
  unidades_incluidas: number | null; // null = unlimited
  unidades_restantes: number | null; // null = unlimited
}
```

#### Type Additions
Add `servicios: SuscripcionServicioDisplay[]` to:
- `InicioSuscripcion` (in `inicio.types.ts`)
- `MiSuscripcionRow` (in `mis-suscripciones-y-pagos.types.ts`)
- `SuscripcionAdminRow` (in `gestion-suscripciones.types.ts`)

If a subscription has no service assignments (e.g. plan with no `plan_tipo_id`, or plan type with no service assignments), the array is empty (`[]`).

#### Service Layer Updates

**`inicio.service.ts` — `fetchMisSuscripciones`**
Extend the `select` query to include:
```
suscripcion_servicios(
  servicio_id, unidades_incluidas, unidades_restantes,
  servicio:servicios!suscripcion_servicios_servicio_id_fkey(nombre)
)
```
Map each joined row into `SuscripcionServicioDisplay[]` and include it in the returned `InicioSuscripcion` object.

**`mis-suscripciones.service.ts` — `fetchMisSuscripcionesTenant`**
Extend the `select` query identically and populate `servicios` in the `mapRow` function.

**`gestion-suscripciones.service.ts` — `fetchSuscripcionesAdmin`**
Extend the `select` query identically, update `RawSuscripcionRow` with the new nested shape, and populate `servicios` in `mapRawRow`.

#### Component Updates

**`InicioSuscripciones.tsx`**
After the dates/payment badge line, if `s.servicios.length > 0`, render a compact services row:
- One `<span>` per service showing `{nombre}: {unidades_restantes} / {unidades_incluidas}` where null units render as `∞`.
- Style: `text-[10px] text-slate-400`, services separated by a middle dot `·`.
- Remove the legacy progress bar block (the `clases_plan / clases_restantes` progress indicator — US-0065 leaves this as dead code if not yet removed).

**`SuscripcionCard.tsx`** (athlete view)
Replace the existing `showClases` block with a services section:
- If `suscripcion.servicios.length === 0`, render nothing in place of that section.
- If `suscripcion.servicios.length > 0`, render a small section below the date row:
  - Label: `"Servicios:"` in `text-slate-500 text-xs`
  - Per service: `{nombre}: {restantes}/{incluidas}` (null → `∞`). Render a mini progress bar when `unidades_incluidas` is not null and `> 0` (same style as the legacy class bar). When `unidades_restantes === 0` use `bg-rose-500`, otherwise use `bg-gradient-to-r from-secondary to-primary`.

**`SuscripcionesTable.tsx`** (admin view)
Replace the `"Clases"` column header and cell with a `"Servicios"` column:
- If `row.servicios.length === 0`, show `"—"`.
- If `row.servicios.length > 0`, render a `<ul>` (no bullets) where each item is `{nombre}: {restantes}/{incluidas}` (null → `∞`).
- Keep `whitespace-nowrap` on the cell to avoid layout breakage in narrow viewports. If more than 3 services, show first 3 then `+N más`.

---

## Database Changes

No new tables or columns are required. All data already exists:
- `suscripcion_servicios` (US-0063) — `suscripcion_id`, `servicio_id`, `unidades_incluidas`, `unidades_restantes`
- `servicios` — `id`, `nombre`
- RLS policies on `suscripcion_servicios` (US-0063) and `servicios` (US-0062) already cover the required access patterns.

---

## API / Server Actions

No new server actions or RPCs. All changes are query extensions in existing service functions.

| File | Function | Change |
|------|----------|--------|
| `src/services/supabase/portal/inicio.service.ts` | `fetchMisSuscripciones` | Extend select + mapper |
| `src/services/supabase/portal/mis-suscripciones.service.ts` | `fetchMisSuscripcionesTenant` | Extend select + mapper |
| `src/services/supabase/portal/gestion-suscripciones.service.ts` | `fetchSuscripcionesAdmin` | Extend select + mapper |

Each function fetches `suscripcion_servicios` with a nested join to `servicios(nombre)` in the same query. No additional network calls.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Type | `src/types/portal/suscripciones.types.ts` | Add `SuscripcionServicioDisplay` interface |
| Type | `src/types/portal/inicio.types.ts` | Add `servicios: SuscripcionServicioDisplay[]` to `InicioSuscripcion` |
| Type | `src/types/portal/mis-suscripciones-y-pagos.types.ts` | Add `servicios: SuscripcionServicioDisplay[]` to `MiSuscripcionRow` |
| Type | `src/types/portal/gestion-suscripciones.types.ts` | Add `servicios: SuscripcionServicioDisplay[]` to `SuscripcionAdminRow` |
| Service | `src/services/supabase/portal/inicio.service.ts` | Extend query + mapper in `fetchMisSuscripciones` |
| Service | `src/services/supabase/portal/mis-suscripciones.service.ts` | Extend `RawRow`, query, and `mapRow` in `fetchMisSuscripcionesTenant` |
| Service | `src/services/supabase/portal/gestion-suscripciones.service.ts` | Extend `RawSuscripcionRow`, query, and `mapRawRow` in `fetchSuscripcionesAdmin` |
| Component | `src/components/portal/inicio/InicioSuscripciones.tsx` | Replace legacy class-progress block with per-service units row |
| Component | `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx` | Replace `showClases` block with services section + mini progress bars |
| Component | `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | Replace "Clases" column with "Servicios" column |

---

## Acceptance Criteria

1. A subscription that has service assignments shows one entry per service in every subscription view (home dashboard, athlete view, admin table), displaying the service name, remaining units, and total units.
2. When `unidades_incluidas` is `null` (unlimited), the display shows `∞` instead of a number (e.g. `Natación: ∞`).
3. When `unidades_restantes` is `0`, the unit display is highlighted in red/rose in both the athlete card and the admin table cell.
4. A subscription with no service assignments (empty `suscripcion_servicios` for that `suscripcion_id`) shows no services section in the athlete card, shows `"—"` in the admin table Servicios column, and shows nothing for services in the home dashboard card.
5. The admin table "Clases" column no longer exists; it is replaced by "Servicios".
6. The athlete `SuscripcionCard` no longer shows the legacy `clases_restantes / clases_plan` counter; it is replaced by the services section (or nothing, if no services).
7. The home dashboard `InicioSuscripciones` no longer shows the legacy class progress bar; services are shown in compact inline format.
8. No additional network requests are made when filters change in `MisSuscripcionesFilters` or `SuscripcionesHeaderFilters` — service data is fetched once with the subscription list.
9. When a subscription has more than 3 services, the admin table cell shows the first 3 and appends `+N más` (e.g. `+2 más`) to avoid cell overflow.
10. All three views compile without TypeScript errors after the changes.

---

## Implementation Steps

- [ ] Dependency: ensure US-0065 (`feat/remove-clases-field-usage`) is merged before starting this story, as it removes `clases_restantes` / `clases_plan` references that overlap with changes here
- [ ] Add `SuscripcionServicioDisplay` interface to `src/types/portal/suscripciones.types.ts`
- [ ] Add `servicios: SuscripcionServicioDisplay[]` field to `InicioSuscripcion` in `inicio.types.ts`
- [ ] Add `servicios: SuscripcionServicioDisplay[]` field to `MiSuscripcionRow` in `mis-suscripciones-y-pagos.types.ts`
- [ ] Add `servicios: SuscripcionServicioDisplay[]` field to `SuscripcionAdminRow` in `gestion-suscripciones.types.ts`
- [ ] Update `fetchMisSuscripciones` in `inicio.service.ts`: extend select + update `RawRow` type + map `servicios`
- [ ] Update `fetchMisSuscripcionesTenant` in `mis-suscripciones.service.ts`: extend select + update `RawRow` type + map `servicios`
- [ ] Update `fetchSuscripcionesAdmin` in `gestion-suscripciones.service.ts`: extend select + update `RawSuscripcionRow` + map `servicios` in `mapRawRow`
- [ ] Update `InicioSuscripciones.tsx`: remove legacy class-progress block, add compact services row
- [ ] Update `SuscripcionCard.tsx`: replace `showClases` block with services section + mini progress bars
- [ ] Update `SuscripcionesTable.tsx`: replace "Clases" column with "Servicios" column
- [ ] Run `tsc --noEmit` to verify no TypeScript errors
- [ ] Test manually: subscription with services, subscription without services, subscription with unlimited service, subscription with 0 remaining units

---

## Non-Functional Requirements

- **Security**: No new RLS changes required. The existing `suscripcion_servicios` select policy (US-0063) already allows: (a) the owning athlete to read their own subscription service rows, (b) tenant admins to read all rows for their tenant. The join to `servicios` is covered by the read policy on `servicios` (US-0062). No additional grants needed.
- **Performance**: The service units are fetched in the same query as the subscription list via a nested join — no N+1 queries. No additional indexes are required beyond those created in US-0063.
- **Accessibility**: Service unit values rendered in the admin table should have a meaningful `title` or `aria-label` attribute when using abbreviated text (e.g. `∞`). Mini progress bars in `SuscripcionCard` should include `aria-label="Unidades restantes de {nombre}"`.
- **Error handling**: If the joined `suscripcion_servicios` data is unexpectedly absent or malformed, default to an empty array and render the "no services" state gracefully — no UI crash.
