## Why

The landing page footer still renders a placeholder text-only brand mark, links to dead `href="#"` anchors that don't match the redesigned landing sections, and offers no direct WhatsApp/email contact action — even though this exact WhatsApp pattern already exists elsewhere on the landing (Hero, Pricing). Separately, the app's logo usage is inconsistent and partially broken: the portal sidebar references `/logo2.png`, a file that does not exist in `public/`, so it currently renders a broken image. This change aligns the footer with the new landing design and unifies every logo reference in the app to the single canonical `public/logo-navbar.png` asset (US-0082).

## What Changes

- Replace the footer's icon+text brand mark with the real `/logo-navbar.png` image.
- Fix the footer's "Producto" and "Compañía" column links to point to real landing section anchors (`#hero`, `#operacion`, `#solucion`, `#pricing`) instead of `href="#"`.
- Replace the footer's 3 generic placeholder social icons with two concrete contact actions: a WhatsApp link (`https://wa.me/573224399865` with a pre-filled message) and a `mailto:contacto@grit-arena.com` email link.
- Update every remaining app logo reference (`Header.tsx`, `PortalHeader.tsx`, `PortalSidebar.tsx`, and all auth screens) to use `/logo-navbar.png`, resizing square containers to the logo's wide (4:1) aspect ratio to avoid distortion/cropping. **Fixes a live bug**: `PortalSidebar.tsx`'s reference to the non-existent `/logo2.png`.
- Remove the redundant duplicate asset `public/landing/logo-navbar.png` once `Header.tsx` points at the root asset.
- **BREAKING** (visual only, no API/data contract impact): the footer's social row no longer shows the 3 previous placeholder icons; visual layout of logo containers in portal header/sidebar and auth screens changes from square to wide rectangle.

## Capabilities

### New Capabilities
- `landing-footer`: Footer branding (logo), section navigation links, and contact actions (WhatsApp, email) on the public landing page.
- `app-branding`: Unified logo asset (`/logo-navbar.png`) used consistently across landing header, auth screens, and portal header/sidebar.

### Modified Capabilities
None — no existing spec files cover landing footer content or app-wide logo/branding; both are net-new capabilities.

## Impact

- **Affected code**: `src/components/landing/Footer.tsx`, `src/components/landing/Header.tsx`, `src/components/portal/PortalHeader.tsx`, `src/components/portal/PortalSidebar.tsx`, `src/components/auth/LoginForm.tsx`, `src/components/auth/SignupForm.tsx`, `src/components/auth/ForgotPasswordForm.tsx`, `src/components/auth/UpdatePasswordForm.tsx`, `src/components/auth/LoginBenefitsPanel.tsx`.
- **Affected assets**: `public/logo-navbar.png` (canonical, already present), `public/landing/logo-navbar.png` (to be deleted).
- **No API, database, hook, or service changes** — purely presentational/static-asset.
- **Dependencies**: None new; reuses the existing WhatsApp URL pattern already present in `HeroSection.tsx`/`PricingSection.tsx` and the existing `mailto:` pattern in `TenantContactCard.tsx`.
