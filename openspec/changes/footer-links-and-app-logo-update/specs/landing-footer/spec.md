## ADDED Requirements

### Requirement: Footer Brand Logo
The landing page footer SHALL render the canonical `/logo-navbar.png` image as its brand mark instead of a text-only mark, sized to preserve its native aspect ratio without distortion or cropping.

#### Scenario: Footer displays the real logo
- **WHEN** a visitor scrolls to the footer of the landing page
- **THEN** the brand column shows an `<Image>` with `src="/logo-navbar.png"`, `alt="GRIT Arena"`, and `object-contain` styling, with no visible stretching or cropping

### Requirement: Footer Navigation Links Match Landing Sections
The footer's "Producto" and "Compañía" columns SHALL link to real section anchors present on the landing page instead of placeholder `href="#"` links.

#### Scenario: Producto column links to existing sections
- **WHEN** a visitor clicks a link in the footer's "Producto" column
- **THEN** the page scrolls to one of the existing section ids `#hero`, `#operacion`, `#solucion`, or `#pricing`, matching the same section mapping used by the header navigation

#### Scenario: Compañía column contact link uses mailto
- **WHEN** a visitor clicks "Contacto" in the footer's "Compañía" column
- **THEN** the link opens the default mail client addressed to `contacto@grit-arena.com` via an `href="mailto:contacto@grit-arena.com"`

### Requirement: Footer WhatsApp Contact Action
The footer SHALL provide a WhatsApp link that opens a chat with a pre-filled informational message, replacing the previous generic placeholder social icons.

#### Scenario: Visitor clicks the WhatsApp icon
- **WHEN** a visitor clicks the WhatsApp icon in the footer
- **THEN** a new tab opens to `https://wa.me/573224399865?text=Quiero%20mas%20informacion%20de%20GRIT%20Arena` (URL-encoded message "Quiero mas informacion de GRIT Arena")
- **AND** the link has `target="_blank"` and `rel="noopener noreferrer"`
- **AND** the icon element has an `aria-label` describing the WhatsApp action

### Requirement: Footer Email Contact Action
The footer SHALL provide a direct email link to the GRIT Arena contact address, replacing the previous generic placeholder social icons.

#### Scenario: Visitor clicks the email icon
- **WHEN** a visitor clicks the email icon in the footer
- **THEN** the default mail client opens addressed to `contacto@grit-arena.com` via `href="mailto:contacto@grit-arena.com"`
- **AND** the icon element has an `aria-label` describing the email action
