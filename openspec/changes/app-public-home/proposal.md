# Proposal

> Source: `projectspec/userstory/us0140-app-public-home.md` (US-0140). Design: `projectspec/designs/pencil/grit-arena-v2.pen` — frames `T9KXek` (desktop), `XWAjJ` (mobile), `ldXx5` (states), components `C9T8S` (Event Card), `ojyQD` (Organization Card).

## Why

The app root (`/`) still renders the B2B marketing landing, which now lives in its own repository (US-0139). Athletes and visitors arriving at the app need an entry point that shows what is happening on the platform — upcoming public events and the clubs training on GRIT Arena — with direct paths to `/eventos` and to sign in.

## What Changes

- **BREAKING (UX)**: `/` no longer shows the marketing landing (pricing, operation, administration sections). It shows a public app home for anonymous and signed-in users (no redirect).
- Hero: centered title "La plataforma donde el deporte evoluciona" + new athlete-oriented subtitle over a muted looping background video (poster image under reduced motion), CTAs "Ver eventos" and "Iniciar sesión" / "Mi portal".
- Upcoming events ribbon: up to 12 public upcoming events in an auto-scrolling marquee on desktop (pausable, disabled under reduced motion) and a swipe carousel on mobile; first event featured with a "PRÓXIMO" ribbon; skeleton and empty states; "Ver todos los eventos" → `/eventos`.
- Organizations showcase: up to 6 public organizations with **logo** (fallback initials), banner, name, description, disciplines and athlete count; "Ver todas las organizaciones" → login (anonymous) or `/portal/orgs` (signed in).
- New `SECURITY DEFINER` RPC `listar_organizaciones_destacadas(p_limit)` executable by `anon`, exposing only public fields of `publico = true` tenants. `tenants` RLS unchanged.
- `eventosService.listEventosPublicados` gains an optional `limit`.
- Club CTA band linking to the external marketing landing (`NEXT_PUBLIC_LANDING_URL`) and a minimal footer.
- Landing `Header` (still used by `/eventos`, `/equipos`, `/atletas`) nav becomes "Eventos" + "Organizaciones"; the "Plataforma" group and marketing anchors are removed.
- Removal of the old marketing sections, `useScrollReveal`, `public/landing/**` and the CSS utilities only they used.

## Non-goals

- A "premium"/featured flag on events (the soonest event is featured as "PRÓXIMO").
- City data for organizations (no column; the city row of the design is omitted).
- Making the organizations marketplace (`/portal/orgs`) public, or changing `tenants` RLS.
- Making the `org-assets` storage bucket public.
- Moving `landing/{Header,Footer,ComingSoonPage,eventos}` to a new folder (kept as-is for the public pages).
- Social links other than WhatsApp/email in the footer.

## Capabilities

### New Capabilities
- `app-public-home`: The public home at the app root — header, video hero, upcoming events ribbon, organizations showcase, club CTA band and footer, including session-aware CTAs, motion/accessibility behavior and loading/empty/error states.

### Modified Capabilities
- `tenant-marketplace-visibility`: adds a requirement for the anonymous featured-organizations listing (RPC limited to public fields of `publico = true` tenants).
- `team-events-discovery`: the "Discovery navigation entries" requirement changes — the landing header lists "Eventos" and "Organizaciones" directly instead of a "Plataforma" group.

## Impact

- **DB**: one new function + grants (local migration only).
- **Services/types**: `eventos.service.ts` (optional limit), new `organizaciones-publicas.service.ts` and types.
- **UI**: new `src/components/home/**`, `src/hooks/home/**`, `src/lib/home/home.utils.ts`; `src/app/page.tsx` replaced; `landing/Header.tsx` nav updated; old marketing files deleted.
- **Assets**: `public/home/grit-hero-loop.{webm,mp4}` (~1.8/2.7 MB), `public/home/grit-hero-poster.jpg`.
- **Env**: `NEXT_PUBLIC_LANDING_URL` (default `https://grit-arena.com`).
- **Docs**: `projectspec/03-project-structure.md`.

## Files to Create or Modify

Following page → component → hook → service → types:

| Layer | File | Change |
|---|---|---|
| Page | `src/app/page.tsx` | Replace landing with `HomePage`, read session, metadata |
| Styles | `src/app/globals.css` | `home-marquee` keyframes/utility; remove unused landing utilities |
| Component | `src/components/home/{HomePage,HomeHeader,HomeHero,HeroVideoBackground,EventosCintaSection,EventoCintaCard,EventosCintaSkeleton,OrganizacionesSection,OrganizacionCard,ClubCtaBand,HomeFooter}.tsx`, `index.ts` | New |
| Component | `src/components/landing/Header.tsx` | Nav: "Eventos", "Organizaciones" |
| Component (delete) | `src/components/landing/{HeroSection,HeroValueProps,ProblemSolutionSection,PricingSection,ShowcaseSection,TrustedBySection}.tsx`, `landing/operation/**`, `landing/administration/**`, `landing/shared/**` | Remove |
| Hook | `src/hooks/home/{useHomeEventos,useOrganizacionesDestacadas,usePrefersReducedMotion,useHeaderScrolled}.ts` | New |
| Hook (delete) | `src/hooks/landing/useScrollReveal.ts` | Remove |
| Lib | `src/lib/home/home.utils.ts` | New — date badge, initials, landing URL |
| Service | `src/services/supabase/portal/eventos.service.ts` | Optional `limit` |
| Service | `src/services/supabase/portal/organizaciones-publicas.service.ts` | New |
| Types | `src/types/portal/organizaciones-publicas.types.ts` | New |
| Migration | `supabase/migrations/20261114120000_listar_organizaciones_destacadas.sql` | New RPC |
| Assets | `public/home/*`; delete `public/landing/**` | |
| Docs | `projectspec/03-project-structure.md` | Update |

## Implementation Plan

1. Branch from `develop`/`main` per convention; migration + local apply; verify anon access.
2. Types and services (organizations RPC client, events limit).
3. Hooks (events, organizations, reduced motion, header scrolled) and `home.utils`.
4. Components bottom-up: video background → hero → header → event card + ribbon (+ CSS) → organization card + section → CTA band → footer → `HomePage`.
5. Page wiring (`src/app/page.tsx`).
6. Landing header nav update, deletion of unused marketing files/assets/CSS.
7. Manual verification (anon/signed-in, data edge cases, reduced motion, breakpoints, keyboard), type-check + lint.
8. Docs update; commit message + PR description.
