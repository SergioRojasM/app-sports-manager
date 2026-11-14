# Proposal

> Source: `projectspec/userstory/us0139-standalone-marketing-landing-repo.md` (US-0139)

## Why

The marketing landing page lives inside the product app (`src/app/page.tsx` + `src/components/landing/`), so any copy or design change requires deploying the app, and the landing carries the app's Supabase/data dependencies and global styles. Extracting it into an independent, static repository at `/home/sergio/projects/grit-arena/landing` lets the marketing site evolve and deploy on its own while the app focuses on login, portal and data-driven public pages.

## What Changes

- New standalone Next.js repository at `/home/sergio/projects/grit-arena/landing`, statically exported (`output: 'export'`), with no Supabase or data dependencies.
- Port the marketing sections 1:1 (Header, Hero, HeroValueProps, Problem/Solution, Operation, Administration + panels, Pricing, Footer, ConnectedStepsBar, `useScrollReveal`) plus their assets (`public/landing/**`, `logo-navbar.png`, favicon).
- Port only the landing-related styles: `--landing-*` variables, `.landing-shell`, `.landing-*` / `.font-landing-*` utilities, the Tailwind `landing-*` colors, landing fonts and `lg`/`xl` radius overrides.
- Links to the app become absolute, built from `NEXT_PUBLIC_APP_URL` (login, events); in-page anchors become `#section`.
- Add SEO basics: `lang="es"`, metadata, canonical, Open Graph, `sitemap.xml`, `robots.txt` (site URL from `NEXT_PUBLIC_SITE_URL`).
- Add README, `.env.example`, `.gitignore`; initialize git with `main` and a feature branch.
- **No changes to `app_sports_manager` source code** — the app's `/` keeps rendering the current landing until a follow-up story.

## Non-goals

- Redirecting the app's `/` to `/auth/login` / `/portal`.
- Moving `eventos/*`, `ComingSoonPage`, and the Header/Footer used by `/eventos`, `/equipos`, `/atletas` into `src/components/public/`, or deleting landing code/assets/CSS from the app.
- Porting `ShowcaseSection`, `TrustedBySection`, public events, teams or athletes pages to the landing.
- DNS, Vercel project/domain setup, Supabase Auth Site URL / Redirect URL updates.
- Creating the GitHub remote for the new repo.
- Content or design changes to the landing (pure 1:1 port, except links).

## Capabilities

### New Capabilities
- `marketing-landing-site`: The public marketing website that describes GRIT Arena (modules, benefits for athletes and organization owners, pricing, contact) and routes visitors to the product app (login, public events). Owns behavior of the standalone landing: content sections, navigation, outbound app links, static delivery and SEO metadata.

### Modified Capabilities
<!-- None: no existing spec covers the landing, and the app's behavior does not change in this change. -->

## Impact

- **New repo**: `/home/sergio/projects/grit-arena/landing` (outside this repo; its own git history).
- **Dependencies (new repo)**: `next@16.1.6`, `react@19.2.3`, `react-dom@19.2.3`, `@vercel/analytics`, `tailwindcss@4`, `@tailwindcss/postcss`, `typescript@5`, `eslint@9`, `eslint-config-next`, `babel-plugin-react-compiler`.
- **Env vars (new repo)**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`.
- **This repo**: only planning artifacts (user story + this OpenSpec change). No runtime impact.

## Files to Create or Modify

Following page → component → hook → service → types (no service/types layer: the landing has no data).

All paths relative to `/home/sergio/projects/grit-arena/landing`:

| Layer | File | Change |
|---|---|---|
| Config | `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `eslint.config.mjs` | New |
| Config | `.gitignore`, `.env.example`, `README.md` | New |
| Page | `src/app/layout.tsx` | New — fonts, Material Symbols, metadata, Analytics |
| Page | `src/app/page.tsx` | New — section composition |
| Page | `src/app/globals.css` | New — landing tokens + utilities only |
| Page | `src/app/sitemap.ts`, `src/app/robots.ts` | New — static SEO routes |
| Component | `src/components/Header.tsx` | Ported — `appLinks`, `#anchors` |
| Component | `src/components/{HeroSection,HeroValueProps,ProblemSolutionSection,PricingSection,Footer}.tsx` | Ported |
| Component | `src/components/operation/*`, `src/components/administration/**`, `src/components/shared/ConnectedStepsBar.tsx` | Ported |
| Hook | `src/hooks/useScrollReveal.ts` | Ported |
| Lib | `src/lib/links.ts` | New — `appLinks` from `NEXT_PUBLIC_APP_URL` |
| Assets | `public/logo-navbar.png`, `public/favicon.ico`, `public/landing/**` | Copied |

In `app_sports_manager`: `projectspec/userstory/us0139-standalone-marketing-landing-repo.md` and `openspec/changes/standalone-marketing-landing-repo/**` (planning only).

## Implementation Plan

1. Create feature branches (app repo for planning docs; landing repo after `git init`) and verify neither is `main`/`master`/`develop`.
2. Scaffold the landing project with the app's exact versions; configure static export, React Compiler, `@/*` alias, PostCSS, ESLint.
3. Create `tailwind.config.ts` and `globals.css` with the landing subset of tokens, fonts, radius overrides and utilities.
4. Copy assets.
5. Build page layer: `layout.tsx`, `page.tsx`, `sitemap.ts`, `robots.ts`.
6. Port components, fixing imports; add `src/lib/links.ts` and rewire Header/CTA links and anchors.
7. Port `useScrollReveal` hook.
8. Verify: type-check, lint, dev-server visual parity with the app at 375/768/1440 px, anchors, app links, reduced motion, no 404s.
9. Write README/.env.example; prepare commit message and PR description; commit.
