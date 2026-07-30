# US-0086 — Attach a Form Template to a Training

## ID
US-0086

## Name
Attach an Internal Form Template or External Form to Trainings, with an Optional "Required to Book" Flag

## As a
Tenant administrator or trainer (entrenador) creating or editing a training

## I Want
To decide, per training, whether a form must be filled out to reserve a spot — choosing either an external link (e.g. Google Forms, today's `formulario_externo`) or one of my organization's internal form templates (`formularios_plantillas`, US-0084/US-0085) — and to mark that form as required or optional

## So That
Athletes see exactly which form (if any) applies to a training before booking, administrators can reuse the structured form-template module they already built instead of only pasting external links, and this configuration is preserved when a training is saved as a reusable template

---

## Description

### Current State

- **`formulario_externo` already exists and is fully wired end-to-end** (added by `supabase/migrations/20260313000100_add_formulario_externo_entrenamientos.sql`): a plain `varchar(500)` column on both `public.entrenamientos` and `public.entrenamientos_grupo`, storing only an external URL. It is:
  - Rendered as a single "Formulario externo" URL `<input>` inside [EntrenamientoWizard.tsx:173-184](../../src/components/portal/entrenamientos/EntrenamientoWizard.tsx#L173-L184) (part of section "1. Datos base"), with no toggle — the field is always visible and always optional.
  - Read/written throughout [entrenamientos.types.ts](../../src/types/portal/entrenamientos.types.ts) (`TrainingGroup`, `TrainingInstance`, `TrainingWizardValues`, `CreateTrainingSeriesInput`, `UpdateTrainingSeriesInput`, `UpdateTrainingInstanceInput`), [entrenamientos.service.ts](../../src/services/supabase/portal/entrenamientos.service.ts) (every `select(...)` string and every `insert`/`update` payload), and [useEntrenamientos.ts](../../src/hooks/portal/entrenamientos/useEntrenamientos.ts) (`toCreatePayload`, `toUpdatePatch`, `buildPlantillaContenidoFromInstance`).
  - Displayed as a clickable link in [EntrenamientoDetalleModal.tsx:180-194](../../src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx#L180-L194) ("ver detalle"), [EntrenamientosList.tsx:172-190](../../src/components/portal/entrenamientos/EntrenamientosList.tsx#L172-L190) (calendar/list card), and [ReservasPanel.tsx:365-372](../../src/components/portal/entrenamientos/reservas/ReservasPanel.tsx#L365-L372) (the booking panel).
  - Persisted inside a training template's JSON snapshot: `EntrenamientoPlantillaContenido.formulario_externo` (`src/types/portal/entrenamiento-plantillas.types.ts:29`), built by `buildPlantillaContenido`/`applyPlantillaContenido` in [useEntrenamientoForm.ts:477-559](../../src/hooks/portal/entrenamientos/useEntrenamientoForm.ts#L477-L559) and by `buildPlantillaContenidoFromInstance` in [useEntrenamientos.ts:250-288](../../src/hooks/portal/entrenamientos/useEntrenamientos.ts#L250-L288).
- **US-0084 / US-0085 shipped a separate, fully independent "form templates" module** (`public.formularios_plantillas` + `public.formulario_plantilla_esquema`, `formulariosService`, `src/components/portal/formularios/*`) for building Google-Forms-style templates (título/subtítulo/texto/datos sections) at `/portal/orgs/{tenant_id}/gestion-formularios`, admin-only. Nothing in `entrenamientos` or `entrenamientos_grupo` references this table today — there is no way to attach one of these templates to a training.
- There is no "does this training even have a form" toggle and no "is the form required to book" flag anywhere in the schema or UI — `formulario_externo` being non-empty is the only (implicit, external-only) signal today.

### Proposed Changes

This US unifies the two facts above: a training can optionally have **one** form attached — either the existing external URL, or an internal `formularios_plantillas` reference — and that form can optionally be **required** to book.

#### 1. Data model
Add exactly two new columns to both `public.entrenamientos` and `public.entrenamientos_grupo` (per the request): `formulario_id` (uuid, FK to `formularios_plantillas.id`) and `formulario_obligatorio` (boolean). `formulario_externo` is **not** touched — it already exists and is reused as-is for the "external" case. See **Database Changes** for exact SQL, including two check constraints: (a) `formulario_id` and `formulario_externo` cannot both be set on the same row, and (b) `formulario_obligatorio` can only be `true` when one of the two is set.

#### 2. UI — Training create/edit modal (`EntrenamientoFormModal` → new `EntrenamientoFormularioSection`)
Remove the standalone "Formulario externo" input from `EntrenamientoWizard.tsx` (section "1. Datos base", lines 173-184) and replace it with a new, dedicated collapsible section component — `EntrenamientoFormularioSection.tsx` — rendered inside `EntrenamientoFormModal.tsx` alongside the existing `EntrenamientoCategoriasSection` / `EntrenamientoRestriccionesSection` (same visual pattern: a `<section>` card with a header checkbox that reveals more fields, matching `EntrenamientoCategoriasSection`'s "¿Usar categorías?" pattern). It implements the exact flow requested:

- **a. "¿Quieres agregar un formulario para poder reservar?"** — a Sí/No toggle (checkbox or radio, styled like the existing "¿Usar categorías?" toggle). Maps to a new tri-state `formulario_tipo: 'ninguno' | 'externo' | 'interno'`; unchecked = `'ninguno'` and hides everything below.
- **b. "¿Es externo (ej. Google Forms)?"** — shown only when the answer to (a) is yes; a Sí/No toggle mapping `'externo'` vs `'interno'` onto `formulario_tipo`.
- **c. External case** — shows the **existing** "Formulario externo" URL `<input>` (same markup/validation as today, just relocated into this new section), bound to `values.formulario_externo` (unchanged field).
- **d. Internal case** — shows a `<select>` populated from `formulariosService.getPlantillasByTenant(tenantId)` filtered client-side to `activo === true` and sorted by `nombre` (the existing service call needs no changes), bound to a new `formulario_id: string` value. Below the select, a **"+ Crear nueva plantilla"** link/button — visible only when the current user's `role === 'administrador'` (a trainer cannot manage `gestion-formularios`, which is behind the `(administrador)` layout guard) — that navigates (`next/link` or `router.push`) to `/portal/orgs/{tenant_id}/gestion-formularios`, where the admin can create a template and come back to select it (matches "vaya a la sección de formularios" from the request; no deep-link-and-return mechanism is required, this is a simple navigation).
- **e. "Formulario obligatorio para reservar"** — a checkbox, shown whenever `formulario_tipo !== 'ninguno'`, mapping to a new `formulario_obligatorio: boolean` value.

**Why a separate parallel state object instead of adding these to `TrainingWizardValues`**: `TrainingWizardValues`' generic `updateField(field, value: string)` (`useEntrenamientoForm.ts:164`) only accepts string values and relies on a structural-typing loophole (computed-key spread) that silently accepts any field name — adding a real `boolean` (`formulario_obligatorio`) into that type would compile but store a string at runtime. The codebase already avoids this for non-string, non-simple-input state by keeping `categoriasForm: CategoriasFormState` and `restricciones: EntrenamientoRestriccionInput[]` as **separate** state slices with their own setters, composed back into the submit payload inside `useEntrenamientos.ts`'s `submitForm`. This US follows that exact precedent with a new `formularioForm: { tipo: TrainingFormularioTipo; formulario_id: string; obligatorio: boolean }` slice — `formulario_externo` itself stays inside `TrainingWizardValues` unchanged, since it was already there and is a plain string.

Switching `formulario_tipo` clears the now-irrelevant value: switching to `'ninguno'` clears both `formulario_externo` and `formulario_id`; switching to `'externo'` clears `formulario_id`; switching to `'interno'` clears `formulario_externo`. This guarantees the client never submits both at once (defense in depth on top of the DB check constraint).

#### 3. UI — Viewing trainings ("ver entrenamientos")
Generalize every existing `formulario_externo`-only display into a "Formulario" block that also handles the internal case, plus an "Obligatorio" indicator when `formulario_obligatorio` is true:

- **`EntrenamientoDetalleModal.tsx`** (the "Ver detalle" modal, lines 180-194): if `formulario_externo` is set, keep today's link; if `formulario_id` is set, show the attached template's `nombre` (via a joined `formulario_plantilla: { nombre }` — see below) plus a "Ver formulario" button that lazily loads `formulariosService.getPlantillaConSecciones(formulario_id)` and opens the existing **read-only** `FormularioPreviewModal` (reused as-is from US-0085, no changes needed to that component). If `formulario_obligatorio`, render a small "Obligatorio" badge next to either case.
- **`EntrenamientosList.tsx`** (calendar/list card, lines 172-190): same generalization in the compact card — external link stays as-is; internal case shows `Formulario: {nombre}` text with the same `link`/`description` icon, plus a compact "Obligatorio" tag when applicable. No preview trigger needed at this density (the detail modal is one click away).
- **`ReservasPanel.tsx`** (the booking panel athletes/staff use to reserve, lines 365-372): same generalization — external link stays; internal case shows the template name with a "Ver formulario" link opening `FormularioPreviewModal`. If `formulario_obligatorio`, show an inline note ("Debes completar este formulario antes de reservar.") for information only — **actually blocking the reserve action until the athlete has filled the form is explicitly out of scope** (see below), since there is still no "fill out a form" flow in the product (US-0084 already deferred that; this US doesn't add it either).

To avoid an extra round-trip per row for the internal template's name, extend the relevant `select(...)` calls in `entrenamientos.service.ts` to embed the FK join Supabase/PostgREST already supports: `formulario_id, formulario_obligatorio, formulario_plantilla:formularios_plantillas(nombre)`. This works because `formularios_plantillas` has an open `using (true)` SELECT RLS policy (any authenticated user, per US-0084), so the embed succeeds regardless of the viewer's role.

#### 4. Training templates (`entrenamiento_plantillas.contenido`) — requirement #7
When a training is saved as a reusable template (`GuardarPlantillaModal` → `buildPlantillaContenido` in `useEntrenamientoForm.ts`, and "Guardar como plantilla" from the detail view → `buildPlantillaContenidoFromInstance` in `useEntrenamientos.ts`), persist `formulario_tipo` and `formulario_obligatorio` into the JSON snapshot (`EntrenamientoPlantillaContenido`) — **but never `formulario_id`**, per requirement #7 ("la configuración de formulario debe quedar almacenada... a excepción del template de formulario seleccionado"). `formulario_externo` already lives in the snapshot and keeps being saved only when `formulario_tipo === 'externo'`.

When a template is later applied (`applyPlantillaContenido` / the "aplicar plantilla" flow), `formulario_tipo` and `formulario_obligatorio` are restored as-is, but `formulario_id` always resets to `''` (unselected) — even if the snapshot's `formulario_tipo` is `'interno'`. In that case the "Interno" toggle is pre-selected and the dropdown is empty, and the admin must explicitly (re)pick a template before saving (the existing "internal requires a selection" validation, described below, naturally enforces this — they cannot silently save with a stale/no template). This is a one-line, explicit rule, not an implicit gap: **do not attempt to carry `formulario_id` across templates.**

No `EntrenamientoPlantillaContenido.version` bump is needed — the two new fields are additive and optional; when reading an **older** saved template (recorded before this US shipped, so it lacks `formulario_tipo`/`formulario_obligatorio`), default `formulario_tipo` to `'externo'` if it has a non-empty `formulario_externo`, else `'ninguno'`, and default `formulario_obligatorio` to `false`.

#### Out of Scope (explicitly deferred, consistent with US-0084/US-0085)
- Any screen where an athlete actually **fills out** an internal form template before/while booking — still deferred to a future US (no `formulario_respuestas` table, no submission UI).
- **Enforcing** `formulario_obligatorio` by blocking the "Reservar" action in `ReservasPanel.tsx` / `reservas.service.ts` until a form has been filled — there is nothing to "have filled" yet (see above), so this US only stores and displays the flag. A future US that adds form submission will also need to add the actual booking gate.
- Cross-tenant DB-level enforcement that a selected `formulario_id` belongs to the same tenant as the training (see **Non-Functional Requirements → Security** for the flagged trade-off — this mirrors how `disciplina_id`/`escenario_id`/`entrenador_id` are already handled: a single-column FK, tenant-scoping enforced only by the UI's tenant-filtered dropdown).

---

## Database Changes

New migration file: `supabase/migrations/20260722010000_entrenamientos_formulario_plantilla.sql`

```sql
-- =============================================
-- Migration: Attach form templates to trainings
-- US-0086: formulario_id + formulario_obligatorio on entrenamientos / entrenamientos_grupo
-- =============================================

-- 1. entrenamientos_grupo: new columns
alter table public.entrenamientos_grupo
  add column if not exists formulario_id uuid default null,
  add column if not exists formulario_obligatorio boolean not null default false;

alter table public.entrenamientos_grupo
  add constraint entrenamientos_grupo_formulario_id_fkey
    foreign key (formulario_id) references public.formularios_plantillas(id) on delete set null;

alter table public.entrenamientos_grupo
  add constraint entrenamientos_grupo_formulario_exclusivo_ck
    check (not (formulario_id is not null and formulario_externo is not null));

alter table public.entrenamientos_grupo
  add constraint entrenamientos_grupo_formulario_obligatorio_ck
    check (formulario_obligatorio = false or formulario_id is not null or formulario_externo is not null);

create index if not exists idx_entrenamientos_grupo_formulario_id
  on public.entrenamientos_grupo (formulario_id);

-- 2. entrenamientos: new columns
alter table public.entrenamientos
  add column if not exists formulario_id uuid default null,
  add column if not exists formulario_obligatorio boolean not null default false;

alter table public.entrenamientos
  add constraint entrenamientos_formulario_id_fkey
    foreign key (formulario_id) references public.formularios_plantillas(id) on delete set null;

alter table public.entrenamientos
  add constraint entrenamientos_formulario_exclusivo_ck
    check (not (formulario_id is not null and formulario_externo is not null));

alter table public.entrenamientos
  add constraint entrenamientos_formulario_obligatorio_ck
    check (formulario_obligatorio = false or formulario_id is not null or formulario_externo is not null);

create index if not exists idx_entrenamientos_formulario_id
  on public.entrenamientos (formulario_id);
```

**Notes**:
- `formulario_id` is a **single-column** FK to `formularios_plantillas(id)` (not a tenant-composite FK like `entrenamientos_entrenamiento_grupo_fkey`), matching the existing single-column pattern used by `disciplina_id`/`escenario_id`/`entrenador_id` on the same tables. A composite `(tenant_id, formulario_id) → formularios_plantillas(tenant_id, id)` FK was considered for stricter cross-tenant integrity, but rejected: Postgres multi-column `ON DELETE SET NULL` nulls **every** referencing column, which would try to null `entrenamientos.tenant_id` (a `NOT NULL` column) the moment an admin deletes a `formularios_plantillas` row still referenced by a training, throwing a hard error instead of gracefully detaching. Tenant scoping is instead enforced purely at the UI layer (the picker only ever lists `formulariosService.getPlantillasByTenant(tenantId)` results) — flag this decision for review if stricter DB-level guarantees are later required.
- `on delete set null` on `formulario_id` means deleting a `formularios_plantillas` row (still a hard delete per US-0084) silently detaches it from any training that referenced it, rather than blocking the delete or cascading. This is the same trade-off already made for `entrenador_id` (`on delete set null`).
- Both check constraints treat `formulario_externo` (already `varchar(500)`, unchanged) and the new `formulario_id` as mutually exclusive, and require at least one of them to be non-null before `formulario_obligatorio` can be `true`. A row with both null and `formulario_obligatorio = false` (the default / "no form" state) is always valid.
- Run `supabase db reset` (or the local equivalent) to confirm the migration applies cleanly on top of `20260721223051_formulario_esquema_secciones.sql` and that all existing `entrenamientos`/`entrenamientos_grupo` rows (which all have `formulario_id = null`, `formulario_obligatorio = false` by default) remain valid.
- RLS: no changes needed. Existing RLS on `entrenamientos`/`entrenamientos_grupo` operates at the row level regardless of which columns are touched; existing RLS on `formularios_plantillas` (`using (true)` for SELECT) already allows any authenticated user to read template names/ids for the picker and the joined display.

---

## API / Server Actions

All operations remain direct Supabase-client calls from the service layer, consistent with the rest of the codebase — no new API routes.

**File**: `src/services/supabase/portal/entrenamientos.service.ts` (existing file, extended — no renames)

| Function | Change |
|---|---|
| `listTrainingGroupsByTenant` | Extend the `entrenamientos_grupo` `select(...)` string (line ~316) to add `formulario_id, formulario_obligatorio, formulario_plantilla:formularios_plantillas(nombre)`; extend the `entrenamientos` `select(...)` string (line ~327) the same way |
| `listTrainingInstancesByTenantAndRange` | Same extension to its `select(...)` string (line ~356) |
| `createTrainingSeries` | Both the `entrenamientos` (único) and `entrenamientos_grupo` (recurrente) `insert(...)` payloads (lines ~386, ~445) gain `formulario_id: input.group.formulario_id ?? null` and `formulario_obligatorio: input.group.formulario_obligatorio ?? false`; the trailing `.select(...)` string on the grupo insert (line ~465) gets the same 3-field extension |
| `updateTrainingSeries` | `entrenamientos_grupo` `update(...)` payload (line ~603 / ~644) gains the two new fields from `input.groupPatch`; its `select(...)` string (line ~670) extended |
| `updateTrainingInstance` | `entrenamientos` `update(...)` payload (line ~688) gains the two new fields from `input.patch`; its `select(...)` string (line ~703, ~719 context) extended |
| `mapTrainingGroup` / `mapTrainingInstance` | Map the new raw columns onto `TrainingGroup.formulario_id` / `.formulario_obligatorio` / `.formulario_plantilla` (and same for `TrainingInstance`) |

`formularios.service.ts` needs **no changes** — `getPlantillasByTenant(tenantId)` and `getPlantillaConSecciones(plantillaId)` are reused as-is by the new picker and preview.

Auth / RLS: unchanged. Writers must already be `administrador`/`entrenador` of the tenant (existing `entrenamientos`/`entrenamientos_grupo` RLS); reads of the joined `formularios_plantillas.nombre` succeed for any authenticated user per its existing catalog-style SELECT policy.

---

## Files to Create or Modify

| Area | File | Change |
|---|---|---|
| Migration | `supabase/migrations/20260722010000_entrenamientos_formulario_plantilla.sql` | New columns, FKs, check constraints, indexes (see SQL above) |
| Types | `src/types/portal/entrenamientos.types.ts` | Add `TrainingFormularioTipo = 'ninguno' \| 'externo' \| 'interno'`; add `formulario_id: string \| null`, `formulario_obligatorio: boolean`, `formulario_plantilla?: { nombre: string } \| null` to `TrainingGroup` and `TrainingInstance`; add `formulario_id?: string \| null`, `formulario_obligatorio?: boolean` to `CreateTrainingSeriesInput['group']`, `UpdateTrainingSeriesInput['groupPatch']`, `UpdateTrainingInstanceInput['patch']`; add `'formulario_tipo'` and `'formulario_id'` to the `TrainingField` union (for `TrainingFieldErrors` keys only — these are not real `TrainingWizardValues` keys, see Description) |
| Types | `src/types/portal/entrenamiento-plantillas.types.ts` | Add `formulario_tipo: TrainingFormularioTipo` and `formulario_obligatorio: boolean` to `EntrenamientoPlantillaContenido` (both optional/defaulted when reading pre-existing rows, per Description §4) |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientoForm.ts` | Add `formularioForm: { tipo, formulario_id, obligatorio }` state + `setFormularioTipo`/`setFormularioPlantillaId`/`setFormularioObligatorio` setters (clearing the irrelevant field on tipo switch, per Description §2); extend `validate` to require `formulario_externo` when tipo is `'externo'` and `formulario_id` when tipo is `'interno'`; extend `buildPlantillaContenido`/`applyPlantillaContenido` (lines 477-559) per Description §4 |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Extend `toCreatePayload`/`toUpdatePatch` (lines 307-389) to accept `formularioForm` and compute `formulario_id`/`formulario_externo`/`formulario_obligatorio` with mutual-exclusion enforced client-side (per Description §2); extend `buildPlantillaContenidoFromInstance` (lines 250-288) per Description §4; wire `form.formularioForm` into all four `submitForm` call sites (lines ~996, ~1038, ~1060, ~1092); re-export `formularioForm` + its setters + `plantillas` (already exposed) from the hook's return value |
| Hook | `src/hooks/portal/formularios/useFormularios.ts` | No changes — `formulariosService.getPlantillasByTenant` reused directly from the new training hook state |
| Component | `src/components/portal/entrenamientos/EntrenamientoWizard.tsx` | Remove the "Formulario externo" input block (lines 173-184) — superseded by the new section |
| Component | `src/components/portal/entrenamientos/EntrenamientoFormularioSection.tsx` | **New** — the a/b/c/d/e flow described in Proposed Changes §2, styled like `EntrenamientoCategoriasSection.tsx` |
| Component | `src/components/portal/entrenamientos/EntrenamientoFormModal.tsx` | Render `<EntrenamientoFormularioSection />` alongside `EntrenamientoCategoriasSection`/`EntrenamientoRestriccionesSection`; add `role: UserRole \| null`, `tenantId: string`, `plantillasFormulario: FormularioPlantillaListItem[]`, `formularioForm`, and its setters to `EntrenamientoFormModalProps` |
| Component | `src/components/portal/entrenamientos/EntrenamientosPage.tsx` | Fetch `formulariosService.getPlantillasByTenant(tenantId)` once (mirrors how `servicios`/`disciplinas` are fetched for the wizard's other selects) and pass the list + `role` + `tenantId` down to `EntrenamientoFormModal` |
| Component | `src/components/portal/entrenamientos/EntrenamientoDetalleModal.tsx` | Generalize the "Formulario externo" block (lines 180-194) into a "Formulario" block handling both the external and internal case + "Obligatorio" badge + "Ver formulario" trigger opening `FormularioPreviewModal` (per Description §3) |
| Component | `src/components/portal/entrenamientos/EntrenamientosList.tsx` | Generalize the compact "Formulario externo" indicator (lines 172-190) the same way (no preview trigger) |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Generalize the "Formulario externo" link (lines 365-372) the same way + informational "Obligatorio" note (no booking gate — out of scope) |
| Component | `src/components/portal/formularios/FormularioPreviewModal.tsx` | No changes — reused as-is from the training views |
| Service | `src/services/supabase/portal/entrenamientos.service.ts` | Extend `select`/`insert`/`update` payloads and `mapTrainingGroup`/`mapTrainingInstance` per the API table above |
| Service | `src/services/supabase/portal/formularios.service.ts` | No changes — `getPlantillasByTenant`/`getPlantillaConSecciones` reused as-is |

---

## Acceptance Criteria

1. Creating a new training with no interaction in the new "Formulario" section persists `formulario_id = null`, `formulario_externo = null`, `formulario_obligatorio = false` — identical to today's default behavior.
2. Toggling "¿Quieres agregar un formulario para poder reservar?" to "Sí" reveals the "¿Es externo?" toggle; toggling it back to "No" hides and discards any values entered below (both `formulario_externo` and the internal picker's selection are cleared from the in-memory form state).
3. With "¿Es externo?" = "Sí", the section shows the URL input (same as today's "Formulario externo" field); submitting a non-empty URL persists it to `formulario_externo` with `formulario_id` staying `null`. Submitting with the field empty shows an inline validation error and blocks submit.
4. With "¿Es externo?" = "No", the section shows a `<select>` listing every `activo = true` template from `formularios_plantillas` for the current tenant, sorted by `nombre`, plus a "+ Crear nueva plantilla" entry point. Selecting a template and submitting persists its id to `formulario_id` with `formulario_externo` staying `null`. Submitting without a selection shows an inline validation error and blocks submit.
5. The "+ Crear nueva plantilla" link is visible only when the current user's role is `administrador`; it is hidden for `entrenador`. Clicking it navigates to `/portal/orgs/{tenant_id}/gestion-formularios` without submitting or discarding the in-progress training form's other fields (the modal stays open in the background per standard Next.js navigation, or the admin can return and reopen the training modal — no special state preservation is required beyond what the browser back button already provides).
6. The "Formulario obligatorio para reservar" checkbox is visible only when a form is enabled (`formulario_tipo !== 'ninguno'`) and persists to `formulario_obligatorio`; it is impossible to submit `formulario_obligatorio = true` while `formulario_tipo === 'ninguno'` (the checkbox isn't rendered in that state, and the client-side payload builder forces `false` regardless of any stale in-memory value).
7. Editing an existing training whose `formulario_id` is set pre-selects "Sí" / "No, no es externo" and the correct template in the dropdown; editing one whose `formulario_externo` is set pre-selects "Sí" / "Sí, es externo" and shows the URL; editing one with neither pre-selects "No".
8. Attempting to insert/update a row with both `formulario_id` and `formulario_externo` non-null is rejected by the new `_formulario_exclusivo_ck` check constraint (verified directly in SQL); the client-side logic in `toCreatePayload`/`toUpdatePatch` never produces such a payload in the first place.
9. Attempting to set `formulario_obligatorio = true` with both `formulario_id` and `formulario_externo` null is rejected by the new `_formulario_obligatorio_ck` check constraint.
10. On "Ver detalle" (`EntrenamientoDetalleModal`), a training with `formulario_externo` set shows the same clickable external link as before; a training with `formulario_id` set shows the attached template's name and a "Ver formulario" action that opens a read-only preview of its sections (no submit control); either case shows an "Obligatorio" badge when `formulario_obligatorio` is true; a training with neither shows no form section at all (unchanged from today for that case).
11. The calendar/list view (`EntrenamientosList`) shows the same generalized indicator (external link or internal template name) at a glance, without needing to open the detail modal.
12. The booking panel (`ReservasPanel`) shows the same generalized indicator; when `formulario_obligatorio` is true, an informational note is shown, but the "Reservar" action is **not** blocked by this US (no fill-out flow exists yet to gate on).
13. Saving a training as a template (`GuardarPlantillaModal`, either from the create wizard or "Guardar como plantilla" in the detail view) stores `formulario_tipo` and `formulario_obligatorio` in `entrenamiento_plantillas.contenido`, but never stores `formulario_id`, even when the source training had one set.
14. Applying a saved template whose `contenido.formulario_tipo === 'interno'` pre-selects "Sí" / "No, no es externo" in the wizard, but leaves the template dropdown unselected — attempting to submit without picking a template shows the same inline validation error as AC 4.
15. Applying a saved template whose `contenido.formulario_tipo === 'externo'` restores both the toggle state and the `formulario_externo` URL text exactly as saved.
16. Applying a pre-existing template saved **before** this US shipped (its `contenido` lacks `formulario_tipo`/`formulario_obligatorio`) defaults to `'externo'` if it has a non-empty `formulario_externo`, else `'ninguno'`, and `formulario_obligatorio` defaults to `false` — no crash, no `undefined` rendering.
17. Deleting a `formularios_plantillas` row that is currently referenced by one or more trainings' `formulario_id` succeeds (per its existing hard-delete behavior from US-0084) and sets `formulario_id` to `null` on those trainings via `on delete set null`, without erroring and without deleting the training itself.
18. No existing menu item, route, or admin page regresses — verified by loading `gestion-servicios`, `gestion-disciplinas`, `gestion-escenarios`, and `gestion-formularios` after the change.
19. No regression in existing `formulario_externo`-only behavior for trainings created before this US: they continue to display/edit exactly as before (their `formulario_id` and `formulario_obligatorio` are `null`/`false` by default from the migration).

---

## Implementation Steps

- [ ] Write and apply the migration (`formulario_id`, `formulario_obligatorio`, FKs, check constraints, indexes on both tables); run `supabase db reset` (or equivalent) to verify it applies cleanly on top of `20260721223051_formulario_esquema_secciones.sql`
- [ ] Update `entrenamientos.types.ts` and `entrenamiento-plantillas.types.ts` per the Files table
- [ ] Extend `entrenamientos.service.ts`: select strings, insert/update payloads, `mapTrainingGroup`/`mapTrainingInstance`
- [ ] Extend `useEntrenamientoForm.ts`: `formularioForm` state + setters, validation, `buildPlantillaContenido`/`applyPlantillaContenido`
- [ ] Extend `useEntrenamientos.ts`: `toCreatePayload`/`toUpdatePatch`/`buildPlantillaContenidoFromInstance`, wire `formularioForm` into `submitForm`, re-export new state/setters
- [ ] Remove the old "Formulario externo" block from `EntrenamientoWizard.tsx`
- [ ] Build `EntrenamientoFormularioSection.tsx`; wire it into `EntrenamientoFormModal.tsx` with the new props
- [ ] Fetch `formulariosService.getPlantillasByTenant(tenantId)` in `EntrenamientosPage.tsx` and thread it + `role` + `tenantId` down to the new section
- [ ] Generalize the form display in `EntrenamientoDetalleModal.tsx`, `EntrenamientosList.tsx`, and `ReservasPanel.tsx`; wire `FormularioPreviewModal` (lazy-loaded via `formulariosService.getPlantillaConSecciones`) into the detail modal and booking panel
- [ ] Test manually: create a training with no form, with an external URL, with an internal template (incl. "obligatorio" on/off); edit each case; verify mutual-exclusion validation and DB check constraints reject bad direct-SQL inserts; save each case as a template and re-apply it (verify `formulario_id` never carries over); delete a template referenced by a training and confirm `formulario_id` nulls out gracefully; verify the "+ Crear nueva plantilla" link's role-based visibility; verify "ver entrenamientos" (list, detail, booking panel) render correctly for all three states
- [ ] Confirm no regressions in sibling admin pages (`gestion-servicios`, `gestion-disciplinas`, `gestion-escenarios`, `gestion-formularios`) and in existing `formulario_externo`-only trainings

---

## Non-Functional Requirements

- **Security**: All writes to `entrenamientos`/`entrenamientos_grupo` remain gated by their existing RLS (administrador/entrenador of the tenant); reading the joined `formularios_plantillas.nombre` is safe for any authenticated user per its existing open SELECT policy. `formulario_id` uses a single-column FK (not tenant-composite) — cross-tenant selection is prevented only at the UI layer (the picker only lists the current tenant's templates), matching the existing trade-off for `disciplina_id`/`escenario_id`/`entrenador_id`; flagged for review if stricter DB-level tenant isolation on this FK is later required.
- **Performance**: The new `idx_entrenamientos_formulario_id` / `idx_entrenamientos_grupo_formulario_id` indexes keep the FK join and any future "trainings using template X" lookups fast. The joined `formularios_plantillas(nombre)` embed adds no extra round-trip to existing list/detail queries — it's part of the same `select(...)` call.
- **Accessibility**: The new section's toggles/select/checkbox follow the same accessible patterns already used by `EntrenamientoCategoriasSection` (labelled checkbox, associated `<label>`s); the "Ver formulario" preview trigger and "+ Crear nueva plantilla" link both need descriptive `aria-label`s/accessible text, consistent with US-0085's icon-action conventions.
- **Error handling**: Inline field-level validation errors in the new section (mirroring `TrainingFieldErrors`'s existing pattern) for both the "external URL required" and "template selection required" cases; the existing `mapServiceError`'s generic `23514` → `TrainingServiceError('validation', ...)` mapping in `entrenamientos.service.ts` already catches the two new check-constraint violations with a friendly (if generic) message — no new error code needed unless a more specific message is desired later.
