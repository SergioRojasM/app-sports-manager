# Design

## Context

See `proposal.md` (Why) and `specs/marketing-landing-site/spec.md` (requirements). Source of truth for the port is the current landing in `app_sports_manager`:

- Page: `src/app/page.tsx` → composes `Header`, `HeroSection`, `ProblemSolutionSection`, `OperationSection`, `AdministrationSection`, `PricingSection`, `Footer` inside `.landing-shell`.
- Root layout: `src/app/layout.tsx` → `next/font/google` Lexend (`--font-lexend`), Rajdhani 600/700 (`--font-rajdhani`), Montserrat 400–700 (`--font-montserrat`); Material Symbols Outlined stylesheet; `<body className="… font-display antialiased">`; `<Analytics />`.
- Styles used by the marketing components (verified by grep over the files to port):
  - Tailwind colors: all `landing-*`, plus `navy-deep` (`#0f172a`) and `accent-teal` (`#00e5c4`) used by `Footer`.
  - Tailwind fonts: `display`, `landing-display`, `landing-body`. Radius overrides `lg: 2rem`, `xl: 3rem` (components use `rounded-lg` / `rounded-xl` relying on them).
  - Global CSS (`src/app/globals.css`): `:root` `--landing-*` vars, `body`, `.landing-shell`, `.material-symbols-outlined`, `.glass`, and the `@layer utilities` block from `.bg-brand-gradient` through `.landing-step-connector` (incl. its `max-width: 639px` and `prefers-reduced-motion` media queries).
  - Not used by the ported files: `grit-*` tokens, `.grit-shell`, `.grit-scrollbar`, `.glass-card`, `.stat-card`, `.ticker`, `.radial-glow`, etc.
- Assets: `public/logo-navbar.png`, `public/landing/landing-hero-background.png`, `public/landing/operation/*`, `public/landing/administration/*`, `src/app/favicon.ico`.
- Cross-origin links today: `Header` → `/auth/login` (`next/link`) and `/eventos` (dropdown). Anchors `/#hero`, `/#operacion`, `/#solucion`, `/#pricing`, `/#footer`. Hero/Pricing CTAs only use WhatsApp URLs and `#operacion` — no app links.

The target directory `/home/sergio/projects/grit-arena/landing` already exists and is empty.

## Goals / Non-Goals

**Goals:**
- Byte-for-byte equivalent rendering of the current landing, with the minimum code changes (import paths, outbound links, anchors).
- Zero runtime coupling with the app: no shared packages, no Supabase, only a URL env var.
- Static output deployable to any static host (Vercel as primary).

**Non-Goals:**
- Shared design-system package between repos (tokens are duplicated on purpose).
- Fixing pre-existing visual issues or refactoring components (e.g. replacing `.glass` with a landing token).
- Tests framework setup (the app has none; verification is lint + type-check + manual visual parity).

## Architecture

```
┌─────────────────────────────┐          ┌────────────────────────────────┐
│ grit-arena/landing (static) │          │ app_sports_manager (Next+Supa) │
│  grit-arena.com             │          │  app.grit-arena.com            │
│                             │  <a href>│                                │
│  Header ── Iniciar sesión ──┼─────────▶│  /auth/login                   │
│         └─ Eventos ─────────┼─────────▶│  /eventos  (public, Supabase)  │
│  #hero #operacion #solucion │          │  /portal/** (auth)             │
│  #pricing #footer           │          │                                │
│  Footer ── WhatsApp / mail  │          │                                │
└─────────────────────────────┘          └────────────────────────────────┘
        NEXT_PUBLIC_APP_URL ───────────────────────▲
```

Layering (page → component → hook; no service/types layers because there is no data):

```
src/app/(layout, page, sitemap, robots, globals.css)
  └─ src/components/** (marketing sections, client components where they already are)
       └─ src/hooks/useScrollReveal.ts
       └─ src/lib/links.ts (pure config helper)
```

## Decisions

### D1 — Next.js with static export, same versions as the app
`next@16.1.6`, `react@19.2.3`, Tailwind 4, React Compiler, `output: 'export'`, `images.unoptimized: true`.
- **Why**: components use `next/image`, `next/link`, `'use client'` and Tailwind 4 `@config`; matching versions means a copy-paste port with no API drift. Static export removes any server runtime.
- **Alternatives**: Astro (would require rewriting every component); plain Next SSR on Vercel (works, but invites adding server code and costs functions for no reason).
- **Trade-off**: `images.unoptimized` serves original PNGs. Acceptable; images can be pre-optimized later without spec changes.

### D2 — Flat component folder, no `landing/` namespace
`src/components/landing/X` → `src/components/X`; `src/hooks/landing/useScrollReveal` → `src/hooks/useScrollReveal`.
- **Why**: the whole repo is the landing; the namespace is redundant. Only import paths change.
- **Alternative**: keep the same paths to minimize diffs — rejected, it would leave misleading structure.

### D3 — Outbound app links via `src/lib/links.ts`
```ts
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
export const appLinks = {
  login: `${APP_URL}/auth/login`,
  signup: `${APP_URL}/auth/signup`,
  eventos: `${APP_URL}/eventos`,
} as const;
```
- Rendered with plain `<a>` (cross-origin; `next/link` prefetch is useless there).
- `NEXT_PUBLIC_*` is inlined at build time — correct for a static export; each environment builds with its own value.
- **Alternative**: hard-coded production URLs — rejected, breaks local/preview environments.

### D4 — Anchors become `#section`
`/#hero` → `#hero` etc. in `Header` (desktop + mobile + dropdown parent). The logo keeps `href="/"`. Footer anchors already use `#…`.
- **Why**: the landing is one page; `/#x` would also work but `#x` avoids a navigation on the same page. Mobile menu must still close on selection (existing `onClick` behavior is preserved).

### D5 — Duplicate only the tokens actually used
`tailwind.config.ts` and `globals.css` contain exactly the subset listed in Context. Verification rule: every non-Tailwind class in `className` must resolve (grep check in tasks).
- **Why**: keeps the landing independent and small; the app's `grit-*` system is for the portal.
- **Trade-off**: brand colors live in two repos. Accepted for now (Non-Goal: shared package).

### D6 — SEO with App Router metadata files
`metadata` in `layout.tsx` (`metadataBase` from `NEXT_PUBLIC_SITE_URL`, default `https://grit-arena.com`), `sitemap.ts` and `robots.ts` with `export const dynamic = 'force-static'` so they are emitted by the static export. `<html lang="es">`.

### D7 — Git layout
`git init -b main` with an initial empty commit (`chore: init repository`), then work on `feat/standalone-marketing-landing` and commit there. In `app_sports_manager`, planning docs go on `feat/standalone-marketing-landing-repo`. Remote creation is manual (Non-Goal).

### D8 — Dev port 3001
`"dev": "next dev -p 3001"` so the landing and the app (3000) run side by side for the visual parity check and for testing outbound links against the local app.

### D9 — Verification without `next build`
Per project rules, verification uses `npx tsc --noEmit` + `npm run lint` + the dev server (`/`, `/sitemap.xml`, `/robots.txt` are all served in dev). The static `out/` build is produced by the deployment pipeline.

## Risks / Trade-offs

- [A class or token used by a ported component is missed → unstyled element] → grep every `className` for non-Tailwind classes and compare screenshots against the app at 375/768/1440 px.
- [`next/font` + static export differences] → same Next version as the app; fonts are self-hosted by `next/font` at build time, verified in dev network tab.
- [Forgotten relative app link → 404 on the landing domain] → grep `['"]/(auth|portal|eventos|equipos|atletas)` must only match `src/lib/links.ts`.
- [`NEXT_PUBLIC_APP_URL` unset in production → links to localhost] → documented in README and `.env.example`; deployment checklist in README.
- [Two copies of the landing (app + new repo) drift until the app cleanup story] → app cleanup follow-up story is a listed follow-up; no content changes are made in either copy meanwhile.

## Migration Plan

1. Build the new repo (this change). App untouched.
2. Owner creates the GitHub remote and a Vercel project with `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_SITE_URL`, deploys to a preview URL, and validates.
3. Follow-up story (app): move app to `app.` subdomain, update Supabase Auth URLs, redirect app `/` to login/portal, remove landing code from the app.
4. Point the root domain to the landing project.

Rollback: until step 4 the app's `/` still serves the old landing, so reverting is just not switching DNS.
