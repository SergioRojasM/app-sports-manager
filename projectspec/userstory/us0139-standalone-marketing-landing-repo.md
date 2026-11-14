# US-0139 — Standalone Marketing Landing Repository

## ID
US-0139

## Name
Extract the GRIT Arena marketing landing page into an independent, static Next.js repository at `/home/sergio/projects/grit-arena/landing`, containing only content that describes the platform (modules, benefits for athletes and organization owners, pricing)

## As a
Prospective customer (organization owner / coach) or athlete visiting the GRIT Arena public website — and, internally, the product team maintaining it

## I Want
A dedicated marketing site that explains what GRIT Arena is, which modules it offers and what benefits it brings to athletes and owners, with clear calls to action that take me to the app (login, public events)

## So That
- The marketing site can be edited, redesigned and deployed independently of the product app (no risk of breaking the portal when changing copy).
- The landing is fully static, fast and SEO-friendly, with no Supabase dependency.
- The product app (`app_sports_manager`) can focus exclusively on authenticated and data-driven features (login, portal, public events, teams, athletes).

---

## Description

### Current State
- The landing lives inside the product app at `src/app/page.tsx` (route `/`) and is composed of components under `src/components/landing/` plus `src/hooks/landing/useScrollReveal.ts`.
- Landing styles are mixed into the app's global styles:
  - CSS variables `--landing-*`, the `.landing-shell` class and the `@layer` utilities `.font-landing-display`, `.font-landing-body`, `.landing-divider`, `.landing-primary-button`, `.landing-secondary-button`, `.landing-nav-link`, `.landing-hero-overlay`, `.landing-hero-glow`, `.landing-panel`, `.landing-value-item`, `.landing-reveal`, `.landing-operation-mockup`, `.landing-operation-image-pop`, `.landing-step-connector` (and their reduced-motion media queries) in `src/app/globals.css`.
  - Tailwind theme colors `landing-*`, font families `landing-display` / `landing-body`, and the legacy `borderRadius` overrides `lg: 2rem` / `xl: 3rem` in `tailwind.config.ts`.
- Fonts (Rajdhani, Montserrat, Lexend via `next/font/google`) and the Material Symbols stylesheet are loaded in `src/app/layout.tsx`.
- Assets used by the landing: `public/logo-navbar.png`, `public/landing/landing-hero-background.png`, `public/landing/operation/*`, `public/landing/administration/*`.
- The landing `Header` links to `/eventos` and `/auth/login` (same origin) and anchors `/#hero`, `/#operacion`, `/#solucion`, `/#pricing`, `/#footer`.
- `src/components/landing/` also contains **non-marketing** code that belongs to the app and must **not** move: `eventos/*` (public events listing/detail, depends on Supabase and portal components) and `ComingSoonPage.tsx` (used by `/atletas` and `/equipos`).
- `ShowcaseSection.tsx` and `TrustedBySection.tsx` exist but are not rendered by `src/app/page.tsx`.

### Proposed Changes

#### 1. New repository scaffold — `/home/sergio/projects/grit-arena/landing`
- Next.js **16.1.6**, React **19.2.3**, TypeScript 5, Tailwind CSS 4 (`@tailwindcss/postcss`), ESLint 9 with `eslint-config-next`, `babel-plugin-react-compiler` (`reactCompiler: true`) — the same versions as `app_sports_manager` so components port without changes.
- `@vercel/analytics` for parity with the app's analytics.
- **No** Supabase, `resend`, nivo, exceljs, jspdf, qrcode or any data dependency.
- `package.json` name: `grit-arena-landing`. Scripts: `dev`, `build`, `start`, `lint`.
- `next.config.ts`:
  ```ts
  const nextConfig: NextConfig = {
    reactCompiler: true,
    output: 'export',          // fully static site
    images: { unoptimized: true }, // required by static export for next/image
  };
  ```
- `tsconfig.json` with path alias `@/*` → `./src/*`.
- Initialize git (`git init -b main`), `.gitignore` (Next.js default + `.env*.local`), initial commit. Creating the GitHub remote is out of scope (done manually by the owner).

#### 2. Directory structure (simplified feature layout — no hexagonal layers needed, there is no data)
```
landing/
├── public/
│   ├── logo-navbar.png
│   ├── favicon.ico
│   └── landing/            # copied 1:1 from app public/landing/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # fonts, Material Symbols, metadata, Analytics
│   │   ├── page.tsx        # composes the sections
│   │   ├── globals.css     # landing-only tokens + utilities
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── HeroValueProps.tsx
│   │   ├── ProblemSolutionSection.tsx
│   │   ├── PricingSection.tsx
│   │   ├── Footer.tsx
│   │   ├── operation/      # OperationSection, OperationModuleCard, OperationDashboardImage, index.ts
│   │   ├── administration/ # AdministrationSection, AdministrationModuleCard, AdministrationDashboardImage, panels/*, index.ts
│   │   └── shared/ConnectedStepsBar.tsx
│   ├── hooks/useScrollReveal.ts
│   └── lib/links.ts        # external URLs to the app
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── next.config.ts
├── .env.example
└── README.md
```

#### 3. Components to port
Copy from `app_sports_manager` and fix imports (`@/components/landing/...` → `@/components/...`, `@/hooks/landing/useScrollReveal` → `@/hooks/useScrollReveal`):

| Source (app) | Target (landing) |
|---|---|
| `src/components/landing/Header.tsx` | `src/components/Header.tsx` |
| `src/components/landing/HeroSection.tsx` | `src/components/HeroSection.tsx` |
| `src/components/landing/HeroValueProps.tsx` | `src/components/HeroValueProps.tsx` |
| `src/components/landing/ProblemSolutionSection.tsx` | `src/components/ProblemSolutionSection.tsx` |
| `src/components/landing/PricingSection.tsx` | `src/components/PricingSection.tsx` |
| `src/components/landing/Footer.tsx` | `src/components/Footer.tsx` |
| `src/components/landing/operation/*` | `src/components/operation/*` |
| `src/components/landing/administration/**` | `src/components/administration/**` |
| `src/components/landing/shared/ConnectedStepsBar.tsx` | `src/components/shared/ConnectedStepsBar.tsx` |
| `src/hooks/landing/useScrollReveal.ts` | `src/hooks/useScrollReveal.ts` |

**Do not port**: `eventos/*`, `ComingSoonPage.tsx`, `ShowcaseSection.tsx`, `TrustedBySection.tsx`.

#### 4. Links to the app
Create `src/lib/links.ts`:
```ts
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const appLinks = {
  login: `${APP_URL}/auth/login`,
  signup: `${APP_URL}/auth/signup`,
  eventos: `${APP_URL}/eventos`,
} as const;
```
- `Header`:
  - "Iniciar sesión" button → `appLinks.login`, rendered as a plain `<a>` (cross-origin, not `next/link`).
  - "Plataforma → Eventos" dropdown item → `appLinks.eventos` (plain `<a>`).
  - Anchor items change from `/#hero`, `/#operacion`, etc. to `#hero`, `#operacion`, `#solucion`, `#pricing`, `#footer` (single page).
  - Logo link stays `/`.
- `PricingSection` / `HeroSection` CTAs that point to `/auth/login` or `/auth/signup` (if any) use `appLinks.*`. Review each CTA `href` in the ported files; **no relative link to an app route may remain** (`grep -rn "\"/auth\|'/auth\|/eventos\|/portal" src` must return only `links.ts`).
- `.env.example`:
  ```
  # URL of the GRIT Arena product app (no trailing slash)
  NEXT_PUBLIC_APP_URL=https://app.grit-arena.com
  ```

#### 5. Styles
- `src/app/globals.css`: copy from the app **only** the landing-related parts:
  - `@config "../../tailwind.config.ts";` and `@import "tailwindcss";`
  - `:root` with the `--landing-*` variables and `color-scheme: dark`.
  - `body` base styles and `.landing-shell`.
  - Every `.landing-*` / `.font-landing-*` utility listed in *Current State*, plus their `prefers-reduced-motion` blocks.
  - Any other global class referenced by the ported components (e.g. `.text-brand-gradient` if used). Rule: run `grep -rhoE 'className="[^"]*"' src` and make sure every non-Tailwind class resolves.
  - Do **not** copy `--grit-*` portal tokens, `.grit-shell`, `.glass`, `.glass-card` unless a ported component uses them (`Footer.tsx` references `grit-arena` only as text, not a token — verify).
- `tailwind.config.ts`: keep `theme.extend.colors` `landing-*` (and any `grit-*` color a ported file actually uses), `fontFamily` `landing-display`, `landing-body`, `display`, and the `borderRadius` overrides `lg: 2rem`, `xl: 3rem` (the landing relies on them).

#### 6. Root layout and SEO
- `src/app/layout.tsx`: load Lexend, Rajdhani (600/700), Montserrat (400–700) with the same CSS variables (`--font-lexend`, `--font-rajdhani`, `--font-montserrat`), the Material Symbols Outlined stylesheet, and `<Analytics />`.
- `<html lang="es">` (content is Spanish; the app currently uses `en` by mistake — not fixed here).
- `metadata`: title `GRIT Arena — Plataforma para gestionar equipos deportivos`, description reused from the app layout, `metadataBase` from `NEXT_PUBLIC_SITE_URL` (default `https://grit-arena.com`), `openGraph` (title, description, image `/landing/landing-hero-background.png`), `alternates.canonical: '/'`.
- `src/app/sitemap.ts` (single URL `/`) and `src/app/robots.ts` (allow all, sitemap URL). Both must work with `output: 'export'` (`export const dynamic = 'force-static'`).
- Add `NEXT_PUBLIC_SITE_URL=https://grit-arena.com` to `.env.example`.

#### 7. Page composition
`src/app/page.tsx` renders, in order, inside `<div className="landing-shell selection:bg-[var(--landing-primary)] selection:text-slate-950">`:
`Header`, `HeroSection`, `ProblemSolutionSection`, `OperationSection`, `AdministrationSection`, `PricingSection`, `Footer` — identical to the current app landing.

#### 8. README
Document: purpose of the repo, `npm install`, `npm run dev` (port 3001 recommended to avoid clashing with the app on 3000: `"dev": "next dev -p 3001"`), env vars, `npm run build` output in `out/`, deployment as a separate Vercel project on the root domain, and the rule "this repo contains only marketing content — anything with data or auth belongs to app_sports_manager".

### Out of Scope (follow-up story in `app_sports_manager`)
- Turning the app's `/` into a redirect (`/auth/login`, or `/portal` when authenticated).
- Moving `eventos/*`, `ComingSoonPage`, `Header`, `Footer` used by public app pages into `src/components/public/` and deleting the remaining `src/components/landing/*`, `public/landing/*` and unused landing CSS from the app.
- DNS / Vercel domain setup and Supabase Auth Site URL / Redirect URL updates.
- Creating the GitHub remote.

The app must keep working unchanged after this story: **no files in `app_sports_manager` are modified** by US-0139 (except this user story file).

---

## Database Changes
None. The landing has no database access.

---

## API / Server Actions
None. The landing is a static export with no server code, API routes, server actions or middleware.

---

## Files to Create or Modify

All paths relative to `/home/sergio/projects/grit-arena/landing` unless stated.

| Area | File | Change |
|------|------|--------|
| Config | `package.json` | New — deps listed in §1 |
| Config | `next.config.ts` | New — `reactCompiler`, `output: 'export'`, `images.unoptimized` |
| Config | `tsconfig.json` | New — `@/*` alias |
| Config | `tailwind.config.ts` | New — landing subset of the app config |
| Config | `postcss.config.mjs`, `eslint.config.mjs` | New — copied from the app |
| Config | `.gitignore`, `.env.example` | New |
| Docs | `README.md` | New |
| Layout | `src/app/layout.tsx` | New — fonts, metadata, Analytics |
| Page | `src/app/page.tsx` | New — section composition |
| Styles | `src/app/globals.css` | New — landing tokens + utilities only |
| SEO | `src/app/sitemap.ts`, `src/app/robots.ts` | New |
| Lib | `src/lib/links.ts` | New — `appLinks` |
| Component | `src/components/Header.tsx` | Ported — app links via `appLinks`, anchors without leading `/` |
| Component | `src/components/{HeroSection,HeroValueProps,ProblemSolutionSection,PricingSection,Footer}.tsx` | Ported — import paths, CTA links |
| Component | `src/components/operation/*`, `src/components/administration/**`, `src/components/shared/ConnectedStepsBar.tsx` | Ported — import paths |
| Hook | `src/hooks/useScrollReveal.ts` | Ported |
| Assets | `public/logo-navbar.png`, `public/favicon.ico`, `public/landing/**` | Copied from app |
| App repo | `app_sports_manager/projectspec/userstory/us0139-standalone-marketing-landing-repo.md` | This story |

---

## Acceptance Criteria

1. `/home/sergio/projects/grit-arena/landing` is a git repository on branch `main` with at least one commit, and `git status` is clean after the commit.
2. `npm install && npm run lint && npm run build` finish with no errors and no TypeScript errors; `npm run build` produces a static `out/` directory containing `index.html`, `sitemap.xml` and `robots.txt`.
3. `package.json` contains no `@supabase/*`, `resend`, `@nivo/*`, `exceljs`, `jspdf`, `qrcode` or `qr-scanner` dependency.
4. Running `npm run dev` and opening `http://localhost:3001` shows the landing visually identical to the current app `/` at 375px, 768px and 1440px widths (header, hero with background image, problem/solution, operation, administration with panels, pricing, footer). Compare side by side with the app running on port 3000.
5. Scroll-reveal animations work; with `prefers-reduced-motion: reduce` emulated, elements are visible without animation.
6. Header anchor links (Plataforma, Funciones, Para equipos, Precios, Recursos) scroll to the corresponding sections on the same page, on desktop and in the mobile menu; the mobile menu closes after selecting an item.
7. "Iniciar sesión" navigates to `${NEXT_PUBLIC_APP_URL}/auth/login`; "Plataforma → Eventos" navigates to `${NEXT_PUBLIC_APP_URL}/eventos`. With `NEXT_PUBLIC_APP_URL` unset, they point to `http://localhost:3000/...`; a trailing slash in the env value does not produce `//auth`.
8. `grep -rnE "['\"]/(auth|portal|eventos|equipos|atletas)" src` returns no matches outside `src/lib/links.ts` (no relative links to app routes).
9. No 404s in the browser network tab for images, fonts or the Material Symbols stylesheet; all Material Symbols icons render (no raw ligature text visible).
10. The page `<html>` has `lang="es"`, a `<title>`, meta description, canonical link and Open Graph tags.
11. Every class used in `className` attributes either is a Tailwind utility or is defined in `globals.css` (no unstyled custom classes); no `--grit-*` portal tokens are copied unless used.
12. Footer WhatsApp and email links keep their current targets and open correctly.
13. `app_sports_manager` has no source changes from this story; its `npm run build` still passes and its `/` still renders the old landing.

---

## Implementation Steps

- [ ] Scaffold Next.js 16.1.6 + TS + Tailwind 4 + ESLint project in `/home/sergio/projects/grit-arena/landing` (match app versions); `git init -b main`
- [ ] Configure `next.config.ts` (static export, unoptimized images, React Compiler), `tsconfig.json` alias, `postcss.config.mjs`, `eslint.config.mjs`
- [ ] Create `tailwind.config.ts` with the landing subset of tokens, fonts and radius overrides
- [ ] Create `globals.css` with landing variables, `.landing-shell` and all `.landing-*` utilities (incl. reduced-motion)
- [ ] Copy assets (`logo-navbar.png`, `favicon.ico`, `public/landing/**`)
- [ ] Port components and `useScrollReveal`; fix import paths
- [ ] Add `src/lib/links.ts`; replace app-route links in `Header` and CTAs; convert anchors to `#section`
- [ ] Build `layout.tsx` (fonts, Material Symbols, metadata, Analytics, `lang="es"`) and `page.tsx`
- [ ] Add `sitemap.ts`, `robots.ts`, `.env.example`, `README.md`, `.gitignore`
- [ ] Run `npm run lint` and `npm run build`; verify `out/`
- [ ] Manual visual comparison against the app landing at 375 / 768 / 1440 px; test anchors, mobile menu, app links, reduced motion
- [ ] Initial commit
- [ ] Create follow-up story for the app-side cleanup (root redirect, move public pages' components, delete landing code)

---

## Non-Functional Requirements

- **Security**: No secrets or server-only env vars in the repo; only `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_SITE_URL`. External links (`WhatsApp`) keep `target="_blank"` with `rel="noopener noreferrer"`. No user input, forms or data access.
- **Performance**: Fully static export; hero image keeps `priority`; other images lazy-load (default `next/image`). Target Lighthouse Performance ≥ 90 and SEO ≥ 95 on desktop.
- **Accessibility**: Keep existing `aria-expanded` / `aria-label` on the mobile menu button and dropdown; all images keep meaningful `alt` (decorative ones `alt=""`); anchors reachable by keyboard; reduced-motion respected.
- **Error handling**: Not applicable (no runtime data). A missing `NEXT_PUBLIC_APP_URL` falls back to `http://localhost:3000` and is documented in the README so production builds set it explicitly.
