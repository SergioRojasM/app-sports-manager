# US-0082 — Update Landing Footer Branding/Links and Unify App Logo

## ID
US-0082

## Name
Update Landing Footer Branding, Contact Links and Unify the App Logo Across the Application

## As a
GRIT Arena landing visitor and platform user

## I Want
The landing page footer to use the real brand logo, link to the correct sections of the redesigned landing page, and offer direct WhatsApp and email contact actions; and the entire application (landing, auth screens, and portal) to consistently use the `logo-navbar.png` brand asset

## So That
The brand identity is consistent across every touchpoint of the product, dead/placeholder links are removed, and visitors have a low-friction way to reach out for more information

---

## Description

### Current State

**Footer** (`src/components/landing/Footer.tsx`)
- The brand column renders a text-only mark (a small icon + "GRIT Arena" text, [Footer.tsx:6-14](src/components/landing/Footer.tsx#L6-L14)) instead of the actual logo image used elsewhere on the landing page.
- The "Producto" and "Compañía" columns link to placeholder `href="#"` anchors ([Footer.tsx:46-83](src/components/landing/Footer.tsx#L46-L83)) that do not match the current landing sections. The redesigned landing (`src/app/page.tsx`) exposes these section ids: `#hero`, `#solucion` ([ProblemSolutionSection.tsx:33](src/components/landing/ProblemSolutionSection.tsx#L33)), `#operacion` ([OperationSection.tsx:52](src/components/landing/operation/OperationSection.tsx#L52)), `#administracion` ([AdministrationSection.tsx:59](src/components/landing/administration/AdministrationSection.tsx#L59)), `#pricing` ([PricingSection.tsx:92](src/components/landing/PricingSection.tsx#L92)), `#footer`. The header nav (`src/components/landing/Header.tsx`) already maps labels to these ids and should be mirrored.
- The social row ([Footer.tsx:20-39](src/components/landing/Footer.tsx#L20-L39)) has 3 generic placeholder icons (`public`, `video_library`, `alternate_email`) that link nowhere and don't represent real channels.
- There is no WhatsApp or email contact action in the footer, even though this exact pattern already exists elsewhere in the landing: `demoWhatsappUrl` in [HeroSection.tsx:4-5](src/components/landing/HeroSection.tsx#L4-L5) and the `buildWhatsappUrl` helper in [PricingSection.tsx:5-8](src/components/landing/PricingSection.tsx#L5-L8), both using phone `573224399865`.

**App logo usage** — inconsistent across the codebase:
- Landing header uses `/landing/logo-navbar.png` ([Header.tsx:19](src/components/landing/Header.tsx#L19)) — this file is byte-identical to the new `public/logo-navbar.png` (verified via diff), so it's a redundant duplicate.
- Portal header uses `/icono_2.png` ([PortalHeader.tsx:22](src/components/portal/PortalHeader.tsx#L22)), a square 753×731 icon, in an 8×8 container.
- Portal sidebar references `/logo2.png` ([PortalSidebar.tsx:20](src/components/portal/PortalSidebar.tsx#L20)) — **this file does not exist in `public/`**, so the sidebar currently renders a broken image.
- Auth screens all use `/icono_2.png` in square containers: `LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `UpdatePasswordForm.tsx` (each ~40×40px), and `LoginBenefitsPanel.tsx` (`size-30` square, [LoginBenefitsPanel.tsx:10-17](src/components/auth/LoginBenefitsPanel.tsx#L10-L17)).
- `public/logo-navbar.png` is 800×200 (4:1 wide aspect ratio) — it will visibly distort or get cropped if dropped into any of the current square containers without resizing them.

### Proposed Changes

**Footer**
1. Replace the text-only brand mark with the real logo: a Next.js `<Image>` pointing to `/logo-navbar.png`, `alt="GRIT Arena"`, `object-contain`, sized as a wide rectangle (mirror the treatment in `Header.tsx`, e.g. `relative h-8 w-36` or similar responsive sizing appropriate for a dark footer).
2. Update the "Producto" column links to point to real landing section anchors, mirroring `Header.tsx`'s nav: `Plataforma` → `#hero`, `Funciones` → `#operacion`, `Para equipos` → `#solucion`, `Precios` → `#pricing`.
3. Update the "Compañía" column: keep "Sobre nosotros" pointing to `#hero`, and change "Contacto" to use the new mailto link (see below) instead of `href="#"`.
4. Replace the 3 generic placeholder social icons with exactly two contact actions:
   - **WhatsApp**: `href="https://wa.me/573224399865?text=" + encodeURIComponent('Quiero mas informacion de GRIT Arena')`, opened in a new tab (`target="_blank" rel="noopener noreferrer"`), with a WhatsApp-recognizable icon (reuse the same icon treatment/library used in `HeroSection.tsx`/`PricingSection.tsx` for their WhatsApp CTAs — check those files for the icon component already in use before adding a new dependency) and an `aria-label="Escribir por WhatsApp"`.
   - **Email**: `href="mailto:contacto@grit-arena.com"`, with a mail icon (`material-symbols-outlined` `mail` or `alternate_email`, consistent with the existing icon system) and an `aria-label="Enviar correo a contacto@grit-arena.com"`.
5. Keep the bottom bar (copyright + Privacidad/Términos/Cookies) and the Newsletter column unchanged — out of scope for this story.

**App-wide logo unification**
6. Update every logo reference below to `/logo-navbar.png`, resizing each container from square to a wide rectangle (~4:1 ratio) so the image is not distorted or cropped:
   - `src/components/landing/Header.tsx` — change `src="/landing/logo-navbar.png"` to `src="/logo-navbar.png"` (container sizing already correct).
   - `src/components/portal/PortalHeader.tsx` — replace `/icono_2.png`, resize the `h-8 w-8` container to a wide rectangle (e.g. `h-8 w-32`), drop the adjacent "GRIT Arena" text span if the logo already contains the wordmark (verify visually).
   - `src/components/portal/PortalSidebar.tsx` — replace the broken `/logo2.png` reference, resize the `h-8 w-8` container similarly.
   - `src/components/auth/LoginForm.tsx`, `src/components/auth/SignupForm.tsx`, `src/components/auth/ForgotPasswordForm.tsx`, `src/components/auth/UpdatePasswordForm.tsx` — replace `/icono_2.png`, resize their square containers to wide rectangles.
   - `src/components/auth/LoginBenefitsPanel.tsx` — replace `/icono_2.png`, resize the `size-30` square container to a wide rectangle.
7. Remove the now-redundant duplicate asset `public/landing/logo-navbar.png` once `Header.tsx` points at the root asset, so `/logo-navbar.png` is the single source of truth.

---

## Database Changes

None — this is a front-end/static-asset only change. No migrations required.

---

## API / Server Actions

None — no service, hook, or API changes required. All changes are presentational (components + static assets).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Component | `src/components/landing/Footer.tsx` | Replace brand mark with `/logo-navbar.png` image; fix "Producto"/"Compañía" link hrefs; replace social icon row with WhatsApp + email links |
| Component | `src/components/landing/Header.tsx` | Point logo `src` to `/logo-navbar.png` instead of `/landing/logo-navbar.png` |
| Component | `src/components/portal/PortalHeader.tsx` | Replace `/icono_2.png` with `/logo-navbar.png`; resize logo container to wide rectangle |
| Component | `src/components/portal/PortalSidebar.tsx` | Replace broken `/logo2.png` with `/logo-navbar.png`; resize logo container to wide rectangle |
| Component | `src/components/auth/LoginForm.tsx` | Replace `/icono_2.png` with `/logo-navbar.png`; resize container |
| Component | `src/components/auth/SignupForm.tsx` | Replace `/icono_2.png` with `/logo-navbar.png`; resize container |
| Component | `src/components/auth/ForgotPasswordForm.tsx` | Replace `/icono_2.png` with `/logo-navbar.png`; resize container |
| Component | `src/components/auth/UpdatePasswordForm.tsx` | Replace `/icono_2.png` with `/logo-navbar.png`; resize container |
| Component | `src/components/auth/LoginBenefitsPanel.tsx` | Replace `/icono_2.png` with `/logo-navbar.png`; resize `size-30` container to wide rectangle |
| Static asset | `public/landing/logo-navbar.png` | Delete duplicate once `Header.tsx` references `public/logo-navbar.png` directly |

---

## Acceptance Criteria

1. The footer renders `/logo-navbar.png` as the brand logo (replacing the icon+text mark), with `alt="GRIT Arena"` and `object-contain`, at a size that does not distort or crop the image.
2. The footer "Producto" column links point to `#hero`, `#operacion`, `#solucion`, `#pricing` — no `href="#"` placeholders remain in that column.
3. The footer "Compañía" column's "Contacto" item links to `mailto:contacto@grit-arena.com`.
4. The footer includes a WhatsApp link with `href="https://wa.me/573224399865?text=Quiero%20mas%20informacion%20de%20GRIT%20Arena"` (URL-encoded), opens in a new tab, has a recognizable WhatsApp icon, and an accessible label.
5. The footer includes a distinct email link with `href="mailto:contacto@grit-arena.com"`, a recognizable mail icon, and an accessible label.
6. No `href="#"` placeholder links remain anywhere in `Footer.tsx` except where explicitly kept out of scope (bottom bar links, newsletter form).
7. Every logo reference in `Header.tsx`, `PortalHeader.tsx`, `PortalSidebar.tsx`, `LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `UpdatePasswordForm.tsx`, and `LoginBenefitsPanel.tsx` points to `/logo-navbar.png`.
8. No component renders the logo inside a square (1:1) container — all affected containers are resized to a wide aspect ratio appropriate for the 800×200 source image, with no visible stretching or cropping on desktop and mobile viewports.
9. The broken `/logo2.png` reference no longer exists anywhere in the codebase (`grep -r "logo2.png" src` returns no matches).
10. `public/landing/logo-navbar.png` no longer exists (or is no longer referenced by any component) — `/logo-navbar.png` at the public root is the single source of truth.
11. No console 404 errors for image assets when navigating the landing page, auth pages (login/signup/forgot/update password), and portal (header + sidebar) after the change.

---

## Implementation Steps

- [ ] Update `Footer.tsx`: logo image, "Producto"/"Compañía" link hrefs, WhatsApp link, email link (remove old placeholder social icons)
- [ ] Update `Header.tsx` to reference `/logo-navbar.png`
- [ ] Update `PortalHeader.tsx` logo (fix container sizing)
- [ ] Update `PortalSidebar.tsx` logo (fix broken reference + container sizing)
- [ ] Update auth forms (`LoginForm.tsx`, `SignupForm.tsx`, `ForgotPasswordForm.tsx`, `UpdatePasswordForm.tsx`, `LoginBenefitsPanel.tsx`) logo + container sizing
- [ ] Delete `public/landing/logo-navbar.png` duplicate
- [ ] Manually verify no visual distortion/cropping of the logo on every updated screen (desktop + mobile widths)
- [ ] Manually verify WhatsApp link opens WhatsApp Web/app with the pre-filled message, and the mailto link opens the default mail client addressed to `contacto@grit-arena.com`
- [ ] Check browser console for 404s on all affected pages

---

## Non-Functional Requirements

- **Security**: All external links (WhatsApp) must use `rel="noopener noreferrer"` alongside `target="_blank"` to prevent reverse-tabnabbing.
- **Performance**: No new image assets are introduced; reuse the existing `/logo-navbar.png` file via Next.js `<Image>` for automatic optimization. No layout shift — reserve fixed-size containers as done elsewhere in the codebase.
- **Accessibility**: Icon-only links (WhatsApp, email) must have descriptive `aria-label`s since they carry no visible text. Logo images must have non-empty, descriptive `alt` text. All links must remain keyboard-focusable with a visible focus state consistent with existing footer link styles.
- **Error handling**: N/A — static asset/link changes only, no runtime error states to handle.
