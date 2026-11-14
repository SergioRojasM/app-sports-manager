# Spec Delta

## ADDED Requirements

### Requirement: Featured organizations projection
A function `public.listar_organizaciones_destacadas(p_limit integer default 6)` SHALL return only tenants with `publico = true` whose `nombre` is not `public` (internal system tenant), with the columns `id`, `nombre`, `descripcion`, `logo_url`, `banner_url`, `disciplinas` (up to 3 active discipline names, alphabetical) and `total_atletas` (active members with role `usuario`), ordered by `total_atletas` descending then `nombre`.

#### Scenario: Private organizations excluded
- **WHEN** a tenant has `publico = false`
- **THEN** it never appears in the function result

#### Scenario: System tenant excluded
- **WHEN** the internal tenant named `public` exists
- **THEN** it never appears in the function result

#### Scenario: Only public fields
- **WHEN** the function result is inspected
- **THEN** it contains no email, phone, social URLs or member identities

#### Scenario: Athlete count
- **WHEN** a public tenant has 3 active `usuario` members, 1 suspended `usuario` and 2 `entrenador` members
- **THEN** its `total_atletas` is 3

### Requirement: Featured organizations access and limits
`listar_organizaciones_destacadas` SHALL be executable by `anon` and `authenticated`, SHALL return between 1 and 24 rows at most (6 when `p_limit` is null), and SHALL NOT change the `tenants` table policies.

#### Scenario: Anonymous caller
- **WHEN** an `anon` client calls `listar_organizaciones_destacadas(6)`
- **THEN** it receives up to 6 rows of public organizations

#### Scenario: Tenants table still protected
- **WHEN** an `anon` client selects from `public.tenants`
- **THEN** no rows are returned

#### Scenario: Limit bounds
- **WHEN** the function is called with `p_limit` null, 0 or 100
- **THEN** it returns at most 6, 1 and 24 rows respectively
