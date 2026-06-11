## 1. Branch Setup

- [x] 1.1 Create new branch: `git checkout -b feat/display-subscription-service-units`
- [x] 1.2 Validate working branch is not `main`, `master`, or `develop`: `git branch --show-current`

## 2. Types

- [x] 2.1 Add `SuscripcionServicioDisplay` interface to `src/types/portal/suscripciones.types.ts` with fields: `servicio_id: string`, `servicio_nombre: string`, `unidades_incluidas: number | null`, `unidades_restantes: number | null`
- [x] 2.2 Add `servicios: SuscripcionServicioDisplay[]` field to `InicioSuscripcion` in `src/types/portal/inicio.types.ts` (import `SuscripcionServicioDisplay` from `suscripciones.types.ts`)
- [x] 2.3 Add `servicios: SuscripcionServicioDisplay[]` field to `MiSuscripcionRow` in `src/types/portal/mis-suscripciones-y-pagos.types.ts`
- [x] 2.4 Add `servicios: SuscripcionServicioDisplay[]` field to `SuscripcionAdminRow` in `src/types/portal/gestion-suscripciones.types.ts`

## 3. Services

- [x] 3.1 Update `fetchMisSuscripciones` in `src/services/supabase/portal/inicio.service.ts`: extend the `select` string to include `suscripcion_servicios(servicio_id, unidades_incluidas, unidades_restantes, servicio:servicios!suscripcion_servicios_servicio_id_fkey(nombre))`; add the nested type to the internal row shape; map `(row.suscripcion_servicios ?? [])` into `SuscripcionServicioDisplay[]` and include as `servicios` in the returned object
- [x] 3.2 Update `fetchMisSuscripcionesTenant` in `src/services/supabase/portal/mis-suscripciones.service.ts`: extend `RawRow` type with the nested `suscripcion_servicios` shape; extend the `select` string identically; map `servicios` in `mapRow`
- [x] 3.3 Update `fetchSuscripcionesAdmin` in `src/services/supabase/portal/gestion-suscripciones.service.ts`: extend `RawSuscripcionRow` with the nested `suscripcion_servicios` shape; extend the `select` string identically; map `servicios` in `mapRawRow`

## 4. Components

- [x] 4.1 Update `src/components/portal/planes/SuscripcionModal.tsx` — Step 1: inside each `tipo` card, after the price/vigencia row, render a `flex flex-wrap gap-1 mt-1` row of compact chips when `tipo.servicios?.length > 0`; each chip shows `{s.servicioNombre ?? s.servicioId}: {s.unidades ?? '∞'} uds` with class `bg-navy-deep/40 rounded px-1.5 py-0.5 text-[10px] text-slate-400`
- [x] 4.2 Update `src/components/portal/planes/SuscripcionModal.tsx` — Step 2: inside the plan/subtype summary box, add a services sub-section when `selectedTipo?.servicios?.length > 0` using the same chip style; label the section with a `"Servicios"` label in `text-xs font-medium text-slate-400`
- [x] 4.3 Update `src/components/portal/inicio/InicioSuscripciones.tsx`: remove the legacy class progress bar block (`clases_plan / clases_restantes`); after the dates row, render a compact services row when `s.servicios.length > 0` — one `<span>` per service showing `{servicio_nombre}: {unidades_restantes ?? '∞'}/{unidades_incluidas ?? '∞'}`, separated by ` · `; style: `text-[10px] text-slate-400`
- [x] 4.4 Update `src/components/portal/mis-suscripciones-y-pagos/SuscripcionCard.tsx`: remove the `showClases` variable and the associated render block; replace with a services section that renders when `suscripcion.servicios.length > 0`; for each service, show label + counter + a mini progress bar (omit progress bar when `unidades_incluidas` is null); use `bg-rose-500` when `unidades_restantes === 0`, else `bg-gradient-to-r from-secondary to-primary`; add `aria-label="Unidades restantes de {servicio_nombre}"` to each progress bar
- [x] 4.5 Update `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`: replace the `<th>Clases</th>` column header with `<th>Servicios</th>`; replace the corresponding `<td>` cell logic: show `"—"` when `row.servicios.length === 0`; otherwise render a `<ul className="list-none p-0 m-0 space-y-0.5">` with each service as `<li>{nombre}: {restantes ?? '∞'}/{incluidas ?? '∞'}</li>`; when `row.servicios.length > 3`, show first 3 entries then a `<li className="text-slate-500">+{N} más</li>`

## 5. Validation

- [x] 5.1 Run `npx tsc --noEmit` and fix any TypeScript errors
- [x] 5.2 Manually test: plan subtype with services — verify chips appear in `SuscripcionModal` Step 1 and Step 2
- [x] 5.3 Manually test: subscription with services — verify service rows appear in home dashboard, athlete card, and admin table
- [x] 5.4 Manually test: subscription without services — verify no services section renders in any view
- [x] 5.5 Manually test: subscription with unlimited service (`unidades_incluidas: null`) — verify `∞` renders and no progress bar appears
- [x] 5.6 Manually test: subscription with exhausted service (`unidades_restantes: 0`) — verify rose highlight in athlete card

## 6. Documentation

- [x] 6.1 Update `projectspec/03-project-structure.md`: in the `mis-suscripciones-y-pagos` component slice entry, update `SuscripcionCard.tsx` comment to reflect services section replacing class counter; in the `gestion-suscripciones` slice entry, update `SuscripcionesTable.tsx` comment to note \"Servicios\" column; in the `inicio` slice entry, update `InicioSuscripciones.tsx` comment; in `suscripciones.types.ts` entry, add `SuscripcionServicioDisplay`; in service entries for `inicio.service.ts`, `mis-suscripciones.service.ts`, and `gestion-suscripciones.service.ts`, note the extended join

## 7. Commit and PR

- [ ] 7.1 Stage all changes and create commit: `git add -A && git commit -m "feat: display subscription service units across all UI views and plan acquisition modal"`
- [ ] 7.2 Create PR description:
  ```
  ## Summary
  Displays per-service unit allocations (`unidades_incluidas` / `unidades_restantes`) in all
  subscription-facing UI surfaces and in the plan acquisition modal.

  ## Changes
  - New `SuscripcionServicioDisplay` type in `suscripciones.types.ts`
  - Extended `InicioSuscripcion`, `MiSuscripcionRow`, and `SuscripcionAdminRow` with `servicios[]`
  - Extended queries in `fetchMisSuscripciones`, `fetchMisSuscripcionesTenant`, `fetchSuscripcionesAdmin` (no new round-trips)
  - `SuscripcionModal`: service chips in Step 1 tipo cards and Step 2 summary box
  - `InicioSuscripciones`: compact per-service inline row replaces legacy class progress bar
  - `SuscripcionCard`: services section with mini progress bars replaces `clases_restantes` block
  - `SuscripcionesTable`: "Servicios" column replaces "Clases" column

  ## Depends on
  - US-0065 (`feat/remove-clases-field-usage`) must be merged before this branch
  ```
