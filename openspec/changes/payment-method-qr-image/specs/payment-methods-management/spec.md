## ADDED Requirements

### Requirement: Payment method SHALL support an optional QR image
`tenant_metodos_pago` SHALL have a nullable `qr_url text` column holding the signed URL of an optional image. The column SHALL be covered by the existing row-level security policies of the table (read: any authenticated user; insert/update/delete: tenant administrators only). `MetodoPago`, `CreateMetodoPagoInput` and `UpdateMetodoPagoInput` SHALL expose `qr_url`, and `metodosPagoService.getMetodosPago` SHALL return it.

#### Scenario: Existing rows after migration
- **WHEN** the migration is applied
- **THEN** the column `qr_url` SHALL exist and every pre-existing row SHALL have `qr_url = null`

#### Scenario: Non-admin cannot change the image
- **WHEN** a user who is not an administrator of the tenant attempts to update `qr_url` of one of its payment methods
- **THEN** the update SHALL be rejected by row-level security

### Requirement: Payment method form SHALL let the administrator select, preview, replace and remove a QR image
`MetodoPagoFormModal` SHALL render an optional field labelled "Imagen QR (opcional)" between the URL and Comentarios fields, for every method type. The field SHALL accept JPEG, PNG or WebP files of at most 2 MB, validated on file selection. No upload SHALL happen until the form is saved. The field SHALL be disabled while the form is submitting.

#### Scenario: Empty state
- **WHEN** the modal opens in create mode, or in edit mode for a method without `qr_url`
- **THEN** the field SHALL show a "Subir imagen" control and the helper text "JPEG, PNG o WebP. Máximo 2 MB."

#### Scenario: Valid file selected
- **WHEN** the administrator selects a JPEG, PNG or WebP file of at most 2 MB
- **THEN** the field SHALL show a preview of the image on a white background with "Cambiar" and "Quitar" buttons, and nothing SHALL be uploaded yet

#### Scenario: Unsupported file type
- **WHEN** the administrator selects a file whose MIME type is not `image/jpeg`, `image/png` or `image/webp`
- **THEN** the field SHALL show "Solo se permiten imágenes JPEG, PNG o WebP." with `role="alert"` and SHALL keep its previous state

#### Scenario: File too large
- **WHEN** the administrator selects a file larger than 2 MB
- **THEN** the field SHALL show "El archivo no puede superar 2 MB." with `role="alert"` and SHALL keep its previous state

#### Scenario: Edit mode shows the current image
- **WHEN** the modal opens in edit mode for a method with `qr_url`
- **THEN** the field SHALL show the current image with "Cambiar" and "Quitar" buttons

#### Scenario: Cancel discards image changes
- **WHEN** the administrator selects or removes an image and then cancels or closes the modal
- **THEN** no change SHALL be made to the database or to storage

### Requirement: Saving a payment method SHALL persist QR image changes
`useMetodosPago.submitForm(data, qr)` SHALL accept `qr: { file: File | null; remove: boolean }` and persist the image as part of the save.

#### Scenario: Create with image
- **WHEN** the administrator submits a valid create form with a selected image
- **THEN** the system SHALL insert the method, upload the image using the new method id, update the row's `qr_url` with the returned signed URL, close the modal and refresh the list

#### Scenario: Edit replacing the image
- **WHEN** the administrator submits the edit form after selecting a new image
- **THEN** the system SHALL upload the image and update the method with its other fields and the new `qr_url`

#### Scenario: Edit removing the image
- **WHEN** the administrator presses "Quitar" on a method with an image and submits the edit form
- **THEN** the system SHALL update the method with `qr_url = null`

#### Scenario: Save without touching the image
- **WHEN** the administrator submits the create or edit form without selecting or removing an image
- **THEN** the system SHALL behave as before this change and, on edit, SHALL leave `qr_url` unchanged

#### Scenario: Upload fails after the method was created
- **WHEN** the method is inserted successfully but the image upload fails
- **THEN** the method SHALL remain created without image, the modal SHALL stay open in edit mode for that method showing "El método se guardó, pero no fue posible subir la imagen. Intenta de nuevo.", and a new submit SHALL NOT create a duplicate method

#### Scenario: Upload fails while editing
- **WHEN** the image upload fails during an edit
- **THEN** no field of the method SHALL be updated and the modal SHALL show "No fue posible subir la imagen. Intenta de nuevo."

### Requirement: Payment methods list SHALL flag methods that have a QR image
`TenantPaymentMethodsCard` SHALL show a "QR" indicator (icon `qr_code_2` plus the text "QR", `title="Tiene imagen QR"`) on each method whose `qr_url` is set.

#### Scenario: Method with image
- **WHEN** the list renders a method with `qr_url`
- **THEN** the row SHALL show the "QR" indicator next to its badges

#### Scenario: Method without image
- **WHEN** the list renders a method without `qr_url`
- **THEN** the row SHALL NOT show the "QR" indicator
