# notifications-inbox Specification

## Purpose
TBD - created by archiving change notifications-module-email-in-app. Update Purpose after archive.
## Requirements
### Requirement: In-app notifications table
The legacy `public.notificaciones` table SHALL be dropped and recreated with columns `id`, `usuario_id` (not null, `on delete cascade`), `tenant_id` (nullable, `on delete cascade`), `modulo` (≤40), `tipo` (≤60), `titulo` (≤200), `mensaje`, `url` (nullable), `entidad_tipo` (nullable), `entidad_id` (nullable), `leida` (default false), `leida_at` and `created_at`.
- Indexes SHALL exist on `(usuario_id, created_at desc)` and on `(usuario_id) where leida = false`.
- RLS SHALL be enabled. Every privilege SHALL be revoked from `anon` and `authenticated`, and `authenticated` SHALL be granted `select` only, with the policy `usuario_id = auth.uid()`.
- The table SHALL be part of the `supabase_realtime` publication.

#### Scenario: Own rows only
- **WHEN** an authenticated user selects `notificaciones`
- **THEN** only rows with `usuario_id = auth.uid()` SHALL be returned

#### Scenario: Direct writes denied
- **WHEN** an authenticated user runs `insert`, `update` or `delete` on `notificaciones`
- **THEN** the statement SHALL fail with a permission error

#### Scenario: Anonymous access denied
- **WHEN** `anon` selects `notificaciones`
- **THEN** the statement SHALL fail with a permission error

### Requirement: Mark-as-read RPCs
`marcar_notificacion_leida(p_id uuid)` SHALL set `leida = true` and `leida_at = now()` on the row only when it belongs to `auth.uid()` and is unread. `marcar_notificaciones_leidas()` SHALL do the same for every unread row of `auth.uid()`. Both SHALL be SECURITY DEFINER, executable by `authenticated` only.

#### Scenario: Mark own notification
- **WHEN** a user calls `marcar_notificacion_leida` with the id of an own unread notification
- **THEN** the row SHALL have `leida = true` and `leida_at` set

#### Scenario: Foreign notification untouched
- **WHEN** a user calls `marcar_notificacion_leida` with the id of another user's notification
- **THEN** no row SHALL change and no error SHALL be raised

#### Scenario: Mark all
- **WHEN** a user with three unread notifications calls `marcar_notificaciones_leidas`
- **THEN** all three SHALL be read and other users' rows SHALL be unchanged

### Requirement: Notifications browser service
`notificacionesService` in `src/services/supabase/portal/notificaciones.service.ts` SHALL use the browser client and expose:
- `listar({ limit, offset })` → `{ items, total }`, newest first;
- `contarNoLeidas()` → number;
- `marcarLeida(id)` and `marcarTodasLeidas()` through the RPCs;
- `suscribir(usuarioId, onInsert, onReconnect)` → an unsubscribe function, listening to `postgres_changes` `INSERT` on `notificaciones` filtered by `usuario_id=eq.{usuarioId}`, and calling `onReconnect` when the channel becomes subscribed again after a drop.

#### Scenario: Paged listing
- **WHEN** `listar({ limit: 20, offset: 20 })` is called by a user with 45 notifications
- **THEN** it SHALL return items 21 to 40 by `created_at` descending and `total = 45`

#### Scenario: Unsubscribe removes the channel
- **WHEN** the function returned by `suscribir` is called
- **THEN** the Realtime channel SHALL be removed

### Requirement: Header notifications bell
`PortalHeader` SHALL render `NotificacionesBell` in place of the static bell. The bell SHALL show the unread count as a badge: hidden at 0, the exact number from 1 to 9, and `9+` above 9.
- The button SHALL have an `aria-label` that includes the unread count, `aria-haspopup` and `aria-expanded`.
- New notifications SHALL arrive without reloading the page, increasing the count and appearing at the top of the panel. The count change SHALL be announced through an `aria-live="polite"` region.
- The list and count SHALL be reloaded when the Realtime channel reconnects and when the tab regains focus.
- One Realtime channel per open tab SHALL be used and removed on unmount.
- A failure to load notifications SHALL NOT break the header; the bell SHALL render without a badge.

#### Scenario: Badge values
- **WHEN** the user has 0, 4 and 12 unread notifications
- **THEN** the badge SHALL be hidden, show `4` and show `9+` respectively

#### Scenario: Real-time arrival
- **WHEN** a notification is inserted for the signed-in user while the portal is open
- **THEN** the badge SHALL increase by one and the notification SHALL be first in the panel without a reload

#### Scenario: Other users' notifications ignored
- **WHEN** a notification is inserted for a different user
- **THEN** the signed-in user's badge and panel SHALL not change

#### Scenario: Load failure
- **WHEN** the unread count request fails
- **THEN** the header SHALL render normally with the bell and no badge

### Requirement: Notifications panel
Activating the bell SHALL open a panel with the 10 most recent notifications, each showing title, message, relative time and an unread marker that is not conveyed by colour alone.
- Clicking a notification SHALL mark it read, close the panel and navigate to its `url`; a notification without `url` SHALL only be marked read.
- "Marcar todas como leídas" SHALL mark all as read and SHALL be disabled when there are no unread notifications.
- "Ver todas" SHALL navigate to `/portal/notificaciones`.
- The panel SHALL show the empty state "No tienes notificaciones" when the list is empty, and an inline `role="alert"` error with "Reintentar" when loading fails.
- The panel SHALL close on `Escape` and on outside click, return focus to the bell and be fully keyboard navigable.

#### Scenario: Open and read
- **WHEN** the user clicks an unread notification with a `url`
- **THEN** it SHALL be marked read, the badge SHALL decrease by one and the browser SHALL navigate to that `url`

#### Scenario: Mark all as read
- **WHEN** the user activates "Marcar todas como leídas"
- **THEN** the badge SHALL disappear and no item SHALL show the unread marker

#### Scenario: Escape closes
- **WHEN** the panel is open and the user presses `Escape`
- **THEN** the panel SHALL close and focus SHALL be on the bell button

#### Scenario: Empty panel
- **WHEN** the user has no notifications
- **THEN** the panel SHALL show "No tienes notificaciones"

### Requirement: Notifications history page
`/portal/notificaciones` SHALL be available to every authenticated portal user and list the user's notifications newest first, 20 per page, with the same item behaviour as the panel and a "Marcar todas como leídas" action.
- It SHALL show a loading state, the empty state "No tienes notificaciones", and an inline `role="alert"` error with "Reintentar".
- The breadcrumb SHALL label the route "Notificaciones".

#### Scenario: Pagination
- **WHEN** a user with 45 notifications opens the page
- **THEN** 20 SHALL be listed and the user SHALL be able to reach pages 2 and 3

#### Scenario: Empty state
- **WHEN** a user without notifications opens the page
- **THEN** the empty state SHALL be shown and no pagination controls SHALL be rendered

#### Scenario: Unauthenticated access
- **WHEN** a visitor without a session opens `/portal/notificaciones`
- **THEN** the portal shell guard SHALL redirect to the login

### Requirement: Design approval before building the notifications UI
The visual design of the bell badge, the panel and the history page SHALL be approved by the product owner before any of those components is implemented. The components SHALL use the existing grit-arena-v2 tokens and `Grit*` UI components.

#### Scenario: Components built after approval
- **WHEN** the implementation of `NotificacionesBell`, `NotificacionesPanel`, `NotificacionItem` or `NotificacionesPage` starts
- **THEN** an approved design (sketch, `.pen` node or HTML) SHALL already exist and be referenced in the change

