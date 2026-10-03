## ADDED Requirements

### Requirement: Check-in information on the purchases page
The purchases page SHALL show check-in data in three places:
- `EventoComprasStats` SHALL add an "Ingresaron" card with `ingresaron / activas` from `resumen_ingresos_evento`.
- `EventoComprasTable` SHALL show "Ingresó {d MMM HH:mm}" (America/Bogotá) under each used ticket code.
- `CompraDatosModal` SHALL show the entry time per ticket, or "Sin ingreso".

The stats SHALL reload together with the list.

#### Scenario: Used ticket in the table
- **WHEN** a ticket of a confirmed purchase was checked in at 19:05
- **THEN** its row SHALL show "Ingresó … 19:05"

#### Scenario: Stats card
- **WHEN** 3 of 10 `activa` tickets were checked in
- **THEN** the "Ingresaron" card SHALL read "3 / 10"
