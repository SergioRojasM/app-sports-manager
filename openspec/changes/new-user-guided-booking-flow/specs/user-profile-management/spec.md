## ADDED Requirements

### Requirement: Personal and Sports Profile Forms Support a Field Subset
`PerfilPersonalForm` and `PerfilDeportivoForm` SHALL accept an optional `visibleFields` prop listing which profile fields to render. When the prop is omitted, both components SHALL render every field exactly as they do today, preserving all existing `user-profile-management` requirements for the full `/portal/perfil` page unchanged.

#### Scenario: Omitting visibleFields preserves full-page behavior
- **WHEN** `PerfilPersonalForm` or `PerfilDeportivoForm` is rendered without a `visibleFields` prop (as on `/portal/perfil` today)
- **THEN** every field the component currently renders is still rendered, with no visual or behavioral change

#### Scenario: Providing visibleFields renders only the listed fields
- **WHEN** `PerfilPersonalForm` or `PerfilDeportivoForm` is rendered with a `visibleFields` prop listing a subset of its fields
- **THEN** only the fields in that subset are rendered; all other fields are omitted from the DOM

#### Scenario: Save behavior is unaffected by field filtering
- **WHEN** a form rendered with a `visibleFields` subset is saved via the existing `usePerfil().submit()` flow
- **THEN** the save behaves exactly as it does today (validating `nombre`/`apellido`, persisting to `usuarios` and `perfil_deportivo`), regardless of which fields were visually rendered
