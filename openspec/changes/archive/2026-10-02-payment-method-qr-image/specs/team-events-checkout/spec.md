## ADDED Requirements

### Requirement: Payment method card shows the QR image
`EventoMetodoPagoCard` SHALL render the image of a snapshot that has `qr_url` inside its expanded area, after `comentarios`, on a white background, lazily loaded, with `alt="Código QR de {nombre}"`. `qr_url` SHALL count as a detail, so the `compact` variant offers "Ver más" when the QR is the only detail. The image SHALL be shown to authenticated buyers and anonymous guests alike.

#### Scenario: Snapshot with a QR image
- **WHEN** the payment step renders a method whose snapshot has `qr_url`
- **THEN** the card SHALL show the QR image once expanded

#### Scenario: Compact variant with only a QR image
- **WHEN** a compact card renders a snapshot with `qr_url` and without `url` or `comentarios`
- **THEN** the card SHALL show "Ver más" and reveal the QR image when it is pressed

#### Scenario: Guest buyer
- **WHEN** an anonymous guest reaches the payment step of an event whose snapshot has `qr_url`
- **THEN** the QR image SHALL load without authentication

#### Scenario: Legacy snapshot
- **WHEN** the card renders a snapshot saved before this change, without `qr_url`
- **THEN** the card SHALL render as before, without image and without errors

#### Scenario: Method image replaced after the event was saved
- **WHEN** the administrator replaces or removes the method's image after the event was saved
- **THEN** the card SHALL keep showing the image referenced by the event's snapshot

#### Scenario: Image fails to load
- **WHEN** the QR image cannot be loaded
- **THEN** the image SHALL be hidden and the rest of the method information SHALL remain visible
