# Tasks

## 1. Branch

- [x] 1.1 Create branch `feat/app-public-home` (from `develop` once `feat/standalone-marketing-landing-repo` is merged; otherwise from `feat/standalone-marketing-landing-repo` so the US-0139 docs are included); verify with `git branch --show-current`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`; stop if it is

## 2. Database (local only)

- [x] 2.1 Create `supabase/migrations/20261114120000_listar_organizaciones_destacadas.sql` with the function from US-0140 (SECURITY DEFINER, `stable`, `search_path = public`, projection `id, nombre, descripcion, logo_url, banner_url, disciplinas text[], total_atletas int`, `publico` only, order `total_atletas desc, nombre`, limit clamped to 1..24, default 6), `revoke all … from public`, `grant execute … to anon, authenticated`, and a `comment on function`
- [x] 2.2 Apply locally (`npx supabase migration up`, never push to remote) and verify in `psql`/Studio as `anon` (`set role anon;`): `select * from listar_organizaciones_destacadas(6)` returns only public tenants; `p_limit` null/0/100 → ≤6/1/24 rows; `select * from tenants` returns 0 rows; `total_atletas` counts only active `usuario` members

## 3. Types and services

- [x] 3.1 Create `src/types/portal/organizaciones-publicas.types.ts` with `OrganizacionDestacada` (`id`, `nombre`, `descripcion`, `logoUrl`, `bannerUrl`, `disciplinas: string[]`, `totalAtletas: number`) and the row type `OrganizacionDestacadaRow`; verify `npx tsc --noEmit`
- [x] 3.2 Create `src/services/supabase/portal/organizaciones-publicas.service.ts` exporting `organizacionesPublicasService.listDestacadas(limit = 6)` (browser `createClient`, `rpc('listar_organizaciones_destacadas', { p_limit })`, snake→camel mapping, defaults `[]`/`0`, logs and throws `Error('No fue posible cargar las organizaciones.')`); verify `npx tsc --noEmit`
- [x] 3.3 Add optional `limit?: number` to `eventosService.listEventosPublicados` in `src/services/supabase/portal/eventos.service.ts` (`.limit(Math.min(limit ?? EVENTOS_PUBLICOS_LIMIT, EVENTOS_PUBLICOS_LIMIT))`); verify existing callers compile unchanged (`npx tsc --noEmit`)

## 4. Hooks and utils

- [x] 4.1 Create `src/lib/home/home.utils.ts`: `formatFechaBadge(fechaHora)` (Bogotá, `{ day, month }` uppercase without dot, or `null`), `getIniciales(nombre)` (first letter of first two words), `getLandingUrl()` (`NEXT_PUBLIC_LANDING_URL` || `https://grit-arena.com`, trailing slash stripped), `formatAtletas(n)` ("1 atleta" / "{n} atletas" / `null` for 0); verify with a quick `node --experimental-strip-types` check of `formatFechaBadge('2026-11-23T15:00:00Z')` → `{ day: '23', month: 'NOV' }`
- [x] 4.2 Create `src/hooks/home/usePrefersReducedMotion.ts` (`false` on first render, `matchMedia` + change listener) and `src/hooks/home/useHeaderScrolled.ts` (passive scroll listener, threshold 24px); verify `npx tsc --noEmit`
- [x] 4.3 Create `src/hooks/home/useHomeEventos.ts` (`listEventosPublicados({ soloPublicos: true, limit: 12 })`, returns `{ items, loading, error }`, logs `useHomeEventos:` errors) and `src/hooks/home/useOrganizacionesDestacadas.ts` (`listDestacadas(6)`, same shape); verify `npx tsc --noEmit`

## 5. Assets

- [x] 5.1 Copy `projectspec/designs/refernce/grit-hero-loop.webm` and `.mp4` to `public/home/`, and `projectspec/designs/pencil/images/grit-hero-poster.jpg` to `public/home/grit-hero-poster.jpg`; verify with `ls -la public/home`

## 6. Components (page → component order applied bottom-up for compilation)

- [x] 6.1 `src/components/home/HeroVideoBackground.tsx`: poster `next/image` (`fill`, `priority`, `object-cover`, mobile `object-[30%_center]`) + `<video autoPlay muted loop playsInline preload="metadata" aria-hidden>` (WebM, MP4) mounted only when `usePrefersReducedMotion()` is false, fade-in on `canplay`; overlays (center radial vignette, top fade, bottom fade to `#07111F`) per design D5; verify in dev that the video plays and with reduced motion emulated no `<video>` exists in the DOM
- [x] 6.2 `src/components/home/HomeHero.tsx`: eyebrow pill, `h1`, gradient divider, subtitle, CTAs ("Ver eventos" → `/eventos`; secondary "Iniciar sesión"/"Mi portal" by `isAuthenticated`), scroll hint → `#eventos`; `min-h-[100svh]`; verify centered layout at 375/768/1440 against Pencil `T9KXek`/`XWAjJ`
- [x] 6.3 `src/components/home/HomeHeader.tsx`: logo, "Eventos"/"Organizaciones" links, session-aware action, glass background via `useHeaderScrolled`, mobile menu (<1024px) with `aria-expanded`, "Abrir menú"/"Cerrar menú", closes on link click and Escape; verify keyboard and screen-reader labels in dev
- [x] 6.4 `src/components/home/EventoCintaCard.tsx` (props `evento`, `featured`, `tabIndex?`): cover `<img>` with discipline placeholder fallback (`getDisciplinaVisual`), date badge (`formatFechaBadge` / "POR DEFINIR"), discipline chip, 2-line name, organization + location rows, `formatEventoPrecio`, decorative arrow, featured variant (340px, "PRÓXIMO" ribbon with `workspace_premium`, cyan border + glow), whole card `Link` to `buildEventoLandingDetalleHref(id, { from: '/' })`; verify with events lacking banner/date/price
- [x] 6.5 `src/components/home/EventosCintaSkeleton.tsx` (3 pulse cards) and the empty block (icon `event_upcoming`, copy from spec, "Ver eventos" → `/eventos`) inside `EventosCintaSection`
- [x] 6.6 `src/components/home/EventosCintaSection.tsx` (`id="eventos"`): header row with "Ver todos los eventos" → `/eventos`; ribbon band with cyan lines and edge fades; desktop marquee (duplicated `aria-hidden` copy with `tabIndex={-1}`, duration `items.length * 6s`, only when ≥4 items); mobile snap carousel + IntersectionObserver dots; add `@keyframes home-marquee`, `.home-marquee`, pause on `:hover`/`:focus-within` and `prefers-reduced-motion` override to `src/app/globals.css`; verify: pauses on hover/focus, Tab reaches each event once, 3 items do not animate, reduced motion stops it, mobile swipes
- [x] 6.7 `src/components/home/OrganizacionCard.tsx`: banner (`bannerSrc` or gradient), **logo** 76×76 overlapping the banner using `useTenantBrandingImages` (`<img alt="Logo de {nombre}">`, initials fallback on cyan→teal gradient), name (2 lines, grows), description (`line-clamp-2`, default text), up to 2 discipline chips, `formatAtletas`; link to `/portal/orgs` only when `isAuthenticated`; verify with org with logo, without logo and with a broken logo URL
- [x] 6.8 `src/components/home/OrganizacionesSection.tsx` (`id="organizaciones"`): centered heading, grid 3/2/1 cols (`lg:grid-cols-3 md:grid-cols-2`) and mobile snap carousel, skeletons while loading, hidden when empty/error, CTA "Ver todas las organizaciones" (anon → `/auth/login?next=/portal/orgs` + lock hint; signed in → `/portal/orgs`); verify both session states and that login with `next` lands on `/portal/orgs`
- [x] 6.9 `src/components/home/ClubCtaBand.tsx` ("Conoce GRIT Arena" → `getLandingUrl()`, new tab, `rel="noopener noreferrer"`) and `src/components/home/HomeFooter.tsx` (logo, `/eventos`, `/auth/login`, `mailto:contacto@grit-arena.com`, WhatsApp, current-year copyright); verify link targets in dev
- [x] 6.10 `src/components/home/HomePage.tsx` composing all sections with `bg-grit-bg`, and `src/components/home/index.ts` barrel; verify `npx tsc --noEmit`

## 7. Page

- [x] 7.1 Replace `src/app/page.tsx`: async server component reading `getUser()` via `@/services/supabase/server` (errors → anonymous), `metadata` (title "GRIT Arena — Eventos y clubes deportivos", description from US-0140), render `<HomePage isAuthenticated={…} />`; verify `/` renders for anon and signed-in users without redirect

## 8. Public header and cleanup

- [x] 8.1 Update `src/components/landing/Header.tsx`: `navItems` = "Eventos" → `/eventos`, "Organizaciones" → `/#organizaciones`; remove `PlataformaDropdown` and the marketing anchors; verify on `/eventos` and `/equipos` (desktop + mobile menu)
- [x] 8.2 Delete `src/components/landing/{HeroSection,HeroValueProps,ProblemSolutionSection,PricingSection,ShowcaseSection,TrustedBySection}.tsx`, `src/components/landing/operation/`, `src/components/landing/administration/`, `src/components/landing/shared/`, `src/hooks/landing/useScrollReveal.ts`, `public/landing/` after confirming no imports/refs (`grep -rn "landing/operation\|landing/administration\|landing/shared\|HeroSection\|HeroValueProps\|ProblemSolutionSection\|PricingSection\|ShowcaseSection\|TrustedBySection\|useScrollReveal\|/landing/" src` returns nothing); verify `npx tsc --noEmit`
- [x] 8.3 Remove from `src/app/globals.css` the utilities only used by deleted files (`.landing-hero-overlay`, `.landing-hero-glow`, `.landing-value-item`, `.landing-reveal`, `.landing-operation-mockup`, `.landing-operation-image-pop`, `.landing-step-connector` and their media queries), each confirmed unused by grep; verify `/eventos`, `/eventos/[id]`, `/equipos`, `/atletas` still render correctly
- [x] 8.4 Add `NEXT_PUBLIC_LANDING_URL=https://grit-arena.com` to `.env.example` (create the entry if the file exists; otherwise document it in task 10.1)

## 9. Verification (integration)

- [x] 9.1 Manual run (`npm run dev`) with Playwright screenshots at 375/768/1440 compared with Pencil `T9KXek`/`XWAjJ`/`ldXx5`: no horizontal scroll at 375px, documented deviations only (no city row, "PRÓXIMO" label)
- [x] 9.2 Data edge cases: 0 events (empty block), 2 events (no animation), 12+ events (12 shown, marquee), events without banner/date/price; 0 organizations (section hidden), orgs with/without logo and banner, broken logo URL (initials); RPC unavailable (section hidden, page OK)
- [x] 9.3 Session cases: anonymous vs signed-in header/hero/org CTAs; login via `/auth/login?next=/portal/orgs` lands on `/portal/orgs`
- [x] 9.4 Accessibility: single `h1`, keyboard through header/menu/ribbon/cards, marquee pauses on focus, reduced motion (no video, no animation), logo alt text, contrast of hero text ≥ 4.5:1

## 10. Documentation

- [x] 10.1 Update `projectspec/03-project-structure.md`: add `src/components/home/`, `src/hooks/home/`, `src/lib/home/`, `organizaciones-publicas.service.ts` + types to the directory tree; document `listar_organizaciones_destacadas` under "PL/pgSQL SECURITY DEFINER Functions"; add `NEXT_PUBLIC_LANDING_URL` to Environment Variables; replace the US-0139 "pending removal / root will redirect" note with the US-0140 state (root = public app home; remaining `landing/{Header,Footer,ComingSoonPage,eventos}` serve public pages); verify the Markdown renders

## 11. Commit and PR

- [x] 11.1 Run `npx tsc --noEmit` and `npm run lint` (no tests configured; never run `build`); both pass with zero errors
- [x] 11.2 Write the commit message and PR description (summary, screenshots desktop/mobile, migration note "apply locally / remote by owner", deviations, test notes) and commit on `feat/app-public-home`; verify `git log -1`

## Workflow follow-up

- Owner applies the migration to the remote Supabase project during release.
- Owner sets `NEXT_PUBLIC_LANDING_URL` in Vercel.
- Archive this change after review (`/opsx:archive`).
