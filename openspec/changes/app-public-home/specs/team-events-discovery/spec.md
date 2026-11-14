# Spec Delta

## MODIFIED Requirements

### Requirement: Discovery navigation entries
- The portal global menu (no tenant selected) SHALL include "Eventos" (icon `celebration`) linking to `/portal/eventos`. The menu SHALL NOT include "Entrenamientos Públicos".
- The header of the public pages (`/eventos`, `/eventos/[event_id]`, `/equipos`, `/atletas`) SHALL list "Eventos" linking to `/eventos` and "Organizaciones" linking to `/#organizaciones` as top-level items. It SHALL NOT include a "Plataforma" group, "Calendario de Entrenamientos", nor the former marketing anchors ("Funciones", "Para equipos", "Precios", "Recursos").
- The portal breadcrumb SHALL label the `eventos` segment "Eventos".

#### Scenario: Landing header link
- **WHEN** a visitor views the header on a public page
- **THEN** an "Eventos" link to `/eventos` and an "Organizaciones" link to `/#organizaciones` SHALL be listed, and no "Plataforma" group, "Calendario de Entrenamientos", "Funciones", "Para equipos", "Precios" or "Recursos" item SHALL be shown

#### Scenario: Portal breadcrumb
- **WHEN** a user is on `/portal/eventos`
- **THEN** the breadcrumb SHALL read "Eventos"
