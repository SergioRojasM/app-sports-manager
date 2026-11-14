# Tasks

> Landing repo root: `/home/sergio/projects/grit-arena/landing` (referred to as `LANDING`). App repo: `/home/sergio/projects/app_sports_manager` (`APP`).

## 1. Branches

- [x] 1.1 In `APP`, create branch `feat/standalone-marketing-landing-repo` from `main` (holds US-0139 + this change); verify with `git branch --show-current`
- [x] 1.2 In `LANDING`, run `git init -b main`, create an empty initial commit `chore: init repository`, then create branch `feat/standalone-marketing-landing`; verify with `git branch --show-current`
- [x] 1.3 Validate that the working branch in both `APP` and `LANDING` is not `main`, `master` or `develop`; stop if it is

## 2. Project scaffold and configuration

- [x] 2.1 Create `LANDING/package.json` (name `grit-arena-landing`, `private: true`; scripts `dev: next dev -p 3001`, `build: next build`, `start: next start`, `lint: eslint`; deps `next@16.1.6`, `react@19.2.3`, `react-dom@19.2.3`, `@vercel/analytics`; devDeps `typescript@^5`, `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19`, `tailwindcss@^4`, `@tailwindcss/postcss@^4`, `eslint@^9`, `eslint-config-next@^16.1.6`, `babel-plugin-react-compiler@1.0.0`); run `npm install` and verify it succeeds and no `@supabase/*`, `resend`, `@nivo/*`, `exceljs`, `jspdf`, `qrcode`, `qr-scanner` appear in `package.json`
- [x] 2.2 Create `next.config.ts` with `reactCompiler: true`, `output: 'export'`, `images: { unoptimized: true }`; create `tsconfig.json` (copy from `APP`, keep `@/*` → `./src/*`); copy `postcss.config.mjs` and `eslint.config.mjs` from `APP`; verify `npx tsc --noEmit` runs (empty project OK)
- [x] 2.3 Create `.gitignore` (Next.js defaults: `node_modules`, `.next`, `out`, `next-env.d.ts`, `*.tsbuildinfo`, `.env*.local`, `.vercel`) and `.env.example` with `NEXT_PUBLIC_APP_URL=https://app.grit-arena.com` and `NEXT_PUBLIC_SITE_URL=https://grit-arena.com` (with comments); verify `git status` does not list `node_modules`

## 3. Design tokens and global styles

- [x] 3.1 Create `LANDING/tailwind.config.ts` with `content: ['./src/**/*.{ts,tsx}']` and `theme.extend`: colors `background`, `foreground`, all `landing-*`, `navy-deep` (`#0f172a`), `accent-teal` (`#00e5c4`); fontFamily `display`, `landing-display`, `landing-body`; borderRadius `lg: 2rem`, `xl: 3rem` — values copied from `APP/tailwind.config.ts`; verify no `grit` key is present
- [x] 3.2 Create `LANDING/src/app/globals.css` with `@config "../../tailwind.config.ts"; @import "tailwindcss";`, `:root` (`--background`, `--foreground`, all `--landing-*`, `color-scheme: dark`), `@theme inline` font block, `body`, `.landing-shell`, `.material-symbols-outlined`, `.glass`, `.brand-glow` (Footer button), and the `@layer utilities` block from `.bg-brand-gradient` through `.landing-step-connector` (incl. `max-width: 639px` and `prefers-reduced-motion` queries) copied verbatim from `APP/src/app/globals.css`; verify no `--grit-*`, `.grit-shell`, `.glass-card`, `.stat-card`, `.ticker` remain

## 4. Assets

- [x] 4.1 Copy `APP/public/logo-navbar.png` → `LANDING/public/logo-navbar.png`, `APP/public/landing/**` → `LANDING/public/landing/**`, `APP/src/app/favicon.ico` → `LANDING/src/app/favicon.ico`; verify with `ls -R LANDING/public` that `landing-hero-background.png`, `operation/dashboard-entrenamientos.png`, `administration/dashboard-general.png` exist

## 5. Page layer

- [x] 5.1 Create `src/lib/links.ts` exporting `appLinks` (`login`, `signup`, `eventos`) built from `NEXT_PUBLIC_APP_URL` with trailing slashes stripped and `http://localhost:3000` fallback (design D3); verify by temporarily setting `NEXT_PUBLIC_APP_URL=https://app.example.com/` and checking the rendered login href is `https://app.example.com/auth/login`
- [x] 5.2 Create `src/app/layout.tsx`: Lexend / Rajdhani (600,700) / Montserrat (400–700) via `next/font/google` with the same CSS variables as `APP`; Material Symbols `<link>` (keep the eslint-disable comment); `<html lang="es">`; `<body className="${vars} font-display antialiased">`; `<Analytics />`; `metadata` with title `GRIT Arena — Plataforma para gestionar equipos deportivos`, description from `APP/src/app/layout.tsx`, `metadataBase` from `NEXT_PUBLIC_SITE_URL` (default `https://grit-arena.com`), `alternates.canonical: '/'`, `openGraph` (title, description, `images: ['/landing/landing-hero-background.png']`, `locale: 'es_CO'`, `type: 'website'`); verify `npx tsc --noEmit` passes
- [x] 5.3 Create `src/app/sitemap.ts` (root URL only) and `src/app/robots.ts` (allow `*`, `sitemap: <site>/sitemap.xml`), both with `export const dynamic = 'force-static'`; verify in dev that `http://localhost:3001/sitemap.xml` and `/robots.txt` respond with the expected content
- [x] 5.4 Create `src/app/page.tsx` composing `Header`, `HeroSection`, `ProblemSolutionSection`, `OperationSection`, `AdministrationSection`, `PricingSection`, `Footer` inside `<div className="landing-shell selection:bg-[var(--landing-primary)] selection:text-slate-950">` (same as `APP/src/app/page.tsx`); verified together with group 6

## 6. Component layer

- [x] 6.1 Copy `APP/src/components/landing/{Header,HeroSection,HeroValueProps,ProblemSolutionSection,PricingSection,Footer}.tsx` → `LANDING/src/components/`, `landing/operation/*` → `src/components/operation/`, `landing/administration/**` → `src/components/administration/`, `landing/shared/ConnectedStepsBar.tsx` → `src/components/shared/`; do NOT copy `eventos/*`, `ComingSoonPage`, `ShowcaseSection`, `TrustedBySection`; rewrite imports `@/components/landing/` → `@/components/` and `@/hooks/landing/useScrollReveal` → `@/hooks/useScrollReveal`; verify `grep -rn "components/landing\|hooks/landing" src` returns nothing
- [x] 6.2 Update `src/components/Header.tsx`: nav anchors `/#hero|/#operacion|/#solucion|/#pricing|/#footer` → `#…`; dropdown "Eventos" → `appLinks.eventos` as `<a>`; "Iniciar sesión" `next/link` → `<a href={appLinks.login}>` keeping classes; keep logo `Link href="/"`, mobile-menu close-on-click and `aria-*`; verify `grep -rnE "['\"]/(auth|portal|eventos|equipos|atletas)" src` only matches `src/lib/links.ts`
- [x] 6.3 Verify every non-Tailwind class used in `src/components/**` is defined in `globals.css` or `tailwind.config.ts` (grep `landing-`, `glass`, `brand-gradient`, `navy-deep`, `accent-teal`, `material-symbols-outlined`, `font-landing-*`, `font-display`) and that no `grit-` class is referenced

## 7. Hook layer

- [x] 7.1 Copy `APP/src/hooks/landing/useScrollReveal.ts` → `LANDING/src/hooks/useScrollReveal.ts` unchanged; verify `npx tsc --noEmit` passes with all components wired

## 8. Verification (integration)

- [x] 8.1 Run `npx tsc --noEmit` and `npm run lint` in `LANDING`; both pass with zero errors
- [x] 8.2 Run `APP` (`npm run dev`, port 3000) and `LANDING` (`npm run dev`, port 3001); compare `/` side by side at 375, 768 and 1440 px (Playwright screenshots) — sections, order, typography, colors, images and copy match
- [x] 8.3 Check behavior on `LANDING`: desktop anchors scroll to sections; mobile menu items scroll and close the menu; "Iniciar sesión" opens `http://localhost:3000/auth/login`; "Plataforma → Eventos" opens `http://localhost:3000/eventos`; footer WhatsApp opens in new tab with `rel="noopener noreferrer"`, email uses `mailto:contacto@grit-arena.com`
- [x] 8.4 With reduced motion emulated, all sections are visible without reveal animations; with network inspector, no 404 for images/fonts/stylesheets and Material Symbols render as glyphs
- [x] 8.5 Inspect the rendered HTML: `<html lang="es">`, `<title>`, meta description, canonical, `og:title`, `og:description`, `og:image` present
- [x] 8.6 In `APP`, verify `git status` shows only `projectspec/userstory/us0139-*.md`, `openspec/changes/standalone-marketing-landing-repo/**` and the docs change from 9.2 (no source changes)

## 9. Documentation

- [x] 9.1 Write `LANDING/README.md`: purpose ("marketing only — anything with data or auth belongs to app_sports_manager"), requirements, `npm install`, `npm run dev` (port 3001), env vars table, static output in `out/`, deployment as separate Vercel project on root domain with `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL` set; verify every command in the README runs as written (except `build`)
- [x] 9.2 Update `APP/projectspec/03-project-structure.md` "Related Documentation" with a note that the public marketing landing now lives in the `grit-arena/landing` repo (US-0139) and that `src/components/landing/` in the app is pending removal by a follow-up story; verify the section renders correctly in Markdown preview

## 10. Commit and PR

- [x] 10.1 Re-run `npx tsc --noEmit` and `npm run lint` in `LANDING` (no `build`); both pass
- [x] 10.2 Write commit message and PR description for `LANDING` (`feat: standalone GRIT Arena marketing landing (US-0139)` — summary, ported sections, link/env changes, verification done, out-of-scope items) and for `APP` (`docs: US-0139 standalone landing story and OpenSpec change`); commit on the feature branches in both repos; verify `git log -1` in each

## Workflow follow-up

- Owner creates the GitHub remote for `LANDING`, pushes `main` and the feature branch, and opens the PR.
- Owner creates the Vercel project and validates a preview deployment.
- Create the follow-up user story for the app cleanup (root redirect, move public-page components to `src/components/public/`, delete remaining landing code/assets/CSS, Supabase Auth URLs, domains).
- Archive this change after review (`/opsx:archive`).
