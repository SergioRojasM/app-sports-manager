# US-0088 — Reusable Confirm/Alert Dialog Component

## ID
US-0088

## Name
Introduce a Shared, On-Brand Confirm/Alert Dialog and Retire Native `window.confirm`/`window.alert` Calls

## As a
Any user of the portal (administrador, entrenador, atleta) interacting with a destructive or important confirmation action

## I Want
Confirmation and alert prompts (e.g. "¿Confirmas la eliminación...?") to look and behave like the rest of the app — themed, keyboard-accessible, non-blocking to styling — instead of the browser's native `window.confirm`/`window.alert` popup

## So That
The product feels consistent and polished at every decision point, and future features get a single, correct-by-default building block instead of every screen hand-rolling its own confirmation modal (with divergent styling, focus handling, and escape-key support)

---

## Description

### Current State

There is **no shared Alert/Confirm component anywhere in the codebase** today (verified by searching `src/components/ui/` — referenced in `projectspec/03-project-structure.md`'s directory tree as `└── ui/` but the directory does not actually exist yet — and `src/components/portal/` for any `Alert`/`Confirm`/`Dialog` component; none exists). Two different, uncoordinated patterns currently do this job:

1. **Native `window.confirm` / `window.alert`** — used directly in **9 files, 11 call sites**:
   - `src/components/portal/entrenamientos/PlantillasListModal.tsx:58`
   - `src/components/portal/servicios/ServiciosPage.tsx:72`
   - `src/components/portal/formularios/FormulariosPage.tsx:77,86`
   - `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx:219,230` (confirm) and `:428` (`window.alert`, CSV export error)
   - `src/hooks/portal/planes/usePlanes.ts:206`
   - `src/hooks/portal/scenarios/useScenarios.ts:209`
   - `src/hooks/portal/entrenamientos/useEntrenamientos.ts:949`
   - `src/hooks/portal/disciplines/useDisciplines.ts:161`

   These render the browser's own unstyled dialog — no design control, no async loading state while the underlying delete is in flight, blocks the JS main thread while open (React state updates queued behind it), and cannot show a richer message (e.g. an item name in bold, a secondary warning line).

2. **One-off custom "confirm delete" modals** — at least **36 files** match `*Modal*` under `src/components/portal/` that implement their own `<div role="dialog">` markup from scratch, with **inconsistent visual treatment for the same "danger" action**. Two representative examples, read directly:
   - `src/components/portal/gestion-equipo/EliminarMiembroModal.tsx`: opaque `bg-navy-deep` panel, a centered rose icon badge (`bg-rose-500/15` + `person_remove` icon), solid `bg-rose-500` confirm button, **no Escape-key handling, no focus trap**.
   - `src/components/portal/gestion-suscripciones/EliminarSuscripcionModal.tsx`: translucent `glass` panel (no icon), an **outlined** rose confirm button (`border-rose-400/40 bg-rose-900/20`), inline error block, **with** Escape-key handling and initial focus — a materially different look and interaction model for the exact same kind of action ("delete, are you sure?").

   This US does not attempt to migrate all 36 one-off modals (that is a large, separate cleanup effort — see Out of Scope), but it does retire the **native browser dialogs** (bounded, fully enumerated above) and migrates the **two representative examples** above to the new shared component as a concrete adoption pattern for the rest to follow later.

### Proposed Changes

#### 1. New shared UI primitive — `src/components/ui/`
This is the **first file in `src/components/ui/`** — the directory is already reserved in the project's documented structure but has never been populated.

- **`ConfirmDialog.tsx`** — a presentational, controlled dialog component. Props:
  - `open: boolean`
  - `tone?: 'danger' | 'warning' | 'info'` (default `'info'`) — drives the icon badge color, icon glyph, and confirm-button color per the token table below.
  - `title: string`
  - `description?: React.ReactNode` — the body message; supports bold item names via normal JSX (e.g. `<>¿Eliminar a <strong>{nombre}</strong>?</>`).
  - `confirmLabel?: string` (default `'Confirmar'`)
  - `cancelLabel?: string` — **when omitted, the dialog renders in "alert" mode**: a single button (the confirm button, doubling as "Aceptar") and no cancel/backdrop-dismiss, replacing `window.alert`. When provided, it renders in "confirm" mode with both buttons.
  - `isConfirming?: boolean` (default `false`) — disables both buttons and shows a loading label (`"{confirmLabel}…"` pattern, matching existing modals) on the confirm button while an async `onConfirm` is in flight.
  - `error?: string | null` — optional inline error block (rose, matching `EliminarSuscripcionModal`'s existing treatment) shown above the actions, for when confirming fails and the dialog should stay open.
  - `onConfirm: () => void`
  - `onClose: () => void` — called on Cancel click, Escape key (alert mode: also on Escape, since there's no cancel action to distinguish), or backdrop click (confirm mode only — alert mode does not dismiss on backdrop click, matching `window.alert`'s modal-until-acknowledged behavior).
  - Behavior parity with the more complete existing example (`EliminarSuscripcionModal.tsx`): focus is moved to the dialog on open, `Escape` closes it (unless `isConfirming`), backdrop click closes it (confirm mode only), `role="dialog"` + `aria-modal="true"` + `aria-label={title}`.
  - Visual container (standardized pick, since existing modals disagree — see Non-Functional Requirements → flagged decision): `rounded-xl border border-portal-border bg-navy-medium p-6 shadow-2xl`, matching `ReservaFormModal`/`FormularioRespuestaModal` (this session's most recent modals), not the `glass` or opaque `bg-navy-deep` variants.

  **Tone token table**:

  | Tone | Icon badge | Icon glyph | Confirm button |
  |---|---|---|---|
  | `danger` | `bg-rose-500/15` / `text-rose-400` | `delete` (or a `icon` prop override) | `bg-rose-500 hover:bg-rose-600 text-white` |
  | `warning` | `bg-amber-500/15` / `text-amber-400` | `warning` | `bg-amber-500 hover:bg-amber-400 text-navy-deep` |
  | `info` | `bg-turquoise/15` / `text-turquoise` | `info` | `bg-turquoise hover:bg-turquoise/90 text-navy-deep` |

  The icon glyph is overridable via an optional `icon?: string` prop (Material Symbols name) for cases like `person_remove` (team removal) vs the tone's default.

- **`ConfirmDialogProvider.tsx`** — a client component holding the "currently pending request" state (at most one at a time) and rendering a single `<ConfirmDialog>` instance. Exposes a React context with an imperative API.

#### 2. New hook — `src/hooks/ui/useConfirmDialog.ts`
`useConfirmDialog()` reads the context from `ConfirmDialogProvider` and returns:
```ts
{
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  alertUser: (options: Omit<ConfirmDialogOptions, 'cancelLabel'>) => Promise<void>;
}
```
Where `ConfirmDialogOptions` mirrors `ConfirmDialog`'s props minus the imperative/state ones (`open`, `onConfirm`, `onClose`, `isConfirming`, `error`). `confirm(...)` resolves `true` when the user clicks confirm, `false` on cancel/Escape/backdrop-dismiss — a drop-in async replacement for `window.confirm(message): boolean`, just `await`ed instead of synchronous. `alertUser(...)` resolves once the single button is clicked — a drop-in async replacement for `window.alert(message)`.

This hook can be called from **either** a component or another hook (it's just a hook calling a hook, valid per the Rules of Hooks) — so the four affected files under `src/hooks/portal/` migrate with the same one-line pattern as the components do.

#### 3. Mount point
`ConfirmDialogProvider` wraps `{children}` in `src/app/portal/layout.tsx` (the shared portal shell, already the mount point for `PortalHeader`/`PortalNavMenu`), so `useConfirmDialog()` is available anywhere under `/portal/**` without per-page wiring.

#### 4. Migrate every native `window.confirm`/`window.alert` call site
All 9 files / 11 call sites enumerated in **Current State** are updated to call `const ok = await confirm({ title, description, tone: 'danger' | 'warning' | 'info' }); if (!ok) return;` (or `await alertUser({...})` for the one `window.alert` in `ReservasPanel.tsx:428`) instead of the native dialog. No behavioral change to *what* gets confirmed or *when* — only *how* the prompt is rendered.

#### 5. Migrate two representative one-off modals (proof of adoption)
- `EliminarMiembroModal.tsx` and `EliminarSuscripcionModal.tsx` are rewritten to render `<ConfirmDialog tone="danger" ... />` instead of their own hand-rolled markup, preserving their existing props/behavior (async `onConfirm`, `isSubmitting` → `isConfirming`, existing copy). This demonstrates the pattern other one-off modals should follow in a future cleanup (see Out of Scope) without this US having to touch all 36.

#### Out of Scope
- Migrating the remaining ~34 one-off custom modals to `ConfirmDialog` (tracked as a future cleanup story once this component has proven itself in production).
- A generic Toast/notification system for non-blocking success messages — this US only covers blocking confirm/alert prompts.
- Any change to the actual delete/confirm business logic in the 9 migrated call sites — this is a presentation-layer swap only.

---

## Database Changes
None — this is a frontend-only change. No new tables, columns, or RLS policies.

---

## API / Server Actions
None — no new service functions or Supabase calls. `ConfirmDialog`/`useConfirmDialog` are pure UI/state, consistent with `components/ui/` and `hooks/ui/` sitting outside the `components → hooks → service → supabase` data-flow layers (there is no data access here).

---

## Files to Create or Modify

| Area | File | Change |
|---|---|---|
| Component | `src/components/ui/ConfirmDialog.tsx` | **New** — presentational dialog, tone-driven styling, confirm/alert modes, focus/Escape/backdrop handling (see Proposed Changes §1) |
| Component | `src/components/ui/ConfirmDialogProvider.tsx` | **New** — holds pending-request state, renders `ConfirmDialog`, provides the context |
| Hook | `src/hooks/ui/useConfirmDialog.ts` | **New** — `confirm()` / `alertUser()` imperative API described in §2 |
| Layout | `src/app/portal/layout.tsx` | Wrap `{children}` in `<ConfirmDialogProvider>` |
| Component | `src/components/portal/entrenamientos/PlantillasListModal.tsx` | Replace `window.confirm` (line 58) with `await confirm({...})` |
| Component | `src/components/portal/servicios/ServiciosPage.tsx` | Replace `window.confirm` (line 72) with `await confirm({...})` |
| Component | `src/components/portal/formularios/FormulariosPage.tsx` | Replace both `window.confirm` calls (lines 77, 86 — the delete confirm and the "in use, delete anyway" follow-up from US-0087) with `await confirm({...})` |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Replace both `window.confirm` calls (lines 219, 230) with `await confirm({...})`; replace `window.alert` (line 428) with `await alertUser({...})` |
| Hook | `src/hooks/portal/planes/usePlanes.ts` | Replace `window.confirm` (line 206) with `useConfirmDialog()`'s `confirm(...)` |
| Hook | `src/hooks/portal/scenarios/useScenarios.ts` | Replace `window.confirm` (line 209) with `confirm(...)` |
| Hook | `src/hooks/portal/entrenamientos/useEntrenamientos.ts` | Replace `window.confirm` (line 949) with `confirm(...)` |
| Hook | `src/hooks/portal/disciplines/useDisciplines.ts` | Replace `window.confirm` (line 161) with `confirm(...)` |
| Component | `src/components/portal/gestion-equipo/EliminarMiembroModal.tsx` | Rewrite to render `<ConfirmDialog tone="danger" icon="person_remove" .../>` instead of hand-rolled markup |
| Component | `src/components/portal/gestion-suscripciones/EliminarSuscripcionModal.tsx` | Rewrite to render `<ConfirmDialog tone="danger" .../>` instead of hand-rolled markup |
| Docs | `projectspec/03-project-structure.md` | Populate the previously-empty `└── ui/` entry with `ConfirmDialog.tsx`, `ConfirmDialogProvider.tsx`; add a `hooks/ui/` entry for `useConfirmDialog.ts` |

---

## Acceptance Criteria

1. `src/components/ui/ConfirmDialog.tsx` exists and renders with `tone="danger"|"warning"|"info"` producing the icon/button colors in the token table; an unrecognized/omitted tone defaults to `info`.
2. When `cancelLabel` is omitted, `ConfirmDialog` renders exactly one button (confirm/"Aceptar") and does not close on backdrop click; when provided, it renders both Cancel and Confirm, and closes on backdrop click.
3. Pressing `Escape` calls `onClose` in both modes, unless `isConfirming` is `true`, in which case it is a no-op.
4. `isConfirming={true}` disables both buttons and shows a loading label on the confirm button; the dialog does not close itself — the caller decides when to close it after the async action settles.
5. Passing a non-null `error` string renders an inline rose error block above the action row without closing the dialog.
6. `useConfirmDialog()`'s `confirm(options)` returns a `Promise<boolean>` that resolves `true` on confirm click and `false` on cancel/Escape/backdrop-dismiss; only one confirm/alert can be pending at a time (a second call while one is open replaces it, matching the fact that `window.confirm` is also inherently single-instance).
7. `useConfirmDialog()`'s `alertUser(options)` returns a `Promise<void>` that resolves when the single button is clicked or Escape is pressed.
8. Calling `useConfirmDialog()` from inside a plain hook (e.g. `usePlanes.ts`) works with no React "hooks called conditionally" warnings, since it's called unconditionally at that hook's top level.
9. All 11 native `window.confirm`/`window.alert` call sites listed in Current State are replaced; grepping the codebase for `window.confirm` and `window.alert` returns zero results in `src/`.
10. Each migrated call site preserves its exact original copy/wording and destructive-action semantics (e.g. cancelling still aborts the delete/cancellation exactly as before) — verified by manual test of each of the 9 flows (delete plantilla, delete plantilla "in use" force-delete, delete servicio, cancel reserva, delete reserva, CSV export error alert, delete plan, delete scenario, delete training series, delete discipline).
11. `EliminarMiembroModal.tsx` and `EliminarSuscripcionModal.tsx` render visually via `ConfirmDialog` (same copy, same async confirm behavior) and both now share identical container styling, icon treatment, and Escape/focus handling — verified by comparing their rendered output side by side.
12. No existing menu item, route, or admin/booking page regresses — verified by exercising all 9 migrated confirm/alert flows plus the two migrated one-off modals.

---

## Implementation Steps

- [ ] Build `ConfirmDialog.tsx` (tones, confirm/alert modes, focus/Escape/backdrop handling, `isConfirming`/`error` states)
- [ ] Build `ConfirmDialogProvider.tsx` + the context
- [ ] Build `useConfirmDialog.ts` (`confirm`/`alertUser`)
- [ ] Wrap `src/app/portal/layout.tsx` with `ConfirmDialogProvider`
- [ ] Migrate all 9 files / 11 native `window.confirm`/`window.alert` call sites
- [ ] Migrate `EliminarMiembroModal.tsx` and `EliminarSuscripcionModal.tsx` to `ConfirmDialog`
- [ ] Update `projectspec/03-project-structure.md`'s `ui/` and hooks listings
- [ ] Test manually: each of the 9 migrated flows end-to-end (confirm path + cancel path), the `alertUser` CSV-export-error path, keyboard-only operation (Tab, Escape) on at least one confirm and the one alert-mode dialog, and the two migrated one-off modals visually
- [ ] Confirm no regressions in sibling pages touched by the migrated hooks (`gestion-planes`, `gestion-disciplinas`, `gestion-escenarios`, `gestion-entrenamientos`, `gestion-equipo`, `gestion-suscripciones`, `gestion-servicios`, `gestion-formularios`, `gestion-reservas`)

---

## Non-Functional Requirements

- **Security**: None — no data access, no RLS surface.
- **Performance**: Single provider instance mounted once at the portal layout; negligible re-render cost since only one dialog can be pending at a time.
- **Accessibility**: `role="dialog"`, `aria-modal="true"`, `aria-label` set to `title`; initial focus moves into the dialog on open; full keyboard operability (Tab cycles between visible buttons, Escape closes per the rules in AC 3); color contrast for all three tones checked against `navy-medium`/`navy-deep` backgrounds.
- **Error handling**: The `error` prop is the only error-surfacing mechanism — callers that need to show a failed-confirm message keep the dialog open (don't call `onClose`) and pass the message into `error`, mirroring `EliminarSuscripcionModal`'s existing inline-error pattern.
- **Flagged design decision**: the container style (`bg-navy-medium` + `border-portal-border`, not `glass` or opaque `bg-navy-deep`) is a judgment call given today's inconsistency across existing modals — flag for design review if a different canonical style is preferred before broadly adopting this component in the future one-off-modal cleanup.
