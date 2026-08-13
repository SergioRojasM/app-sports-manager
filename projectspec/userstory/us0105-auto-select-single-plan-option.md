# US-0105 — Auto-Select a Plan's Only Option and Skip to Payment

## ID
US-0105

## Name
Auto-Select Single Plan Subtype and Skip Directly to the Payment Step

## As a
User (public visitor or authenticated athlete) acquiring a plan through the shared
subscription-request flow (`SuscripcionModal` / `useSuscripcion`)

## I Want
The subtype (`plan_tipos`) to be selected automatically, without an extra picker screen,
when the plan I'm acquiring only has one active option

## So That
I don't have to click through a subtype-selection step that offers no real choice — fewer
clicks between "Adquirir" and completing my payment request

---

## Description

### Current State

Acquiring a plan always goes through the same shared chain, regardless of entry point:
`PlanPublicoCard.tsx`'s "Adquirir" button (rendered whenever `canAcquire && plan.tipos.length > 0`,
outside the card's `<details>` disclosure so it's always clickable) →
`PlanesPublicosModal.tsx`'s `handleAcquire` → `useSuscripcion.openModal(plan)`
(`src/hooks/portal/planes/useSuscripcion.ts`) → `SuscripcionModal.tsx`
(`src/components/portal/planes/SuscripcionModal.tsx`). The exact same hook/modal pair is
also used directly by `PlanesViewPage.tsx` for an authenticated athlete browsing plans
inside their own portal, and is reached from the public marketplace's booking-rejection
flow ("Ver planes de {tenant}" in `PublicTrainingReservaModal.tsx` for `SERVICIO_REQUERIDO`/
`UNIDADES_AGOTADAS`) — so a fix at the hook/modal level benefits every entry point
automatically.

Today, regardless of how many active subtypes (`plan_tipos` where `activo = true`) a plan
has:
- `useSuscripcion.openModal(plan)` (lines 57-65) always resets `selectedTipoId` to `null`.
- `SuscripcionModal`'s mount effect (lines 66-75) always does
  `setStep(hasSubtypes ? 1 : 2)`, where `hasSubtypes = activeTipos.length > 0` — so even a
  plan with exactly **one** active subtype still opens on step 1 (the subtype picker),
  forcing the user to click that single option, then click "Continuar", before ever
  reaching step 2 (the payment form). For a plan with exactly one option, this is a
  no-choice screen: clicking anything other than the one visible card isn't possible, yet
  it's still presented as a decision.
- Step 2 also renders a "Volver" (back) button whenever `hasSubtypes` is true (line 415),
  which would send the user back to a single-option picker that no longer serves any
  purpose once the fix below skips it.

Click count today for a single-subtype plan, from clicking "Adquirir" to reaching the
payment form: click the one subtype card (1) → click "Continuar" (2). With this story,
that becomes zero extra clicks — payment form appears immediately.

### Proposed Changes

- `useSuscripcion.openModal(plan)`: compute the plan's active subtypes using the existing
  `getActiveTipos(plan)` helper (`src/hooks/portal/planes/usePlanesView.ts`, already used by
  `SuscripcionModal` itself — reuse it here instead of duplicating the `plan_tipos.filter(t
  => t.activo)` logic a third time). If `activeTipos.length === 1`, call
  `setSelectedTipoId(activeTipos[0].id)` instead of `setSelectedTipoId(null)`. For 0 or
  more than 1 active subtypes, behavior is unchanged (`null`).
- `SuscripcionModal.tsx`: introduce `hasSubtypeChoice = activeTipos.length > 1` (an actual
  decision to make) alongside the existing `hasSubtypes = activeTipos.length > 0` (used
  only to know whether step 2 needs a subtype summary at all):
  - The mount effect becomes `setStep(hasSubtypeChoice ? 1 : 2)`.
  - Step 1's render guard becomes `step === 1 && hasSubtypeChoice`.
  - The step 2 "Volver" button's guard becomes `hasSubtypeChoice` (was `hasSubtypes`) — it
    no longer renders when there's only one (already auto-selected) subtype, since there's
    no meaningful picker screen to return to.
  - Step 2's plan/subtype summary (price, vigencia, servicios) is unchanged — it already
    reads from `selectedTipo`, which will now be populated automatically for the
    single-option case.
- No change to the 0-subtypes case (plan not acquirable, per existing
  `PlanPublicoCard` behavior) or the >1-subtypes case (picker still shown, unchanged).

---

## Database Changes

None. This is a pure client-side state/flow change — no new tables, columns, or RLS
policies.

---

## API / Server Actions

No new server actions. Existing functions change only their in-memory initial state:

- **File**: `src/hooks/portal/planes/useSuscripcion.ts`
  - **Function**: `openModal(plan: PlanWithDisciplinas): Promise<void>`
  - **Change**: uses `getActiveTipos(plan)` (imported from
    `src/hooks/portal/planes/usePlanesView.ts`) to auto-set `selectedTipoId` when there is
    exactly one active subtype, instead of always resetting to `null`.
  - **Auth/RLS**: unchanged — no new data access.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | `openModal` auto-selects the sole active `plan_tipo` via `getActiveTipos(plan)` when `activeTipos.length === 1` |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Add `hasSubtypeChoice = activeTipos.length > 1`; mount effect and step-1 render guard use it instead of `hasSubtypes`; "Volver" button (step 2) guarded by `hasSubtypeChoice` |

No new files, no migrations.

---

## Acceptance Criteria

1. Clicking "Adquirir" on a plan that has exactly one active `plan_tipo` opens
   `SuscripcionModal` directly on the payment step (step 2) — the subtype-picker step is
   never shown.
2. In that single-option case, the payment step's plan/subtype summary (price, vigencia,
   servicios) shows the auto-selected subtype's data immediately, with no picker
   interaction required first.
3. In that single-option case, the step 2 footer does **not** show a "Volver" button.
4. Submitting the payment form for a single-option plan creates the `suscripcion` with the
   correct `plan_tipo_id` (the auto-selected one) and the matching `pago.monto` — identical
   end-result data to today's manual-pick flow, just without the extra clicks.
5. A plan with **zero** active subtypes is unaffected: `PlanPublicoCard` still shows "Este
   plan no tiene opciones disponibles" and renders no "Adquirir" button (unchanged, no
   modal to open).
6. A plan with **two or more** active subtypes is unaffected: `SuscripcionModal` still
   opens on the subtype-picker step, requires an explicit selection, and shows "Continuar"
   /"Volver" exactly as it does today.
7. The behavior is identical across every entry point that reuses `useSuscripcion`/
   `SuscripcionModal`: the public marketplace catalog (`PlanesPublicosModal`), the
   booking-rejection "Ver planes de {tenant}" action (`PublicTrainingReservaModal`), and the
   authenticated athlete's own plans view (`PlanesViewPage`) — no entry-point-specific code
   changes are needed since the fix lives in the shared hook/modal.
8. Closing the modal (`Cancelar`/backdrop click) and reopening it for a different plan
   re-evaluates the subtype count fresh — no stale auto-selection carried over from a
   previous plan.

---

## Implementation Steps

- [ ] Update `useSuscripcion.ts`: import `getActiveTipos` from `usePlanesView.ts`; in
      `openModal`, auto-set `selectedTipoId` when `getActiveTipos(plan).length === 1`
- [ ] Update `SuscripcionModal.tsx`: add `hasSubtypeChoice`, use it for the mount effect's
      `setStep(...)`, the step-1 render guard, and the "Volver" button guard
- [ ] Manually test: plan with 1 active subtype (skips picker, correct summary shown, no
      Volver button, submit produces correct `plan_tipo_id`/`monto`)
- [ ] Manually test: plan with 0 active subtypes (no Adquirir button — unchanged)
- [ ] Manually test: plan with 2+ active subtypes (picker still shown — unchanged)
- [ ] Manually test the same single-subtype plan from both `PlanesPublicosModal` (public
      marketplace) and `PlanesViewPage` (authenticated athlete) to confirm shared behavior
- [ ] Manually test the booking-rejection "Ver planes de {tenant}" entry point
      (`PublicTrainingReservaModal`) with a single-subtype plan

---

## Non-Functional Requirements

- **Security**: No change — no new data access, same RLS-governed `createSuscripcion`/
  `createPago` calls as today.
- **Performance**: No additional queries — `getActiveTipos` is a pure in-memory filter
  already computed today inside `SuscripcionModal`; reusing it in `openModal` adds no cost.
- **Accessibility**: No regression — removing an unreachable/unnecessary picker step
  reduces the number of focus stops needed to complete the flow; the "Volver" button's
  conditional removal follows the same pattern already used for its guard.
- **Error handling**: Unchanged — `submit()`'s existing "Selecciona un subtipo de plan
  antes de continuar" guard remains as defense-in-depth (e.g., if a subtype is
  deactivated between opening the modal and submitting), but will not trigger in the normal
  single-option path since `selectedTipoId` is populated up front.
