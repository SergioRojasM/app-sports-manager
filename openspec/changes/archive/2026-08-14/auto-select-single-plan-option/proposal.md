## Why

Acquiring a plan that only has one active subtype (`plan_tipos`) still forces the user
through a subtype-picker screen that offers no real choice — click the one visible card,
then click "Continuar" — before ever reaching the payment form. This is dead-weight
friction reused across every plan-acquisition entry point in the app (public marketplace,
booking-rejection "Ver planes", and the authenticated athlete's own plans view), since they
all share the same `useSuscripcion`/`SuscripcionModal` chain. (Source: US-0105,
`projectspec/userstory/us0105-auto-select-single-plan-option.md`)

## What Changes

- `useSuscripcion.openModal(plan)` auto-selects the plan's sole active subtype (via the
  existing `getActiveTipos(plan)` helper) instead of always resetting `selectedTipoId` to
  `null`.
- `SuscripcionModal` skips its Step 1 subtype-picker screen and opens directly on Step 2
  (payment) whenever a plan has exactly one active subtype — introducing
  `hasSubtypeChoice = activeTipos.length > 1` alongside the existing `hasSubtypes =
  activeTipos.length > 0`.
- The Step 2 "Volver" button no longer renders in the single-subtype case, since there is
  no picker screen to return to.
- No change for plans with 0 active subtypes (still not acquirable, unchanged) or 2+ active
  subtypes (picker still shown, unchanged).

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `subscription-management`: the "Subscription modal presents a subtype selection step
  before payment" requirement changes — Step 1 is now conditional on there being more than
  one active subtype, not merely one-or-more; and "useSuscripcion hook tracks selected
  subtype" changes — the hook now auto-populates `selectedTipoId` on open when exactly one
  active subtype exists.

## Impact

- **Affected code**: `src/hooks/portal/planes/useSuscripcion.ts`,
  `src/components/portal/planes/SuscripcionModal.tsx`.
- **No new files, no database/API impact**: no migrations, no new server actions — the
  existing `createSuscripcion`/`createPago` calls and their inputs are unchanged; only the
  client-side initial state and step-gating logic change.
- **No RLS/security impact**: no new data access.
- **Shared-component reuse**: because `useSuscripcion`/`SuscripcionModal` are shared by
  `PlanesPublicosModal` (public marketplace), `PublicTrainingReservaModal`'s "Ver planes de
  {tenant}" booking-rejection action, and `PlanesViewPage` (authenticated athlete's own
  plans), this fix applies to all three entry points without touching any of them
  individually.

## Non-Goals

- No change to plans with zero or multiple (2+) active subtypes — both cases keep today's
  exact behavior.
- No change to the underlying eligibility/subscription-creation logic
  (`createSuscripcion`/`createPago`, duplicate-subscription check, payment-method fetch) —
  only when the subtype-picker step is shown.
- No change to `PlanPublicoCard`'s own `<details>` disclosure (already outside the click
  path to "Adquirir" — confirmed not to gate the button).

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | `openModal` auto-selects the sole active `plan_tipo` via `getActiveTipos(plan)` when there is exactly one |
| Component | `src/components/portal/planes/SuscripcionModal.tsx` | Add `hasSubtypeChoice = activeTipos.length > 1`; mount effect and Step 1 render guard use it; "Volver" button (Step 2) guarded by it |

## Implementation Plan (step-by-step)

1. Update `useSuscripcion.ts`: import `getActiveTipos` from `usePlanesView.ts`; in
   `openModal`, compute `activeTipos = getActiveTipos(plan)` and set
   `selectedTipoId = activeTipos.length === 1 ? activeTipos[0].id : null`.
2. Update `SuscripcionModal.tsx`: add `hasSubtypeChoice = activeTipos.length > 1`; change
   the mount effect's `setStep(hasSubtypes ? 1 : 2)` to `setStep(hasSubtypeChoice ? 1 : 2)`;
   change Step 1's render guard from `step === 1 && hasSubtypes` to `step === 1 &&
   hasSubtypeChoice`; change the Step 2 "Volver" button's guard from `hasSubtypes` to
   `hasSubtypeChoice`.
3. Manual verification across all three entry points and all three subtype-count cases (0,
   1, 2+) — see US-0105's Implementation Steps for the full manual test matrix.
