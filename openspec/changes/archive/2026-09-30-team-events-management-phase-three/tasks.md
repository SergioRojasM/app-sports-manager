## 1. Branch setup

- [x] 1.1 Create a new branch `feat/team-events-management-phase-three` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Pages

- [x] 2.1 Fill the empty `src/app/eventos/page.tsx`:
  - `export const metadata` with the title "Eventos disponibles — GRIT Arena" and the description "Descubre eventos de los equipos en GRIT Arena y obtén tu entrada."
  - render `<EventosLandingPage />`
- [x] 2.2 Create `src/app/eventos/[event_id]/page.tsx`: an async server page that awaits `params` and renders `<Suspense fallback={null}><EventoDetalleLandingPage eventoId={event_id} /></Suspense>`, with static `metadata` "Evento | GRIT Arena"
- [x] 2.3 Fill the empty `src/app/portal/eventos/page.tsx`: `<Suspense fallback={null}><EventosPublicosPage /></Suspense>`
- [x] 2.4 Create `src/app/portal/eventos/[event_id]/page.tsx`: awaits `params` and renders `<Suspense fallback={null}><EventoDetallePortalPage eventoId={event_id} /></Suspense>`

## 3. Detail components (`src/components/portal/eventos/detalle/`)

- [x] 3.1 `EventoDetalleHero.tsx`: copy and adapt `PublicTrainingDetalleHero` (the `evento` variant behavior only):
  - banner with the "Ver" `EventoBannerModal`, or a discipline-gradient placeholder (also used on image error)
  - discipline chip and `tipoLabel` tag
  - organization line (icon `shield`, hidden when `nombreTenant` is `''`)
  - `h1`, short description
  - meta items: date or "Fecha por definir"; time range; place as the "Ver ubicación" link when `punto_encuentro` is http(s) (titled with the venue name or "Punto de encuentro"), otherwise text; capacity; "Reserva hasta N h antes"; "Página del evento" / "Ver página oficial"
  - renders `children`
- [x] 3.2 `EventoDetalleDescripcion.tsx` (`react-markdown`, hidden when empty), `EventoDetalleIncluye.tsx`, `EventoDetalleCronograma.tsx`: copies of the training sections, each hidden when empty
- [x] 3.3 `EventoDetalleEntrenadores.tsx`: `h2` "Entrenadores", one card per snapshot (name plus `experiencia`, the latter hidden when empty); the section is hidden when there are no trainers
- [x] 3.4 `EventoDetalleEntradas.tsx`: `h2` "Entradas", the `precio` options (name, `formatCop` or "Gratis", description) and an "Obtener entrada" button; with an empty `precio` it shows "Este evento aún no tiene entradas disponibles."
- [x] 3.5 ~~`EventoDetalleMetodosPago.tsx`~~ — removed after review: payment methods are not shown on the event page; they belong to the ticket-purchase flow (only `EventoEntradasModal` lists them)
- [x] 3.6 `EventoDetalleCtaBanner.tsx`: the title "Reserva tu cupo" (no subtitle) and an "Obtener entrada" button ("Cargando…" while disabled)
- [x] 3.7 `EventoDetalleStates.tsx`: loading; error with "Reintentar"; not-found "Evento no encontrado" with a link to the given listing href
- [x] 3.8 `EventoDetalleBody.tsx`:
  - props `{ evento: EventoPublicoDetalle; onObtenerEntrada; obtenerEntradaDisabled; tipoLabel? }`
  - order: Hero (+ Descripción), Incluye | Cronograma, Entrenadores, Entradas, CTA banner (no payment methods)
  - no Ubicación card and no occupancy
- [x] 3.9 `EventoDetallePortalPage.tsx` (`'use client'`):
  - `useEventoDetalle(eventoId, { soloPublicos: false })`
  - a "Volver a eventos" link from `resolveEventosOrigin(from, '/portal/eventos')`
  - states, and the body with `tipoLabel` "Evento público" / "Evento privado"
  - `useObtenerEntrada({ surface: 'portal' })`, and renders `EventoEntradasModal`
- [x] 3.10 `detalle/index.ts` barrel

## 4. Listing and get-ticket components (`src/components/portal/eventos/`)

- [x] 4.1 `EventoBannerModal.tsx` (copy of `PublicTrainingBannerModal`) and `EventosDisponiblesWidget.tsx` (copy of `SessionsAvailableWidget`: "{N} eventos disponibles" / "1 evento disponible")
- [x] 4.2 `EventoMetodoPagoCard.tsx`:
  - name and tipo badge (`METODO_PAGO_TIPO_LABELS`)
  - `valor` with a "Copiar" icon button (`navigator.clipboard.writeText`, 2 s `role="status"` "Copiado", silent fallback)
  - `url` as "Ir al enlace de pago" only for http(s) (`target="_blank" rel="noopener noreferrer"`), otherwise text
  - `comentarios` as `whitespace-pre-wrap` text
  - a `compact` variant: `url` and `comentarios` behind "Ver más"
- [x] 4.3 `EventoPublicoCard.tsx`: adapted from `PublicTrainingCard`:
  - banner/placeholder (+ `loading="lazy"` unless featured)
  - "Próximo" badge, discipline chip, "Solo miembros" chip
  - organization line, `h3`, 2-line description
  - date / place ("Lugar por definir") / capacity row
  - trainers, antelación
  - `formatEventoPrecio`
  - "Ver detalles" link (`detalleHref`) and an "Obtener entrada" button (`onObtenerEntrada`, `obtenerEntradaDisabled`)
  - no occupancy, services, form or plans
- [x] 4.4 `EventosPublicosGrid.tsx`: featured + `grid-cols-1 sm:grid-cols-3`; the empty state "No hay eventos disponibles por ahora." (icon `celebration`); with `hasActiveFilters`, the "No hay eventos que coincidan con los filtros" + "Limpiar filtros" state
- [x] 4.5 `EventosPublicosFiltersDrawer.tsx`: copy of `PublicTrainingFiltersDrawer`:
  - calendar range, quick chips (`aria-pressed`), search
  - **Organización** select (`tenantOptions`) and **Disciplina** select (`disciplinaOptions`), both with "Todas"
  - "Limpiar filtros"
  - every control has a `<label>`
- [x] 4.6 `ObtenerEntradaModal.tsx`:
  - dialog "Obtén tu entrada" with the body copy
  - "Crear cuenta gratis" (`signupHref`), "Ya tengo cuenta" (`loginHref`), "Continuar sin registro" (`onContinuarSinRegistro`)
  - the email hint
  - Escape/close, focus management
  - styled with the landing classes (it is only shown on landing surfaces)
- [x] 4.7 `EventoEntradasModal.tsx`:
  - props `{ open, evento, modo, onClose, onContinuar? }`
  - "Entradas · {nombre}" plus the organization/date/place line
  - native radio group over `precio`, with the first option preselected
  - the "Métodos de pago aceptados" block (compact cards) when the selected amount is > 0 and methods exist
  - in `invitado` mode: the guest note and the "¿Prefieres crear una cuenta?" link
  - "Continuar" calls `onContinuar`, or is disabled and described by the `GritAlert` "La compra de entradas estará disponible próximamente."
  - the empty-`precio` message; "Cerrar"
  - dialog accessibility (focus in/out, Escape)
- [x] 4.8 `EventosPublicosPage.tsx` (`'use client'`):
  - sticky header: `h1` "Eventos Públicos", widget, "Filtrar"
  - the 60-day note
  - loading / error + "Reintentar" states, and the grid (detail href `/portal/eventos/{id}?from=/portal/eventos`)
  - the drawer and `EventoEntradasModal` (`usuario`)
- [x] 4.9 `src/components/portal/eventos/index.ts` barrel (`EventosPublicosPage`, `EventoPublicoCard`, `EventosPublicosGrid`, `EventoEntradasModal`, `ObtenerEntradaModal`)

## 5. Landing components (`src/components/landing/eventos/`)

- [x] 5.1 `EventosLandingPage.tsx` (`'use client'`), a copy of `PublicEntrenamientosLandingPage`:
  - "Volver al inicio", `h1` "Eventos disponibles", subtitle
  - loading and error + "Reintentar"
  - the grid, with the detail href `/eventos/{id}?from=/eventos`
  - `useObtenerEntrada({ surface: 'landing-listado' })` + `ObtenerEntradaModal`
- [x] 5.2 `EventoDetalleBreadcrumb.tsx`: copy of `PublicTrainingDetalleBreadcrumb` ("Eventos › {nombre}", origin link)
- [x] 5.3 `EventoDetalleLandingPage.tsx` (`'use client'`):
  - the landing `Header`/`Footer` shell (copy of the `PublicTrainingDetallePage` `Shell`)
  - `useEventoDetalle(eventoId, { soloPublicos: true })`, `resolveEventosOrigin(from, '/eventos')`
  - states, the body with `tipoLabel="Evento público"`
  - `useObtenerEntrada({ surface: 'landing-detalle' })` with `ObtenerEntradaModal` + `EventoEntradasModal` (`invitado`)
- [x] 5.4 `src/components/landing/eventos/index.ts` barrel

## 6. Wizard and navigation updates

- [x] 6.1 `src/components/portal/gestion-eventos/wizard/EventoPreview.tsx`: render `EventoDetalleBody` (`onObtenerEntrada={() => {}}`, `obtenerEntradaDisabled`, `tipoLabel` "Evento público" / "Evento privado") instead of `PublicTrainingDetalleBody`; remove that import
- [x] 6.1a `src/hooks/portal/gestion-eventos/useEventoWizard.ts`: expose `nombreTenant`:
  - edit mode: from the loaded `EventoCompleto.nombre_tenant`
  - create mode before the first save: fall back to `useTenantName(tenantId)`
  - keep the value after a draft save
  
  `EventoPreview` passes it to `toDetallePreviewItem`.
- [x] 6.2 `src/components/portal/gestion-eventos/wizard/EventoMetodosPagoStep.tsx`: add the helper text "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento."; replace the local tipo label map with `METODO_PAGO_TIPO_LABELS`
- [x] 6.3 `src/components/portal/tenant/TenantPaymentMethodsCard.tsx`: replace the local tipo label map with `METODO_PAGO_TIPO_LABELS` (no visible change)
- [x] 6.4 `src/components/portal/PortalBreadcrumb.tsx`: `SLUG_LABELS.eventos = 'Eventos'`; make the uuid segment render "Evento" under `/portal/eventos/` as well (generalize the US-0119 uuid handling if it is keyed to `gestion-eventos`)
- [x] 6.5 `src/components/landing/Header.tsx`: add `{ label: 'Eventos', href: '/eventos' }` under "Plataforma", after "Calendario de Entrenamientos"
- [x] 6.6 `src/types/portal.types.ts`: add `EVENTOS_MENU_ITEM = { label: 'Eventos', href: '/portal/eventos', icon: 'celebration' }` after `PUBLIC_TRAININGS_MENU_ITEM` in the no-tenant branch of `resolvePortalMenu`
- [x] 6.7 `src/hooks/portal/formularios/useFormularioPreview.ts`: copy of the public-trainings `useFormularioPreview`; `EventoFormularioSelector` (wizard step 2) imports it instead, so the isolation grep (11.7) returns nothing (found during verification)

## 6b. Management page: activo indicator and quick toggle (added after review)

- [x] 6b.1 `eventosService.updateActivoEvento(tenantId, eventoId, activo)` and `useCambiarActivoEvento` (quick toggle, no modal, ignores double toggles)
- [x] 6b.2 `EventoActivoBadge` ("Activo" / "Inactivo", icon + text, `overlay` variant); `EventoEstadoBadge` gains the `overlay` variant (opaque background over banners)
- [x] 6b.3 Cards: estado + activo pills over the banner, dashed amber border when inactive (the old body "Inactivo" tag is removed); list: "Activo" column and stacked row; calendar: inactive chip icon, `aria-label` count, pill in the selected-day list
- [x] 6b.4 `EventoActionsMenu`: "Activar evento" / "Desactivar evento" (also for drafts); `GestionEventosPage` wires the toggle with a status message, an error alert and a data/calendar refresh
- [x] 6b.6 Wizard step 1: the inverted "Oculto" toggle becomes an "Activo" / "Inactivo" toggle (checked = active) with the description "Si está activo, se publicará en el panel de eventos públicos. Si está inactivo, solo será visible para el administrador."; badge tooltip and quick-action messages use the same wording
- [x] 6b.5 Verified in the browser (local): cards, list and calendar badges; activate from a card, deactivate from the list, activate from the calendar; DB updated; QA data removed

## 7. Hooks

- [x] 7.1 `src/hooks/landing/eventos/useEventosLanding.ts`: `{ items, loading, error, refetch }` via `listEventosPublicados({ soloPublicos: true })`; error "No fue posible cargar los eventos."; `console.error` on failure; `console.warn` when 500 rows are returned
- [x] 7.2 `src/hooks/portal/eventos/useEventosPublicos.ts`: port `useEntrenamientosPublicosMarketplace` with Bogotá date keys:
  - the default range today → +60 days
  - undated events always pass the date filter and sort last
  - `tenantOptions` / `disciplinaOptions` derived from the rows
  - `matchesEventoSearch`
  - `tenantId` / `disciplina` filters
  - `hasActiveFilters`, `clearFilters`, `isDefaultDateRange`
  - month navigation not before the current Bogotá month
  - `featuredItem` / `standardItems`, `refetch`
- [x] 7.3 `src/hooks/portal/eventos/useEventoDetalle.ts`: `(eventoId, { soloPublicos })` → `{ evento, loading, error, refetch }`; `evento === null` after load means not found; error "No fue posible cargar el evento."
- [x] 7.4 `src/hooks/portal/eventos/useObtenerEntrada.ts`: `({ evento, surface })`. Encapsulates:
  - the disabled state while `useAuth().initializing`
  - session/portal → open the Entradas modal (`usuario`); session/landing → `router.push` to the portal detail with `?entradas=1`
  - anonymous → `ObtenerEntradaModal` with `signupHref` / `loginHref` (`next=/portal/eventos/{id}?entradas=1`)
  - `continuarSinRegistro()`: from the listing, push `/eventos/{id}?entradas=1`; from the detail page, open the Entradas modal (`invitado`)
  - the one-shot `?entradas=1` auto-open with a `useRef` guard, then `router.replace` without the param (`scroll: false`)

## 8. Service

- [x] 8.1 `src/services/supabase/portal/eventos.service.ts`: add `EVENTOS_PUBLICOS_LIST_SELECT` (includes `nombre_tenant`, `metodos_pago`; excludes `formulario_id`, `creado_por`, `omitir_confirmacion_compra`) and `EVENTO_PUBLICO_DETALLE_SELECT` (+ `descripcion_larga`, `cronograma`, `incluye`, `cancelacion_antelacion_horas`)
- [x] 8.2 Add a private query builder `publicadosQuery(select, soloPublicos)` that applies `activo`, `borrador = false`, `estado = 'confirmado'`, `.or('fecha_hora.gte.<now>,fecha_hora.is.null')` and, optionally, `publico = true`
- [x] 8.3 Add `toPublicoListItem` / `toPublicoDetalle` mappers (flatten the venue, join trainer names, default the arrays to `[]`)
- [x] 8.4 Add `listEventosPublicados({ soloPublicos })` (order by `fecha_hora` asc, nulls last, `limit(500)`) and `getEventoPublicado(eventoId, { soloPublicos })` (`maybeSingle`, `22P02` → `null`)
- [x] 8.5 `mapServiceError`: map `TENANT_INVALIDO` (`23503`) → `invalid_reference`, "La organización del evento no existe."

## 9. Types and lib

- [x] 9.1 `src/types/portal/eventos.types.ts`: `Evento.nombre_tenant: string`; add `EventoPublicoListItem` (incl. `nombreTenant`, `escenario`, `entrenadores`, `metodosPago`), `EventoPublicoDetalle`, `EventoEntradasModo`, `EventoEntradaSeleccion`, `EventosPublicosDateChip`
- [x] 9.2 `src/types/portal/metodos-pago.types.ts`: export `METODO_PAGO_TIPO_LABELS`
- [x] 9.3 `src/lib/portal/eventos-publicos.utils.ts`: `computeEventosChipRange`, `addDaysKeyInBogota`, `matchesEventoSearch` (NFD accent-insensitive), `resolveEventosOrigin`, `buildEventoPortalDetalleHref` / `buildEventoLandingDetalleHref`, `toHttpUrl` (copied, not imported)
- [x] 9.4 `src/lib/portal/eventos-wizard.utils.ts`: `toDetallePreviewItem(draft, eventoId, tenantId, nombreTenant)` returns `EventoPublicoDetalle` (the `nombreTenant` parameter, or `''` while it is null; trainers, complete tickets as `precio`, `metodosPago` from the draft); fix its callers

## 10. Database (local only)

- [x] 10.1 Create `supabase/migrations/20260930120000_eventos_nombre_tenant.sql`:
  - add `nombre_tenant varchar(150)`
  - backfill from `tenants` (`coalesce(nullif(btrim(nombre), ''), 'Organización')`)
  - `set not null` + `eventos_nombre_tenant_ck`, and the column comment
- [x] 10.2 In the same migration, `create or replace function public.guardar_evento_completo(...)`, copying the **latest** body from `20260929120100_guardar_evento_completo.sql` verbatim with three edits:
  - declare `v_nombre_tenant`
  - after the FORBIDDEN check and when `p_es_nuevo`, read the tenant name and raise `TENANT_INVALIDO` (`23503`) if it is not found
  - add `nombre_tenant` to the insert
  
  The update branch is untouched. Re-state the grants (`authenticated` only). Diff against the previous definition.
- [x] 10.3 Apply the migration **locally only** (never push to the remote Supabase). Verify in SQL:
  - backfill
  - a create ignores a client `nombre_tenant`
  - an edit keeps it
  - the US-0119 RPC scenarios still pass
- [x] 10.4 Verify the visibility matrix in SQL and through the pages as anon, non-member, member, `pendiente_activacion` member and admin (drafts, inactive, cancelled, past, private-on-landing)

## 11. Verification

- [x] 11.1 Seed events across two tenants:
  - public / private, confirmed / cancelled, draft, inactive, past, undated
  - with and without banner, venue, URL `punto_encuentro`, trainers, cronograma / incluye, and payment methods (with and without `url` / `comentarios`)
  - free / one price / several prices
- [x] 11.2 Walk through the listing scenarios: featured order, card fields, the 60-day default with undated events, each filter and their combination, accent search, chip toggle, "Limpiar filtros", and the empty / error states
- [x] 11.3 Walk through the detail scenarios on both routes: every section, hidden empty sections, not-found (malformed, private on landing, draft), error retry, `from` safety, and the breadcrumb "Eventos › Evento"
- [x] 11.4 Walk through the get-ticket paths end to end: signup → portal detail with the modal open; login → the same; "Continuar sin registro" from the listing and from the detail page; logged-in landing redirect; one-shot `?entradas=1`; payment methods shown for paid tickets only; "Copiar"; disabled "Continuar"
- [x] 11.5 Check the wizard: the *Página* preview renders `EventoDetalleBody` with trainers, methods and the organization name (new event before saving, and edit mode); the step 3 helper text is shown
- [x] 11.6 In the Network tab, confirm the four pages query only `rest/v1/eventos`, and that no `select` includes `formulario_id`, `creado_por` or `omitir_confirmacion_compra`
- [x] 11.7 Isolation grep: `grep -rE "(components|hooks)/[a-z]+/entrenamientos-publicos|lib/portal/entrenamientos-publicos" src/components/portal/eventos src/components/landing/eventos src/hooks/portal/eventos src/hooks/landing/eventos src/components/portal/gestion-eventos src/lib/portal/eventos*.ts` returns nothing
- [x] 11.8 Regression: `/entrenamientos-publicos`, its detail page, `/portal/entrenamientos-publicos` and `/portal/orgs/{tenantId}/gestion-eventos` (list + wizard) behave as before

## 12. Documentation

- [x] 12.1 Update `projectspec/03-project-structure.md`:
  - the four routes (the public ones outside `protectedPaths`)
  - the `components/portal/eventos` (+ `detalle/`), `components/landing/eventos`, `hooks/portal/eventos` and `hooks/landing/eventos` slices
  - `eventos-publicos.utils.ts`
  - `listEventosPublicados` / `getEventoPublicado` in the service entry
  - `nombre_tenant` in the eventos table notes, and the RPC change
  - `METODO_PAGO_TIPO_LABELS`
  - the wizard preview now using `EventoDetalleBody`

## 13. Quality checks, commit and PR

- [x] 13.1 Run the type check (`npx tsc --noEmit`), lint (`npm run lint`) and the tests (`npm test`, if configured); fix any failures. Do **not** run the build.
- [x] 13.2 Write the commit message (Conventional Commits, e.g. `feat(team-events-management-phase-three): add public and portal event listing and detail pages`) and the pull request description (summary, US-0120 link, migration notes (local only), screenshots checklist, test plan)
