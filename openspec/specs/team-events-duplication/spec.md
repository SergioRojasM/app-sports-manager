# team-events-duplication Specification

## Purpose
Duplicating an existing team event from the management page into the create wizard (US-0122): the "Duplicar" entry point, what the unsaved copy carries, how ticket and coupon window ends follow the new event date, the independent banner, and the error and access rules.

## Requirements
### Requirement: Duplicar action in the events management views
The event actions menu SHALL offer a "Duplicar" item (icon `content_copy`) for every event in the cards, list and calendar views, placed right after "Editar" (published events) or "Continuar editando" (drafts). Choosing it SHALL navigate to `/portal/orgs/{tenantId}/gestion-eventos/nuevo?duplicar={eventoId}` and SHALL NOT write to the database.

#### Scenario: Item available for any event
- **WHEN** an administrator opens the actions menu of a published, draft, cancelled, inactive or past event in any of the three views
- **THEN** the menu shows "Duplicar"

#### Scenario: Navigates without creating anything
- **WHEN** the administrator chooses "Duplicar" and then leaves the wizard without saving
- **THEN** the events list contains the same events as before

#### Scenario: Keyboard and placement
- **WHEN** the menu is opened near the bottom of the viewport and navigated with the arrow keys
- **THEN** the menu opens upward without being clipped and "Duplicar" is reachable and activatable by keyboard

### Requirement: Create wizard pre-filled from the source event
When the create route receives a `duplicar` query param that is a UUID, the wizard SHALL load that event of the same tenant and open in create mode, titled "Nuevo evento", with a draft copied from it. The name SHALL be `Copia de {nombre}` truncated to 150 characters. All step-1 fields, the tickets with their coupons in the same order, the access form and the payment methods SHALL equal the source. The copy SHALL NOT carry the source's event id, estado, draft flag, ticket ids, coupon ids, purchases or form snapshot.

#### Scenario: Fields copied
- **WHEN** the wizard opens with `?duplicar={id}` of an event that has a banner, trainers, cronograma, two tickets with coupons, a form and payment methods
- **THEN** the three steps show those same values and the name is `Copia de {nombre}`

#### Scenario: Invalid param ignored
- **WHEN** the `duplicar` value is not a UUID
- **THEN** the wizard opens empty, as a plain new event

#### Scenario: Stale references keep the existing behavior
- **WHEN** the source references a deleted discipline, scenario, form, payment method or bundled event
- **THEN** the copy shows the same labels and warnings the wizard shows for those cases in edit mode, and an inactive form blocks publishing but not saving the draft

### Requirement: Dates of the copy follow the new event date
The copy SHALL keep the event date when it is in the future and SHALL clear it when it is in the past. Ticket and coupon validity windows SHALL be copied as stored. When the administrator sets or changes the event date in the wizard, the end of every ticket window ("Venta disponible hasta") and of every coupon window ("válido hasta") that has a value SHALL move by the same amount as the event date, measured from the previous event date (the source's date when the copy's date was cleared). Window starts and empty coupon ends SHALL NOT change. A ticket end that is empty on an event that never had a date SHALL take the new event date. This rule SHALL apply to the wizard in create and edit mode.

#### Scenario: Future event date
- **WHEN** the source event date is in the future
- **THEN** the copy has the same date and the same windows

#### Scenario: Past event date
- **WHEN** the source event date is in the past
- **THEN** the date field of the copy is empty and the windows are still the source's

#### Scenario: Window ends move with the event date
- **WHEN** the source event is on 10 Oct 11:00 with a ticket ending 10 Oct 11:00 and a coupon ending 10 Oct 11:07, and the administrator sets the copy's date to 15 Nov 18:30
- **THEN** the ticket ends 15 Nov 18:30 and the coupon ends 15 Nov 18:37, and their start dates are unchanged

#### Scenario: Retyping the date
- **WHEN** the administrator clears the event date field and then enters a new date
- **THEN** the window ends move relative to the last complete event date

### Requirement: Duplicate notice
While the copy is unsaved, the wizard SHALL show a dismissible `role="status"` notice above the stepper stating that the event is a copy of the named source and that nothing is saved until "Guardar borrador" or "Publicar evento" is pressed. The notice SHALL also say when the event date was cleared and that the ticket and coupon closing dates will follow the new date. It SHALL NOT be shown after the first successful save.

#### Scenario: Notice with adjustments
- **WHEN** the copy loads from a past event
- **THEN** the notice names the source event, says a new date must be defined and that the closing dates of tickets and coupons will follow it

#### Scenario: Dismiss
- **WHEN** the administrator presses the notice's close button
- **THEN** the notice disappears and the draft is unchanged

#### Scenario: Hidden after saving
- **WHEN** the copy is saved as a draft for the first time
- **THEN** the notice is no longer shown

### Requirement: Saving the copy creates an independent event
The unsaved copy SHALL count as having unsaved changes from the moment it loads, so "Guardar borrador" is enabled without further edits and the unsaved-changes guard applies. Saving SHALL create a new event through the existing create path, with a new id, its own ticket and coupon rows, `estado = confirmado` and no purchases, and SHALL leave the source event unchanged.

#### Scenario: Save as draft
- **WHEN** the administrator presses "Guardar borrador" right after the copy loads
- **THEN** a new draft event is created and the URL becomes `/gestion-eventos/{newId}/editar?paso={step}` with an id different from the source

#### Scenario: Publish
- **WHEN** the administrator completes the copy and presses "Publicar evento"
- **THEN** the full validation runs and, on success, the list shows "Evento creado correctamente." with both the source and the copy

#### Scenario: Source untouched
- **WHEN** the copy has been saved
- **THEN** the source event keeps its data, its ticket and coupon ids and its purchases

#### Scenario: Leave guard
- **WHEN** the administrator tries to leave the wizard before saving the copy
- **THEN** the unsaved-changes confirmation is shown

### Requirement: Independent banner for the copy
When the copy is first saved with the banner inherited from the source, the system SHALL store a copy of that image under the new event's own storage path and save that URL. A failure to copy the image SHALL NOT block the save; the event is then saved with the source's banner URL. Choosing a new image or removing the image before the first save SHALL NOT copy the source banner.

#### Scenario: Banner copied
- **WHEN** a copy with the inherited banner is saved and the source banner is replaced afterwards
- **THEN** the copy still shows the original image, stored under `orgs/{tenantId}/eventos/{newId}.*`

#### Scenario: Copy failure
- **WHEN** copying the image fails during the first save
- **THEN** the event is saved with the source's banner URL and no error is shown for the banner

#### Scenario: New or removed image
- **WHEN** the administrator picks a new image or presses "Quitar imagen" before the first save
- **THEN** the source banner is not copied

### Requirement: Duplicate source errors and access
Duplicating SHALL be limited to administrators of the tenant and to events of that tenant. A source that does not exist or belongs to another tenant SHALL show "Evento no encontrado" with "Volver a eventos". A load failure SHALL show the error state with "Reintentar", which loads the copy again.

#### Scenario: Unknown or foreign event
- **WHEN** the wizard opens with a `duplicar` id that does not exist or belongs to another tenant
- **THEN** "Evento no encontrado" is shown with a "Volver a eventos" action

#### Scenario: Load error and retry
- **WHEN** loading the source fails and the administrator presses "Reintentar"
- **THEN** the source is requested again and, on success, the pre-filled wizard is shown

#### Scenario: Non-administrator
- **WHEN** a user who is not an administrator of the tenant requests the route
- **THEN** the existing role guard redirects them and no event data is loaded

