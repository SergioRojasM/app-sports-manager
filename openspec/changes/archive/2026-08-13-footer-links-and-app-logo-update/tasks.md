## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/footer-links-and-app-logo-update` off `develop`
- [x] 1.2 Validate the current working branch is not `main`, `master`, or `develop` before making changes

## 2. Footer Component

- [x] 2.1 In `src/components/landing/Footer.tsx`, replace the icon+text brand mark with a Next.js `<Image>` using `src="/logo-navbar.png"`, `alt="GRIT Arena"`, `object-contain`, sized as a wide rectangle consistent with `Header.tsx`'s logo treatment
- [x] 2.2 Update the "Producto" column links to `#hero`, `#operacion`, `#solucion`, `#pricing`, matching the section id mapping already defined in `Header.tsx`'s `navItems`
- [x] 2.3 Update the "Compañía" column's "Contacto" link to `href="mailto:contacto@grit-arena.com"` (keep "Sobre nosotros" pointing to `#hero`)
- [x] 2.4 Replace the 3 generic placeholder social icons with a WhatsApp link (`https://wa.me/573224399865?text=` + `encodeURIComponent('Quiero mas informacion de GRIT Arena')`, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label` describing the action) and an email link (`mailto:contacto@grit-arena.com`, `aria-label` describing the action)
- [x] 2.5 Reuse the existing WhatsApp icon treatment already used in `HeroSection.tsx`/`PricingSection.tsx` for visual consistency (no new icon dependency)

## 3. App-Wide Logo Unification

- [x] 3.1 In `src/components/landing/Header.tsx`, change the logo `src` from `/landing/logo-navbar.png` to `/logo-navbar.png`
- [x] 3.2 In `src/components/portal/PortalHeader.tsx`, replace `/icono_2.png` with `/logo-navbar.png` and resize the `h-8 w-8` container to a wide rectangle; verify visually whether the adjacent "GRIT Arena" text span is still needed
- [x] 3.3 In `src/components/portal/PortalSidebar.tsx`, replace the broken `/logo2.png` reference with `/logo-navbar.png` and resize the `h-8 w-8` container to a wide rectangle
- [x] 3.4 In `src/components/auth/LoginForm.tsx`, `src/components/auth/SignupForm.tsx`, `src/components/auth/ForgotPasswordForm.tsx`, and `src/components/auth/UpdatePasswordForm.tsx`, replace `/icono_2.png` with `/logo-navbar.png` and resize their square logo containers to wide rectangles
- [x] 3.5 In `src/components/auth/LoginBenefitsPanel.tsx`, replace `/icono_2.png` with `/logo-navbar.png` and resize the `size-30` square container to a wide rectangle

## 4. Asset Cleanup

- [x] 4.1 Delete the duplicate asset `public/landing/logo-navbar.png` now that `Header.tsx` references `public/logo-navbar.png` directly
- [x] 4.2 Confirm `grep -r "logo2.png\|icono_2.png\|landing/logo-navbar.png" src public` returns no matches

## 5. Verification

- [x] 5.1 Run the dev server and visually check the footer (logo, links, WhatsApp icon, email icon) on desktop and mobile widths
- [x] 5.2 Visually check the landing header, portal header, portal sidebar, and all auth screens for logo distortion/cropping on desktop and mobile widths
- [x] 5.3 Click the WhatsApp link and confirm it opens `https://wa.me/573224399865` with the message "Quiero mas informacion de GRIT Arena" pre-filled
- [x] 5.4 Click the email link and confirm it opens the default mail client addressed to `contacto@grit-arena.com`
- [x] 5.5 Check the browser console for image 404s across all affected pages
- [x] 5.6 Run lint/typecheck/build to confirm no errors introduced

## 6. Commit and Pull Request

- [x] 6.1 Write a commit message summarizing the footer branding/links update and the app-wide logo unification
- [x] 6.2 Write a pull request description referencing US-0082, summarizing the changes, and including a manual test plan (visual checks + link checks from section 5)
