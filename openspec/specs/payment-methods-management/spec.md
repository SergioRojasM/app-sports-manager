## ADDED Requirements

### Requirement: Tenant administrator can view and manage payment methods from organization management page
The system SHALL render a "Métodos de Pago" card on the `/portal/orgs/[tenant_id]/(administrador)/gestion-organizacion` page, below existing tenant info cards. The card SHALL display all payment methods (active and inactive) for the tenant, sorted by `orden ASC, nombre ASC`.

#### Scenario: Payment methods card renders for tenant with methods
- **WHEN** an authenticated administrator opens the organization management page and the tenant has one or more payment methods
- **THEN** the system SHALL render each method as a row showing: name, type badge, value, URL link icon (if present), status badge (activo/inactivo), and edit/delete action buttons

#### Scenario: Payment methods card renders empty state
- **WHEN** an authenticated administrator opens the organization management page and the tenant has no payment methods
- **THEN** the system SHALL render an explicit empty state: "No hay métodos de pago configurados. Agrega uno para que tus usuarios puedan realizar pagos."

#### Scenario: Card is loading data
- **WHEN** the payment methods fetch is in progress
- **THEN** the system SHALL render a loading state in the card

#### Scenario: Page remains a composition-only server component
- **WHEN** the organization management page is rendered
- **THEN** the page SHALL delegate all data access to `TenantPaymentMethodsCard` and SHALL NOT call Supabase directly

### Requirement: Tenant administrator can create a new payment method
The system SHALL allow an administrator to create a payment method for their tenant via a form modal opened from the "Métodos de Pago" card. The record SHALL be persisted to `tenant_metodos_pago` scoped to the active `tenant_id`.

#### Scenario: Create form opens from card
- **WHEN** the administrator clicks the "Add" (or equivalent CTA) button on the payment methods card
- **THEN** the system SHALL open the `MetodoPagoFormModal` in create mode with empty / default field values (`activo = true`)

#### Scenario: Successful creation persists method and refreshes list
- **WHEN** the administrator submits a valid create form
- **THEN** the system SHALL insert a row into `tenant_metodos_pago` and SHALL refresh the card list to include the new method

#### Scenario: Creation blocked while submit is in progress
- **WHEN** the administrator submits the create form and the request is pending
- **THEN** the system SHALL disable the submit button and show a loading state until the operation completes

### Requirement: Tenant administrator can edit an existing payment method
The system SHALL allow an administrator to modify any field of an existing payment method through the same `MetodoPagoFormModal` opened in edit mode.

#### Scenario: Edit form pre-populates existing values
- **WHEN** the administrator clicks the edit action on a payment method row
- **THEN** the system SHALL open `MetodoPagoFormModal` in edit mode with all current field values pre-filled

#### Scenario: Successful update persists changes and refreshes list
- **WHEN** the administrator submits a valid edit form
- **THEN** the system SHALL update the corresponding `tenant_metodos_pago` row and SHALL refresh the card list with the updated values

### Requirement: Tenant administrator can delete a payment method
The system SHALL allow an administrator to hard-delete a payment method after confirmation. Deletion SHALL be safe for historical `pagos` records due to the `ON DELETE SET NULL` FK on `pagos.metodo_pago_id`.

#### Scenario: Delete confirmation dialog is shown
- **WHEN** the administrator clicks the delete action on a payment method row
- **THEN** the system SHALL open a confirmation dialog before committing the deletion

#### Scenario: Confirmed deletion removes method and refreshes list
- **WHEN** the administrator confirms deletion
- **THEN** the system SHALL hard-delete the `tenant_metodos_pago` row and SHALL remove the method from the rendered card list

#### Scenario: Cancelled deletion takes no action
- **WHEN** the administrator dismisses the delete confirmation
- **THEN** the system SHALL take no action and the payment method SHALL remain in the list

### Requirement: Payment method form SHALL validate required fields and input constraints
The system SHALL enforce client-side validation before submitting create or update requests. Field-level errors SHALL be displayed adjacent to offending inputs without clearing other fields.

#### Scenario: Missing required nombre field
- **WHEN** the administrator submits the form with an empty `nombre` field
- **THEN** the system SHALL display a required-field validation error on `nombre` and SHALL NOT submit the request

#### Scenario: nombre exceeds maximum length
- **WHEN** the administrator submits the form with a `nombre` longer than 100 characters
- **THEN** the system SHALL display a length validation error on `nombre` and SHALL NOT submit

#### Scenario: Missing required tipo field
- **WHEN** the administrator submits the form without selecting a `tipo`
- **THEN** the system SHALL display a required-field validation error on `tipo` and SHALL NOT submit

#### Scenario: Invalid URL value
- **WHEN** the administrator enters a non-empty `url` that is not a valid http or https URL
- **THEN** the system SHALL display a URL format validation error on `url` and SHALL NOT submit

#### Scenario: Duplicate nombre within tenant
- **WHEN** the administrator submits a nombre that already exists for the same `tenant_id`
- **THEN** the system SHALL surface the unique constraint error and SHALL display a user-facing duplicate-name error (e.g., "Ya existe un método de pago con ese nombre.")

### Requirement: Payment methods data SHALL be persisted and secured in `tenant_metodos_pago` with row-level security
The system SHALL use the `tenant_metodos_pago` table with RLS policies enforcing that only tenant members can SELECT and only tenant administrators can INSERT, UPDATE, and DELETE.

#### Scenario: Tenant member (non-admin) can read payment methods
- **WHEN** an authenticated user with any active membership role for the tenant queries `tenant_metodos_pago`
- **THEN** the database RLS policy SHALL permit the SELECT

#### Scenario: Tenant administrator can write payment methods
- **WHEN** an authenticated user with `administrador` role in the tenant performs INSERT, UPDATE, or DELETE on `tenant_metodos_pago`
- **THEN** the database RLS policy SHALL permit the operation

#### Scenario: Non-member or out-of-scope write attempt is denied
- **WHEN** an authenticated user without `administrador` membership for the target tenant attempts INSERT, UPDATE, or DELETE on `tenant_metodos_pago`
- **THEN** the database RLS policy SHALL deny the operation and no data SHALL be persisted

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
