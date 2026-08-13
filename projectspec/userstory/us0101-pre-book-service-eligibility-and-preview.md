# US-0101 — Pre-Book Service Eligibility Check, Formulario Preview, and Plan Acquisition on Public Training Cards

## ID
US-0101

## Name
Validate Service Eligibility Before Opening the Booking Form, and Add "Vista Previa del Formulario" / "Adquirir Plan" Actions to Public Training Cards

## As a
Authenticated athlete/visitor browsing the Public Training Marketplace (`/portal/entrenamientos-publicos`)

## I Want
1. To find out **before** filling out the booking form whether I already have a plan/subscription that grants the service(s) a training requires, and
2. A way to preview the training's attached formulario, and a way to go acquire the required plan, directly from the training card — without first clicking "Reservar"

## So That
I don't waste time filling out a full reservation form (and, for trainings with an attached formulario, answering every field) only to be rejected at the very end because I never had the required service — and so I can make an informed decision (check what's asked, or go buy the missing plan) before starting the booking flow at all.

---

## Description

### Current State

- `PublicTrainingReservaModal.tsx` already has a dedicated rejection screen for `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` with a "Ver planes de {tenantNombre}" button that opens `PlanesPublicosModal` (US-0094) — but it is only ever reached **after** the user completes the entire booking flow and submits:
  - `usePublicTrainingReserva.openBooking()` (`src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts:125-135`) goes straight from "modal opened" to `reservaForm.openCreate()`, i.e. straight to the form. It never checks eligibility first.
  - The only place `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` can currently surface is inside `onCreateReserva` (`usePublicTrainingReserva.ts:100-115`), which runs `reservasService.create()` — reachable only via the form's submit button (`ReservaFormModal`/`FormularioRespuestaModal`'s `onSubmit`).
  - `reservasService.create()` (`src/services/supabase/portal/reservas.service.ts:690-880`) itself already calls `validateBookingRestrictions()` as a **pre-flight check before** the atomic RPC (`book_and_deduct_service_units`) — this is the exact function this story reuses, just triggered earlier in the UI flow. The RPC remains the final, authoritative, race-safe check; nothing about server-side enforcement changes.
  - `validateBookingRestrictions()` (`reservas.service.ts:297-498`) is already exported via `reservasService.validateBookingRestrictions` and is already safe to call for a non-member cross-tenant visitor: `entrenamiento_restricciones` (`ent_restricciones_select_authenticated` policy) and `entrenamientos` (`entrenamientos_select_authenticated` policy, for `visibilidad = 'publico'` rows) are both readable `to authenticated` with no tenant-membership requirement — booking already works today for non-members, so this pre-check works identically.
- There is no "preview the formulario" affordance anywhere on the marketplace. The only place a formulario can be previewed today is `ReservasPanel.tsx`'s "Ver formulario" button (tenant-admin surface, not the public marketplace), which inlines its own fetch of `formulariosService.getPlantillaConSecciones(formularioId)` into local component state — there is no reusable hook for this.
- `PublicTrainingCard.tsx` shows a "Requiere: …" line (service **names** only, from `serviciosRequeridos: string[]`) when a training has a service restriction, but offers no direct action to go acquire that plan — the user must click "Reservar", fill the form, get rejected, and only then see "Ver planes".
- `formulario_id`/`formulario_externo` for a training is currently only fetched once the reservation modal opens (`usePublicTrainingReserva.ts:51-71`, a single-row query per training) — never at card/grid level, so the card cannot today show whether a formulario exists at all.
- `serviciosRequeridos` comes from `entrenamientos_publicos_servicios_view`, granted to `authenticated` only (revoked from `anon`) — `listPublicTrainingsForLanding()` always returns `serviciosRequeridos: []` for the anonymous landing page. This story's new affordances rely on the same authenticated-only data (formulario tables are also `to authenticated` with no anonymous grant), so **all new behavior in this story is scoped to the authenticated marketplace only** — the anonymous landing page (`/entrenamientos-publicos`) is unaffected (see Non-Goals).
- `BookingRejection` (`src/types/portal/entrenamiento-restricciones.types.ts:98-102`) currently carries only `{ ok: false; code; message }` — the service name that's missing is baked into the free-text `message` string but not exposed as a structured field, so today's "Ver planes" button always opens the **unfiltered** plan catalog.

### Proposed Changes

**1. Upfront eligibility pre-check on "Reservar"**
- `usePublicTrainingReserva.openBooking()` calls `reservasService.validateBookingRestrictions(entrenamientoId, currentUserId, tenantId)` as soon as `currentUserId` resolves, **before** calling `reservaForm.openCreate()`.
- Add a `checkingEligibility: boolean` state, `true` for the duration of the check, so `PublicTrainingReservaModal` can render a brief loading state (spinner + "Verificando disponibilidad…") instead of a blank/janky modal while the check's several sequential queries resolve.
- If the check passes (`{ ok: true }`), proceed exactly as today: call `reservaForm.openCreate(currentUserId)` and show the form.
- If the check fails, set `bookingRejection` to the result and **do not** open the form — the modal goes straight to a rejection screen (see #2), skipping the form entirely (including skipping the formulario step, if one is attached).
- **Fail open on unexpected errors**: if `validateBookingRestrictions` throws (network error, unrelated to a real rejection), do not block the user — log the error, treat it the same as `{ ok: true }`, and proceed to the form. The RPC-level check at actual submit time remains the authoritative gate regardless, so failing open here only affects UX friction, not security.
- The pre-check re-runs (and `bookingRejection` resets) every time the modal is reopened, consistent with `openBooking()`'s existing reset behavior (`usePublicTrainingReserva.ts:125-130`).

**2. Broaden the existing rejection screen to handle the pre-check outcome**
- `PublicTrainingReservaModal.tsx`'s rejection branch (currently gated on `rejectionCode === 'SERVICIO_REQUERIDO' || rejectionCode === 'UNIDADES_AGOTADAS'`, lines 90-144) becomes gated on `reserva.bookingRejection != null` generally, since the pre-check can now surface **any** `BookingRejectionCode` (e.g. `TIMING_RESERVA`, `USUARIO_INACTIVO`, `NIVEL_INSUFICIENTE`) before the form ever opens, not just service-related ones.
- The "Ver planes de {tenantNombre}" button (and the `PlanesPublicosModal` it opens) is shown **only** when `rejectionCode` is `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS` — those are the only codes a plan purchase can fix. For every other code, show the rejection message with just a "Cerrar" button (same dialog shell, no plan CTA).
- When the "Ver planes" button is shown, pre-fill the catalog's search with the missing service's name (see #4) instead of opening it unfiltered.

**3. "Vista previa del formulario" button on the card**
- `listPublicTrainings()` (`src/services/supabase/portal/entrenamientos-publicos.service.ts`) is extended with one additional batched query — after the base list is fetched, a single `supabase.from('entrenamientos').select('id, formulario_id, formulario_externo').in('id', entrenamientoIds)` call (mirroring the existing `Promise.all`/enrichment pattern already used for capacity) — merged into each row as `formularioId: string | null` / `formularioExterno: string | null`. This does **not** duplicate these columns onto `entrenamientos_publicos` (a deliberate, pre-existing architectural rule — see the table's original spec) — it's a runtime join in the service layer only, exactly like `usePublicTrainingReserva.ts` already does per-training, just batched for the whole visible list instead of one row at a time.
- `PublicTrainingListItem` / `PublicTrainingCardData` gain `formularioId: string | null` and `formularioExterno: string | null`.
- `listPublicTrainingsForLanding()` is **not** touched — it continues to omit these fields entirely (the anonymous landing page never shows this button; see Non-Goals).
- New hook `useFormularioPreview` wraps `formulariosService.getPlantillaConSecciones(formularioId)`, exposing `{ open, loading, error, plantillaNombre, secciones, perfilCamposRequeridos, openPreview(formularioId), closePreview() }` — the first reusable extraction of the fetch-and-preview pattern currently duplicated inline in `ReservasPanel.tsx` (that file is untouched by this story; extracting its own usage into the new hook is a nice-to-have, not required — see Non-Goals).
- `PublicTrainingCard.tsx` renders a "Vista previa" action, gated on the card's data:
  - `formularioId` set → button opens `FormularioPreviewModal` (existing component, reused as-is) via the new hook, showing the training's formulario read-only.
  - `formularioId` null but `formularioExterno` set → the same visual slot instead renders as a link (`<a href={formularioExterno} target="_blank" rel="noopener noreferrer">`) labeled "Ver formulario externo", opening the external URL in a new tab — there is nothing to render inline for an external form.
  - Neither set → no button/link rendered.
  - This state (`formularioModalOpen`/hook state) lives locally inside `PublicTrainingCard`, following the exact same self-contained pattern established for the banner-viewer modal (US-0100) — no prop plumbing through `PublicTrainingsGrid.tsx`/`EntrenamientosPublicosPage.tsx`.

**4. "Adquirir plan" button on the card**
- `PublicTrainingCardData` gains a required `tenantId: string` field (needed to open `PlanesPublicosModal`, which requires it) — populated in `PublicTrainingsGrid.tsx`'s `toCardData()` from the already-available `PublicTrainingListItem.tenantId`.
- `PublicTrainingCard.tsx` renders an "Adquirir plan" button whenever `serviciosRequeridos.length > 0` (the same condition that already drives the existing "Requiere: …" row) — this is a **proactive, always-shown-when-a-requirement-exists** affordance, independent of whether the current viewer happens to already hold the service (checking that for every visible card on page load would mean running `validateBookingRestrictions` N times; out of scope — see Non-Goals). This mirrors the existing "Requiere: …" text's identical characteristic today (shown regardless of the viewer's actual entitlement), so it is not a behavioral regression.
- Clicking it opens `PlanesPublicosModal` for the card's `tenantId`/`tenantNombre`, with `usePlanesPublicos`'s search **pre-filled** to the first entry in `serviciosRequeridos` (search-by-name already works today via `matchesSearch()` in `usePlanesPublicos.ts:61-76`, which already matches against each subtype's granted service names — no new matching logic needed).
- This card-level button is complementary to, not a replacement for, the reactive "Ver planes" button inside the (broadened) rejection screen from #2 — the card button is a discovery affordance available any time; the rejection-screen button appears specifically after a failed eligibility check.
- Local `useState` inside `PublicTrainingCard`, same self-contained pattern as #3 and the US-0100 banner modal.

**5. Structured missing-service name on `BookingRejection`**
- `BookingRejection` gains an optional `servicioNombre?: string`, populated only for `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` rejections, at every site in `reservas.service.ts` that already resolves the service's name locally to build the existing message string (`validateBookingRestrictions`'s `SERVICIO_REQUERIDO` branch around line 450-456, and the `UNIDADES_AGOTADAS`/`SERVICIO_REQUERIDO` branches inside `create()` around lines 768-876) — the query that fetches `svc.nombre` already runs at each of these points; this only means also attaching it to the returned object instead of only interpolating it into `message`.
- `PlanesPublicosModal` gains an optional `initialSearch?: string` prop, threaded into `usePlanesPublicos({ tenantId, enabled: open, initialSearch })`, which seeds `search`'s initial state.
- Because `usePlanesPublicos`/`PlanesPublicosModal` are **not** unmounted between opens (`open` is a boolean prop, not a mount trigger), `initialSearch` must be re-applied via a `useEffect` keyed on `open` (reset `search` to `initialSearch ?? ''` whenever `open` transitions to `true`) — a plain `useState(initialSearch ?? '')` initializer would only apply on the component's first-ever mount, not on every reopen with a different service name. This is an implementation detail, not a behavior change to document elsewhere in this story.
- `VerPlanesButton.tsx` and every other existing `PlanesPublicosModal` caller are unaffected — `initialSearch` is optional and defaults to unfiltered, preserving current behavior everywhere else.

---

## Database Changes

None. Every change in this story is application-layer (new/extended TypeScript types, one additional batched Supabase query, reuse of already-readable tables via existing RLS policies). No new tables, columns, RLS policies, or migrations.

---

## API / Server Actions

No new server actions or API routes. This is a client-side Supabase-service story; all data access already goes through existing, RLS-covered tables/views. Changed/extended functions:

- **`src/services/supabase/portal/entrenamientos-publicos.service.ts`** — `listPublicTrainings(tenantId?: string)`: add a batched follow-up query (`entrenamientos` table, `id, formulario_id, formulario_externo`, filtered `.in('id', entrenamientoIds)`) and merge `formularioId`/`formularioExterno` onto each returned `PublicTrainingListItem`. Auth: `to authenticated`, existing `entrenamientos_select_authenticated` RLS policy (no policy change needed — already allows any authenticated user to read `visibilidad = 'publico'` rows).
- **`src/services/supabase/portal/reservas.service.ts`** — `validateBookingRestrictions` (already exported, unchanged signature): populate `servicioNombre` on the returned `BookingRejection` at the `SERVICIO_REQUERIDO` branch. `create()`: same addition at its `UNIDADES_AGOTADAS`/`SERVICIO_REQUERIDO` branches. No signature/behavior change to the pass/fail logic itself.
- **`src/services/supabase/portal/formularios.service.ts`** — `getPlantillaConSecciones(formularioId)`: reused as-is (no change), called from the new `useFormularioPreview` hook. Auth: `to authenticated`, `using (true)` on both `formularios_plantillas_select_authenticated` and `formulario_plantilla_esquema_select_authenticated` (`supabase/migrations/20260721161036_formularios_plantillas.sql`) — confirmed no tenant-membership restriction, so this already works for a non-member cross-tenant visitor.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Hook | `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts` | `openBooking()` runs `validateBookingRestrictions` pre-check before opening the form; add `checkingEligibility` state; fail-open on unexpected errors |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx` | Add loading branch for `checkingEligibility`; broaden rejection branch to any `bookingRejection`, gating the "Ver planes" CTA to `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS`; pass `initialSearch` to `PlanesPublicosModal` |
| Type | `src/types/portal/entrenamiento-restricciones.types.ts` | `BookingRejection.servicioNombre?: string` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Populate `servicioNombre` at existing service-name-resolution points in `validateBookingRestrictions` and `create()` |
| Service | `src/services/supabase/portal/entrenamientos-publicos.service.ts` | `listPublicTrainings()`: batched `formulario_id`/`formulario_externo` enrichment |
| Type | `src/types/portal/entrenamientos-publicos.types.ts` | `PublicTrainingListItem`/`PublicTrainingCardData`: add `formularioId`, `formularioExterno`, `tenantId` (card data only) |
| Hook | `src/hooks/portal/entrenamientos-publicos/useFormularioPreview.ts` | New — wraps `formulariosService.getPlantillaConSecciones` for read-only card-level preview |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | Add "Vista previa" (modal or external link) and "Adquirir plan" (opens `PlanesPublicosModal`) actions, each gated on card data; local state for both, mirroring the US-0100 banner-modal pattern |
| Component | `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx` | `toCardData()`: map `tenantId`, `formularioId`, `formularioExterno` from `PublicTrainingListItem` onto `PublicTrainingCardData` |
| Component | `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` | Add optional `initialSearch?: string` prop, reset `search` to it on each `open` transition |
| Hook | `src/hooks/portal/planes-publicos/usePlanesPublicos.ts` | Accept optional `initialSearch` option, seed `search`'s initial state |

---

## Acceptance Criteria

1. Clicking "Reservar" on a public training card opens the booking modal, which shows a brief loading state, then either the eligibility-rejection screen or the booking form — never the form followed immediately by a rejection for a condition that was already knowable upfront.
2. When the athlete lacks a required service (or its units are exhausted), the rejection screen appears **without** the booking form (or formulario step) ever being shown, with a "Ver planes de {organización}" button that opens the plan catalog pre-searched to the missing service's name.
3. When the pre-check fails for a non-service reason (`TIMING_RESERVA`, `USUARIO_INACTIVO`, `NIVEL_INSUFICIENTE`, etc.), the rejection screen shows the message with only a "Cerrar" action — no "Ver planes" button.
4. When the pre-check passes, the booking flow proceeds exactly as it does today (form, or formulario step first if attached and obligatorio) — no regression to the happy path.
5. If the pre-check request fails unexpectedly (network error), the user is not blocked — the flow proceeds to the form as if the check had passed, and the existing submit-time RPC check still applies as the final safety net.
6. A public training card with an attached internal formulario (`formulario_id` set) shows a "Vista previa" button; clicking it opens a read-only preview of the formulario's sections without affecting any reservation state, and without requiring the visitor to click "Reservar" first.
7. A public training card with only an external formulario (`formulario_externo` set, no `formulario_id`) shows a "Ver formulario externo" link that opens the URL in a new tab; a card with neither shows no such affordance.
8. A public training card whose training has at least one required service (`serviciosRequeridos.length > 0`) shows an "Adquirir plan" button; clicking it opens the plan catalog for that training's organization, pre-searched to the required service's name.
9. A public training card with no service requirement shows no "Adquirir plan" button, matching the existing "Requiere: …" row's visibility condition.
10. None of the new affordances (pre-check, "Vista previa", "Adquirir plan") appear on the anonymous landing page (`/entrenamientos-publicos`) — that page's cards continue to show only the "Regístrate para reservar" CTA, unaffected by this story.
11. The admin's `PublicarEntrenamientoModal` live preview (which also renders `PublicTrainingCard`) does not crash or regress if it doesn't populate `formularioId`/`formularioExterno`/`tenantId`/`serviciosRequeridos` in its card data — the new buttons simply don't render there, same as any other card missing that data.
12. Opening `PlanesPublicosModal` via "Adquirir plan" from two different cards (with different required services) in the same session shows the correct pre-filled search each time — not a stale search term from a previous open.
13. `VerPlanesButton` and every other existing caller of `PlanesPublicosModal` continue to work identically (unfiltered catalog) since `initialSearch` is optional.

---

## Implementation Steps

- [ ] Add `BookingRejection.servicioNombre?: string` to `entrenamiento-restricciones.types.ts`
- [ ] Populate `servicioNombre` at the existing service-name-resolution points in `reservas.service.ts` (`validateBookingRestrictions`, `create()`)
- [ ] Add the batched `formulario_id`/`formulario_externo` enrichment to `listPublicTrainings()`; extend `PublicTrainingListItem` type
- [ ] Extend `PublicTrainingCardData` with `formularioId`, `formularioExterno`, `tenantId`; update `toCardData()` in `PublicTrainingsGrid.tsx`
- [ ] Add `checkingEligibility` state + pre-check call to `usePublicTrainingReserva.openBooking()`, with fail-open error handling
- [ ] Update `PublicTrainingReservaModal.tsx`: loading branch, broadened rejection branch (generic message vs. service-specific with "Ver planes"), `initialSearch` wiring
- [ ] Add `initialSearch` option to `usePlanesPublicos` and prop to `PlanesPublicosModal`, with the `open`-keyed reset effect
- [ ] Create `useFormularioPreview` hook
- [ ] Add "Vista previa" / "Ver formulario externo" and "Adquirir plan" actions to `PublicTrainingCard.tsx`, each with local state, following the US-0100 banner-modal pattern
- [ ] Verify RLS: confirm (already true per this story's research, but re-verify against the running local DB) that `entrenamientos`, `entrenamiento_restricciones`, `formularios_plantillas`, and `formulario_plantilla_esquema` are readable by a non-member authenticated session for a public training
- [ ] Test manually: happy path (eligible athlete books normally), missing-service pre-check (rejection before form, pre-filled plan search), non-service rejection (message-only), network-error fallback (fails open to form), formulario preview (internal + external + none), adquirir-plan button (present/absent, correct pre-filled search across multiple cards), anonymous landing page unaffected, admin publish-preview unaffected
- [ ] Update `projectspec/03-project-structure.md` for the new/changed files above

---

## Non-Functional Requirements

- **Security**: No RLS changes — every table/view this story reads from is already `to authenticated`-readable cross-tenant for public trainings (confirmed via existing policies: `entrenamientos_select_authenticated`, `ent_restricciones_select_authenticated`, `formularios_plantillas_select_authenticated`, `formulario_plantilla_esquema_select_authenticated`). The atomic RPC (`book_and_deduct_service_units`) remains the sole authoritative, race-safe enforcement point — the new pre-check is a UX convenience layered on the same client-callable validation function already used as a pre-flight check inside `create()`, not a new trust boundary.
- **Performance**: The batched `entrenamientos` enrichment query for `listPublicTrainings()` is a single `.in()` query regardless of list size (not N+1). The eligibility pre-check runs only on "Reservar" click (once per booking attempt), not for every card on page load — the "Adquirir plan" button's visibility is intentionally based on the static `serviciosRequeridos` data already loaded with the list, not a per-card live entitlement check, to avoid N look-ups on page render.
- **Accessibility**: "Vista previa" and "Adquirir plan" buttons need visible focus states and accessible labels consistent with the card's existing "Ver" (banner) button (US-0100) and `VerPlanesButton` conventions. The loading state in `PublicTrainingReservaModal` should be announced (e.g. `aria-live="polite"` or a visible, non-decorative loading message) so screen-reader users aren't left on a silent blank dialog.
- **Error handling**: Pre-check network failures fail open (proceed to form) rather than surfacing a dead-end error, per Acceptance Criterion 5. Formulario-preview fetch errors show an inline error message inside the preview modal (reusing `FormularioPreviewModal`'s existing `error` prop) rather than a blank/broken dialog. Plan-catalog loading/error states are already handled by the existing `PlanesPublicosModal`/`usePlanesPublicos` — unchanged by this story.
