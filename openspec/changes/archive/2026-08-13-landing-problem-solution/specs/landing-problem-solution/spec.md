## ADDED Requirements

### Requirement: Landing Replaces Trust Strip With Problem-Solution Narrative
The system SHALL render a new problem-solution section immediately below the landing hero and before the features section, replacing the previous trust/ticker strip in the landing flow.

#### Scenario: New section appears in correct landing order
- **WHEN** an anonymous visitor opens the landing page
- **THEN** the system SHALL render the problem-solution section directly after the hero and before the features section

#### Scenario: Legacy placeholder ticker is removed
- **WHEN** an anonymous visitor views the landing flow
- **THEN** the repeated `WOLFPACK-SXH` ticker SHALL not be visible anywhere in that section

### Requirement: Problem Block Explains The Cost Of Fragmented Operations
The system SHALL render a top problem block with the label `Problema`, the statement `Cuando tu club crece, operar sin sistema empieza a costar caro`, turquoise emphasis on `sin sistema`, and supporting explanatory copy about fragmented club operations.

#### Scenario: Problem statement is rendered with emphasis
- **WHEN** an anonymous visitor views the top block of the section
- **THEN** the system SHALL display the required problem label, headline, supporting copy, and turquoise emphasis on `sin sistema`

#### Scenario: Problem copy excludes removed phrase
- **WHEN** an anonymous visitor reads the problem block and supporting pain items
- **THEN** the exact phrase `y cargas de trabajo por seguimiento de atletas` SHALL not appear

### Requirement: Problem Block Includes Three Structured Pain Items
The system SHALL render three structured pain items in the problem block that communicate dispersed information, low operational control, and higher administrative effort with less focus on sports operations.

#### Scenario: Three required pain themes are visible
- **WHEN** an anonymous visitor views the right side of the problem block
- **THEN** the system SHALL display three distinct items covering the required pain themes

#### Scenario: Pain items remain readable on small screens
- **WHEN** an anonymous visitor views the section on mobile or tablet
- **THEN** the pain items SHALL stack or reflow without clipped text or broken layout

### Requirement: Solution Block Presents Connected Operational Flow
The system SHALL render a bottom solution block with the label `Solución`, the statement `Un sistema pensado para profesionalizar la gestión deportiva`, turquoise emphasis on `profesionalizar`, and supporting copy describing a connected operational flow.

#### Scenario: Solution statement and copy are visible
- **WHEN** an anonymous visitor views the bottom block of the section
- **THEN** the system SHALL display the required label, headline, supporting paragraph, and turquoise emphasis on `profesionalizar`

#### Scenario: Solution copy communicates operational connection
- **WHEN** an anonymous visitor reads the solution paragraph
- **THEN** the system SHALL explain how administrative, commercial, and sports workflows are connected in one traceable flow

### Requirement: Solution Block Shows Four Connected Roles Or Capabilities
The system SHALL render four connected solution items labeled `Atleta`, `Entrenador`, `Operación`, and `Dirección`, each with an icon and short supporting sentence, plus a closing summary treatment equivalent to `Todo conectado. Todo bajo control.`

#### Scenario: All four connected items are rendered
- **WHEN** an anonymous visitor views the solution flow area
- **THEN** the system SHALL display all four required role/capability items with icon, uppercase label, and short description

#### Scenario: Closing summary is rendered
- **WHEN** an anonymous visitor reaches the end of the solution flow
- **THEN** the system SHALL display a closing connected-summary statement equivalent to `Todo conectado. Todo bajo control.`

### Requirement: Trusted-By Navigation Target Remains Stable
The system SHALL preserve the existing landing navigation contract by exposing the replacement section through the `#trusted-by` anchor.

#### Scenario: Header navigation still resolves to the replacement section
- **WHEN** an anonymous visitor activates the landing navigation link pointing to `#trusted-by`
- **THEN** the system SHALL move the viewport to the new problem-solution section

### Requirement: Problem-Solution Section Matches Landing Visual System
The system SHALL implement the problem-solution section in code using the GRIT Arena landing visual system, with rounded surfaces, subtle borders, turquoise accents, and responsive composition derived from the design reference rather than by embedding the reference PNG as final content.

#### Scenario: Section is rendered as code-based UI
- **WHEN** the landing page is rendered
- **THEN** the problem-solution section SHALL be composed from HTML/CSS/Tailwind components rather than displaying the reference PNG as the final section content

#### Scenario: Section is responsive without overflow
- **WHEN** an anonymous visitor views the section on mobile, tablet, or desktop
- **THEN** the section SHALL remain readable without horizontal overflow, clipped connectors, or unreadable copy