## Context

This is a low-complexity, presentation-only change spanning multiple components (`Footer.tsx`, `Header.tsx`, `PortalHeader.tsx`, `PortalSidebar.tsx`, and five auth-screen components) that all reference the app logo or footer content. No new architectural pattern, external dependency, data model, or migration is introduced — it's cross-cutting only in the sense that the same static asset (`/logo-navbar.png`) is swapped in across several unrelated component trees (landing, auth, portal).

The one existing defect this change surfaces: `PortalSidebar.tsx` (`src/components/portal/PortalSidebar.tsx:20`) references `/logo2.png`, which does not exist in `public/`, so the sidebar currently renders a broken image icon. Unifying all logo references onto `/logo-navbar.png` fixes this as a side effect.

## Goals / Non-Goals

**Goals:**
- Replace the footer's placeholder brand mark with the real logo image and align its "Producto"/"Compañía" links with the actual redesigned landing section ids.
- Add WhatsApp and email contact actions to the footer, reusing the existing WhatsApp URL pattern (`buildWhatsappUrl` in `PricingSection.tsx`) rather than inventing a new one.
- Make `/logo-navbar.png` the single logo asset referenced anywhere in the app (landing header, portal header/sidebar, auth screens), removing the duplicate `public/landing/logo-navbar.png` and the broken `/logo2.png` reference.
- Resize any container that currently assumes a square (1:1) logo to the wide (4:1, 800×200) aspect ratio of the actual asset, so the image is never stretched or cropped.

**Non-Goals:**
- No changes to the footer's Newsletter column or bottom bar (copyright/Privacidad/Términos/Cookies) — out of scope per the User Story.
- No new icon library/dependency: WhatsApp and mail icons must reuse whatever icon approach (`material-symbols-outlined` or the icon already used in `HeroSection.tsx`/`PricingSection.tsx` for their WhatsApp CTAs) already exists in the codebase.
- No database, service, hook, or API changes — this is components + static assets only.
- No favicon change — only `public/logo-navbar.png` usage is in scope, not `src/app/favicon.ico`.

## Decisions

- **Single canonical asset path**: Use `/logo-navbar.png` (public root) everywhere, not `/landing/logo-navbar.png`. Rationale: the User Story explicitly names `public/logo-navbar.png` as canonical; the `/landing/` copy is a byte-identical duplicate (confirmed via `diff`) and keeping both risks future drift if only one gets updated.
- **Resize containers instead of cropping/stretching the image**: Since `logo-navbar.png` is 800×200 (4:1), every currently-square container (`h-8 w-8` in `PortalHeader.tsx`/`PortalSidebar.tsx`, `size-30` in `LoginBenefitsPanel.tsx`, similar in auth forms) is widened rather than using `object-cover` or forcing a square crop, to avoid visually mangling the wordmark. Alternative considered: keep containers square and use `object-contain` with letterboxing — rejected because it wastes space and looks unpolished next to a wordmark-style logo.
- **Reuse existing WhatsApp/email patterns rather than new components**: `PricingSection.tsx` already has `buildWhatsappUrl(message)` and `HeroSection.tsx` has `demoWhatsappUrl` using phone `573224399865`. The footer's WhatsApp link builds its URL the same way (`https://wa.me/573224399865?text=<encoded message>`), and its email link mirrors the existing `mailto:${contact.email}` pattern from `TenantContactCard.tsx`. Rationale: consistency and no new abstraction for a one-off need.
- **Footer nav links mirror `Header.tsx`'s nav, not a new independent list**: `Header.tsx` already defines the canonical mapping of nav labels to section ids (`#hero`, `#operacion`, `#solucion`, `#pricing`, `#footer`). The footer's "Producto"/"Compañía" columns reuse those same ids so the two never drift out of sync.
- **Delete the duplicate asset rather than keep it as a redirect/alias**: `public/landing/logo-navbar.png` is removed once `Header.tsx` is repointed, since Next.js serves `public/` files by exact path with no aliasing mechanism needed here, and keeping an unused duplicate file adds no value.

## Risks / Trade-offs

- [Risk] Removing the "GRIT Arena" text next to the icon in `PortalHeader.tsx` (if the new logo already contains a wordmark) could look different from the current header at a glance → Mitigation: verify visually in a running dev session before finalizing; if the wordmark isn't legible at portal-header scale, keep the adjacent text span.
- [Risk] Widening previously-square logo containers could shift adjacent layout (e.g., portal header's nav menu, auth form spacing) → Mitigation: task-by-task manual visual check on desktop and mobile widths per the User Story's acceptance criteria before considering the change complete.
- [Risk] Hardcoding the WhatsApp phone number and message text again in `Footer.tsx` duplicates the constant already in `PricingSection.tsx`/`HeroSection.tsx` → Mitigation: acceptable for this scope since extracting a shared constant/helper is not required by the User Story and would be scope creep; noted here in case a future change wants to consolidate into a shared `lib/whatsapp.ts` helper.

## Migration Plan

Not applicable — no database migration, no data backfill, no feature flag. Deploy is a normal front-end release: merge, build, deploy. Rollback is a standard revert of the commit/PR if a visual regression is found in production.
