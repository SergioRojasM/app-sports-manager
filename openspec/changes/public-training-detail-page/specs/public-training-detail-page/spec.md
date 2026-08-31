## ADDED Requirements

### Requirement: Public Detail Page Route
The system SHALL serve a public, unauthenticated-friendly detail page at `/entrenamientos-publicos/{entrenamiento_id}` for a single published public training, fetching data client-side from `entrenamientos_publicos_view`.

#### Scenario: Published future training renders fully
- **WHEN** a visitor (anonymous or authenticated) visits `/entrenamientos-publicos/{entrenamiento_id}` for a training that is `activo = true` and has `fecha_hora >= now()`
- **THEN** the full detail page renders without requiring authentication

#### Scenario: Invalid, unpublished, or past training shows not-found
- **WHEN** a visitor visits the detail URL for an id that doesn't exist, isn't published, or is in the past
- **THEN** the page renders an inline "not found" state with a link back to `/entrenamientos-publicos`, without erroring or blank-rendering

#### Scenario: Fetch failure shows a distinguishable error state
- **WHEN** the detail fetch fails due to a network or Supabase error
- **THEN** the page renders an inline error state with a "Reintentar" button, visually distinguishable from the "not found" state

### Requirement: Detail Page Visual Fidelity to Design
The detail page's section structure, layout, spacing, typography, and colors SHALL match node `obHO3` ("Content", inside the `OyIqr` "Public Training Detail" frame) of `projectspec/designs/pencil/grit-arena-v2.pen` as closely as possible, excluding explicitly out-of-scope elements.

#### Scenario: Page sections match the design node
- **WHEN** the detail page is compared section by section against design node `obHO3`
- **THEN** it includes header/breadcrumb, hero banner, tags/title/subtitle/meta row, descripción, incluye, cronograma, location card, reserve card, pricing grid, and closing CTA banner, styled per the design's spacing/typography/colors

#### Scenario: Out-of-scope design elements are omitted
- **WHEN** the detail page is rendered
- **THEN** it does NOT render the "Nivel recomendado" row, the amenity tags ("Parqueadero", "Vestieres") on the location card, decorative map artwork, or a "MÁS POPULAR" featured badge on any pricing card

### Requirement: Conditional Section Visibility
Each optional detail-page section SHALL be hidden entirely (no empty heading, no empty container) when its backing data is null or an empty array.

#### Scenario: Empty descripcion_larga hides the Descripción section
- **WHEN** a training's `descripcion_larga` is null or empty
- **THEN** the "Descripción" section is not rendered, and the short `descripcion` subtitle is not used as a fallback

#### Scenario: Empty incluye array hides the Incluye section
- **WHEN** a training's `incluye` array is empty
- **THEN** the "¿Qué incluye este entrenamiento?" section is not rendered

#### Scenario: Empty cronograma array hides the Cronograma section
- **WHEN** a training's `cronograma` array is empty
- **THEN** the "¿Cómo será la sesión?" section is not rendered

#### Scenario: Empty precio array shows Gratis and hides the pricing grid
- **WHEN** a training's `precio` array is empty
- **THEN** the card shows "Gratis" and the detail page's pricing section is hidden, not rendered as an empty grid

### Requirement: Entrenador and Official Event Link Display
The detail page's reserve card SHALL show the entrenador's name only when the publication has an associated `entrenador_id`, and SHALL show a secondary "Ver detalles oficiales" CTA only when `pagina_evento_url` is set.

#### Scenario: Entrenador name shown when present
- **WHEN** a training publication has an `entrenador_id`
- **THEN** the resolved entrenador display name appears in the reserve card

#### Scenario: Entrenador row omitted when absent
- **WHEN** a training publication has no `entrenador_id`
- **THEN** no entrenador name, "null" text, or empty row is rendered

#### Scenario: Official event link opens in a new tab when set
- **WHEN** `pagina_evento_url` is set on a training
- **THEN** the "Ver detalles oficiales" CTA is rendered with `target="_blank"` and `rel="noopener noreferrer"`, alongside a "Serás redirigido al sitio oficial del evento" note

#### Scenario: Official event link absent when unset
- **WHEN** `pagina_evento_url` is not set
- **THEN** neither the CTA nor its note is rendered, in any state (not disabled, not empty)

### Requirement: Multi-Price Display
Public training pricing SHALL be stored as an array of `{ nombre, precio, descripcion }` items, and displayed consistently across the card and detail page based on the number of items, with no item visually featured over another.

#### Scenario: Single price item shown directly
- **WHEN** a training has exactly one `precio` array item
- **THEN** the card shows that single price, unchanged from prior single-price behavior

#### Scenario: Multiple price items show a starting-from price on the card
- **WHEN** a training has two or more `precio` array items
- **THEN** the card shows "Desde $<lowest> COP", and the detail page's pricing grid renders every item as a separate card, all styled identically regardless of array position

#### Scenario: Pre-existing single-price trainings migrate correctly
- **WHEN** a public training published before this change had a plain numeric price
- **THEN** after migration its price appears as a single-item pricing array labeled "Precio general", and displays correctly on both the card and the detail page

### Requirement: "Ver Detalles" Card Entry Point
`PublicTrainingCard` SHALL render a "Ver detalles" link to the training's detail page whenever an `entrenamientoId` is available, carrying a `from` origin so the visitor can return to the grid they came from.

#### Scenario: Ver detalles link appears on both grids
- **WHEN** `PublicTrainingCard` renders on either `/entrenamientos-publicos` or `/portal/entrenamientos-publicos`
- **THEN** it shows a "Ver detalles" button/link pointing to `/entrenamientos-publicos/{entrenamientoId}?from={encodeURIComponent(currentPathname)}`

#### Scenario: Ver detalles is absent from the unpublished live preview
- **WHEN** `PublicarEntrenamientoModal` renders its live card preview for a training that may not yet be published
- **THEN** no "Ver detalles" link is shown, since no live detail URL exists yet

### Requirement: Stable Back-Navigation via `from` Parameter
The detail page's breadcrumb "Entrenamientos" crumb and its "Volver" affordance SHALL both target the URL given by the `from` search parameter, falling back to `/entrenamientos-publicos` when absent, and SHALL NOT rely on `router.back()` or `document.referrer`.

#### Scenario: Back-navigation from the public landing grid
- **WHEN** a visitor reaches the detail page via "Ver detalles" from `/entrenamientos-publicos`
- **THEN** clicking the breadcrumb's "Entrenamientos" crumb or "Volver" returns to `/entrenamientos-publicos`

#### Scenario: Back-navigation from the portal marketplace grid
- **WHEN** a visitor reaches the detail page via "Ver detalles" from `/portal/entrenamientos-publicos`
- **THEN** clicking the breadcrumb's "Entrenamientos" crumb or "Volver" returns to `/portal/entrenamientos-publicos`

#### Scenario: Cold visit or hard reload falls back to the public landing page
- **WHEN** a visitor opens the detail URL directly (no `from` param), or reloads the detail page (losing in-app navigation history)
- **THEN** the breadcrumb/"Volver" affordance targets `/entrenamientos-publicos`

### Requirement: Reservation Entry Point Reuses Existing Auth Branching
Clicking "Reservar mi cupo" on the detail page (reserve card or closing CTA banner) SHALL branch on the current session via the existing `useAuth()` hook, reusing the existing anonymous and authenticated booking flows unmodified.

#### Scenario: Anonymous visitor sees the guided signup flow
- **WHEN** an anonymous visitor (`!initializing && !user`) clicks "Reservar mi cupo"
- **THEN** the existing `RegistrateParaReservarModal` opens, and completing signup or login lands the visitor in the authenticated marketplace with the booking modal auto-opened for the same training

#### Scenario: Authenticated visitor books directly
- **WHEN** an authenticated visitor (`user` present) clicks "Reservar mi cupo"
- **THEN** the existing `PublicTrainingReservaModal` opens directly and completes a full reservation, including any attached formulario and plan/service requirement flow

#### Scenario: CTA disabled while session state initializes
- **WHEN** `useAuth()`'s `initializing` is true
- **THEN** the "Reservar mi cupo" CTA is disabled with a loading state, rather than opening either modal speculatively

### Requirement: Safe Markdown Rendering for Long Description
`descripcion_larga` SHALL be rendered as formatted Markdown through a React-element-based renderer (no `dangerouslySetInnerHTML`), such that embedded raw HTML or script never executes.

#### Scenario: Markdown formatting renders correctly
- **WHEN** a training's `descripcion_larga` contains headings, bold text, lists, and paragraphs
- **THEN** the Descripción section renders each of these as formatted output

#### Scenario: Embedded script does not execute
- **WHEN** a training's `descripcion_larga` contains a `<script>` tag or an `<img onerror>` payload
- **THEN** the content renders as literal text and does not execute as markup

### Requirement: Publish-Time Authoring of Detail Fields
Tenant administrators SHALL be able to author `cronograma`, `incluye`, and `precio` as repeatable lists, plus a Markdown `descripcion_larga` and an optional `pagina_evento_url`, when publishing or editing a public training.

#### Scenario: Adding and removing repeatable rows
- **WHEN** an administrator adds or removes cronograma rows (hora + descripción), incluye rows (título + descripción), or precio rows (nombre + precio + descripción) in the publish modal
- **THEN** the modal reflects any number of rows for each list, in the order entered

#### Scenario: Saved values persist and reload
- **WHEN** an administrator saves a training with cronograma, incluye, precio, `descripcion_larga`, and `pagina_evento_url` values, then reopens the modal
- **THEN** all five fields show their previously saved values

#### Scenario: Página del evento URL is validated when non-empty
- **WHEN** an administrator enters a non-empty value in the "Página del evento (URL)" field that is not a well-formed URL
- **THEN** the system SHALL block saving with an inline validation error; an empty value is valid

#### Scenario: Individual precio row validation does not block the whole array
- **WHEN** one precio row's amount fails validation (not a number ≥ 0)
- **THEN** only that row shows an inline error; other valid rows are unaffected
