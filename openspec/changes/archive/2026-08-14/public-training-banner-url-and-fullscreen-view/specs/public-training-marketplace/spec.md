## ADDED Requirements

### Requirement: Banner URL storage has no practical length ceiling
`entrenamientos_publicos.banner_url` SHALL be stored as an unrestricted-length text column (not a bounded `varchar`), since its value is a system-generated Supabase Storage signed URL whose length is not controlled by the application and routinely exceeds short fixed bounds. `entrenamientos_publicos_view` SHALL continue projecting `banner_url` with the same, unrestricted type, and SHALL remain otherwise byte-identical (same columns, joins, row filter, and grants) to its prior definition.

#### Scenario: Publishing with a long signed-URL banner succeeds
- **WHEN** an administrador publishes (or updates the publication of) a training whose uploaded banner produces a Supabase signed URL longer than 500 characters
- **THEN** the write to `entrenamientos_publicos.banner_url` SHALL succeed without a "value too long" error

#### Scenario: Anonymous landing view is unaffected in shape
- **WHEN** `/entrenamientos-publicos` (anonymous) loads training data through `entrenamientos_publicos_view`
- **THEN** the view SHALL expose the same columns, the same `activo = true and fecha_hora >= now()` filter, and the same `anon, authenticated` grants as before this change, with `banner_url` values of any length rendering correctly

#### Scenario: Existing short banner URLs are unaffected
- **WHEN** a training published before this change has a `banner_url` under 500 characters
- **THEN** it continues to be stored and read back unchanged after the column type change

---

### Requirement: Marketplace cards offer a fullscreen banner view
Every public training card that has a banner SHALL show a "Ver" action. Activating it SHALL open the banner image fullscreen in a dismissible modal, without triggering the card's "Reservar" action or any navigation. Cards with no banner SHALL show no "Ver" action. This behavior SHALL be provided by the shared card component so it applies uniformly wherever public training cards are rendered — the authenticated marketplace, the anonymous landing page, and the admin's publish/manage-publication preview — with no per-surface wiring.

#### Scenario: Logged-in visitor views a banner fullscreen
- **WHEN** an authenticated user on `/portal/entrenamientos-publicos` clicks "Ver" on a card with a banner
- **THEN** a fullscreen modal opens showing that training's banner image at full size

#### Scenario: Anonymous visitor views a banner fullscreen
- **WHEN** an unauthenticated visitor on `/entrenamientos-publicos` clicks "Ver" on a card with a banner
- **THEN** the same fullscreen modal opens and behaves identically, with no session required

#### Scenario: Card with no banner shows no "Ver" action
- **WHEN** a public training card's `bannerUrl` is null
- **THEN** no "Ver" button is rendered on that card

#### Scenario: Viewing a banner does not trigger booking
- **WHEN** a visitor clicks "Ver" on a card
- **THEN** the "Reservar" action for that card SHALL NOT be invoked and no booking-related modal SHALL open

#### Scenario: Modal is dismissible three ways
- **WHEN** the fullscreen banner modal is open
- **THEN** it SHALL close when the visitor clicks its close button, clicks the backdrop, or presses `Escape`
