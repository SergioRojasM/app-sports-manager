## 1. Setup

- [x] 1.1 Create a new branch named `feat/public-training-banner-url-and-fullscreen-view` off the current base branch
- [x] 1.2 Validate the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/{timestamp}_entrenamientos_publicos_banner_url_text.sql`: drop `entrenamientos_publicos_view`, `alter table entrenamientos_publicos alter column banner_url type text`, then recreate the view with the exact original definition from `20260724010000_entrenamientos_publicos_public_view.sql` (same columns, joins, `where ep.activo = true and ep.fecha_hora >= now()`), applying the `revoke all` → `grant select` idiom already established in `20260729000100_entrenamientos_publicos_restricciones_servicio.sql` so recreating the view doesn't leave `anon`/`authenticated` with the broader default-privilege grant
- [x] 2.2 Apply the migration to the **local** Supabase instance only via `supabase db reset --local` (never push to the remote/hosted project as part of this change)
- [x] 2.3 Verify locally: `entrenamientos_publicos.banner_url` is `text` with no length modifier; `entrenamientos_publicos_view` returns the same 21 columns as before (only `banner_url`'s type changed) with `anon`/`authenticated` scoped to `SELECT` only

## 3. Component: Fullscreen Banner Modal

- [x] 3.1 Create `src/components/portal/entrenamientos-publicos/PublicTrainingBannerModal.tsx`: fixed-overlay modal with backdrop, fade-in transition, `Escape`-to-close listener, and a labeled close button, modeled on the existing pattern in `src/components/portal/formularios/FormularioPreviewModal.tsx`
- [x] 3.2 Props: `open: boolean`, `bannerUrl: string`, `alt: string`, `onClose: () => void`; render the image at full size within the modal (no zoom/pan/gallery — single static image)
- [x] 3.3 Ensure the close button has an `aria-label` and is keyboard-focusable

## 4. Component: "Ver" Button on Public Training Card

- [x] 4.1 In `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx`, add local `useState` for the banner-modal open/closed state
- [x] 4.2 Add a "Ver" icon button overlaid on the banner area, rendered only when `data.bannerUrl` is non-null; `onClick` stops propagation and opens the modal (must not trigger `onReservar`)
- [x] 4.3 Render `PublicTrainingBannerModal` from within `PublicTrainingCard`, wired to the local state and `data.bannerUrl`/`data.nombre`
- [x] 4.4 Confirm no changes are needed to `PublicTrainingsGrid.tsx`, `EntrenamientosPublicosPage.tsx`, `PublicEntrenamientosLandingPage.tsx`, or `PublicarEntrenamientoModal.tsx` — all three consumers should pick up the button automatically

## 5. Barrel Export

- [x] 5.1 Check `src/components/portal/entrenamientos-publicos/index.ts`; if it re-exports sibling components, add the export for `PublicTrainingBannerModal`

## 6. Manual Verification

- [x] 6.1 Publish a training with a banner upload and confirm no "value too long" error occurs on save — verified by inserting an `entrenamientos_publicos` row with a 542-character `banner_url` directly (local DB had no seed data for a full UI publish flow); insert succeeded and the value round-trips through `entrenamientos_publicos_view` unchanged
- [x] 6.2 As a logged-in user, open `/portal/entrenamientos-publicos`, click "Ver" on a card with a banner, confirm the fullscreen modal opens and displays the image — not run against a live authenticated session (would require a full signup/login flow with no seed users); covered instead by code review: `/portal/entrenamientos-publicos` renders the exact same `PublicTrainingCard`/`PublicTrainingsGrid` components verified live in 6.3, with no per-surface wiring (design.md Decision 3)
- [x] 6.3 Logged out, open `/entrenamientos-publicos`, repeat the same "Ver" check with no session — verified live with Playwright against the local dev server: card renders with "Ver" button, click opens the fullscreen modal showing the banner image, no console errors
- [x] 6.4 Confirm the modal closes via close button, backdrop click, and `Escape` — all three verified live with Playwright (each reopened and closed independently)
- [x] 6.5 Confirm a card with no banner shows no "Ver" button and the existing placeholder icon still renders — verified live: seeded a second training with `banner_url = null`; exactly one "Ver" button rendered across both cards (only on the banner card) and the placeholder icon rendered on the other
- [x] 6.6 Confirm clicking "Ver" never opens the "Reservar"/booking flow — verified by code review (`stopPropagation` + separate `onClick` handler; `onReservar` is never referenced by the "Ver" button) and empirically: the "Reservar" button/booking modal never appeared during the Playwright runs
- [x] 6.7 Open `PublicarEntrenamientoModal`'s live preview (admin publish flow) and confirm the preview card also shows a working "Ver" button with no regressions to the rest of the modal — not run against a live admin session (same auth-flow constraint as 6.2); covered by code review: the preview renders the same `PublicTrainingCard` with `bannerUrl` sourced from `bannerPreviewUrl ?? existingBannerUrl` (`PublicarEntrenamientoModal.tsx:79`), which is a non-empty string whenever a banner exists, so the "Ver" button's `data.bannerUrl` gate is satisfied identically

**Note:** local DB had no seed data (no tenants/usuarios), so the fully-authenticated paths (6.2, 6.7) were verified by code review rather than a live browser session; 6.1, 6.3–6.6 were verified live via a seeded row + headless Chromium (Playwright) against the local dev server. Test rows and the local DB were reset to a clean state afterward (`supabase db reset --local`).

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: add `PublicTrainingBannerModal.tsx` to the `entrenamientos-publicos/` feature-slice component listing under `components/portal/`

## 8. Finalize

- [ ] 8.1 Run type check, lint, and tests; fix any failures (do not run a production build)
- [ ] 8.2 Write the commit message summarizing the migration + fullscreen viewer change
- [ ] 8.3 Write the pull request description (summary, test plan referencing section 6's manual checks)
