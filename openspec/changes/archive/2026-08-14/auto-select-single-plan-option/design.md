## Context

Every plan-acquisition entry point (`PlanesPublicosModal` on the public marketplace,
`PublicTrainingReservaModal`'s "Ver planes de {tenant}" booking-rejection action, and the
authenticated athlete's own `PlanesViewPage`) funnels through the same
`useSuscripcion`/`SuscripcionModal` pair. Today that pair always shows a Step 1
subtype-picker whenever a plan has one or more active `plan_tipos`
(`hasSubtypes = activeTipos.length > 0`), even when there is only one card to click —
forcing a no-op decision before the user can reach the payment form (Step 2).

This is a small, localized change confined to two files already read in full:
`src/hooks/portal/planes/useSuscripcion.ts` and
`src/components/portal/planes/SuscripcionModal.tsx`. No new architecture, dependency, or
data model is introduced.

## Goals / Non-Goals

**Goals:**
- Skip Step 1 entirely, with the sole active subtype pre-selected, whenever a plan has
  exactly one active `plan_tipo`.
- Apply this uniformly across all three entry points by fixing only the shared
  hook/modal — no entry-point-specific code.
- Leave the 0-subtype (not acquirable) and 2+-subtype (picker shown) cases byte-for-byte
  unchanged.

**Non-Goals:**
- No change to subscription/payment creation logic (`createSuscripcion`, `createPago`,
  duplicate-check, payment-method fetch).
- No change to `PlanPublicoCard`'s `<details>` disclosure or its "Adquirir" button — both
  already sit outside the friction path being fixed here (confirmed by direct code read:
  "Adquirir" renders unconditionally outside the `<details>`, so expand/collapse never
  gates the click).
- No attempt to reconcile this proposal with the wider staleness already present in the
  `subscription-management` spec (e.g. its lingering `clases_incluidas`/`clases_plan`
  references from an earlier schema iteration, now superseded by the servicio-unit model)
  beyond the one requirement this change directly touches.

## Decisions

### 1. Replace "has any subtypes" with "has a real choice between subtypes"

**Decision**: replace `SuscripcionModal.tsx`'s existing `hasSubtypes = activeTipos.length >
0` with `hasSubtypeChoice = activeTipos.length > 1`, gating the mount-time `setStep(...)`,
the Step 1 render guard, and the "Volver" button. Once all three of `hasSubtypes`'s call
sites moved to the `> 1` check, it turned out to have no remaining use elsewhere in the
component (Step 2's subtype summary already reads `selectedTipo` directly, not gated by a
subtype-count flag) — so it was removed rather than kept alongside the new flag, avoiding
an unused variable.

**Alternatives considered**: keeping both `hasSubtypes` (`> 0`) and `hasSubtypeChoice`
(`> 1`) side by side, on the assumption `hasSubtypes` was still needed elsewhere —
this was the original plan, but a check of every remaining reference after migrating the
three call sites showed none survived, so keeping it would have just been dead code
flagged by lint (`@typescript-eslint/no-unused-vars`).

### 2. Auto-selection lives in `useSuscripcion.openModal`, not in `SuscripcionModal`

**Decision**: the single active subtype is auto-selected where `selectedTipoId` state
already lives — inside `useSuscripcion.openModal(plan)` — reusing the existing
`getActiveTipos(plan)` helper from `usePlanesView.ts` (already the canonical
active-subtype computation, already used by `SuscripcionModal` itself for display). This
keeps `SuscripcionModal` a pure function of props it's handed, rather than adding a second
place that decides what to select.

**Alternatives considered**: computing the auto-selection inside `SuscripcionModal`'s
mount effect instead — rejected because `selectedTipoId` is owned and mutated by
`useSuscripcion` (`selectTipo`, `submit`), and `SuscripcionModal` only reads it via props;
setting it from inside the modal would require threading a setter down that doesn't
otherwise exist, when `openModal` already has direct access to the state setter.

## Risks / Trade-offs

- **[Risk]** If a plan transitions from 1 to 2+ active subtypes (or vice versa) via
  another browser tab/admin action while the modal is already open, the auto-selection
  computed at `openModal` time could go stale. → **Mitigation**: none needed beyond what
  already exists — `submit()`'s existing "Selecciona un subtipo de plan antes de
  continuar" / "El subtipo seleccionado ya no está disponible" guards remain untouched as
  defense-in-depth, and this race already existed identically before this change for the
  2+-subtype picker case.
- **[Trade-off]** `hasSubtypeChoice`'s `> 1` threshold (vs. the removed `> 0`) is a subtle
  distinction for a future reader who only sees the final name — mitigated by a one-line
  comment above its declaration explaining why "more than one" is the relevant threshold.

## Migration Plan

No database migration — pure client-side logic change. Deploy as a normal code release;
rollback is a plain revert with no data implications, since no records or schemas are
touched.
