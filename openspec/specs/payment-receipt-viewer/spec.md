# Capability: payment-receipt-viewer

## Purpose
Defines the inline receipt viewing experience within `ValidarPagoModal`: payment method name resolution via `metodo_pago_id` join, fresh 5-minute signed URL generation via `useComprobanteViewer`, inline image/PDF preview, and view/download actions.

## Requirements

### Requirement: Admin query exposes payment method name via metodo_pago_id join
`gestionSuscripcionesService.fetchSuscripcionesAdmin` SHALL extend the `pagos(...)` sub-select to join `tenant_metodos_pago` via `pagos_metodo_pago_id_fkey` and return `metodo_pago_id`, `comprobante_path`, and the joined method object `(id, nombre, tipo)`. The mapper SHALL write `metodo_pago_ref.nombre` -> `PagoAdminRow.metodo_pago_nombre` and `metodo_pago_ref.tipo` -> `PagoAdminRow.metodo_pago_tipo`. When `metodo_pago_id` is null the joined ref SHALL be null and both mapped fields SHALL be null.

#### Scenario: Pago has a metodo_pago_id
- **WHEN** `fetchSuscripcionesAdmin` fetches a subscription whose `pagos` row has a non-null `metodo_pago_id`
- **THEN** `PagoAdminRow.metodo_pago_nombre` SHALL equal the `nombre` value from `tenant_metodos_pago`
- **THEN** `PagoAdminRow.metodo_pago_tipo` SHALL equal the `tipo` value from `tenant_metodos_pago`

#### Scenario: Pago has no metodo_pago_id
- **WHEN** `fetchSuscripcionesAdmin` fetches a subscription whose `pagos` row has `metodo_pago_id = null`
- **THEN** `PagoAdminRow.metodo_pago_nombre` SHALL be null
- **THEN** `PagoAdminRow.metodo_pago_tipo` SHALL be null

---

### Requirement: ValidarPagoModal displays payment method name with fallback
`ValidarPagoModal` SHALL display the "Metodo" row using the value of `pago.metodo_pago_nombre` when non-null. When `metodo_pago_nombre` is null but the legacy `metodo_pago` text field is set, SHALL display that value. When both are null, SHALL display "-".

#### Scenario: metodo_pago_nombre is available
- **WHEN** the modal is opened for a pago that has `metodo_pago_nombre = "Transferencia Nequi"`
- **THEN** the "Metodo" row SHALL display "Transferencia Nequi"

#### Scenario: Only legacy metodo_pago is set
- **WHEN** the modal is opened for a pago with `metodo_pago_nombre = null` and `metodo_pago = "transferencia"`
- **THEN** the "Metodo" row SHALL display "transferencia"

#### Scenario: Both metodo_pago_nombre and metodo_pago are null
- **WHEN** the modal is opened for a pago with both `metodo_pago_nombre` and `metodo_pago` null
- **THEN** the "Metodo" row SHALL display "-"

---

### Requirement: useComprobanteViewer generates a fresh 5-minute signed URL on mount
`useComprobanteViewer` SHALL accept `comprobantePath: string | null` and, when non-null, call `storageService.getSignedUrl(supabase, comprobantePath, 300)` inside a `useEffect` that runs once on mount. It SHALL expose `{ signedUrl: string | null, isLoading: boolean, error: string | null }`. When `comprobantePath` is null the hook SHALL return `{ signedUrl: null, isLoading: false, error: null }` without making any network call.

#### Scenario: Path is provided - URL generated successfully
- **WHEN** the hook is mounted with a valid non-null `comprobantePath`
- **THEN** `isLoading` SHALL be true until `storageService.getSignedUrl` resolves
- **THEN** upon resolution `signedUrl` SHALL be set to the returned URL and `isLoading` SHALL become false
- **THEN** `error` SHALL remain null

#### Scenario: Path is null
- **WHEN** the hook is mounted with `comprobantePath = null`
- **THEN** `isLoading` SHALL be false immediately
- **THEN** `signedUrl` SHALL be null
- **THEN** no call to `storageService.getSignedUrl` SHALL be made

#### Scenario: getSignedUrl call fails
- **WHEN** `storageService.getSignedUrl` throws an error
- **THEN** `isLoading` SHALL become false
- **THEN** `error` SHALL be set to a non-null message
- **THEN** `signedUrl` SHALL remain null

---

### Requirement: ValidarPagoModal renders receipt section when comprobante_path is set
`ValidarPagoModal` SHALL render a dedicated receipt section when `pago.comprobante_path` is non-null. The section SHALL use `useComprobanteViewer(pago.comprobante_path)` to obtain a fresh signed URL. The section SHALL NOT be rendered when `pago.comprobante_path` is null.

#### Scenario: comprobante_path is null
- **WHEN** the modal is opened for a pago with `comprobante_path = null`
- **THEN** no receipt section SHALL be rendered

#### Scenario: comprobante_path is set
- **WHEN** the modal is opened for a pago with a non-null `comprobante_path`
- **THEN** the receipt section SHALL be rendered
- **THEN** `useComprobanteViewer` SHALL be called with `pago.comprobante_path`

---

### Requirement: Receipt section shows image thumbnail for image files
When `comprobante_path` ends with `.jpg`, `.jpeg`, `.png`, or `.webp` (case-insensitive), once the signed URL is available, `ValidarPagoModal` SHALL render an `<img>` thumbnail with `max-h-40 object-contain`, an `alt="Comprobante de pago"` attribute, and a click interaction that opens the signed URL in a new tab.

#### Scenario: Image receipt - URL loaded
- **WHEN** `comprobante_path` ends with an image extension and `signedUrl` is available
- **THEN** an `<img>` element SHALL be rendered with `src` set to the signed URL
- **THEN** the image SHALL have `alt="Comprobante de pago"`
- **THEN** clicking the image SHALL open the signed URL in `_blank`

#### Scenario: Image receipt - loading state
- **WHEN** `comprobante_path` ends with an image extension and `isLoading` is true
- **THEN** a loading skeleton or spinner SHALL be rendered in place of the image
- **THEN** the "Ver comprobante" and "Descargar" links SHALL be disabled or absent

---

### Requirement: Receipt section shows PDF indicator for PDF files
When `comprobante_path` ends with `.pdf` (case-insensitive), `ValidarPagoModal` SHALL render a PDF icon with the filename derived from the path instead of an image thumbnail.

#### Scenario: PDF receipt - indicator shown
- **WHEN** `comprobante_path` ends with `.pdf` and `signedUrl` is available
- **THEN** a PDF icon and the filename SHALL be rendered in place of an image preview

---

### Requirement: Receipt section provides "Ver comprobante" and "Descargar" links
The receipt section SHALL include a "Ver comprobante" anchor (`target="_blank"`, `rel="noopener noreferrer"`) and a "Descargar" anchor (`download` attribute) both pointing to the fresh signed URL. Both links SHALL be disabled while `isLoading` is true. Both links SHALL be hidden when `signedUrl` is null due to an error.

#### Scenario: Both links available after URL loads
- **WHEN** `signedUrl` is available
- **THEN** the "Ver comprobante" link SHALL have `href` set to the signed URL and `target="_blank"`
- **THEN** the "Descargar" link SHALL have `href` set to the signed URL and the `download` attribute set

#### Scenario: Links disabled during loading
- **WHEN** `isLoading` is true
- **THEN** both the "Ver comprobante" and "Descargar" links SHALL be non-interactive (disabled or absent)

#### Scenario: Links hidden on error
- **WHEN** `error` is non-null
- **THEN** both links SHALL be hidden
- **THEN** an inline error message "No fue posible cargar el comprobante" SHALL be shown

---

### Requirement: Receipt section loading and error states do not impair modal actions
`ValidarPagoModal` approve and reject actions SHALL remain fully functional regardless of the state of `useComprobanteViewer`. Receipt loading or error states SHALL only affect the receipt section.

#### Scenario: Signed URL fetch fails - modal actions still work
- **WHEN** `useComprobanteViewer` returns an error
- **THEN** the "Aprobar" and "Rechazar" buttons SHALL remain enabled and functional
- **THEN** the error in the receipt section SHALL not propagate to the modal-level error state

---

### Requirement: Receipt section and modal are accessible
The receipt section SHALL include accessibility attributes: the `<img>` element SHALL have `alt="Comprobante de pago"`; the "Ver comprobante" and "Descargar" anchors SHALL have descriptive `aria-label` attributes; the receipt container SHALL set `aria-busy="true"` while `isLoading` is true.

#### Scenario: Image alt text present
- **WHEN** an image thumbnail is rendered
- **THEN** the `<img>` SHALL have `alt="Comprobante de pago"`

#### Scenario: Links are labelled
- **WHEN** the "Ver comprobante" and "Descargar" anchors are rendered
- **THEN** each SHALL have a descriptive `aria-label` attribute

#### Scenario: Loading container is aria-busy
- **WHEN** `isLoading` is true
- **THEN** the receipt container element SHALL have `aria-busy="true"`
