## ADDED Requirements

### Requirement: Subscription modal SHALL display the QR image of the selected payment method
When the selected payment method has `qr_url`, `SuscripcionModal` SHALL render the image inside the selected-method information box, labelled "Código QR:", on a white background, with `alt="Código QR de {nombre}"`, wrapped in a link that opens the image in a new tab with `rel="noopener noreferrer"`. The information box SHALL be rendered when the method has any of `valor`, `url`, `comentarios` or `qr_url`.

#### Scenario: Selected method has a QR image
- **WHEN** the athlete selects a payment method with `qr_url`
- **THEN** the modal SHALL show the QR image below the method's other details

#### Scenario: Method with only a QR image
- **WHEN** the athlete selects a method that has `qr_url` but no `valor`, `url` or `comentarios`
- **THEN** the information box SHALL be shown containing the QR image

#### Scenario: Selected method has no QR image
- **WHEN** the athlete selects a payment method without `qr_url`
- **THEN** the modal SHALL render the method exactly as before this change

#### Scenario: Image fails to load
- **WHEN** the QR image cannot be loaded
- **THEN** the image SHALL be hidden and the rest of the method information SHALL remain visible
